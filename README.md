# Instagram Downloader & Bulk Reels Collector

## 🚀 How to Install (Add to Browser)

1.  **Download**: Click the "Code" button above and select "Download ZIP", or clone this repository. Extract the ZIP file to a folder on your computer.
2.  **Open Extensions Page**:
    *   **Chrome**: Type `chrome://extensions` in the address bar and press Enter.
    *   **Edge**: Type `edge://extensions` in the address bar and press Enter.
3.  **Enable Developer Mode**: Look for a toggle switch named "Developer mode" (usually in the top right corner) and turn it **ON**.
4.  **Load Extension**:
    *   Click the **"Load unpacked"** button (top left).
    *   Select the folder where you extracted the files (make sure it's the folder containing `manifest.json`).
5.  **Done!**: The extension icon should appear in your browser toolbar. Pin it for easy access!

---

## New Features
This enhanced version includes powerful bulk downloading capabilities for Instagram profiles:

*   **Bulk Download**: Automatically download multiple reels from any profile.
*   **Folder Selection**: Choose exactly where you want to save files (no more "Save As" popups!).
*   **View Count Filter**: Download only viral content (set minimum views: 100K, 1M, etc.).
*   **Max Posts Limit**: Process only the first N posts (e.g., top 10 most recent).
*   **Auto-Download**: Reels are downloaded automatically when they meet your criteria.
*   **Captions Export**: Get a text file (`captions.txt`) with all captions in serial order.
*   **Smart Filtering**: Precise control with number input + multiplier dropdown.

## Usage

### Single Downloads
1.  Go to any post, reel, or story.
2.  Click the Download button to fetch data.
3.  Click on any photo/video to save it.
4.  **Multi-select**: Click "Media" title to toggle select mode, then click items to select multiple. Click "Download" to save as ZIP.

### Bulk Downloads (NEW!)
1.  **Navigate to a profile**: Go to any Instagram profile (e.g., `@username`).
2.  **Click the "Reels" tab**: Ensure you are viewing the reels grid.
3.  **Open Extension**: Click the Download button/Overlay.
4.  **Select Folder**: Click the **"Select Download Folder"** button.
    *   *Important*: You must select a folder to bypass browser download prompts.
5.  **Configure filters**:
    *   **Min Views**: Enter a number (e.g., `2`) and select multiplier (Million, Thousand, Hundred).
        *   *Example*: `2` + `Million` = Only download reels with 2M+ views.
    *   **Max Posts**: Enter how many reels to check (e.g., `10` for first 10 reels). Leave blank to process all.
6.  **Click "Start Collect"**:
    *   The extension will scroll through the profile, open reels, and process them.
    *   Videos meeting your criteria are saved automatically to your selected folder.
7.  **File Naming**: Files are named by popularity for easy sorting: `[Views]_[Username]_[ID].mp4`
    *   *Example*: `2.5M_elitethink_123456.mp4`

## Bulk Download UI
The bulk download panel appears when you're on a profile page:

```text
┌─────────────────────────────────────────┐
│ [Select Download Folder]                │
│ Selected: D:\My Instgram Downloads      │
├─────────────────────────────────────────┤
│ Min Views: [2] [Million ▼] = 2.0M views │
│ Max Posts: [10] Leave blank for all     │
│ [START COLLECT] [DOWNLOAD (0)]          │
└─────────────────────────────────────────┘
```

## Features List
*   Download posts ✔
*   Download reels ✔
*   Download latest stories ✔
*   Download highlight stories ✔
*   **Bulk download from profiles** ✔ NEW!
*   **Folder Selection (FileSystem API)** ✔ NEW!
*   **Filter by view count** ✔ NEW!
*   **Smart File Naming (Sort by Views)** ✔ NEW!
*   **Limit max posts to process** ✔ NEW!
*   **Auto-download with captions** ✔ NEW!
*   Support high resolution ✔
*   Support download zip file ✔

## How this works
With regex and some ReactFiber magic, combined with network request interception, this extension can detect which posts you want to download and fetch the API data automatically. The bulk download feature intercepts Instagram's internal API calls to extract media URLs, view counts, and captions.

## Browser compatibility
This extension should work fine on the following browsers with `fetch()` API and Chromium base:
*   Google Chrome
*   MS Edge
*   Brave
*   Opera

## Technical Details
*   **Network Interception**: Intercepts XMLHttpRequest calls to Instagram's GraphQL API.
*   **Virtualization Handling**: Uses a "Process-As-You-Go" strategy to handle Instagram's infinite scroll and DOM removal.
*   **File System Access API**: Uses `window.showDirectoryPicker()` to save files directly to disk without user interaction per file.

## Customize
You can modify anything you want except some constants start with "IG_" that definitely gonna break this extension.

Edit Hide / Show Transition effects in `src/style/style.css`:
```css
.display-container.hide {
    transform-origin: 85% bottom;
    transform: scale(0);
    pointer-events: none;
    opacity: 0.6;
}
```

## Keyboard shortcuts
*   **Download**: `D`
*   **Close**: `Esc`, `C`
*   **Select all**: `S` (in multi-select mode)

*Note: Shortcuts may not work if focus is on an input field.*

## Notes
*   **Rate Limits**: Instagram may rate-limit you if you download hundreds of reels very quickly. The extension has built-in delays to be safe, but use with caution.
*   **Large Profiles**: Processing a profile with thousands of posts may take time.

## Credits
*   Original extension by [HOAIAN2](https://github.com/HOAIAN2)
*   Enhanced with bulk download features by **Gunesh22**

## License
This project maintains the same license as the original Instagram-Downloader project.
