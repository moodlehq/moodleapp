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

/**
 * Wrapper class to control the interactivity of a media element.
 */
export class MediaElementController extends ElementController {

    private media: HTMLMediaElement;
    private autoplay: boolean;
    private playing?: boolean;
    private playListener?: () => void;
    private pauseListener?: () => void;

    constructor(media: HTMLMediaElement, enabled: boolean) {
        super(enabled);

        this.media = media;
        this.autoplay = media.autoplay;

        media.autoplay = false;

        enabled && this.onEnabled();
    }

    /**
     * @inheritdoc
     */
    onEnabled(): void {
        const ready = this.playing ?? this.autoplay
            ? this.media.play()
            : Promise.resolve();

        ready
            .then(() => this.addPlaybackEventListeners())
            .catch(error => CoreUtils.logUnhandledError('Error enabling media element', error));
    }

    /**
     * @inheritdoc
     */
    async onDisabled(): Promise<void> {
        this.removePlaybackEventListeners();

        this.media.pause();
    }

    /**
     * Start listening playback events.
     */
    private addPlaybackEventListeners(): void {
        this.media.addEventListener('play', this.playListener = () => this.playing = true);
        this.media.addEventListener('pause', this.pauseListener = () => this.playing = false);
    }

    /**
     * Stop listening playback events.
     */
    private removePlaybackEventListeners(): void {
        this.playListener && this.media.removeEventListener('play', this.playListener);
        this.pauseListener && this.media.removeEventListener('pause', this.pauseListener);

        delete this.playListener;
        delete this.pauseListener;
    }

}
