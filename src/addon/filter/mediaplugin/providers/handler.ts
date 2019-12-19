
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

    protected template = document.createElement('template'); // A template element to convert HTML to element.

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

        this.template.innerHTML = text;

        const videos = Array.from(this.template.content.querySelectorAll('video'));

        videos.forEach((video) => {
            this.treatVideoFilters(video);
        });

        return this.template.innerHTML;
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
            youtubeUrl = data.techOrder && data.techOrder[0] && data.techOrder[0] == 'youtube' &&
                    this.urlUtils.getYoutubeEmbedUrl(data.sources && data.sources[0] && data.sources[0].src);

        if (!youtubeUrl) {
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.id = video.id;
        iframe.src = youtubeUrl;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '1');
        iframe.width = '100%';
        iframe.height = '300';

        // Replace video tag by the iframe.
        video.parentNode.replaceChild(iframe, video);
    }
}
