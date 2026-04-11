# ImporTool

**A robust, fail-safe media organization tool for professionals.**

ImporTool is designed to streamline the workflow of photographers and videographers by automating the ingestion of footage from SD cards to storage libraries. Unlike simple file copiers, ImporTool prioritizes data integrity, ensuring every byte is verified before the original file is touched.

## 🚀 Features

### 🛡️ Fail-Safe Architecture
*   **Verify-Then-Delete**: Uses SHA-256 content hashing to verify the destination file matches the source exactly before deleting the source.
*   **Safety Backups**: Optionally creates a temporary backup of files in a separate location before processing.
*   **Transaction Log**: detailed, real-time monitoring of every action (Hashing, Moving, Backing Up, Verifying).

### 📂 Smart Organization
*   **Pattern Recognition**: Automatically parses filenames (Sony, Canon, DJI patterns) or file metadata to extract dates and camera models.
*   **Structured Output**: Organizes files into a clean hierarchy:
    ```
    Library/
      └── Camera_Year/
          └── Month/
              └── Extension/
                  └── YYYY-MM-DD_Camera_OriginalName.Ext
    ```
*   **Fixes Naming**: Corrects inconsistent naming conventions on the fly.

### 🔍 Deep Deduplication
*   **Content-Based**: Detects duplicates based on actual file content (hash), ignoring filenames.
*   **Flexible Strategies**:
    *   **Skip**: Ignore incoming duplicates.
    *   **Overwrite**: Replace the library version.
    *   **Rename**: Keep both (appends timestamp).
    *   **Ask**: Manual conflict resolution UI for specific files.

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: TailwindCSS
*   **Backend Interface**: Integrated with OpenGNAR Core API (FastAPI)
*   **Deployment**: Docker-based architecture (Alpine Linux)

## 🏗️ Architecture

ImporTool now runs as a lightweight SPA (Single Page Application) served directly by the **OpenGNAR Core** backend. 

*   **Communication**: Uses a hybrid REST + WebSocket approach.
    *   **REST**: For status updates, directory scanning, and session-based downloads.
    *   **WebSockets**: For real-time, non-blocking file transfer progress reporting.
*   **Security**: All file operations are validated server-side to ensure they remain within authorized media boundaries.

## 📦 Installation & Usage

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Development

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    Starts the Vite development server with Hot Module Replacement (HMR).
    ```bash
    npm run dev
    ```
    *Note: Ensure the OpenGNAR Core backend is running to enable API features.*

### Building for Production

To build the optimized static assets:

```bash
npm run build
```
The output will be in the `dist` folder, which the OpenGNAR Core backend is configured to serve.

## ⚙️ Configuration

Check the **Settings** tab within the app to configure:
*   **Ignored Extensions**: Skip sidecar files like `.XML`, `.THM`, `.LRV`.
*   **Backup Retention**: How long safety backups are kept.
*   **Duplicate Strategy**: Default behavior for conflicts.

## Project Structure

*   `src/services/FileService.ts`: Abstraction layer handling API communication with the OpenGNAR Core.
*   `src/services/organizer.ts`: Logic for parsing filenames and determining destination paths.
*   `src/components/FileBrowser.tsx`: The explorer-like interface for managing library files.
*   `src/components/TransactionMonitor.tsx`: Failed-safe operation visualization and progress tracking.

---
&copy; CyberTap IT & Security
