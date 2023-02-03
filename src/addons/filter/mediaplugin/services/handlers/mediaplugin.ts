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
import { CoreExternalContentDirective } from '@directives/external-content';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreLang } from '@services/lang';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
import { makeSingleton } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreEvents } from '@singletons/events';
import { CoreMedia } from '@singletons/media';
import videojs, { VideoJSOptions, VideoJSPlayer } from 'video.js';

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
    filter(
        text: string,
    ): string | Promise<string> {
        this.template.innerHTML = text;

        const videos = Array.from(this.template.content.querySelectorAll('video'));

        videos.forEach((video) => {
            this.treatYoutubeVideos(video);
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
                this.useVideoJS(mediaElement);
            } else {
                // Remove the VideoJS classes and data if present.
                mediaElement.classList.remove('video-js');
                mediaElement.removeAttribute('data-setup');
                mediaElement.removeAttribute('data-setup-lazy');
            }
        });
    }

    /**
     * Use video JS in a certain video or audio.
     *
     * @param mediaElement Media element.
     */
    protected async useVideoJS(mediaElement: HTMLVideoElement | HTMLAudioElement): Promise<void> {
        const lang = await CoreLang.getCurrentLanguage();

        // Wait for external-content to finish in the element and its sources.
        await Promise.all([
            CoreDirectivesRegistry.waitDirectivesReady(mediaElement, undefined, CoreExternalContentDirective),
            CoreDirectivesRegistry.waitDirectivesReady(mediaElement, 'source', CoreExternalContentDirective),
        ]);

        const dataSetupString = mediaElement.getAttribute('data-setup') || mediaElement.getAttribute('data-setup-lazy') || '{}';
        const data = CoreTextUtils.parseJSON<VideoJSOptions>(dataSetupString, {});

        const player = videojs(mediaElement, {
            controls: true,
            techOrder: ['OgvJS'],
            language: lang,
            controlBar: {
                pictureInPictureToggle: false,
            },
            aspectRatio: data.aspectRatio,
        }, () => {
            if (mediaElement.tagName === 'VIDEO') {
                this.fixVideoJSPlayerSize(player);
            }
        });

        CoreEvents.trigger(CoreEvents.JS_PLAYER_CREATED, {
            id: mediaElement.id,
            element: mediaElement,
            player,
        });
    }

    /**
     * Fix VideoJS player size.
     * If video width is wider than available width, video is cut off. Fix the dimensions in this case.
     *
     * @param player Player instance.
     */
    protected fixVideoJSPlayerSize(player: VideoJSPlayer): void {
        const videoWidth = player.videoWidth();
        const videoHeight = player.videoHeight();
        const playerDimensions = player.currentDimensions();
        if (!videoWidth || !videoHeight || !playerDimensions.width || videoWidth === playerDimensions.width) {
            return;
        }

        const candidateHeight = playerDimensions.width * videoHeight / videoWidth;
        if (!playerDimensions.height || Math.abs(candidateHeight - playerDimensions.height) > 1) {
            player.dimension('height', candidateHeight);
        }
    }

    /**
     * Treat Video JS Youtube video links and translate them to iframes.
     *
     * @param video Video element.
     */
    protected treatYoutubeVideos(video: HTMLElement): void {
        if (!video.classList.contains('video-js')) {
            return;
        }

        const dataSetupString = video.getAttribute('data-setup') || video.getAttribute('data-setup-lazy') || '{}';
        const data = CoreTextUtils.parseJSON<VideoJSOptions>(dataSetupString, {});
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
