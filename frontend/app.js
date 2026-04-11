document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sdStatusBadge = document.getElementById('sd-status-badge');
    const sdUsed = document.getElementById('sd-used');
    const sdTotal = document.getElementById('sd-total');
    const sdBar = document.getElementById('sd-bar');

    const nvmeStatusBadge = document.getElementById('nvme-status-badge');
    const nvmeUsed = document.getElementById('nvme-used');
    const nvmeTotal = document.getElementById('nvme-total');
    const nvmeBar = document.getElementById('nvme-bar');

    const batteryLevel = document.getElementById('battery-level');
    const batteryStatusText = document.getElementById('battery-status-text');

    const backupBtn = document.getElementById('backup-btn');
    const progressContainer = document.getElementById('progress-container');
    const backupProgressBar = document.getElementById('backup-progress-bar');
    const backupPercentage = document.getElementById('backup-percentage');
    const backupStatusText = document.getElementById('backup-status-text');

    const connectionDot = document.getElementById('connection-dot');
    const connectionStatus = document.getElementById('connection-status');

    let isBackupRunning = false;
    let pollInterval = null;

    // Fetch System Status
    async function fetchStatus() {
        try {
            const res = await fetch('/api/status');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            
            updateConnectionStatus(true);
            updateStorageUI('sd', data.sd);
            updateStorageUI('nvme', data.nvme);
            updateBatteryUI(data.battery);
            
            // Check if backup just finished without us polling progress
            if (!isBackupRunning && backupBtn.disabled) {
                checkBackupProgress();
            }
        } catch (err) {
            console.error(err);
            updateConnectionStatus(false);
        }
    }

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            connectionDot.className = "status-dot";
            connectionStatus.textContent = "Connected";
        } else {
            connectionDot.className = "status-dot red";
            connectionStatus.textContent = "Disconnected";
            
            sdStatusBadge.textContent = "Offline";
            sdStatusBadge.className = "badge badge-red";
            nvmeStatusBadge.textContent = "Offline";
            nvmeStatusBadge.className = "badge badge-red";
        }
    }

    function updateStorageUI(type, data) {
        const badge = type === 'sd' ? sdStatusBadge : nvmeStatusBadge;
        const usedEl = type === 'sd' ? sdUsed : nvmeUsed;
        const totalEl = type === 'sd' ? sdTotal : nvmeTotal;
        const barEl = type === 'sd' ? sdBar : nvmeBar;

        if (data.presence) {
            badge.textContent = "Mounted";
            badge.className = "badge badge-emerald";
            
            usedEl.textContent = data.used_gb;
            totalEl.textContent = data.total_gb;
            
            const percent = (data.used_gb / data.total_gb) * 100;
            barEl.style.width = `${percent}%`;
            
            if (percent > 90) {
                barEl.className = "progress-fill bg-red";
            } else {
                barEl.className = `progress-fill ${type === 'sd' ? 'bg-emerald' : 'bg-indigo'}`;
            }
            
            if (type === 'sd' && !isBackupRunning) {
                backupBtn.disabled = false;
            }
        } else {
            badge.textContent = "Not Inserted";
            badge.className = "badge badge-amber";
            usedEl.textContent = "0";
            totalEl.textContent = "0";
            barEl.style.width = "0%";
            
            if (type === 'sd') {
                backupBtn.disabled = true;
            }
        }
    }

    function updateBatteryUI(battery) {
        batteryLevel.textContent = battery.level;
        batteryStatusText.textContent = battery.status === 'mock' ? 'Simulated Battery' : 'Discharging';
        
        const container = document.getElementById('battery-icon-container');
        if (battery.level <= 20) {
            container.className = "icon-box red-icon";
        } else {
            container.className = "icon-box amber-icon";
        }
    }

    // Backup Logic
    backupBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            const data = await res.json();
            
            if (data.status === 'started') {
                enterBackupState();
            }
        } catch (err) {
            console.error('Failed to start backup', err);
            alert("Failed to start backup. Check connection.");
        }
    });

    function enterBackupState() {
        isBackupRunning = true;
        backupBtn.disabled = true;
        backupBtn.innerHTML = `
            <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Transferring...</span>
        `;
        
        progressContainer.style.display = 'block';
        setTimeout(() => {
            progressContainer.classList.remove('hidden');
        }, 10);
        
        backupProgressBar.style.width = '0%';
        backupPercentage.textContent = '0%';
        backupStatusText.textContent = "Copying files...";
        
        pollInterval = setInterval(checkBackupProgress, 1000);
    }

    async function checkBackupProgress() {
        try {
            const res = await fetch('/api/backup/progress');
            const data = await res.json();
            
            isBackupRunning = data.is_running;
            
            if (data.status === 'completed') {
                backupProgressBar.style.width = '100%';
                backupPercentage.textContent = '100%';
                backupStatusText.textContent = "Backup Complete!";
                cleanupBackupState();
                setTimeout(() => fetchStatus(), 1000); // refresh storage
            } else if (data.status.startsWith('failed')) {
                backupStatusText.textContent = "Error: " + data.status;
                backupStatusText.className = "status-error";
                backupProgressBar.className = "progress-fill bg-red";
                cleanupBackupState();
            } else if (isBackupRunning) {
                backupProgressBar.style.width = `${data.progress}%`;
                backupPercentage.textContent = `${data.progress}%`;
            } else {
                cleanupBackupState();
            }
            
        } catch (err) {
            console.error('Failed to parse progress', err);
        }
    }

    function cleanupBackupState() {
        clearInterval(pollInterval);
        isBackupRunning = false;
        
        setTimeout(() => {
            if (sdTotal.textContent !== "0") backupBtn.disabled = false;
            backupBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>Start Backup</span>
            `;
            
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                setTimeout(() => progressContainer.style.display = 'none', 500);
                
                // reset styling
                backupStatusText.className = "status-active";
                backupProgressBar.className = "progress-fill active-gradient";
            }, 3000);
        }, 1000);
    }

    // Initial fetch and polling
    fetchStatus();
    setInterval(fetchStatus, 5000); // Poll status every 5 seconds
});
