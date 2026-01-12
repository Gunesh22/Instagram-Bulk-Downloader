/**
 * Enable this file will cause Initiator only show this file send request.
 * Only turn on this file to testing.
 * This file is not include in manifest so it not run.
 * If this file run, every network call with XHR will be tracked.
 * So you don't need to call api to get data, just cacth the response somewhere.
 */

((xhr) => {
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    const setRequestHeader = XHR.setRequestHeader;
    const urlPatterns = [
        /graphql\/query/,
        /api\/v1\//
    ];
    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = (new Date()).toISOString();
        return open.apply(this, arguments);
    };
    XHR.setRequestHeader = function (header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };
    XHR.send = function (postData) {
        this.addEventListener('load', () => {
            const url = this._url ? this._url.toLowerCase() : this._url;
            const match = urlPatterns.some(pattern => pattern.test(url));
            if (!match) return;
            window.dispatchEvent(new CustomEvent('apiCall', {
                detail: {
                    body: postData,
                    request: this
                }
            }));
        });
        return send.apply(this, arguments);
    };

})(XMLHttpRequest);

window.addEventListener('apiCall', e => {
    const dispatch = (name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
        window.postMessage({ type: 'IG_DOWNLOADER_EVENT', event: name, detail }, '*');
    };

    if (e.detail.request._url.match(/api\/v1\/media\/\d*\/info\//)) {
        const response = JSON.parse(e.detail.request.response);
        const edges = response.items[0];
        const data = {
            date: '',
            user: {
                username: edges.user['username'],
                fullName: edges.user['full_name'],
            },
            media: [],
            caption: edges.caption ? edges.caption.text : '',
            stats: {
                views: edges.view_count || edges.play_count || 0,
                likes: edges.like_count || 0
            }
        };
        data.date = edges['taken_at'];
        if (edges['carousel_media']) {
            edges['carousel_media'].forEach((item) => {
                const media = {
                    url: item['media_type'] === 1 ? item['image_versions2'].candidates[0]['url'] : item['video_versions'][0].url,
                    isVideo: item['media_type'] === 1 ? false : true,
                    id: item.id.split('_')[0],
                    thumbnail: item['image_versions2'].candidates[0]['url']
                };
                data.media.push(media);
            });
        }
        else {
            const media = {
                url: edges['media_type'] === 1 ? edges['image_versions2'].candidates[0]['url'] : edges['video_versions'][0].url,
                isVideo: edges['media_type'] === 1 ? false : true,
                id: edges.id.split('_')[0],
                thumbnail: edges['image_versions2'].candidates[0]['url']
            };
            data.media.push(media);
        }
        dispatch('postLoad', {
            shortcode: edges.code,
            data: data
        });
    }

    const searchParams = new URLSearchParams(e.detail.body);
    const fbApiReqFriendlyName = searchParams.get('fb_api_req_friendly_name');

    if (fbApiReqFriendlyName === 'PolarisStoriesV3ReelPageGalleryQuery'
        || fbApiReqFriendlyName === 'PolarisStoriesV3ReelPageGalleryPaginationQuery'
    ) {
        const response = JSON.parse(e.detail.request.response);
        const nodes = response.data['xdt_api__v1__feed__reels_media__connection'].edges;
        nodes.forEach(node => {
            const item = node.node.items[0];
            const data = {
                date: item.taken_at,
                user: {
                    username: node.node.user.username,
                    fullName: '',
                },
                media: [],
                caption: item.caption ? item.caption.text : '',
                stats: {
                    views: item.view_count || item.play_count || 0,
                    likes: item.like_count || 0
                }
            };
            node.node.items.forEach(item => {
                const media = {
                    url: item['media_type'] === 1 ? item['image_versions2'].candidates[0]['url'] : item['video_versions'][0].url,
                    isVideo: item['media_type'] === 1 ? false : true,
                    id: item.id.split('_')[0],
                    thumbnail: item['image_versions2'].candidates[0]['url']
                };
                data.media.push(media);
            });
            dispatch('storiesLoad', data);
            dispatch('userLoad', {
                username: node.node.user.username,
                id: node.node.user.pk
            });
        });
    }

    // Handle Profile Feed (Bulk Source)
    // Handle Profile Feed (Bulk Source)
    // We check for various friendly names or just generic structure matching
    if (fbApiReqFriendlyName && (
        fbApiReqFriendlyName.includes('ProfilePosts') ||
        fbApiReqFriendlyName.includes('ProfileReels') ||
        fbApiReqFriendlyName.includes('UserReels') ||
        fbApiReqFriendlyName.includes('Timeline')
    )) {
        const response = JSON.parse(e.detail.request.response);
        let edges = [];

        // 1. New API: User Timeline
        if (response.data?.xdt_api__v1__feed__user_timeline_graphql_connection) {
            edges = response.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges;
        }
        // 2. New API: User Reels
        else if (response.data?.xdt_api__v1__feed__user_reels_media_connection) {
            edges = response.data.xdt_api__v1__feed__user_reels_media_connection.edges;
        }
        // 3. Classic API: Grid (edge_owner_to_timeline_media)
        else if (response.data?.user?.edge_owner_to_timeline_media) {
            edges = response.data.user.edge_owner_to_timeline_media.edges;
        }
        // 4. Classic API: Reels (edge_felix_video_timeline)
        else if (response.data?.user?.edge_felix_video_timeline) {
            edges = response.data.user.edge_felix_video_timeline.edges;
        }

        // 5. REST API: Generic Items (e.g. /api/v1/feed/...)
        else if (response.items) {
            edges = response.items;
        }

        // Safety check if edges is still empty/undefined
        if (!edges) edges = [];

        edges.forEach(edge => {
            const node = edge.node || edge; // Handle both GraphQL (connected) and REST (array of objects)
            if (!node) return; // Safety

            const data = {
                date: node.taken_at,
                user: {
                    username: node.user ? node.user.username : '',
                    fullName: node.user ? node.user.full_name : ''
                },
                media: [],
                caption: node.caption ? node.caption.text : '',
                stats: {
                    views: node.view_count || node.play_count || 0,
                    likes: node.like_count || 0
                }
            };

            const mediaItems = node.carousel_media || [node];

            mediaItems.forEach(item => {
                const media = {
                    url: item.video_versions ? item.video_versions[0].url : (item.image_versions2 ? item.image_versions2.candidates[0].url : ''),
                    isVideo: !!item.video_versions,
                    id: item.id.split('_')[0],
                    thumbnail: item.image_versions2 ? item.image_versions2.candidates[0].url : ''
                };
                if (media.url) data.media.push(media);
            });

            dispatch('postLoad', {
                shortcode: node.code,
                data: data
            });
        });
    }

    if (fbApiReqFriendlyName === 'PolarisStoriesV3ReelPageStandaloneDirectQuery') {
        const response = JSON.parse(e.detail.request.response);
        const nodes = response.data['xdt_api__v1__feed__reels_media']['reels_media'];
        nodes.forEach(node => {
            const item = node.items[0];
            const data = {
                date: item.taken_at,
                user: {
                    username: node.user.username,
                    fullName: '',
                },
                media: [],
                caption: item.caption ? item.caption.text : '',
                stats: {
                    views: item.view_count || item.play_count || 0,
                    likes: item.like_count || 0
                }
            };
            node.items.forEach(item => {
                const media = {
                    url: item['media_type'] === 1 ? item['image_versions2'].candidates[0]['url'] : item['video_versions'][0].url,
                    isVideo: item['media_type'] === 1 ? false : true,
                    id: item.id.split('_')[0],
                    thumbnail: item['image_versions2'].candidates[0]['url']
                };
                data.media.push(media);
            });
            dispatch('storiesLoad', data);
            dispatch('userLoad', {
                username: node.user.username,
                id: node.user.pk
            });
        });
    }
    if (fbApiReqFriendlyName === 'PolarisStoriesV3HighlightsPageQuery') {
        const response = JSON.parse(e.detail.request.response);
        const nodes = response.data['xdt_api__v1__feed__reels_media__connection'].edges;
        nodes.forEach(node => {
            const item = node.node.items[0];
            const data = {
                date: item.taken_at,
                user: {
                    username: node.node.user.username,
                    fullName: '',
                },
                media: [],
                caption: item.caption ? item.caption.text : '',
                stats: {
                    views: item.view_count || item.play_count || 0,
                    likes: item.like_count || 0
                }
            };
            node.node.items.forEach(item => {
                const media = {
                    url: item['media_type'] === 1 ? item['image_versions2'].candidates[0]['url'] : item['video_versions'][0].url,
                    isVideo: item['media_type'] === 1 ? false : true,
                    id: item.id.split('_')[0],
                    thumbnail: item['image_versions2'].candidates[0]['url']
                };
                data.media.push(media);
            });
            dispatch('highlightsLoad', {
                id: node.node.id.split(':')[1],
                data: data
            });
        });
    }
});