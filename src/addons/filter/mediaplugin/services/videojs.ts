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
import { CorePromisedValue } from '@classes/promised-value';
import { CoreExternalContentDirective } from '@directives/external-content';
import { CoreLang } from '@services/lang';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrl } from '@singletons/url';
import { makeSingleton } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreEvents } from '@singletons/events';
import type videojs from 'video.js';

// eslint-disable-next-line no-duplicate-imports
import type { VideoJSOptions, VideoJSPlayer } from 'video.js';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [VIDEO_JS_PLAYER_CREATED]: CoreEventJSVideoPlayerCreated;
    }

}

export const VIDEO_JS_PLAYER_CREATED = 'video_js_player_created';

/**
 * Wrapper encapsulating videojs functionality.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMediaPluginVideoJSService {

    protected videojs?: CorePromisedValue<typeof videojs>;

    /**
     * Create a VideoJS player.
     *
     * @param element Media element.
     */
    async createPlayer(element: HTMLVideoElement | HTMLAudioElement): Promise<void> {
        // Wait for external-content to finish in the element and its sources.
        await Promise.all([
            CoreDirectivesRegistry.waitDirectivesReady(element, undefined, CoreExternalContentDirective),
            CoreDirectivesRegistry.waitDirectivesReady(element, 'source', CoreExternalContentDirective),
        ]);

        // Create player.
        const videojs = await this.getVideoJS();
        const dataSetupString = element.getAttribute('data-setup') || element.getAttribute('data-setup-lazy') || '{}';
        const data = CoreTextUtils.parseJSON<VideoJSOptions>(dataSetupString, {});
        const player = videojs(
            element,
            {
                controls: true,
                techOrder: ['OgvJS'],
                language: await CoreLang.getCurrentLanguage(),
                controlBar: { pictureInPictureToggle: false },
                aspectRatio: data.aspectRatio,
            },
            () => element.tagName === 'VIDEO' && this.fixVideoJSPlayerSize(player),
        );

        CoreEvents.trigger(VIDEO_JS_PLAYER_CREATED, {
            element,
            player,
        });
    }

    /**
     * Find a VideoJS player by id.
     *
     * @param id Element id.
     * @returns VideoJS player.
     */
    async findPlayer(id: string): Promise<VideoJSPlayer | null> {
        const videojs = await this.getVideoJS();

        return videojs.getPlayer(id);
    }

    /**
     * Treat Video JS Youtube video links and translate them to iframes.
     *
     * @param video Video element.
     */
    treatYoutubeVideos(video: HTMLElement): void {
        if (!video.classList.contains('video-js')) {
            return;
        }

        const dataSetupString = video.getAttribute('data-setup') || video.getAttribute('data-setup-lazy') || '{}';
        const data = CoreTextUtils.parseJSON<VideoJSOptions>(dataSetupString, {});
        const youtubeUrl = data.techOrder?.[0] == 'youtube' && CoreUrl.getYoutubeEmbedUrl(data.sources?.[0]?.src);

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

    /**
     * Gets videojs instance.
     *
     * @returns VideoJS.
     */
    protected async getVideoJS(): Promise<typeof videojs> {
        if (!this.videojs) {
            this.videojs = new CorePromisedValue();

            // Inject CSS.
            const link = document.createElement('link');

            link.rel = 'stylesheet';
            link.href = 'assets/lib/video.js/video-js.min.css';

            document.head.appendChild(link);

            // Load library.
            return import('@addons/filter/mediaplugin/utils/videojs').then(({ initializeVideoJSOgvJS, videojs }) => {
                initializeVideoJSOgvJS();

                this.videojs?.resolve(videojs);

                return videojs;
            });
        }

        return this.videojs;
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
        const offsetParentWidth = player.el().offsetParent?.clientWidth;

        if (offsetParentWidth && playerDimensions.width > offsetParentWidth) {
            // The player is bigger than the container. Resize it.
            player.dimension('width', offsetParentWidth);
            playerDimensions.width = offsetParentWidth;
        }

        if (!videoWidth || !videoHeight || !playerDimensions.width || videoWidth === playerDimensions.width) {
            return;
        }

        const candidateHeight = playerDimensions.width * videoHeight / videoWidth;
        if (!playerDimensions.height || Math.abs(candidateHeight - playerDimensions.height) > 1) {
            player.dimension('height', candidateHeight);
        }
    }

}

export const AddonFilterMediaPluginVideoJS = makeSingleton(AddonFilterMediaPluginVideoJSService);

/**
 * Data passed to VIDEO_JS_PLAYER_CREATED event.
 */
export type CoreEventJSVideoPlayerCreated = {
    element: HTMLAudioElement | HTMLVideoElement;
    player: VideoJSPlayer;
};
