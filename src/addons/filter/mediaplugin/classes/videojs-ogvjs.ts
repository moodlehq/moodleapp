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
import { OGVPlayer, OGVCompat, OGVLoader } from 'ogv';
import videojs, { PreloadOption, TechSourceObject, VideoJSOptions } from 'video.js';

const Tech = videojs.getComponent('Tech');

/**
 * Object.defineProperty but "lazy", which means that the value is only set after
 * it retrieved the first time, rather than being set right away.
 *
 * @param obj The object to set the property on.
 * @param key The key for the property to set.
 * @param getValue The function used to get the value when it is needed.
 * @param setter Whether a setter should be allowed or not.
 * @returns Object.
 */
const defineLazyProperty = <T>(obj: T, key: string, getValue: () => unknown, setter = true): T => {
    const set = (value: unknown): void => {
        Object.defineProperty(obj, key, { value, enumerable: true, writable: true });
    };

    const options: PropertyDescriptor = {
        configurable: true,
        enumerable: true,
        get() {
            const value = getValue();

            set(value);

            return value;
        },
    };

    if (setter) {
        options.set = set;
    }

    return Object.defineProperty(obj, key, options);
};

/**
 * OgvJS Media Controller for VideoJS - Wrapper for ogv.js Media API.
 *
 * Code adapted from https://github.com/HuongNV13/videojs-ogvjs/blob/f9b12bd53018d967bb305f02725834a98f20f61f/src/plugin.js
 * Modified in the following ways:
 * - Adapted to Typescript.
 * - Use our own functions to detect the platform instead of using getDeviceOS.
 * - Add an initialize static function.
 * - In the play function, reset the media if it already ended to fix problems with replaying media.
 * - Allow full screen in iOS devices, and implement enterFullScreen and exitFullScreen to use a fake full screen.
 */
export class VideoJSOgvJS extends Tech {

    /**
     * List of available events of the media player.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly Events = [
        'loadstart',
        'suspend',
        'abort',
        'error',
        'emptied',
        'stalled',
        'loadedmetadata',
        'loadeddata',
        'canplay',
        'canplaythrough',
        'playing',
        'waiting',
        'seeking',
        'seeked',
        'ended',
        'durationchange',
        'timeupdate',
        'progress',
        'play',
        'pause',
        'ratechange',
        'resize',
        'volumechange',
    ];

    protected playerId?: string;
    protected parentElement: HTMLElement | null = null;
    protected placeholderElement = document.createElement('div');

    // Variables/functions defined in parent classes.
    protected el_!: OGVPlayerEl; // eslint-disable-line @typescript-eslint/naming-convention
    protected options_!: VideoJSOptions; // eslint-disable-line @typescript-eslint/naming-convention
    protected currentSource_?: TechSourceObject; // eslint-disable-line @typescript-eslint/naming-convention
    protected triggerReady!: () => void;
    protected on!: (name: string, callback: (e?: Event) => void) => void;

    /**
     * Create an instance of this Tech.
     *
     * @param options The key/value store of player options.
     * @param ready Callback function to call when the `OgvJS` Tech is ready.
     */
    constructor(options: VideoJSTechOptions, ready: () => void) {
        super(options, ready);

        this.el_.src = options.src || options.source?.src || options.sources?.[0]?.src || this.el_.src;
        VideoJSOgvJS.setIfAvailable(this.el_, 'autoplay', options.autoplay);
        VideoJSOgvJS.setIfAvailable(this.el_, 'loop', options.loop);
        VideoJSOgvJS.setIfAvailable(this.el_, 'poster', options.poster);
        VideoJSOgvJS.setIfAvailable(this.el_, 'preload', options.preload);
        this.playerId = options.playerId;

        this.on('loadedmetadata', () => {
            if (CorePlatform.isIPhone()) {
                // iPhoneOS add some inline styles to the canvas, we need to remove it.
                const canvas = this.el_.getElementsByTagName('canvas')[0];

                canvas.style.removeProperty('width');
                canvas.style.removeProperty('margin');
            }

            this.triggerReady();
        });
    }

    /**
     * Set the value for the player is it has that property.
     *
     * @param el HTML player.
     * @param name Name of the property.
     * @param value Value to set.
     */
    static setIfAvailable(el: HTMLElement, name: string, value: unknown): void {
        // eslint-disable-next-line no-prototype-builtins
        if (el.hasOwnProperty(name)) {
            el[name] = value;
        }
    };

    /**
     * Check if browser/device is supported by Ogv.JS.
     *
     * @returns Whether it's supported.
     */
    static isSupported(): boolean {
        return OGVCompat.supported('OGVPlayer');
    };

    /**
     * Check if the tech can support the given type.
     *
     * @param type The mimetype to check.
     * @returns 'probably', 'maybe', or '' (empty string).
     */
    static canPlayType(type: string): string {
        return (type.indexOf('/ogg') !== -1 || type.indexOf('/webm')) ? 'maybe' : '';
    };

    /**
     * Check if the tech can support the given source.
     *
     * @param srcObj The source object.
     * @returns The options passed to the tech.
     */
    static canPlaySource(srcObj: TechSourceObject): string {
        return VideoJSOgvJS.canPlayType(srcObj.type);
    };

    /**
     * Check if the volume can be changed in this browser/device.
     * Volume cannot be changed in a lot of mobile devices.
     * Specifically, it can't be changed from 1 on iOS.
     *
     * @returns True if volume can be controlled.
     */
    static canControlVolume(): boolean {
        if (CorePlatform.isIPhone() || CorePlatform.isIPad()) {
            return false;
        }

        const player = new OGVPlayer();

        // eslint-disable-next-line no-prototype-builtins
        return player.hasOwnProperty('volume');
    };

    /**
     * Check if the volume can be muted in this browser/device.
     *
     * @returns True if volume can be muted.
     */
    static canMuteVolume(): boolean {
        return true;
    };

    /**
     * Check if the playback rate can be changed in this browser/device.
     *
     * @returns True if playback rate can be controlled.
     */
    static canControlPlaybackRate(): boolean {
        return true;
    };

    /**
     * Check to see if native 'TextTracks' are supported by this browser/device.
     *
     * @returns True if native 'TextTracks' are supported.
     */
    static supportsNativeTextTracks(): boolean {
        return false;
    };

    /**
     * Check if the fullscreen resize is supported by this browser/device.
     *
     * @returns True if the fullscreen resize is supported.
     */
    static supportsFullscreenResize(): boolean {
        return true;
    };

    /**
     * Check if the progress events is supported by this browser/device.
     *
     * @returns True if the progress events is supported.
     */
    static supportsProgressEvents(): boolean {
        return true;
    };

    /**
     * Check if the time update events is supported by this browser/device.
     *
     * @returns True if the time update events is supported.
     */
    static supportsTimeupdateEvents(): boolean {
        return true;
    };

    /**
     * Create the 'OgvJS' Tech's DOM element.
     *
     * @returns The element that gets created.
     */
    createEl(): OGVPlayerEl {
        const options = this.options_;

        if (options.base) {
            OGVLoader.base = options.base;
        } else if (!OGVLoader.base) {
            throw new Error('Please specify the base for the ogv.js library');
        }

        const el = new OGVPlayer(options);

        el.className += ' vjs-tech';
        options.tag = el;

        return el;
    }

    /**
     * Start playback.
     */
    play(): void {
        if (this.ended()) {
            // Reset the player, otherwise the Replay button doesn't work.
            this.el_.stop();
        }

        this.el_.play();
    }

    /**
     * Get the current playback speed.
     *
     * @returns Playback speed.
     */
    playbackRate(): number {
        return this.el_.playbackRate || 1;
    }

    /**
     * Set the playback speed.
     *
     * @param val Speed for the player to play.
     */
    setPlaybackRate(val: number): void {
        // eslint-disable-next-line no-prototype-builtins
        if (this.el_.hasOwnProperty('playbackRate')) {
            this.el_.playbackRate = val;
        }
    }

    /**
     * Returns a TimeRanges object that represents the ranges of the media resource that the user agent has played.
     *
     * @returns The range of points on the media timeline that has been reached through normal playback.
     */
    played(): TimeRanges {
        return this.el_.played;
    }

    /**
     * Pause playback.
     */
    pause(): void {
        this.el_.pause();
    }

    /**
     * Is the player paused or not.
     *
     * @returns Whether is paused.
     */
    paused(): boolean {
        return this.el_.paused;
    }

    /**
     * Get current playing time.
     *
     * @returns Current time.
     */
    currentTime(): number {
        return this.el_.currentTime;
    }

    /**
     * Set current playing time.
     *
     * @param seconds Current time of audio/video.
     */
    setCurrentTime(seconds: number): void {
        try {
            this.el_.currentTime = seconds;
        } catch (e) {
            videojs.log(e, 'Media is not ready. (Video.JS)');
        }
    }

    /**
     * Get media's duration.
     *
     * @returns Duration.
     */
    duration(): number {
        if (this.el_.duration && this.el_.duration !== Infinity) {
            return this.el_.duration;
        }

        return 0;
    }

    /**
     * Get a TimeRange object that represents the intersection
     * of the time ranges for which the user agent has all
     * relevant media.
     *
     * @returns Time ranges.
     */
    buffered(): TimeRanges {
        return this.el_.buffered;
    }

    /**
     * Get current volume level.
     *
     * @returns Volume.
     */
    volume(): number {
        // eslint-disable-next-line no-prototype-builtins
        return this.el_.hasOwnProperty('volume') ? this.el_.volume : 1;
    }

    /**
     * Set current playing volume level.
     *
     * @param percentAsDecimal Volume percent as a decimal.
     */
    setVolume(percentAsDecimal: number): void {
        // eslint-disable-next-line no-prototype-builtins
        if (!CorePlatform.isIPhone() && !CorePlatform.isIPad() && this.el_.hasOwnProperty('volume')) {
            this.el_.volume = percentAsDecimal;
        }
    }

    /**
     * Is the player muted or not.
     *
     * @returns Whether it's muted.
     */
    muted(): boolean {
        return this.el_.muted;
    }

    /**
     * Mute the player.
     *
     * @param muted True to mute the player.
     */
    setMuted(muted: boolean): void {
        this.el_.muted = !!muted;
    }

    /**
     * Is the player muted by default or not.
     *
     * @returns Whether it's muted by default.
     */
    defaultMuted(): boolean {
        return this.el_.defaultMuted || false;
    }

    /**
     * Get the player width.
     *
     * @returns Width.
     */
    width(): number {
        return this.el_.offsetWidth;
    }

    /**
     * Get the player height.
     *
     * @returns Height.
     */
    height(): number {
        return this.el_.offsetHeight;
    }

    /**
     * Get the video width.
     *
     * @returns Video width.
     */
    videoWidth(): number {
        return (<HTMLVideoElement> this.el_).videoWidth ?? 0;
    }

    /**
     * Get the video height.
     *
     * @returns Video heigth.
     */
    videoHeight(): number {
        return (<HTMLVideoElement> this.el_).videoHeight ?? 0;
    }

    /**
     * Get/set media source.
     *
     * @param src Source.
     * @returns Source when getting it, undefined when setting it.
     */
    src(src?: string): string | undefined {
        if (typeof src === 'undefined') {
            return this.el_.src;
        }

        this.el_.src = src;
    }

    /**
     * Load the media into the player.
     */
    load(): void {
        this.el_.load();
    }

    /**
     * Get current media source.
     *
     * @returns Current source.
     */
    currentSrc(): string {
        if (this.currentSource_) {
            return this.currentSource_.src;
        }

        return this.el_.currentSrc;
    }

    /**
     * Get media poster URL.
     *
     * @returns Poster.
     */
    poster(): string {
        return 'poster' in this.el_ ? this.el_.poster : '';
    }

    /**
     * Set media poster URL.
     *
     * @param url The poster image's url.
     */
    setPoster(url: string): void {
        (<HTMLVideoElement> this.el_).poster = url;
    }

    /**
     * Is the media preloaded or not.
     *
     * @returns Whether it's preloaded.
     */
    preload(): PreloadOption {
        return <PreloadOption> this.el_.preload || 'none';
    }

    /**
     * Set the media preload method.
     *
     * @param val Value for preload attribute.
     */
    setPreload(val: PreloadOption): void {
        // eslint-disable-next-line no-prototype-builtins
        if (this.el_.hasOwnProperty('preload')) {
            this.el_.preload = val;
        }
    }

    /**
     * Is the media auto-played or not.
     *
     * @returns Whether it's auto-played.
     */
    autoplay(): boolean {
        return this.el_.autoplay || false;
    }

    /**
     * Set media autoplay method.
     *
     * @param val Value for autoplay attribute.
     */
    setAutoplay(val: boolean): void {
        // eslint-disable-next-line no-prototype-builtins
        if (this.el_.hasOwnProperty('autoplay')) {
            this.el_.autoplay = !!val;
        }
    }

    /**
     * Does the media has controls or not.
     *
     * @returns Whether it has controls.
     */
    controls(): boolean {
        return this.el_.controls || false;
    }

    /**
     * Set the media controls method.
     *
     * @param val Value for controls attribute.
     */
    setControls(val: boolean): void {
        // eslint-disable-next-line no-prototype-builtins
        if (this.el_.hasOwnProperty('controls')) {
            this.el_.controls = !!val;
        }
    }

    /**
     * Is the media looped or not.
     *
     * @returns Whether it's looped.
     */
    loop(): boolean {
        return this.el_.loop || false;
    }

    /**
     * Set the media loop method.
     *
     * @param val Value for loop attribute.
     */
    setLoop(val: boolean): void {
        // eslint-disable-next-line no-prototype-builtins
        if (this.el_.hasOwnProperty('loop')) {
            this.el_.loop = !!val;
        }
    }

    /**
     * Get a TimeRanges object that represents the
     * ranges of the media resource to which it is possible
     * for the user agent to seek.
     *
     * @returns Time ranges.
     */
    seekable(): TimeRanges {
        return this.el_.seekable;
    }

    /**
     * Is player in the "seeking" state or not.
     *
     * @returns Whether is in the seeking state.
     */
    seeking(): boolean {
        return this.el_.seeking;
    }

    /**
     * Is the media ended or not.
     *
     * @returns Whether it's ended.
     */
    ended(): boolean {
        return this.el_.ended;
    }

    /**
     * Get the current state of network activity
     * NETWORK_EMPTY (numeric value 0)
     * NETWORK_IDLE (numeric value 1)
     * NETWORK_LOADING (numeric value 2)
     * NETWORK_NO_SOURCE (numeric value 3)
     *
     * @returns Network state.
     */
    networkState(): number {
        return this.el_.networkState;
    }

    /**
     * Get the current state of the player.
     * HAVE_NOTHING (numeric value 0)
     * HAVE_METADATA (numeric value 1)
     * HAVE_CURRENT_DATA (numeric value 2)
     * HAVE_FUTURE_DATA (numeric value 3)
     * HAVE_ENOUGH_DATA (numeric value 4)
     *
     * @returns Ready state.
     */
    readyState(): number {
        return this.el_.readyState;
    }

    /**
     * Does the player support native fullscreen mode or not. (Mobile devices)
     *
     * @returns Whether it supports full screen.
     */
    supportsFullScreen(): boolean {
        return !!this.playerId;
    }

    /**
     * Get media player error.
     *
     * @returns Error.
     */
    error(): MediaError | null {
        return this.el_.error;
    }

    /**
     * Enter full screen mode.
     */
    enterFullScreen(): void {
        // Use a "fake" full screen mode, moving the player to a different place in DOM to be able to use full screen size.
        const player = videojs.getPlayer(this.playerId ?? '');
        if (!player) {
            return;
        }

        const container = player.el();
        this.parentElement = container.parentElement;
        if (!this.parentElement) {
            // Shouldn't happen, it means the element is not in DOM. Do not support full screen in this case.
            return;
        }

        this.parentElement.replaceChild(this.placeholderElement, container);
        document.body.appendChild(container);
        container.classList.add('vjs-ios-moodleapp-fs');

        player.isFullscreen(true);
    }

    /**
     * Exit full screen mode.
     */
    exitFullScreen(): void {
        if (!this.parentElement) {
            return;
        }

        const player = videojs.getPlayer(this.playerId ?? '');
        if (!player) {
            return;
        }

        const container = player.el();
        this.parentElement.replaceChild(container, this.placeholderElement);
        container.classList.remove('vjs-ios-moodleapp-fs');

        player.isFullscreen(false);
    }

}

[
    ['featuresVolumeControl', 'canControlVolume'],
    ['featuresMuteControl', 'canMuteVolume'],
    ['featuresPlaybackRate', 'canControlPlaybackRate'],
    ['featuresNativeTextTracks', 'supportsNativeTextTracks'],
    ['featuresFullscreenResize', 'supportsFullscreenResize'],
    ['featuresProgressEvents', 'supportsProgressEvents'],
    ['featuresTimeupdateEvents', 'supportsTimeupdateEvents'],
].forEach(([key, fn]) => {
    defineLazyProperty(VideoJSOgvJS.prototype, key, () => VideoJSOgvJS[fn](), true);
});

type OGVPlayerEl = (HTMLAudioElement | HTMLVideoElement) & {
    stop: () => void;
};

/**
 * VideoJS Tech options. It includes some options added by VideoJS internally.
 */
type VideoJSTechOptions = VideoJSOptions & {
    playerId?: string;
};
