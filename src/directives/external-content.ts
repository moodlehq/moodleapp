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
import { Platform } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';

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
    selector: '[core-external-content]'
})
export class CoreExternalContentDirective implements AfterViewInit, OnChanges {
    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.
    @Input() src?: string;
    @Input() href?: string;
    @Input('target-src') targetSrc?: string;
    @Input() poster?: string;
    @Output() onLoad = new EventEmitter(); // Emitted when content is loaded. Only for images.

    loaded = false;
    protected element: HTMLElement;
    protected logger;
    protected initialized = false;

    invalid = false;

    constructor(element: ElementRef, logger: CoreLoggerProvider, private filepoolProvider: CoreFilepoolProvider,
            private platform: Platform, private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider) {
        // This directive can be added dynamically. In that case, the first param is the HTMLElement.
        this.element = element.nativeElement || element;
        this.logger = logger.getInstance('CoreExternalContentDirective');
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

        const newSource = document.createElement('source'),
            type = this.element.getAttribute('type');

        newSource.setAttribute('src', url);

        if (type) {
            if (this.platform.is('android') && type == 'video/quicktime') {
                // Fix for VideoJS/Chrome bug https://github.com/videojs/video.js/issues/423 .
                newSource.setAttribute('type', 'video/mp4');
            } else {
                newSource.setAttribute('type', type);
            }
        }
        this.element.parentNode.insertBefore(newSource, this.element);
    }

    /**
     * Get the URL that should be handled and, if valid, handle it.
     */
    protected checkAndHandleExternalContent(): void {
        const currentSite = this.sitesProvider.getCurrentSite(),
            siteId = this.siteId || (currentSite && currentSite.getId()),
            tagName = this.element.tagName;
        let targetAttr,
            url;

        // Always handle inline styles (if any).
        this.handleInlineStyles(siteId).catch((error) => {
            this.logger.error('Error treating inline styles.', this.element);
        });

        if (tagName === 'A') {
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

        this.handleExternalContent(targetAttr, url, siteId).catch(() => {
            // Error handling content. Make sure the loaded event is triggered for images.
            if (tagName === 'IMG') {
                if (url) {
                    this.waitForLoad();
                } else {
                    this.onLoad.emit();
                    this.loaded = true;
                }
            }
        });
    }

    /**
     * Handle external content, setting the right URL.
     *
     * @param targetAttr Attribute to modify.
     * @param url Original URL to treat.
     * @param siteId Site ID.
     * @return Promise resolved if the element is successfully treated.
     */
    protected handleExternalContent(targetAttr: string, url: string, siteId?: string): Promise<any> {

        const tagName = this.element.tagName;

        if (tagName == 'VIDEO' && targetAttr != 'poster') {
            const video = <HTMLVideoElement> this.element;
            if (video.textTracks) {
                // It's a video with subtitles. In iOS, subtitles position is wrong so it needs to be fixed.
                video.textTracks.onaddtrack = (event): void => {
                    const track = <TextTrack> event.track;
                    if (track) {
                        track.oncuechange = (): void => {
                            const line = this.platform.is('tablet') || this.platform.is('android') ? 90 : 80;
                            // Position all subtitles to a percentage of video height.
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

        if (!url || !url.match(/^https?:\/\//i) || (tagName === 'A' && !this.urlUtils.isDownloadableUrl(url))) {
            this.logger.debug('Ignoring non-downloadable URL: ' + url);
            if (tagName === 'SOURCE') {
                // Restoring original src.
                this.addSource(url);
            }

            return Promise.reject(null);
        }

        // Get the webservice pluginfile URL, we ignore failures here.
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.canDownloadFiles() && this.urlUtils.isPluginFileUrl(url)) {
                this.element.parentElement.removeChild(this.element); // Remove element since it'll be broken.

                return Promise.reject(null);
            }

            // Download images, tracks and posters if size is unknown.
            const dwnUnknown = tagName == 'IMG' || tagName == 'TRACK' || targetAttr == 'poster';
            let promise;

            if (targetAttr === 'src' && tagName !== 'SOURCE' && tagName !== 'TRACK' && tagName !== 'VIDEO' &&
                    tagName !== 'AUDIO') {
                promise = this.filepoolProvider.getSrcByUrl(siteId, url, this.component, this.componentId, 0, true, dwnUnknown);
            } else {
                promise = this.filepoolProvider.getUrlByUrl(siteId, url, this.component, this.componentId, 0, true, dwnUnknown);
            }

            return promise.then((finalUrl) => {
                if (finalUrl.match(/^https?:\/\//i)) {
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
                    this.element.setAttribute(targetAttr, finalUrl);
                    this.element.setAttribute('data-original-' + targetAttr, url);
                }

                // Set events to download big files (not downloaded automatically).
                if (finalUrl.indexOf('http') === 0 && targetAttr != 'poster' &&
                    (tagName == 'VIDEO' || tagName == 'AUDIO' || tagName == 'A' || tagName == 'SOURCE')) {
                    const eventName = tagName == 'A' ? 'click' : 'play';
                    let clickableEl = this.element;

                    if (tagName == 'SOURCE') {
                        clickableEl = <HTMLElement> this.domUtils.closest(this.element, 'video,audio');
                        if (!clickableEl) {
                            return;
                        }
                    }

                    clickableEl.addEventListener(eventName, () => {
                        // User played media or opened a downloadable link.
                        // Download the file if in wifi and it hasn't been downloaded already (for big files).
                        if (this.appProvider.isWifi()) {
                            // We aren't using the result, so it doesn't matter which of the 2 functions we call.
                            this.filepoolProvider.getUrlByUrl(siteId, url, this.component, this.componentId, 0, false);
                        }
                    });
                }
            });
        });
    }

    /**
     * Handle inline styles, trying to download referenced files.
     *
     * @param siteId Site ID.
     * @return Promise resolved if the element is successfully treated.
     */
    protected handleInlineStyles(siteId: string): Promise<any> {
        let inlineStyles = this.element.getAttribute('style');

        if (!inlineStyles) {
            return Promise.resolve();
        }

        let urls = inlineStyles.match(/https?:\/\/[^"'\) ;]*/g);
        if (!urls || !urls.length) {
            return Promise.resolve();
        }

        const promises = [];
        urls = this.utils.uniqueArray(urls); // Remove duplicates.

        urls.forEach((url) => {
            promises.push(this.filepoolProvider.getUrlByUrl(siteId, url, this.component, this.componentId, 0, true, true)
                    .then((finalUrl) => {

                this.logger.debug('Using URL ' + finalUrl + ' for ' + url + ' in inline styles');
                inlineStyles = inlineStyles.replace(new RegExp(url, 'gi'), finalUrl);
            }));
        });

        return this.utils.allPromises(promises).then(() => {
            this.element.setAttribute('style', inlineStyles);
        });
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
