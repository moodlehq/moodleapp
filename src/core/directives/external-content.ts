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

import { Directive, Input, AfterViewInit, ElementRef, OnChanges, SimpleChange, Output, EventEmitter } from '@angular/core';

import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { Platform } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreError } from '@classes/errors/error';

/**
 * Directive to handle external content.
 *
 * This directive should be used with any element that links to external content
 * which we want to have available when the app is offline. Typically media and links.
 *
 * If a file is downloaded, its URL will be replaced by the local file URL.
 *
 * From v3.5.2 this directive will also download inline styles, so it can be used in any element as long as it has inline styles.
 */
@Directive({
    selector: '[core-external-content]',
})
export class CoreExternalContentDirective implements AfterViewInit, OnChanges {

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

    constructor(element: ElementRef) {

        this.element = element.nativeElement;
        this.logger = CoreLogger.getInstance('CoreExternalContentDirective');
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
            if (CoreApp.isAndroid() && type == 'video/quicktime') {
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
        const currentSite = CoreSites.getCurrentSite();
        const siteId = this.siteId || currentSite?.getId();
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

            return;
        }

        // Avoid handling data url's.
        if (url && url.indexOf('data:') === 0) {
            this.invalid = true;
            this.onLoad.emit();
            this.loaded = true;

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
        }
    }

    /**
     * Handle external content, setting the right URL.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @param siteId Site ID.
     * @return Promise resolved if the element is successfully treated.
     */
    protected async handleExternalContent(targetAttr: string, url: string, siteId?: string): Promise<void> {

        const tagName = this.element.tagName;

        if (tagName == 'VIDEO' && targetAttr != 'poster') {
            const video = <HTMLVideoElement> this.element;
            if (video.textTracks) {
                // It's a video with subtitles. Fix some issues with subtitles.
                video.textTracks.onaddtrack = (event): void => {
                    const track = <TextTrack> event.track;
                    if (track) {
                        track.oncuechange = (): void => {
                            if (!track.cues) {
                                return;
                            }

                            const line = Platform.is('tablet') || CoreApp.isAndroid() ? 90 : 80;
                            // Position all subtitles to a percentage of video height.
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            Array.from(track.cues).forEach((cue: any) => {
                                cue.snapToLines = false;
                                cue.line = line;
                                cue.size = 100; // This solves some Android issue.
                            });
                            // Delete listener.
                            track.oncuechange = null;
                        };
                    }
                };
            }

        }

        if (!url || !url.match(/^https?:\/\//i) || CoreUrlUtils.isLocalFileUrl(url) ||
                (tagName === 'A' && !CoreUrlUtils.isDownloadableUrl(url))) {

            this.logger.debug('Ignoring non-downloadable URL: ' + url);
            if (tagName === 'SOURCE') {
                // Restoring original src.
                this.addSource(url);
            }

            throw new CoreError('Non-downloadable URL');
        }

        const site = await CoreSites.getSite(siteId);

        if (!site.canDownloadFiles() && CoreUrlUtils.isPluginFileUrl(url)) {
            this.element.parentElement?.removeChild(this.element); // Remove element since it'll be broken.

            throw new CoreError('Site doesn\'t allow downloading files.');
        }

        // Download images, tracks and posters if size is unknown.
        const downloadUnknown = tagName == 'IMG' || tagName == 'TRACK' || targetAttr == 'poster';
        let finalUrl: string;

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

        if (!CoreUrlUtils.isLocalFileUrl(finalUrl)) {
            /* In iOS, if we use the same URL in embedded file and background download then the download only
               downloads a few bytes (cached ones). Add a hash to the URL so both URLs are different. */
            finalUrl = finalUrl + '#moodlemobile-embedded';
        }

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

        // Set events to download big files (not downloaded automatically).
        if (!CoreUrlUtils.isLocalFileUrl(finalUrl) && targetAttr != 'poster' &&
            (tagName == 'VIDEO' || tagName == 'AUDIO' || tagName == 'A' || tagName == 'SOURCE')) {
            const eventName = tagName == 'A' ? 'click' : 'play';
            let clickableEl = this.element;

            if (tagName == 'SOURCE') {
                clickableEl = <HTMLElement> CoreDomUtils.closest(this.element, 'video,audio');
                if (!clickableEl) {
                    return;
                }
            }

            clickableEl.addEventListener(eventName, () => {
                // User played media or opened a downloadable link.
                // Download the file if in wifi and it hasn't been downloaded already (for big files).
                if (CoreApp.isWifi()) {
                    // We aren't using the result, so it doesn't matter which of the 2 functions we call.
                    CoreFilepool.getUrlByUrl(site.getId(), url, this.component, this.componentId, 0, false);
                }
            });
        }
    }

    /**
     * Handle inline styles, trying to download referenced files.
     *
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async handleInlineStyles(siteId?: string): Promise<void> {
        if (!siteId) {
            return;
        }

        let inlineStyles = this.element.getAttribute('style');

        if (!inlineStyles) {
            return;
        }

        let urls = inlineStyles.match(/https?:\/\/[^"') ;]*/g);
        if (!urls || !urls.length) {
            return;
        }

        urls = CoreUtils.uniqueArray(urls); // Remove duplicates.

        const promises = urls.map(async (url) => {
            const finalUrl = await CoreFilepool.getUrlByUrl(siteId, url, this.component, this.componentId, 0, true, true);

            this.logger.debug('Using URL ' + finalUrl + ' for ' + url + ' in inline styles');
            inlineStyles = inlineStyles!.replace(new RegExp(url, 'gi'), finalUrl);
        });

        try {
            await CoreUtils.allPromises(promises);

            this.element.setAttribute('style', inlineStyles);
        } catch (error) {
            this.logger.error('Error treating inline styles.', this.element);
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

}
