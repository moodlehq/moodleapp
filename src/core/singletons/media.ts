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

import { CorePlatform } from '@services/platform';
import { CoreMimetypeUtils } from '@services/utils/mimetype';

/**
 * Singleton with helper functions for media.
 */
export class CoreMedia {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Get all source URLs and types for a video or audio.
     *
     * @param mediaElement Audio or video element.
     * @returns List of sources.
     */
    static getMediaSources(mediaElement: HTMLVideoElement | HTMLAudioElement): CoreMediaSource[] {
        const sources = Array.from(mediaElement.querySelectorAll('source')).map(source => ({
            src: source.src || source.getAttribute('target-src') || '',
            type: source.type,
        }));

        if (mediaElement.src) {
            sources.push({
                src: mediaElement.src,
                type: '',
            });
        }

        return sources;
    }

    /**
     * Check if a source needs to be converted to be able to reproduce it.
     *
     * @param source Source.
     * @returns Whether needs conversion.
     */
    static sourceNeedsConversion(source: CoreMediaSource): boolean {
        if (!CorePlatform.isMobile()) {
            return false;
        }

        let extension = source.type ? CoreMimetypeUtils.getExtension(source.type) : undefined;
        if (!extension) {
            extension = CoreMimetypeUtils.guessExtensionFromUrl(source.src);
        }

        return !!extension && ['ogv', 'webm', 'oga', 'ogg'].includes(extension);
    }

    /**
     * Check if JS player should be used for a certain source.
     *
     * @param source Source.
     * @returns Whether JS player should be used.
     */
    static sourceUsesJavascriptPlayer(source: CoreMediaSource): boolean {
        // For now, only use JS player if the source needs to be converted.
        return CoreMedia.sourceNeedsConversion(source);
    }

    /**
     * Check if JS player should be used for a certain audio or video.
     *
     * @param mediaElement Media element.
     * @returns Whether JS player should be used.
     */
    static mediaUsesJavascriptPlayer(mediaElement: HTMLVideoElement | HTMLAudioElement): boolean {
        if (!CorePlatform.isMobile()) {
            return false;
        }

        const sources = CoreMedia.getMediaSources(mediaElement);

        return sources.some(source => CoreMedia.sourceUsesJavascriptPlayer(source));
    }

    /**
     * Check if the browser supports mediaDevices.getUserMedia.
     *
     * @returns Whether the function is supported.
     */
    static canGetUserMedia(): boolean {
        return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if the browser supports MediaRecorder.
     *
     * @returns Whether the function is supported.
     */
    static canRecordMedia(): boolean {
        return !!window.MediaRecorder;
    }

}

/**
 * Source of a media element.
 */
export type CoreMediaSource = {
    src: string;
    type?: string;
};
