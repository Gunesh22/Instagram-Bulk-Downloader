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
        let autoScrollInterval = null;

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


        BULK_BTN.addEventListener('click', async () => {
            isCollecting = !isCollecting;
            if (isCollecting) {
                BULK_BTN.textContent = 'Loading...';
                BULK_BTN.style.background = '#ed4956';
                BULK_DL_BTN.style.display = 'none';
                collectedMedia = [];
                collectedIds.clear();
                let captionsText = '';

                // Step 1: Scroll to load all reels
                BULK_BTN.textContent = 'Scrolling to load all reels...';
                let lastHeight = 0;
                let scrollAttempts = 0;
                const maxScrollAttempts = 50; // Prevent infinite loop

                while (scrollAttempts < maxScrollAttempts && isCollecting) {
                    window.scrollTo(0, document.body.scrollHeight);
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const currentHeight = document.body.scrollHeight;
                    if (currentHeight === lastHeight) {
                        break; // Reached bottom
                    }
                    lastHeight = currentHeight;
                    scrollAttempts++;
                    BULK_BTN.textContent = `Loading reels... (scroll ${scrollAttempts})`;
                }

                // Scroll back to top
                window.scrollTo(0, 0);
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Step 2: Find all reel links
                let reelLinks = Array.from(document.querySelectorAll('a[href*="/reel/"]'))
                    .filter(link => link.href.match(/\/reel\/[A-Za-z0-9_-]+/));

                // Apply max posts limit
                const maxPosts = parseInt(MAX_POSTS_INPUT.value) || reelLinks.length;
                reelLinks = reelLinks.slice(0, maxPosts);

                BULK_BTN.textContent = `Found ${reelLinks.length} reels. Processing...`;

                // Step 3: Process each reel
                for (let i = 0; i < reelLinks.length && isCollecting; i++) {
                    try {
                        // Click to open
                        reelLinks[i].click();

                        // Wait for data
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Close modal
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

                        await new Promise(resolve => setTimeout(resolve, 800));

                        BULK_BTN.textContent = `${i + 1}/${reelLinks.length} | Collected: ${collectedMedia.length}`;
                    } catch (err) {
                        console.error('Error:', err);
                    }
                }

                // Step 4: Auto-download and create captions file
                if (isCollecting && collectedMedia.length > 0) {
                    // Build captions text
                    collectedMedia.forEach((item, index) => {
                        captionsText += `[${index + 1}] ${item.username || 'Unknown'} - ${item.stats?.views || 0} views\n`;
                        captionsText += `${item.caption || 'No caption'}\n`;
                        captionsText += `${'='.repeat(80)}\n\n`;
                    });

                    // Download captions file
                    const captionsBlob = new Blob([captionsText], { type: 'text/plain' });
                    const captionsUrl = URL.createObjectURL(captionsBlob);
                    const captionsLink = document.createElement('a');
                    captionsLink.href = captionsUrl;
                    captionsLink.download = `captions_${Date.now()}.txt`;
                    captionsLink.click();
                    URL.revokeObjectURL(captionsUrl);

                    // Auto-download videos
                    BULK_BTN.textContent = `Downloading ${collectedMedia.length} reels...`;

                    for (let i = 0; i < collectedMedia.length; i++) {
                        const item = collectedMedia[i];
                        try {
                            const response = await fetch(item.url);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${item.username}_${item.id}_${item.stats?.views || 0}views.mp4`;
                            a.click();
                            URL.revokeObjectURL(url);

                            BULK_BTN.textContent = `Downloaded ${i + 1}/${collectedMedia.length}`;
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (err) {
                            console.error('Download error:', err);
                        }
                    }
                }

                // Done
                isCollecting = false;
                BULK_BTN.textContent = 'Start Collect';
                BULK_BTN.style.background = '#0095f6';
                BULK_DL_BTN.style.display = 'block';
                BULK_COUNT.textContent = collectedMedia.length;
            } else {
                BULK_BTN.textContent = 'Start Collect';
                BULK_BTN.style.background = '#0095f6';
                BULK_DL_BTN.style.display = 'block';
                BULK_COUNT.textContent = collectedMedia.length;
            }
        });

        BULK_DL_BTN.addEventListener('click', () => {
            if (collectedMedia.length === 0) return;
            // Render collected media
            // Create a fake data object wrapper
            const wrapper = {
                date: Date.now() / 1000,
                user: { username: collectedMedia[0].username || 'bulk_collection' },
                media: collectedMedia
            };
            renderMedia(wrapper);

            // Select All
            TITLE_CONTAINER.classList.add('multi-select');
            DISPLAY_CONTAINER.querySelectorAll('.overlay').forEach(el => el.classList.add('checked'));
            setSelectedMedia();
        });

        window.addEventListener('message', e => {
            if (e.data && e.data.type === 'IG_DOWNLOADER_EVENT' && e.data.event === 'postLoad') {
                const data = e.data.detail.data;
                const views = data.stats.views || 0;
                if (isCollecting) {
                    if (views >= minViews) {
                        data.media.forEach(m => {
                            if (!collectedIds.has(m.id)) {
                                collectedIds.add(m.id);
                                // Attach metadata
                                m.caption = data.caption;
                                m.stats = data.stats;
                                m.username = data.user.username; // keep username
                                collectedMedia.push(m);
                            }
                        });
                        BULK_BTN.textContent = `Collecting... (${collectedMedia.length})`;
                    }
                }
            }
        });

        // Show Bulk UI only on Profiles (approx check) or always allow?
        // Let's allow always, but logically works best on feed/profile.
        // We can check if it's a profile page to verify validity? 
        // For now, toggle visibility based on path could be added to pathChange listener.

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