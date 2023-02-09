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

import { CoreUtils } from '@services/utils/utils';
import { ElementController } from './ElementController';
import videojs, { VideoJSPlayer } from 'video.js';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreMedia } from '@singletons/media';

/**
 * Wrapper class to control the interactivity of a media element.
 */
export class MediaElementController extends ElementController {

    private media: HTMLMediaElement;
    private autoplay: boolean;
    private playing?: boolean;
    private playListener?: () => void;
    private pauseListener?: () => void;
    private jsPlayer = new CorePromisedValue<VideoJSPlayer | null>();
    private jsPlayerListener?: CoreEventObserver;
    private shouldEnable = false;
    private shouldDisable = false;

    constructor(media: HTMLMediaElement, enabled: boolean) {
        super(enabled);

        this.media = media;
        this.autoplay = media.autoplay;

        media.autoplay = false;

        if (CoreMedia.mediaUsesJavascriptPlayer(media)) {
            const player = this.searchJSPlayer();
            if (player) {
                this.jsPlayer.resolve(player);
            } else {
                this.jsPlayerListener = CoreEvents.on(CoreEvents.JS_PLAYER_CREATED, data => {
                    if (data.element === media) {
                        this.jsPlayerListener?.off();
                        this.jsPlayer.resolve(data.player);
                    }
                });
            }
        } else {
            this.jsPlayer.resolve(null);
        }

        enabled && this.onEnabled();
    }

    /**
     * @inheritdoc
     */
    async onEnabled(): Promise<void> {
        this.shouldEnable = true;
        this.shouldDisable = false;

        const jsPlayer = await this.jsPlayer;

        if (!this.shouldEnable || this.destroyed) {
            return;
        }

        const ready = this.playing ?? this.autoplay
            ? (jsPlayer ?? this.media).play()
            : Promise.resolve();

        try {
            await ready;

            this.addPlaybackEventListeners(jsPlayer);
        } catch (error) {
            CoreUtils.logUnhandledError('Error enabling media element', error);
        }
    }

    /**
     * @inheritdoc
     */
    async onDisabled(): Promise<void> {
        this.shouldDisable = true;
        this.shouldEnable = false;

        const jsPlayer = await this.jsPlayer;

        if (!this.shouldDisable || this.destroyed) {
            return;
        }

        this.removePlaybackEventListeners(jsPlayer);

        (jsPlayer ?? this.media).pause();
    }

    /**
     * @inheritdoc
     */
    async onDestroy(): Promise<void> {
        const jsPlayer = await this.jsPlayer;

        this.removePlaybackEventListeners(jsPlayer);
        jsPlayer?.dispose();
    }

    /**
     * Start listening playback events.
     *
     * @param jsPlayer Javascript player instance (if any).
     */
    private addPlaybackEventListeners(jsPlayer: VideoJSPlayer | null): void {
        if (jsPlayer) {
            jsPlayer.on('play', this.playListener = () => this.playing = true);
            jsPlayer.on('pause', this.pauseListener = () => this.playing = false);
        } else {
            this.media.addEventListener('play', this.playListener = () => this.playing = true);
            this.media.addEventListener('pause', this.pauseListener = () => this.playing = false);
        }
    }

    /**
     * Stop listening playback events.
     *
     * @param jsPlayer Javascript player instance (if any).
     */
    private removePlaybackEventListeners(jsPlayer: VideoJSPlayer | null): void {
        if (jsPlayer) {
            this.playListener && jsPlayer.off('play', this.playListener);
            this.pauseListener && jsPlayer.off('pause', this.pauseListener);
        } else {
            this.playListener && this.media.removeEventListener('play', this.playListener);
            this.pauseListener && this.media.removeEventListener('pause', this.pauseListener);
        }

        delete this.playListener;
        delete this.pauseListener;
    }

    /**
     * Search JS player instance.
     *
     * @returns Player instance if found.
     */
    private searchJSPlayer(): VideoJSPlayer | null {
        return videojs.getPlayer(this.media.id) || videojs.getPlayer(this.media.id.replace('_html5_api', ''));
    }

}
