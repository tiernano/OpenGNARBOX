# OpenGNARBOX

> [!CAUTION]
> **EARLY DEVELOPMENT PHASE**
> This project is currently in the **early stages of active development** and is primarily in a **testing and reverse engineering phase**. The complete OpenGNARBOX software stack is **not yet fully functional**. The custom firmware images will be released at a later date. Use with extreme caution.

For a detailed look at implemented features vs. original hardware capabilities, see [FEATURES.md](./FEATURES.md).

**The Open Source Firmware successor for GNARBOX 2.0 Hardware.**

OpenGNARBOX is a specialized software stack designed to replace the proprietary firmware on GNARBOX 2.0 (x86_64) devices. It transforms the device into a robust, secure, and fully open-source backup and organization tool for professional photographers and videographers.

## 📜 Motivation

Following the **bankruptcy of MyGnar Inc.**, the original GNARBOX hardware was left without official support, potentially turning thousands of high-end field backup devices into e-waste. Furthermore, analysis of the original proprietary firmware revealed significant security gaps and architectural vulnerabilities. 

OpenGNARBOX was born out of a necessity to provide a **secure, sustainable, and transparent** alternative that puts the hardware back in the hands of its owners.

## 🌟 Key Features

*   **Fail-Safe Ingestion**: Automated backup from SD to NVMe with SHA-256 verification.
*   **Professional Organization**: Smart pattern-based file organization with deep deduplication.
*   **Secure by Design**: Strict path validation and session-based downloads to prevent system escape.
*   **Modern Web UI**: Responsive, mobile-friendly interface for field use.
*   **Hardware Integration**: Real-time monitoring of SSD storage, battery levels, and mount status.

## 🏗️ Architecture

OpenGNARBOX is built with a decoupled, containerized architecture:

### [OpenGNAR Core (Backend)](./backend)
A high-performance **FastAPI (Python)** server that manages the device hardware.
- Orchestrates file operations (copy, move, delete, hash).
- Monitors system status (battery, storage).
- Enforces security through a sandboxed path validation engine.
- Serves the compiled frontend assets.

### [ImporTool (Frontend)](./importool)
A professional-grade **React (TypeScript)** web application.
- Explorer-like file browser with multi-file management.
- Real-time progress monitoring via WebSockets.
- Intelligent organization rules and naming transformation.

---

## 🚀 Quick Start

The easiest way to run OpenGNARBOX is using Docker Compose.

### Running with Docker

1.  **Clone the repository**
2.  **Start the stack**
    ```bash
    docker-compose up -d
    ```
3.  **Access the UI**
    Open your browser and navigate to `http://localhost:8000`.

### Running in Test/Mock Mode
To run without requiring hardware mounts:
```bash
docker-compose -f docker-compose.test.yml up
```

## 🛡️ Security & Reliability

OpenGNARBOX prioritizes the safety of your data:
- **Path Validation**: All API requests are checked against authorized media mount points (`/media/sd`, `/media/nvme`).
- **Session-Based Downloads**: Prevents URI length limitations and secures multi-file ZIP generation.
- **Atomic Operations**: Verification occurs before source deletion in "Move" mode.

---

## 🛠️ Development

### Backend Development
The backend is located in the `/backend` directory. It uses Python 3.11+.
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development
The frontend is located in the `/importool` directory.
```bash
cd importool
npm install
npm run dev
```

---
*OpenGNARBOX is an independent open-source project and is not affiliated with the original GNARBOX manufacturer.*

&copy; CyberTap IT & Security