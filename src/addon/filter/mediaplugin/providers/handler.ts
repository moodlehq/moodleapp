
// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { CoreFilterDefaultHandler } from '@core/filter/providers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@core/filter/providers/filter';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';

/**
 * Handler to support the Multimedia filter.
 */
@Injectable()
export class AddonFilterMediaPluginHandler extends CoreFilterDefaultHandler {
    name = 'AddonFilterMediaPluginHandler';
    filterName = 'mediaplugin';

    constructor(private textUtils: CoreTextUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider) {
        super();
    }

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, siteId?: string)
            : string | Promise<string> {

        const div = document.createElement('div');
        div.innerHTML = text;

        const videos = Array.from(div.querySelectorAll('video'));

        videos.forEach((video) => {
            this.treatVideoFilters(video);
        });

        return div.innerHTML;
    }

    /**
     * Treat video filters. Currently only treating youtube video using video JS.
     *
     * @param el Video element.
     * @param navCtrl NavController to use.
     */
    protected treatVideoFilters(video: HTMLElement): void {
        // Treat Video JS Youtube video links and translate them to iframes.
        if (!video.classList.contains('video-js')) {
            return;
        }

        const data = this.textUtils.parseJSON(video.getAttribute('data-setup') || video.getAttribute('data-setup-lazy') || '{}'),
            youtubeData = data.techOrder && data.techOrder[0] && data.techOrder[0] == 'youtube' &&
                    this.parseYoutubeUrl(data.sources && data.sources[0] && data.sources[0].src);

        if (!youtubeData || !youtubeData.videoId) {
            return;
        }

        const iframe = document.createElement('iframe'),
            params: any = {};

        if (youtubeData.listId !== null) {
            params.list = youtubeData.listId;
        }
        if (youtubeData.start !== null) {
            params.start = youtubeData.start;
        }

        iframe.id = video.id;
        iframe.src = this.urlUtils.addParamsToUrl('https://www.youtube.com/embed/' + youtubeData.videoId, params);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '1');
        iframe.width = '100%';
        iframe.height = '300';

        // Replace video tag by the iframe.
        video.parentNode.replaceChild(iframe, video);
    }

    /**
     * Parse a YouTube URL.
     * Based on Youtube.parseUrl from Moodle media/player/videojs/amd/src/Youtube-lazy.js
     *
     * @param url URL of the video.
     * @return Data of the video.
     */
    protected parseYoutubeUrl(url: string): {videoId: string, listId?: string, start?: number} {
        const result = {
            videoId: null,
            listId: null,
            start: null
        };

        if (!url) {
            return result;
        }

        url = this.textUtils.decodeHTML(url);

        // Get the video ID.
        let match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);

        if (match && match[2].length === 11) {
            result.videoId = match[2];
        }

        // Now get the playlist (if any).
        match = url.match(/[?&]list=([^#\&\?]+)/);

        if (match && match[1]) {
            result.listId = match[1];
        }

        // Now get the start time (if any).
        match = url.match(/[?&]start=(\d+)/);

        if (match && match[1]) {
            result.start = parseInt(match[1], 10);
        } else {
            // No start param, but it could have a time param.
            match = url.match(/[?&]t=(\d+h)?(\d+m)?(\d+s)?/);
            if (match) {
                result.start = (match[1] ? parseInt(match[1], 10) * 3600 : 0) + (match[2] ? parseInt(match[2], 10) * 60 : 0) +
                        (match[3] ? parseInt(match[3], 10) : 0);
            }
        }

        return result;
    }
}
