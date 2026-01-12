# Instagram Bulk Downloader

![icon](icons/icon128.png)

## 🚀 New Features

This enhanced version includes **powerful bulk downloading capabilities** for Instagram profiles:

* **Bulk Download** - Automatically download multiple reels from any profile
* **View Count Filter** - Download only viral content (set minimum views: 100K, 1M, etc.)
* **Max Posts Limit** - Process only the first N posts (e.g., top 10 most recent)
* **Auto-Download** - Reels are downloaded automatically when they meet your criteria
* **Captions Export** - Get a text file with all captions in serial order
* **Smart Filtering** - Precise control with number input + multiplier dropdown

## How this works

With regex and some `ReactFiber` magic, combined with network request interception, this extension can detect which posts you want to download and fetch the API data automatically. The bulk download feature intercepts Instagram's internal API calls to extract media URLs, view counts, and captions.

## Browser compatibility

This extension should work fine on the following browsers with `fetch()` API and Chromium base browser, tested Browser:

* Google Chrome
* MS Edge
* Firefox

## Download and install

* Download [latest version](https://github.com/Gunesh22/Instagram-Bulk-Downloader/releases) and extract to a folder
* Enable Chrome extensions developer mode
* Drag and drop extracted folder to `chrome://extensions/`

## Usage

### Single Downloads
* Go to any `post`, `reels`, `stories`, etc. Then click `Download` button to fetch data.
* Click on any photos/videos to save.
* Toggle multi select by clicking on `Media` and select photos by clicking on them (or select all by click and hold on `Media`). Then click on `Download` to save zip file.

### Bulk Downloads (NEW!)
1. **Navigate to a profile** - Go to any Instagram profile (e.g., `@username`)
2. **Click the "Reels" tab** - View the grid of reels
3. **Click the Download button** - Opens the extension popup
4. **Configure filters:**
   - **Min Views:** Enter a number (e.g., `2`) and select multiplier (`Million`, `Thousand`, `Hundred`)
     - Example: `2` + `Million` = Only download reels with 2M+ views
   - **Max Posts:** Enter how many reels to check (e.g., `10` for first 10 reels)
     - Leave blank to process all reels on the profile
5. **Click "Start Collect"** - The extension will:
   - Scroll through the profile to load reels
   - Click each reel to extract data
   - Filter by view count
   - Auto-download qualifying reels
   - Create a `captions.txt` file with all captions
6. **Wait for completion** - Progress is shown on the button
7. **Check your Downloads folder** - All reels and captions are saved!

**File naming:** `username_id_viewcount.mp4` (e.g., `elitethink_123456_2500000views.mp4`)

## Features

* Download posts ✔
* Download reels ✔
* Download latest stories ✔
* Download highlight stories ✔
* **Bulk download from profiles** ✔ **NEW!**
* **Filter by view count** ✔ **NEW!**
* **Limit max posts to process** ✔ **NEW!**
* **Auto-download with captions** ✔ **NEW!**
* Support high resolution ✔
* Support download zip file ✔

## Bulk Download UI

The bulk download panel appears when you're on a profile page:

```
┌─────────────────────────────────────────┐
│ Min Views: [2] [Million ▼] = 2.0M views│
│ Max Posts: [10] Leave blank for all    │
│ [START COLLECT] [DOWNLOAD (0)]         │
└─────────────────────────────────────────┘
```

**Controls:**
- **Min Views Input:** Enter a number
- **Multiplier Dropdown:** Select Hundred (×100), Thousand (×1,000), or Million (×1,000,000)
- **Max Posts Input:** Limit how many reels to check (blank = all)
- **Start Collect Button:** Begin the bulk download process
- **Download Button:** Shows count of collected reels

## Customize

You can modify anything you want except some constants start with "IG_" that definitely gonna break this extension.

Edit Hide / Show Transition effects

```css
.display-container.hide {
    transform-origin: 85% bottom;
    transform: scale(0);
    pointer-events: none;
    opacity: 0.6;
}
```

## Keyboard shortcut

Some keyboard shortcuts will not work if you use an external application for typing.

* Download: `D`
* Close: `esc` `C` `c`
* Select all `S` `s`
* Keyboard shortcut should work if you don't focus on special HTML Elements like `input` `textarea` or any element with `textbox` role (ex: comment, search, ...)

## Technical Details

**Network Interception:**
- Intercepts `XMLHttpRequest` calls to Instagram's GraphQL API
- Captures data from `PolarisProfileReelsTabQuery`, `PolarisProfilePostsQuery`, and other endpoints
- Extracts media URLs, view counts, captions, and thumbnails

**Supported API Endpoints:**
- `/graphql/query` - GraphQL queries
- `/api/v1/` - REST API calls
- Handles both classic and new Instagram API structures

## Notes

* If you save extension on external partition or drive and your Linux Distro doesn't mount automatically, extension will disappear. You have to mount that partition/drive and restart browser.
* Bulk download works best on profile pages with the "Reels" tab visible
* Large profiles may take several minutes to process completely
* Instagram may rate-limit if you download too many reels too quickly

## Credits

Original extension by [HOAIAN2](https://github.com/HOAIAN2/Instagram-Downloader)

Enhanced with bulk download features by [Gunesh22](https://github.com/Gunesh22)

## License

This project maintains the same license as the original Instagram-Downloader project.
