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

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
import { makeSingleton } from '@singletons';

/**
 * Handler to support the Multimedia filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMediaPluginHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMediaPluginHandler';
    filterName = 'mediaplugin';

    protected template = document.createElement('template'); // A template element to convert HTML to element.

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(
        text: string,
        filter: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): string | Promise<string> {
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
     */
    protected treatVideoFilters(video: HTMLElement): void {
        // Treat Video JS Youtube video links and translate them to iframes.
        if (!video.classList.contains('video-js')) {
            return;
        }

        const dataSetupString = video.getAttribute('data-setup') || video.getAttribute('data-setup-lazy') || '{}';
        const data = <VideoDataSetup> CoreTextUtils.parseJSON(dataSetupString, {});
        const youtubeUrl = data.techOrder?.[0] == 'youtube' && CoreUrlUtils.getYoutubeEmbedUrl(data.sources?.[0]?.src);

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
        video.parentNode?.replaceChild(iframe, video);
    }

}

export const AddonFilterMediaPluginHandler = makeSingleton(AddonFilterMediaPluginHandlerService);

type VideoDataSetup = {
    techOrder?: string[];
    sources?: {
        src?: string;
    }[];
};
