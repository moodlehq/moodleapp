// (C) Copyright 2015 Martin Dougiamas
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

import { Directive, Input, AfterViewInit, ElementRef } from '@angular/core';
import { Platform } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';

/**
 * Directive to handle external content.
 *
 * This directive should be used with any element that links to external content
 * which we want to have available when the app is offline. Typically media and links.
 *
 * If a file is downloaded, its URL will be replaced by the local file URL.
 */
@Directive({
    selector: '[core-external-content]'
})
export class CoreExternalContentDirective implements AfterViewInit {
    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.

    protected element: HTMLElement;
    protected logger;

    constructor(element: ElementRef, logger: CoreLoggerProvider, private filepoolProvider: CoreFilepoolProvider,
            private platform: Platform, private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider, private appProvider: CoreAppProvider) {
        // This directive can be added dynamically. In that case, the first param is the HTMLElement.
        this.element = element.nativeElement || element;
        this.logger = logger.getInstance('CoreExternalContentDirective');
    }

    /**
     * View has been initialized
     */
    ngAfterViewInit(): void {
        const currentSite = this.sitesProvider.getCurrentSite(),
            siteId = this.siteId || (currentSite && currentSite.getId()),
            tagName = this.element.tagName;
        let targetAttr,
            sourceAttr;

        if (tagName === 'A') {
            targetAttr = 'href';
            sourceAttr = 'href';

        } else if (tagName === 'IMG') {
            targetAttr = 'src';
            sourceAttr = 'src';

        } else if (tagName === 'AUDIO' || tagName === 'VIDEO' || tagName === 'SOURCE' || tagName === 'TRACK') {
            targetAttr = 'src';
            sourceAttr = 'target-src';

            if (tagName === 'VIDEO') {
                const poster = (<HTMLVideoElement> this.element).poster;
                if (poster) {
                    // Handle poster.
                    this.handleExternalContent('poster', poster, siteId).catch(() => {
                        // Ignore errors.
                    });
                }
            }

        } else {
            // Unsupported tag.
            this.logger.warn('Directive attached to non-supported tag: ' + tagName);

            return;
        }

        const url = this.element.getAttribute(sourceAttr) || this.element.getAttribute(targetAttr);
        this.handleExternalContent(targetAttr, url, siteId).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Add a new source with a certain URL as a sibling of the current element.
     *
     * @param {string} url URL to use in the source.
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
     * Handle external content, setting the right URL.
     *
     * @param {string} targetAttr Attribute to modify.
     * @param {string} url Original URL to treat.
     * @param {string} [siteId] Site ID.
     * @return {Promise<any>} Promise resolved if the element is successfully treated.
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

            if (targetAttr === 'src' && tagName !== 'SOURCE' && tagName !== 'TRACK') {
                promise = this.filepoolProvider.getSrcByUrl(siteId, url, this.component, this.componentId, 0, true, dwnUnknown);
            } else {
                promise = this.filepoolProvider.getUrlByUrl(siteId, url, this.component, this.componentId, 0, true, dwnUnknown);
            }

            return promise.then((finalUrl) => {
                this.logger.debug('Using URL ' + finalUrl + ' for ' + url);
                if (tagName === 'SOURCE') {
                    // The browser does not catch changes in SRC, we need to add a new source.
                    this.addSource(finalUrl);
                } else {
                    this.element.setAttribute(targetAttr, finalUrl);
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
                        if (!this.appProvider.isNetworkAccessLimited()) {
                            // We aren't using the result, so it doesn't matter which of the 2 functions we call.
                            this.filepoolProvider.getUrlByUrl(siteId, url, this.component, this.componentId, 0, false);
                        }
                    });
                }
            });
        });
    }
}
