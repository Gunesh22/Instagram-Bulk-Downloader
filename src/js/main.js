const IG_BASE_URL = window.location.origin + '/';
/**
 * @deprecated
 */
const IG_PROFILE_HASH = '69cba40317214236af40e7efa697781d';
/**
 * @deprecated
 */
const IG_POST_HASH = '9f8827793ef34641b2fb195d4d41151c';

const IG_SHORTCODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const IG_POST_REGEX = /\/(p|tv|reel|reels)\/([A-Za-z0-9_-]+)(\/?)/;
const IG_STORY_REGEX = /\/(stories)\/(.*?)\/(\d*)(\/?)/;
const IG_HIGHLIGHT_REGEX = /\/(stories)\/(highlights)\/(\d*)(\/?)/;

const APP_NAME = `${chrome.runtime.getManifest().name} v${chrome.runtime.getManifest().version}`;

const appCache = Object.freeze({
    /**
     * Cache user id, reduce one api call to get id from username
     * 
     * username => id
     */
    userIdsCache: new Map(),
    /**
     * Cache post id, reduce one api call to get post id from shortcode.
     * 
     * Only for private profile, check out  post-modal-view-handler.js
     * 
     * shortcode => post_id
     */
    postIdInfoCache: new Map(),
});

const appState = Object.freeze((() => {
    let currentDisplay = '';
    const current = {
        shortcode: '',
        username: '',
        highlights: '',
    };
    const previous = {
        shortcode: '',
        username: '',
        highlights: '',
    };
    window.addEventListener('shortcodeChange', e => {
        current.shortcode = e.detail.code;
    });
    return {
        get currentDisplay() { return currentDisplay; },
        set currentDisplay(value) { if (['post', 'stories', 'highlights'].includes(value)) currentDisplay = value; },
        current: Object.freeze({
            get shortcode() { return current.shortcode; },
            set shortcode(value) {
                current.shortcode = value;
                downloadPostPhotos().then(data => {
                    renderMedia(data);
                    currentDisplay = 'post';
                });
            },
            get username() { return current.username; },
            set username(value) {
                current.username = value;
                downloadStoryPhotos('stories').then(data => {
                    renderMedia(data);
                    currentDisplay = 'stories';
                });
            },
            get highlights() { return current.highlights; },
            set highlights(value) {
                current.highlights = value;
                downloadStoryPhotos('highlights').then(data => {
                    renderMedia(data);
                    currentDisplay = 'hightlights';
                });
            },
        }),
        setCurrentShortcode() {
            const page = window.location.pathname.match(IG_POST_REGEX);
            if (page) current.shortcode = page[2];
        },
        setCurrentUsername() {
            const page = window.location.pathname.match(IG_STORY_REGEX);
            if (page && page[2] !== 'highlights') current.username = page[2];
        },
        setCurrentHightlightsId() {
            const page = window.location.pathname.match(IG_HIGHLIGHT_REGEX);
            if (page) current.highlights = page[3];
        },
        setPreviousValues() {
            Object.keys(current).forEach(key => { previous[key] = current[key]; });
        },
        getFieldChange() {
            if (current.highlights !== previous.highlights) return 'highlights';
            if (current.username !== previous.username) return 'stories';
            if (current.shortcode !== previous.shortcode) return 'post';
            return 'none';
        },
    };
})());

(() => {
    function createElement(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html').body;
        const fragment = document.createDocumentFragment();
        fragment.append(...doc.childNodes);
        return fragment;
    }
    function initUI() {
        document.body.appendChild(createElement(
            `<div class="display-container hide">
                <div class="title-container">
                    <span title="${APP_NAME}">Media</span>
                    <button class="esc-button">&times</button>
                </div>
                <div class="bulk-container" style="position: absolute; top: 70px; left: 0; width: 100%; padding: 15px; background: #1a1a1a; z-index: 100; border-bottom: 1px solid #333; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: white;">
                        <label style="font-size: 14px; min-width: 90px; font-weight: 500;">Min Views:</label>
                        <input type="number" class="view-count-input" min="0" value="0" style="flex: 1; padding: 8px; background: #262626; border: 1px solid #555; border-radius: 4px; color: white; font-size: 14px; max-width: 100px;">
                        <select class="view-count-multiplier" style="padding: 8px; background: #262626; border: 1px solid #555; border-radius: 4px; color: white; font-size: 14px; cursor: pointer;">
                            <option value="1">Hundred</option>
                            <option value="1000">Thousand</option>
                            <option value="1000000">Million</option>
                        </select>
                        <span class="view-count-display" style="color: #0095f6; font-weight: 600; min-width: 80px;">= 0 views</span>
                    </div>
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: white;">
                        <label style="font-size: 14px; min-width: 90px; font-weight: 500;">Max Posts:</label>
                        <input type="number" class="max-posts-input" min="1" value="10" style="flex: 1; padding: 8px; background: #262626; border: 1px solid #555; border-radius: 4px; color: white; font-size: 14px; max-width: 100px;">
                        <span style="color: #888; font-size: 12px; flex: 1;">Leave blank for all posts</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                         <button class="bulk-btn" style="flex: 1; padding: 10px; cursor: pointer; background: #0095f6; border: none; border-radius: 6px; color: white; font-weight: bold; font-size: 13px; text-transform: uppercase;">Start Collect</button>
                         <button class="bulk-dl-btn" style="flex: 1; padding: 10px; cursor: pointer; background: #262626; border: 1px solid #555; border-radius: 6px; color: white; display: none; font-weight: bold; font-size: 13px;">Download (<span class="bulk-count">0</span>)</button>
                    </div>
                </div>
                <div class="media-container" style="padding-top: 200px;">
                    <p style="position: absolute;top: 50%;transform: translate(0%, -50%); width: 100%; text-align: center; color: #888;">
                        Media items will appear here
                    </p>
                </div>
            </div>
            <button class="download-button">Download</button>`));
    }
    function handleEvents() {
        const ESC_BUTTON = document.querySelector('.esc-button');
        const TITLE_CONTAINER = document.querySelector('.title-container').firstElementChild;
        const DISPLAY_CONTAINER = document.querySelector('.display-container');
        const DOWNLOAD_BUTTON = document.querySelector('.download-button');
        const IGNORE_FOCUS_ELEMENTS = ['INPUT', 'TEXTAREA'];
        const ESC_EVENT_KEYS = ['Escape', 'C', 'c'];
        const DOWNLOAD_EVENT_KEYS = ['D'];
        const SELECT_EVENT_KEYS = ['S', 's'];

        // Bulk Logic Variables
        const VIEW_INPUT = document.querySelector('.view-count-input');
        const VIEW_MULTIPLIER = document.querySelector('.view-count-multiplier');
        const VIEW_DISPLAY = document.querySelector('.view-count-display');
        const MAX_POSTS_INPUT = document.querySelector('.max-posts-input');
        const BULK_BTN = document.querySelector('.bulk-btn');
        const BULK_DL_BTN = document.querySelector('.bulk-dl-btn');
        const BULK_CONTAINER = document.querySelector('.bulk-container');
        const BULK_COUNT = document.querySelector('.bulk-count');

        let minViews = 0;
        let isCollecting = false;
        let collectedMedia = [];
        let collectedIds = new Set();
        let collectedShortcodes = new Set();
        let currentReelResolver = null;
        let dirHandle = null;

        // --- Folder Selection UI ---
        const FOLDER_BTN = document.createElement('button');
        FOLDER_BTN.textContent = 'Select Download Folder';
        FOLDER_BTN.style.cssText = 'padding: 8px; background: #262626; border: 1px solid #555; border-radius: 4px; color: white; font-size: 14px; width: 100%; margin-bottom: 5px; cursor: pointer;';

        const FOLDER_STATUS = document.createElement('div');
        FOLDER_STATUS.textContent = 'No folder selected';
        FOLDER_STATUS.style.cssText = 'color: #888; font-size: 11px; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

        if (BULK_CONTAINER) {
            BULK_CONTAINER.insertBefore(FOLDER_BTN, BULK_CONTAINER.children[2]);
            BULK_CONTAINER.insertBefore(FOLDER_STATUS, BULK_CONTAINER.children[3]);
        }

        FOLDER_BTN.addEventListener('click', async () => {
            try {
                dirHandle = await window.showDirectoryPicker();
                FOLDER_STATUS.textContent = `Selected: ${dirHandle.name}`;
                FOLDER_STATUS.style.color = '#0095f6';
            } catch (err) {
                console.error(err);
                FOLDER_STATUS.textContent = 'Selection cancelled';
            }
        });

        function updateMinViews() {
            const inputVal = parseInt(VIEW_INPUT.value) || 0;
            const multiplier = parseInt(VIEW_MULTIPLIER.value) || 1;
            minViews = inputVal * multiplier;

            // Format display
            if (minViews >= 1000000) {
                VIEW_DISPLAY.textContent = `= ${(minViews / 1000000).toFixed(1)}M views`;
            } else if (minViews >= 1000) {
                VIEW_DISPLAY.textContent = `= ${(minViews / 1000).toFixed(1)}K views`;
            } else {
                VIEW_DISPLAY.textContent = `= ${minViews} views`;
            }
        }

        VIEW_INPUT.addEventListener('input', updateMinViews);
        VIEW_MULTIPLIER.addEventListener('change', updateMinViews);

        function checkBulkVisibility() {
            if (!BULK_CONTAINER) return;
            const path = window.location.pathname;
            const isPost = path.match(IG_POST_REGEX);
            const isStory = path.match(IG_STORY_REGEX);
            const isDirect = path.startsWith('/direct');
            const isHome = path === '/';

            if (!isPost && !isStory && !isDirect && !isHome) {
                BULK_CONTAINER.style.display = 'block';
            } else {
                BULK_CONTAINER.style.display = 'none';
            }
        }

        // --- Core Bulk Collection Logic (Process-As-You-Go) ---
        BULK_BTN.addEventListener('click', async () => {
            isCollecting = !isCollecting;
            if (isCollecting) {
                if (!dirHandle && !confirm("No folder selected. Files will be downloaded to your default Downloads folder and might prompt for each file. Continue?")) {
                    isCollecting = false;
                    return;
                }

                BULK_BTN.textContent = 'Starting...';
                BULK_BTN.style.background = '#ed4956';
                BULK_DL_BTN.style.display = 'none';
                collectedMedia = [];
                collectedIds.clear();
                collectedShortcodes.clear();
                let captionsText = '';

                let lastScrollHeight = 0;
                let noNewContentCount = 0;
                let totalProcessed = 0;
                const maxPosts = parseInt(MAX_POSTS_INPUT.value) || 10000;

                while (isCollecting) {
                    // 1. Find all visible reel links
                    const visibleLinks = Array.from(document.querySelectorAll('a[href*="/reel/"]'))
                        .filter(link => link.href.match(/\/reel\/[A-Za-z0-9_-]+/));

                    for (const link of visibleLinks) {
                        if (!isCollecting) break;
                        if (totalProcessed >= maxPosts) {
                            isCollecting = false;
                            break;
                        }

                        const href = link.href;
                        const shortcodeMatch = href.match(/\/reel\/([A-Za-z0-9_-]+)/);
                        const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

                        if (shortcode && !collectedShortcodes.has(shortcode)) {
                            try {
                                link.click(); // Open modal

                                // Smart Wait
                                const waitPromise = new Promise(resolve => { currentReelResolver = resolve; });
                                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 4000));
                                await Promise.race([waitPromise, timeoutPromise]);

                                // Close modal
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                                await new Promise(resolve => setTimeout(resolve, 800)); // Animation wait

                                collectedShortcodes.add(shortcode);
                                totalProcessed++;
                                BULK_BTN.textContent = `Collected: ${collectedMedia.length} | Scanning...`;

                            } catch (e) {
                                console.error('Error processing item', e);
                            }
                        }
                    }

                    if (!isCollecting || totalProcessed >= maxPosts) break;

                    // 2. Scroll Down
                    window.scrollBy(0, window.innerHeight * 0.8);
                    await new Promise(resolve => setTimeout(resolve, 2500));

                    // 3. Check for end of page
                    const currentScrollHeight = document.body.scrollHeight;
                    if (currentScrollHeight === lastScrollHeight) {
                        noNewContentCount++;
                        if (noNewContentCount > 3) {
                            console.log('Reached end of page');
                            break;
                        }
                    } else {
                        noNewContentCount = 0;
                        lastScrollHeight = currentScrollHeight;
                    }
                }

                // Step 4: Download
                if (collectedMedia.length > 0) {
                    BULK_BTN.textContent = `Saving ${collectedMedia.length} files...`;

                    collectedMedia.forEach((item, index) => {
                        captionsText += `[${index + 1}] ${item.username} - ${item.stats?.views || 0} views\n`;
                        captionsText += `${item.caption || ''}\n`;
                        captionsText += `${'='.repeat(80)}\n\n`;
                    });

                    try {
                        // Save Captions
                        if (dirHandle) {
                            const capHandle = await dirHandle.getFileHandle(`captions_${Date.now()}.txt`, { create: true });
                            const writable = await capHandle.createWritable();
                            await writable.write(captionsText);
                            await writable.close();
                        } else {
                            const blob = new Blob([captionsText], { type: 'text/plain' });
                            saveFile(blob, `captions_${Date.now()}.txt`);
                        }

                        // Save Videos
                        for (let i = 0; i < collectedMedia.length; i++) {
                            const item = collectedMedia[i];
                            BULK_BTN.textContent = `Saving ${i + 1}/${collectedMedia.length}...`;

                            try {
                                const response = await fetch(item.url);
                                const blob = await response.blob();

                                // Format views
                                let views = item.stats?.views || 0;
                                let viewsString = views.toString();
                                if (views >= 1000000) {
                                    viewsString = (views / 1000000).toFixed(1) + 'M';
                                } else if (views >= 1000) {
                                    viewsString = (views / 1000).toFixed(1) + 'K';
                                }

                                const filename = `${viewsString}_${item.username}_${item.id}.mp4`;

                                if (dirHandle) {
                                    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                                    const writable = await fileHandle.createWritable();
                                    await writable.write(blob);
                                    await writable.close();
                                } else {
                                    saveFile(blob, filename);
                                    await new Promise(r => setTimeout(r, 500));
                                }
                            } catch (e) {
                                console.error('Save error', e);
                            }
                        }
                    } catch (err) {
                        console.error('File System Error', err);
                        alert('Error saving files: ' + err.message);
                    }
                }

                isCollecting = false;
                BULK_BTN.textContent = 'Start Collect';
                BULK_BTN.style.background = '#0095f6';
                BULK_DL_BTN.style.display = 'block';
                BULK_COUNT.textContent = collectedMedia.length;

            } else {
                isCollecting = false;
                BULK_BTN.textContent = 'Stopping...';
            }
        });

        BULK_DL_BTN.addEventListener('click', () => {
            if (collectedMedia.length === 0) return;
            const wrapper = {
                date: Date.now() / 1000,
                user: { username: collectedMedia[0].username || 'bulk_collection' },
                media: collectedMedia
            };
            renderMedia(wrapper);

            TITLE_CONTAINER.classList.add('multi-select');
            DISPLAY_CONTAINER.querySelectorAll('.overlay').forEach(el => el.classList.add('checked'));
            setSelectedMedia();
        });

        window.addEventListener('message', e => {
            if (e.data && e.data.type === 'IG_DOWNLOADER_EVENT' && e.data.event === 'postLoad') {
                const data = e.data.detail.data;
                const shortcode = e.data.detail.shortcode;
                const views = data.stats.views || 0;
                if (isCollecting) {
                    if (currentReelResolver) currentReelResolver('loaded');

                    if (views >= minViews) {
                        data.media.forEach(m => {
                            if (!collectedIds.has(m.id)) {
                                collectedIds.add(m.id);
                                if (shortcode) collectedShortcodes.add(shortcode);
                                m.caption = data.caption;
                                m.stats = data.stats;
                                m.username = data.user.username;
                                collectedMedia.push(m);
                            }
                        });
                        BULK_BTN.textContent = `Collecting... (${collectedMedia.length})`;
                    }
                }
            }
        });

        function setTheme() {
            const isDarkMode = localStorage.getItem('igt') === null ?
                window.matchMedia('(prefers-color-scheme: dark)').matches :
                localStorage.getItem('igt') === 'dark';
            if (isDarkMode) {
                DISPLAY_CONTAINER.classList.add('dark');
                DISPLAY_CONTAINER.firstElementChild.classList.add('dark');
            }
            else {
                DISPLAY_CONTAINER.classList.remove('dark');
                DISPLAY_CONTAINER.firstElementChild.classList.remove('dark');
            }
            checkBulkVisibility();
        }
        function pauseVideo() {
            if (DISPLAY_CONTAINER.classList.contains('hide')) {
                DISPLAY_CONTAINER.querySelectorAll('video').forEach(video => {
                    video.pause();
                });
            }
        }
        function toggleSelectMode() {
            if (TITLE_CONTAINER.classList.contains('multi-select')) {
                TITLE_CONTAINER.title = 'Hold to select / deselect all';
                DISPLAY_CONTAINER.querySelectorAll('.overlay').forEach(element => {
                    element.classList.add('show');
                });
            }
            else {
                TITLE_CONTAINER.textContent = 'Media';
                TITLE_CONTAINER.title = APP_NAME;
                DISPLAY_CONTAINER.querySelectorAll('.overlay').forEach(element => {
                    element.classList.remove('show');
                });
            }
        }
        function handleSelectAll() {
            if (!TITLE_CONTAINER.classList.contains('multi-select')) return;
            const totalItem = Array.from(DISPLAY_CONTAINER.querySelectorAll('.overlay'));
            const totalItemChecked = Array.from(DISPLAY_CONTAINER.querySelectorAll('.overlay.checked'));
            if (totalItemChecked.length !== totalItem.length) totalItem.forEach(item => {
                if (!item.classList.contains('saved')) item.classList.add('checked');
            });
            else {
                totalItem.forEach(item => { item.classList.remove('checked'); });
            }
        }
        function setSelectedMedia() {
            if (TITLE_CONTAINER.classList.contains('multi-select')) {
                const totalItemsCount = DISPLAY_CONTAINER.querySelectorAll('.overlay').length;
                const selectedItemsCount = DISPLAY_CONTAINER.querySelectorAll('.overlay.checked').length;
                TITLE_CONTAINER.textContent = `Selected ${selectedItemsCount} / ${totalItemsCount}`;
            }
        }
        function hideExtension() {
            DOWNLOAD_BUTTON.setAttribute('hidden', 'true');
            DISPLAY_CONTAINER.classList.add('hide');
            DISPLAY_CONTAINER.setAttribute('style', 'display: none;');
            // Usage requestAnimationFrame to bypass transition attribute
            requestAnimationFrame(() => {
                DISPLAY_CONTAINER.removeAttribute('style');
            });
        }
        function showExtension() {
            DOWNLOAD_BUTTON.removeAttribute('hidden');
        }
        function handleChatTab() {
            const reactRoot = document.body.querySelector('[id]');
            const rootObserver = new MutationObserver(() => {
                const chatTabsRootContent = document.querySelector('[data-pagelet="IGDChatTabsRootContent"]');
                if (!chatTabsRootContent) {
                    return;
                }
                const tabChatWrapper = chatTabsRootContent.querySelector('[data-visualcompletion="ignore"]').childNodes[0];
                if (tabChatWrapper.childNodes.length > 1) {
                    // This tab will show when you click on Message button
                    const actualTabChat = tabChatWrapper.lastChild;
                    // This tab will show when you view someone story and click on avatar on Message button
                    const singleTabChat = actualTabChat.querySelector('[aria-label]');

                    if (actualTabChat.checkVisibility({ checkVisibilityCSS: true }) ||
                        singleTabChat.checkVisibility({ checkVisibilityCSS: true })
                    ) {
                        hideExtension();
                    }
                    else {
                        showExtension();
                    }
                }
                else {
                    showExtension();
                }
            });

            rootObserver.observe(reactRoot, {
                // attributes: true,
                childList: true,
                subtree: true
            });
        }
        const handleTheme = new MutationObserver(setTheme);
        const handleVideo = new MutationObserver(pauseVideo);
        const handleToggleSelectMode = new MutationObserver(toggleSelectMode);
        const handleSelectMedia = new MutationObserver(setSelectedMedia);
        handleTheme.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        handleVideo.observe(DISPLAY_CONTAINER, {
            attributes: true,
            attributeFilter: ['class']
        });
        handleToggleSelectMode.observe(TITLE_CONTAINER, {
            attributes: true,
            attributeFilter: ['class']
        });
        handleSelectMedia.observe(DISPLAY_CONTAINER.querySelector('.media-container'), {
            attributes: true, childList: true, subtree: true
        });
        ESC_BUTTON.addEventListener('click', () => {
            DISPLAY_CONTAINER.classList.add('hide');
        });
        window.addEventListener('keydown', (e) => {
            if (window.location.pathname.startsWith('/direct')) return;
            if (IGNORE_FOCUS_ELEMENTS.includes(e.target.tagName)) return;
            if (e.target.role === 'textbox') return;
            if (e.ctrlKey) return;
            if (DOWNLOAD_EVENT_KEYS.includes(e.key)) {
                return DOWNLOAD_BUTTON.click();
            }
            if (ESC_EVENT_KEYS.includes(e.key)) {
                return ESC_BUTTON.click();
            }
            if (SELECT_EVENT_KEYS.includes(e.key) && !DISPLAY_CONTAINER.classList.contains('hide')) {
                return TITLE_CONTAINER.classList.toggle('multi-select');
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                DISPLAY_CONTAINER.querySelectorAll('video').forEach(video => {
                    video.pause();
                });
            }
        });
        handleLongClick(TITLE_CONTAINER, () => {
            TITLE_CONTAINER.classList.toggle('multi-select');
            toggleSelectMode(); // Ensure UI updates
        }, handleSelectAll);
        DOWNLOAD_BUTTON.addEventListener('click', handleDownload);
        window.addEventListener('online', () => {
            DISPLAY_CONTAINER.querySelectorAll('img , video').forEach(media => {
                media.src = media.src;
            });
        });
        window.addEventListener('pathChange', (e) => {
            const currentPath = e.detail.currentPath;

            checkBulkVisibility();

            // Hide/Show Download button when user navigate
            if (currentPath.startsWith('/direct')) {
                hideExtension();
            }
            // Have to check old path because Instagram now show message button on almost every page.
            else if (e.detail.previousPath.startsWith('/direct')) {
                showExtension();
            }

            // Set z-index to Download button when navigate to downloadable url
            // Download button z-index unset by default to prevent overlay over other element
            if (currentPath.match(IG_POST_REGEX) ||
                currentPath.match(IG_STORY_REGEX) ||
                currentPath.match(IG_HIGHLIGHT_REGEX)
            ) {
                DOWNLOAD_BUTTON.setAttribute('style', 'z-index: 1000000;');
            }
            else {
                DOWNLOAD_BUTTON.removeAttribute('style');
            }
        });
        window.addEventListener('userLoad', e => {
            if (!appCache.userIdsCache.has(e.detail.username)) {
                appCache.userIdsCache.set(e.detail.username, e.detail.id);
            }
        });
        window.addEventListener('postView', e => {
            if (appCache.postIdInfoCache.has(e.detail.id)) return;
            // Check valid shortcode
            if (e.detail.code.startsWith(convertToShortcode(e.detail.id))) {
                appCache.postIdInfoCache.set(e.detail.code, e.detail.id);
            }
        });
        setTheme();
        handleChatTab();
        if (window.location.pathname.startsWith('/direct')) {
            DOWNLOAD_BUTTON.setAttribute('hidden', 'true');
            DISPLAY_CONTAINER.classList.add('hide');
        }
    }
    function run() {
        document.querySelectorAll('.display-container, .download-button').forEach(node => {
            node.remove();
        });
        initUI();
        handleEvents();
    }
    run();
})();