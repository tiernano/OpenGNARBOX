import React, { useEffect, useRef } from 'react';
import { Job, TransactionStatus } from '../types';

interface TransactionMonitorProps {
  jobs: Job[];
}

const StatusIcon = ({ status }: { status: TransactionStatus }) => {
  switch (status) {
    case TransactionStatus.PENDING: return <span className="text-gray-600">○</span>;
    case TransactionStatus.HASHING_SOURCE:
    case TransactionStatus.HASHING_DEST:
      return <span className="text-blue-400 animate-pulse">#</span>;
    case TransactionStatus.BACKING_UP: return <span className="text-yellow-400 animate-pulse">B</span>;
    case TransactionStatus.MOVING: return <span className="text-purple-400 animate-pulse">→</span>;
    case TransactionStatus.VERIFYING: return <span className="text-cyan-400 animate-pulse">?</span>;
    case TransactionStatus.COMPLETED: return <span className="text-green-500">✓</span>;
    case TransactionStatus.FAILED: return <span className="text-red-500">✕</span>;
    case TransactionStatus.ROLLED_BACK: return <span className="text-red-400">↺</span>;
    case TransactionStatus.SKIPPED: return <span className="text-gray-500">S</span>;
    case TransactionStatus.WAITING_FOR_USER: return <span className="text-orange-500 animate-bounce">!</span>;
    default: return <span>?</span>;
  }
};

const TransactionMonitor: React.FC<TransactionMonitorProps> = ({ jobs }) => {
  const activeRef = useRef<HTMLDivElement>(null);

  // Find the first active or processing job to scroll to
  const activeJobId = jobs.find(j => 
    j.status !== TransactionStatus.COMPLETED && 
    j.status !== TransactionStatus.FAILED &&
    j.status !== TransactionStatus.SKIPPED &&
    j.status !== TransactionStatus.ROLLED_BACK
  )?.id || jobs[jobs.length - 1]?.id; // Or last item if all done

  useEffect(() => {
    if (activeRef.current) {
        activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeJobId, jobs.length]); // Scroll when active job changes or list grows

  if (jobs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        No active transactions. System idle.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 font-mono text-xs border border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 text-gray-400 border-b border-gray-800 flex justify-between">
        <span>Fail-Safe Transaction Log</span>
        <span>{jobs.filter(j => j.status === TransactionStatus.COMPLETED).length} / {jobs.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
        {jobs.map(job => (
          <div key={job.id} ref={job.id === activeJobId ? activeRef : null}>
            <div 
              className={`grid grid-cols-12 gap-2 items-center p-1 rounded-t transition-colors ${
                  job.id === activeJobId ? 'bg-gray-800 border-x border-t border-gray-700 shadow-sm' : 'hover:bg-gray-900 border border-transparent'
              }`}
            >
               <div className="col-span-1 text-center font-bold">
                 <StatusIcon status={job.status} />
               </div>
               <div className="col-span-2 text-gray-500">
                 {new Date(job.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
               </div>
               <div className="col-span-3 text-gray-300 truncate" title={job.sourcePath.split('/').pop()}>
                  {job.sourcePath.split('/').pop()}
               </div>
               <div className="col-span-1 text-center text-gray-600">→</div>
               <div className="col-span-3 text-gray-300 truncate" title={job.proposedPath}>
                  ...{job.proposedPath.slice(-25)}
               </div>
               <div className="col-span-2 text-right">
                 <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                   job.status === TransactionStatus.COMPLETED ? 'bg-green-900 text-green-300' :
                   job.status === TransactionStatus.FAILED ? 'bg-red-900 text-red-300' :
                   job.status === TransactionStatus.WAITING_FOR_USER ? 'bg-orange-900 text-orange-200' :
                   'bg-gray-800 text-gray-400'
                 }`}>
                   {job.status.replace(/_/g, ' ')}
                 </span>
               </div>
            </div>
            {job.status === TransactionStatus.MOVING && job.progress !== undefined && (
              <div className="w-full bg-gray-900 h-1 mb-1 rounded-b">
                <div 
                  className="bg-blue-500 h-1 rounded-b transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionMonitor;