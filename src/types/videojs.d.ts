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

declare module 'video.js' {
    function videojs(
        elementOrId: string | HTMLElement,
        options?: VideoJSOptions,
        readyCallback?: () => void,
    ): VideoJSPlayer;

    namespace videojs {
        function getPlayer(id: string): VideoJSPlayer | null;
        function log(...args): void;
        function getComponent(name: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    export default videojs;

    export type VideoJSPlayer = {
        play: () => Promise<void>;
        pause: () => Promise<void>;
        on: (name: string, callback: (ev: Event) => void) => void;
        off: (name: string, callback: (ev: Event) => void) => void;
        dispose: () => void;
        el: () => HTMLElement;
        fluid: (val?: boolean) => void | boolean;
        isFullscreen: (val?: boolean) => void | boolean;
        videoHeight: () => number;
        videoWidth: () => number;
        currentDimensions: () => { width: number; height: number };
        dimension: (dimension: string, value: number) => void;
    };

    export type VideoJSOptions = {
        'aspectRatio'?: string;
        'audioOnlyMode'?: boolean;
        'audioPosterMode'?: boolean;
        'autoplay'?: boolean | string;
        'autoSetup'?: boolean;
        'base'?: string;
        'breakpoints'?: Record<string, number>;
        'children'?: string[] | Record<string, Record<string, unknown>>;
        'controlBar'?: {
            fullscreenToggle?: boolean;
            pictureInPictureToggle?: boolean;
            remainingTimeDisplay?: {
                displayNegative?: boolean;
            };
        };
        'controls'?: boolean;
        'fluid'?: boolean;
        'fullscreen'?: {
            options?: Record<string, unknown>;
        };
        'height'?: string | number;
        'id'?: string;
        'inactivityTimeout'?: number;
        'language'?: string;
        'languages'?: Record<string, Record<string, string>>;
        'liveui'?: boolean;
        'liveTracker'?: {
            trackingThreshold?: number;
            liveTolerance?: number;
        };
        'loop'?: boolean;
        'muted'?: boolean;
        'nativeControlsForTouch'?: boolean;
        'normalizeAutoplay'?: boolean;
        'notSupportedMessage'?: string;
        'noUITitleAttributes'?: boolean;
        'playbackRates'?: number[];
        'plugins'?: Record<string, Record<string, unknown>>;
        'poster'?: string;
        'preferFullWindow'?: boolean;
        'preload'?: PreloadOption;
        'responsive'?: boolean;
        'restoreEl'?: boolean | HTMLElement;
        'source'?: TechSourceObject;
        'sources'?: TechSourceObject[];
        'src'?: string;
        'suppressNotSupportedError'?: boolean;
        'tag'?: HTMLElement;
        'techCanOverridePoster'?: boolean;
        'techOrder'?: string[];
        'userActions'?: {
            click?: boolean | ((ev: MouseEvent) => void);
            doubleClick?: boolean | ((ev: MouseEvent) => void);
            hotkeys?: boolean | ((ev: KeyboardEvent) => void) | {
                fullscreenKey?: (ev: KeyboardEvent) => void;
                muteKey?: (ev: KeyboardEvent) => void;
                playPauseKey?: (ev: KeyboardEvent) => void;
            };
        };
        'vtt.js'?: string;
        'width'?: string | number;
    };

    export type TechSourceObject = {
        src: string; // Source URL.
        type: string; // Mimetype.
    };

    export type PreloadOption = '' | 'none' | 'metadata' | 'auto';
}
