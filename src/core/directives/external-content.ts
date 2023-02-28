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
import { CoreFile } from '@services/file';
import { CoreFilepool, CoreFilepoolFileActions, CoreFilepoolFileEventData } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from '@singletons/logger';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/site';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreConstants } from '../constants';
import { CoreNetwork } from '@services/network';
import { Translate } from '@singletons';
import { AsyncDirective } from '@classes/async-directive';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';

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
    @Input() src?: string;
    @Input() href?: string;
    @Input('target-src') targetSrc?: string; // eslint-disable-line @angular-eslint/no-input-rename
    @Input() poster?: string;
    @Output() onLoad = new EventEmitter(); // Emitted when content is loaded. Only for images.

    loaded = false;
    invalid = false;
    protected element: Element;
    protected logger: CoreLogger;
    protected initialized = false;
    protected fileEventObserver?: CoreEventObserver;
    protected onReadyPromise = new CorePromisedValue<void>();

    constructor(element: ElementRef) {

        this.element = element.nativeElement;
        this.logger = CoreLogger.getInstance('CoreExternalContentDirective');

        CoreDirectivesRegistry.register(this.element, this);
    }

    /**
     * View has been initialized
     */
    ngAfterViewInit(): void {
        this.checkAndHandleExternalContent();

        this.initialized = true;
    }

    /**
     * Listen to changes.
     *
     * * @param {{[name: string]: SimpleChange}} changes Changes.
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
        const siteId = this.siteId || CoreSites.getRequiredCurrentSite().getId();
        const tagName = this.element.tagName.toUpperCase();
        let targetAttr;
        let url;

        // Always handle inline styles (if any).
        this.handleInlineStyles(siteId);

        if (tagName === 'A' || tagName == 'IMAGE') {
            targetAttr = 'href';
            url = this.href;

        } else if (tagName === 'IMG') {
            targetAttr = 'src';
            url = this.src;

        } else if (tagName === 'AUDIO' || tagName === 'VIDEO' || tagName === 'SOURCE' || tagName === 'TRACK') {
            targetAttr = 'src';
            url = this.targetSrc || this.src;

            if (tagName === 'VIDEO') {
                if (this.poster) {
                    // Handle poster.
                    this.handleExternalContent('poster', this.poster, siteId).catch(() => {
                        // Ignore errors.
                    });
                }
            }

        } else {
            this.invalid = true;
            this.onReadyPromise.resolve();

            return;
        }

        // Avoid handling data url's.
        if (url && url.indexOf('data:') === 0) {
            if (tagName === 'SOURCE') {
                // Restoring original src.
                this.addSource(url);
            }

            this.onLoad.emit();
            this.loaded = true;
            this.onReadyPromise.resolve();

            return;
        }

        try {
            await this.handleExternalContent(targetAttr, url, siteId);
        } catch (error) {
            // Error handling content. Make sure the loaded event is triggered for images.
            if (tagName === 'IMG') {
                if (url) {
                    this.waitForLoad();
                } else {
                    this.onLoad.emit();
                    this.loaded = true;
                }
            }
        } finally {
            this.onReadyPromise.resolve();
        }
    }

    /**
     * Handle external content, setting the right URL.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @param siteId Site ID.
     * @returns Promise resolved if the element is successfully treated.
     */
    protected async handleExternalContent(targetAttr: string, url: string, siteId?: string): Promise<void> {

        const tagName = this.element.tagName;
        if (tagName == 'VIDEO' && targetAttr != 'poster') {
            this.handleVideoSubtitles(<HTMLVideoElement> this.element);
        }

        const site = await CoreSites.getSite(siteId);
        const isSiteFile = site.isSitePluginFileUrl(url);

        if (!url || !url.match(/^https?:\/\//i) || CoreUrlUtils.isLocalFileUrl(url) ||
                (tagName === 'A' && !(isSiteFile || site.isSiteThemeImageUrl(url) || CoreUrlUtils.isGravatarUrl(url)))) {

            this.logger.debug('Ignoring non-downloadable URL: ' + url);
            if (tagName === 'SOURCE') {
                // Restoring original src.
                this.addSource(url);
            } else if (url && !this.element.getAttribute(targetAttr)) {
                // By default, Angular inputs aren't added as DOM attributes. Add it now.
                this.element.setAttribute(targetAttr, url);
            }

            throw new CoreError('Non-downloadable URL');
        }

        if (!site.canDownloadFiles() && isSiteFile) {
            this.element.parentElement?.removeChild(this.element); // Remove element since it'll be broken.

            throw new CoreError(Translate.instant('core.cannotdownloadfiles'));
        }

        const finalUrl = await this.getUrlToUse(targetAttr, url, site);

        this.logger.debug('Using URL ' + finalUrl + ' for ' + url);
        if (tagName === 'SOURCE') {
            // The browser does not catch changes in SRC, we need to add a new source.
            this.addSource(finalUrl);
        } else {
            if (tagName === 'IMG') {
                this.loaded = false;
                this.waitForLoad();
            }

            if (targetAttr == 'poster') {
                // Setting the poster immediately doesn't display it in some cases. Set it to empty and then set the right one.
                this.element.setAttribute(targetAttr, '');
                await CoreUtils.nextTick();
            }

            this.element.setAttribute(targetAttr, finalUrl);
            this.element.setAttribute('data-original-' + targetAttr, url);
        }

        this.setListeners(targetAttr, url, site);
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

        const urls = CoreUtils.uniqueArray(Array.from(inlineStyles.match(/https?:\/\/[^"') ;]*/g) ?? []));
        if (!urls.length) {
            return;
        }

        const promises = urls.map(async (url) => {
            const finalUrl = await CoreFilepool.getSrcByUrl(siteId, url, this.component, this.componentId, 0, true, true);

            this.logger.debug('Using URL ' + finalUrl + ' for ' + url + ' in inline styles');
            inlineStyles = inlineStyles.replace(new RegExp(url, 'gi'), finalUrl);
        });

        try {
            await CoreUtils.allPromises(promises);

            this.element.setAttribute('style', inlineStyles);
        } catch (error) {
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
    protected async getUrlToUse(targetAttr: string, url: string, site: CoreSite): Promise<string> {
        const tagName = this.element.tagName;
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

        if (!CoreUrlUtils.isLocalFileUrl(finalUrl) && !finalUrl.includes('#') && tagName !== 'A') {
            /* In iOS, if we use the same URL in embedded file and background download then the download only
               downloads a few bytes (cached ones). Add an anchor to the URL so both URLs are different.
               Don't add this anchor if the URL already has an anchor, otherwise other anchors might not work.
               The downloaded URL won't have anchors so the URLs will already be different. */
            finalUrl = finalUrl + '#moodlemobile-embedded';
        }

        return finalUrl;
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

            const newState = await CoreFilepool.getFileStateByUrl(site.getId(), url);
            if (newState === state) {
                return;
            }

            state = newState;
            if (state === CoreConstants.DOWNLOADING) {
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
                if (state !== CoreConstants.DOWNLOADED && state !== CoreConstants.DOWNLOADING && CoreNetwork.isWifi()) {
                    // We aren't using the result, so it doesn't matter which of the 2 functions we call.
                    CoreFilepool.getUrlByUrl(site.getId(), url, this.component, this.componentId, 0, false);
                }
            });
        }
    }

    /**
     * Wait for the image to be loaded or error, and emit an event when it happens.
     */
    protected waitForLoad(): void {
        const listener = (): void => {
            this.element.removeEventListener('load', listener);
            this.element.removeEventListener('error', listener);
            this.onLoad.emit();
            this.loaded = true;
        };

        this.element.addEventListener('load', listener);
        this.element.addEventListener('error', listener);
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
