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

import {
    Directive,
    Input,
    AfterViewInit,
    ElementRef,
    OnChanges,
    SimpleChange,
    Output,
    EventEmitter,
    OnDestroy,
} from '@angular/core';
import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreFilepool, CoreFilepoolFileActions, CoreFilepoolFileEventData } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreLogger } from '@singletons/logger';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/sites/site';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { DownloadStatus } from '../constants';
import { CoreNetwork } from '@services/network';
import { Translate } from '@singletons';
import { AsyncDirective } from '@classes/async-directive';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { CoreText } from '@singletons/text';
import { CoreArray } from '@singletons/array';
import { CoreMimetype } from '@singletons/mimetype';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreWS } from '@services/ws';

/**
 * Directive to handle external content.
 *
 * This directive should be used with any element that links to external content
 * which we want to have available when the app is offline. Typically media and links.
 *
 * If a file is downloaded, its URL will be replaced by the local file URL.
 *
 * This directive also downloads inline styles, so it can be used in any element as long as it has inline styles.
 */
@Directive({
    selector: '[core-external-content]',
})
export class CoreExternalContentDirective implements AfterViewInit, OnChanges, OnDestroy, AsyncDirective {

    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.
    @Input() url?: string | null; // The URL to use in the element, either as src or href.
    @Input() posterUrl?: string | null; // The poster URL.
    /**
     * @deprecated since 4.4. Use url instead.
     */
    @Input() src?: string;
    /**
     * @deprecated since 4.4. Use url instead.
     */
    @Input() href?: string;
    /**
     * @deprecated since 4.4. Use posterUrl instead.
     */
    @Input() poster?: string;

    /**
     * Event emitted when the content is loaded. Only for images.
     * Will emit true if loaded, false if error.
     */
    @Output() onLoad = new EventEmitter<boolean>();

    loaded = false;
    invalid = false;
    protected element: Element;
    protected logger: CoreLogger;
    protected initialized = false;
    protected fileEventObserver?: CoreEventObserver;
    protected onReadyPromise = new CorePromisedValue<void>();

    // eslint-disable-next-line @angular-eslint/prefer-inject
    constructor(element: ElementRef) {
        this.element = element.nativeElement; // This is done that way to let format text create a directive.
        this.logger = CoreLogger.getInstance('CoreExternalContentDirective');

        CoreDirectivesRegistry.register(this.element, this);
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.checkAndHandleExternalContent();

        this.initialized = true;
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes && this.initialized) {
            // If any of the inputs changes, handle the content again.
            this.checkAndHandleExternalContent();
        }
    }

    /**
     * Add a new source with a certain URL as a sibling of the current element.
     *
     * @param url URL to use in the source.
     */
    protected addSource(url: string): void {
        if (this.element.tagName !== 'SOURCE') {
            return;
        }

        const newSource = document.createElement('source');
        const type = this.element.getAttribute('type');

        newSource.setAttribute('src', url);

        if (type) {
            if (CorePlatform.isAndroid() && type == 'video/quicktime') {
                // Fix for VideoJS/Chrome bug https://github.com/videojs/video.js/issues/423 .
                newSource.setAttribute('type', 'video/mp4');
            } else {
                newSource.setAttribute('type', type);
            }
        }

        this.element.parentNode?.insertBefore(newSource, this.element);
    }

    /**
     * Get the URL that should be handled and, if valid, handle it.
     */
    protected async checkAndHandleExternalContent(): Promise<void> {
        const tagName = this.element.tagName.toUpperCase();
        let targetAttr: string;
        let url: string;

        // Always handle inline styles (if any).
        this.handleInlineStyles(this.siteId);

        if (tagName === 'A' || tagName == 'IMAGE') {
            targetAttr = 'href';
            url = this.url ?? this.href ?? ''; // eslint-disable-line @typescript-eslint/no-deprecated

        } else if (tagName === 'IMG') {
            targetAttr = 'src';
            url = this.url ?? this.src ?? ''; // eslint-disable-line @typescript-eslint/no-deprecated

        } else if (tagName === 'AUDIO' || tagName === 'VIDEO' || tagName === 'SOURCE' || tagName === 'TRACK') {
            targetAttr = 'src';
            url = this.url ?? this.src ?? ''; // eslint-disable-line @typescript-eslint/no-deprecated

            if (tagName === 'VIDEO' && (this.posterUrl || this.poster)) { // eslint-disable-line @typescript-eslint/no-deprecated
                // Handle poster.
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                this.handleExternalContent('poster', this.posterUrl ?? this.poster ?? '').catch(() => {
                    // Ignore errors.
                });
            }

        } else {
            this.invalid = true;
            this.onReadyPromise.resolve();

            return;
        }

        try {
            await this.handleExternalContent(targetAttr, url);
        } catch {
            // Error handling content. Make sure the original URL is set.
           this.setElementUrl(targetAttr, url);
        } finally {
            this.onReadyPromise.resolve();
        }
    }

    /**
     * Handle external content, setting the right URL.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @returns Promise resolved if the element is successfully treated.
     */
    protected async handleExternalContent(targetAttr: string, url: string): Promise<void> {

        const tagName = this.element.tagName;
        if (tagName == 'VIDEO' && targetAttr != 'poster') {
            this.handleVideoSubtitles(<HTMLVideoElement> this.element);
        }

        const site = await CorePromiseUtils.ignoreErrors(CoreSites.getSite(this.siteId));
        const isSiteFile = site?.isSitePluginFileUrl(url);

        // Try to convert the URL to absolute. This will only work for URLs relative to the site URL, it won't work for
        // URLs relative to a subpath (e.g. relative to the course page URL).
        url = site && url ? CoreUrl.toAbsoluteURL(site.getURL(), url) : url;

        if (!url || !url.match(/^https?:\/\//i) || CoreUrl.isLocalFileUrl(url) ||
                (tagName === 'A' && !(isSiteFile || site?.isSiteThemeImageUrl(url) || CoreUrl.isGravatarUrl(url)))) {

            this.logger.debug(`Ignoring non-downloadable URL: ${url}`);

            throw new CoreError('Non-downloadable URL');
        }

        if (site && !site.canDownloadFiles() && isSiteFile) {
            this.element.parentElement?.removeChild(this.element); // Remove element since it'll be broken.

            throw new CoreError(Translate.instant('core.cannotdownloadfiles'));
        }

        const finalUrl = await this.getUrlToUse(targetAttr, url, site);

        this.logger.debug(`Using URL ${finalUrl} for ${url}`);

        this.setElementUrl(targetAttr, finalUrl);

        if (site) {
            this.setListeners(targetAttr, url, site);
        }
    }

    /**
     * Set the URL to the element.
     *
     * @param targetAttr Name of the attribute to set.
     * @param url URL to set.
     */
    protected setElementUrl(targetAttr: string, url: string): void {
        if (!url) {
            // Ignore empty URLs.
            if (this.element.tagName === 'IMG') {
                this.onLoad.emit(false);
                this.loaded = true;
            }

            return;
        }

        if (this.element.tagName === 'SOURCE') {
            // The WebView does not detect changes in SRC, we need to add a new source.
            this.addSource(url);
        } else {
            this.element.setAttribute(targetAttr, url);

            const originalUrl = targetAttr === 'poster' ?
                (this.posterUrl ?? this.poster) : // eslint-disable-line @typescript-eslint/no-deprecated
                (this.url ?? this.src ?? this.href); // eslint-disable-line @typescript-eslint/no-deprecated
            if (originalUrl && originalUrl !== url) {
                this.element.setAttribute(`data-original-${targetAttr}`, originalUrl);
            }
        }

        if (this.element.tagName !== 'IMG') {
            return;
        }

        if (url.startsWith('data:')) {
            this.onLoad.emit(true);
            this.loaded = true;
        } else {
            this.loaded = false;
            this.waitForLoad();
        }
    }

    /**
     * Handle inline styles, trying to download referenced files.
     *
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async handleInlineStyles(siteId?: string): Promise<void> {
        if (!siteId) {
            return;
        }

        let inlineStyles = this.element.getAttribute('style') || '';

        if (!inlineStyles) {
            return;
        }

        const urls = CoreArray.unique(Array.from(inlineStyles.match(/https?:\/\/[^"') ;]*/g) ?? []));
        if (!urls.length) {
            return;
        }

        const promises = urls.map(async (url) => {
            const finalUrl = await CoreFilepool.getSrcByUrl(siteId, url, this.component, this.componentId, 0, true, true);

            this.logger.debug(`Using URL ${finalUrl} for ${url} in inline styles`);
            inlineStyles = inlineStyles.replace(new RegExp(CoreText.escapeForRegex(url), 'gi'), finalUrl);
        });

        try {
            await CorePromiseUtils.allPromises(promises);

            this.element.setAttribute('style', inlineStyles);
        } catch {
            this.logger.error('Error treating inline styles.', this.element);
        }
    }

    /**
     * Handle video subtitles if any.
     *
     * @param video Video element.
     */
    protected handleVideoSubtitles(video: HTMLVideoElement): void {
        if (!video.textTracks) {
            return;
        }

        // It's a video with subtitles. Fix some issues with subtitles.
        video.textTracks.onaddtrack = (event): void => {
            const track = <TextTrack> event.track;
            if (track) {
                track.oncuechange = (): void => {
                    if (!track.cues) {
                        return;
                    }

                    // Position all subtitles to a percentage of video height.
                    Array.from(track.cues).forEach((cue: VTTCue) => {
                        cue.snapToLines = false;
                        cue.line = 90;
                        cue.size = 100; // This solves some Android issue.
                    });
                    // Delete listener.
                    track.oncuechange = null;
                };
            }
        };
    }

    /**
     * Get the URL to use in the element. E.g. if the file is already downloaded it will return the local URL.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @param site Site.
     * @returns Promise resolved with the URL.
     */
    protected async getUrlToUse(targetAttr: string, url: string, site?: CoreSite): Promise<string> {
        if (!site) {
            return this.getUrlForNoSite(url);
        }

        const tagName = this.element.tagName;
        const openIn = tagName === 'A' && this.element.getAttribute('data-open-in');

        if (openIn === 'app' || openIn === 'browser') {
            // The file is meant to be opened in browser or InAppBrowser, don't use the downloaded URL because it won't work.
            if (!site.isSitePluginFileUrl(url)) {
                return url;
            }

            // Treat the pluginfile URL so it can be opened and the file is displayed instead of downloaded.
            const finalUrl = await site.checkAndFixPluginfileURL(url);

            return finalUrl.replace('forcedownload=1', 'forcedownload=0');
        }

        let finalUrl: string;

        // Download images, tracks and posters if size is unknown.
        const downloadUnknown = tagName == 'IMG' || tagName == 'TRACK' || targetAttr == 'poster';

        if (targetAttr === 'src' && tagName !== 'SOURCE' && tagName !== 'TRACK' && tagName !== 'VIDEO' && tagName !== 'AUDIO') {
            finalUrl = await CoreFilepool.getSrcByUrl(
                site.getId(),
                url,
                this.component,
                this.componentId,
                0,
                true,
                downloadUnknown,
            );
        } else if (tagName === 'TRACK') {
            // Download tracks right away. Using an online URL for tracks can give a CORS error in Android.
            finalUrl = await CoreFilepool.downloadUrl(site.getId(), url, false, this.component, this.componentId);

            finalUrl = CoreFile.convertFileSrc(finalUrl);
        } else {
            finalUrl = await CoreFilepool.getUrlByUrl(
                site.getId(),
                url,
                this.component,
                this.componentId,
                0,
                true,
                downloadUnknown,
            );

            finalUrl = CoreFile.convertFileSrc(finalUrl);
        }

        if (!CoreUrl.isLocalFileUrl(finalUrl) && !finalUrl.includes('#') && tagName !== 'A') {
            /* In iOS, if we use the same URL in embedded file and background download then the download only
               downloads a few bytes (cached ones). Add an anchor to the URL so both URLs are different.
               Don't add this anchor if the URL already has an anchor, otherwise other anchors might not work.
               The downloaded URL won't have anchors so the URLs will already be different. */
            finalUrl = `${finalUrl}#moodlemobile-embedded`;
        }

        return finalUrl;
    }

    /**
     * Get the URL to use when there's no site (the user hasn't authenticated yet).
     * In Android, the file will always be downloaded and served from the local file system to avoid problems with cookies.
     * In other platforms the file will never be downloaded, we'll always use the online URL.
     *
     * @param url Original URL to treat.
     * @returns Promise resolved with the URL.
     */
    protected async getUrlForNoSite(url: string): Promise<string> {
        if (!CorePlatform.isAndroid()) {
            return url;
        }

        const fileId = CoreFilepool.getFileIdByUrl(url);
        const extension = CoreMimetype.guessExtensionFromUrl(url);

        const filePath = `${CoreFileProvider.NO_SITE_FOLDER}/${fileId}${extension ? `.${extension}` : ''}`;
        let fileEntry: FileEntry;

        try {
            // Check if the file is already downloaded.
            fileEntry = await CoreFile.getFile(filePath);
        } catch {
            // File not downloaded, download it first.
            fileEntry = await CoreWS.downloadFile(url, filePath, false);
        }

        return CoreFile.convertFileSrc(CoreFile.getFileEntryURL(fileEntry));
    }

    /**
     * Set listeners if needed.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @param site Site.
     * @returns Promise resolved when done.
     */
    protected async setListeners(targetAttr: string, url: string, site: CoreSite): Promise<void> {
        if (this.fileEventObserver) {
            // Already listening to events.
            return;
        }

        const tagName = this.element.tagName;
        let state = await CoreFilepool.getFileStateByUrl(site.getId(), url);

        // Listen for download changes in the file.
        const eventName = await CoreFilepool.getFileEventNameByUrl(site.getId(), url);

        this.fileEventObserver = CoreEvents.on(eventName, async (data: CoreFilepoolFileEventData) => {
            if (data.action === CoreFilepoolFileActions.DOWNLOAD && !data.success) {
                // Error downloading the file. Don't try again.
                return;
            }

            if (this.isPlayedMedia()) {
                // Don't update the URL if it's a media that already started playing, otherwise the media will be reloaded.
                return;
            }

            const newState = await CoreFilepool.getFileStateByUrl(site.getId(), url);
            if (newState === state) {
                return;
            }

            state = newState;
            if (state === DownloadStatus.DOWNLOADING) {
                return;
            }

            // The file state has changed. Handle the file again, maybe it's downloaded now or the file has been deleted.
            this.checkAndHandleExternalContent();
        });

        // Set events to download big files (not downloaded automatically).
        if (targetAttr !== 'poster' && (tagName === 'VIDEO' || tagName === 'AUDIO' || tagName === 'A' || tagName === 'SOURCE')) {
            const eventName = tagName == 'A' ? 'click' : 'play';
            let clickableEl: Element | null = this.element;

            if (tagName == 'SOURCE') {
                clickableEl = this.element.closest('video,audio');
            }

            if (!clickableEl) {
                return;
            }

            clickableEl.addEventListener(eventName, () => {
                // User played media or opened a downloadable link.
                // Download the file if in wifi and it hasn't been downloaded already (for big files).
                if (state !== DownloadStatus.DOWNLOADED && state !== DownloadStatus.DOWNLOADING && CoreNetwork.isWifi()) {
                    // We aren't using the result, so it doesn't matter which of the 2 functions we call.
                    CoreFilepool.getUrlByUrl(site.getId(), url, this.component, this.componentId, 0, false);
                }
            });
        }
    }

    /**
     * Check if the source affects a media element that is already playing and not ended.
     *
     * @returns Whether it's a played media element.
     */
    protected isPlayedMedia(): boolean {
        let mediaElement: HTMLVideoElement | HTMLAudioElement | null = null;

        if (this.element.tagName === 'VIDEO') {
            mediaElement = this.element as HTMLVideoElement;
        } else if (this.element.tagName === 'AUDIO') {
            mediaElement = this.element as HTMLAudioElement;
        } else if (this.element.tagName === 'SOURCE' || this.element.tagName === 'TRACK') {
            mediaElement = this.element.closest<HTMLVideoElement | HTMLAudioElement>('video,audio');
        }

        if (!mediaElement) {
            return false;
        }

        return !mediaElement.paused || (mediaElement.currentTime > 0.1 && !mediaElement.ended);
    }

    /**
     * Wait for the image to be loaded or error, and emit an event when it happens.
     */
    protected waitForLoad(): void {
        const loadListener = (): void => {
            listener(true);
        };

        const errorListener = (): void => {
            listener(false);
        };

        const listener = (success: boolean): void => {
            this.element.removeEventListener('load', loadListener);
            this.element.removeEventListener('error', errorListener);
            this.onLoad.emit(success);
            this.loaded = true;
        };

        this.element.addEventListener('load', loadListener);
        this.element.addEventListener('error', errorListener);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.fileEventObserver?.off();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
    }

}
