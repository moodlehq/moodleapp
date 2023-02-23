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

import { AddonFilterMediaPluginVideoJS } from '@addons/filter/mediaplugin/services/videojs';
import { Injectable } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { makeSingleton } from '@singletons';
import { CoreMedia } from '@singletons/media';

/**
 * Handler to support the Multimedia filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMediaPluginHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMediaPluginHandler';
    filterName = 'mediaplugin';

    protected template = document.createElement('template'); // A template element to convert HTML to element.

    /**
     * @inheritdoc
     */
    filter(text: string): string | Promise<string> {
        this.template.innerHTML = text;

        const videos = Array.from(this.template.content.querySelectorAll('video'));

        videos.forEach((video) => {
            AddonFilterMediaPluginVideoJS.treatYoutubeVideos(video);
        });

        return this.template.innerHTML;
    }

    /**
     * @inheritdoc
     */
    handleHtml(container: HTMLElement): void {
        const mediaElements = Array.from(container.querySelectorAll<HTMLVideoElement | HTMLAudioElement>('video, audio'));

        mediaElements.forEach((mediaElement) => {
            if (CoreMedia.mediaUsesJavascriptPlayer(mediaElement)) {
                AddonFilterMediaPluginVideoJS.createPlayer(mediaElement);

                return;
            }

            // Remove the VideoJS classes and data if present.
            mediaElement.classList.remove('video-js');
            mediaElement.removeAttribute('data-setup');
            mediaElement.removeAttribute('data-setup-lazy');
        });
    }

}

export const AddonFilterMediaPluginHandler = makeSingleton(AddonFilterMediaPluginHandlerService);
