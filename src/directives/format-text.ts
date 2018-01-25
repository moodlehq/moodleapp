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

import { Directive, ElementRef, Input, Output, EventEmitter, OnChanges, SimpleChange } from '@angular/core';
import { Platform, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../providers/app';
import { CoreFilepoolProvider } from '../providers/filepool';
import { CoreLoggerProvider } from '../providers/logger';
import { CoreSitesProvider } from '../providers/sites';
import { CoreDomUtilsProvider } from '../providers/utils/dom';
import { CoreTextUtilsProvider } from '../providers/utils/text';
import { CoreUrlUtilsProvider } from '../providers/utils/url';
import { CoreUtilsProvider } from '../providers/utils/utils';
import { CoreSite } from '../classes/site';
import { CoreLinkDirective } from '../directives/link';
import { CoreExternalContentDirective } from '../directives/external-content';
import { CoreContentLinksHelperProvider } from '../core/contentlinks/providers/helper';

/**
 * Directive to format text rendered. It renders the HTML and treats all links and media, using CoreLinkDirective
 * and CoreExternalContentDirective.
 *
 * Example usage:
 * <core-format-text [text]="myText" [component]="component" [componentId]="componentId"></core-format-text>
 *
 */
@Directive({
    selector: 'core-format-text'
})
export class CoreFormatTextDirective implements OnChanges {
    @Input() text: string; // The text to format.
    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component for CoreExternalContentDirective.
    @Input() componentId?: string|number; // Component ID to use in conjunction with the component.
    @Input() adaptImg?: boolean|string = true; // Whether to adapt images to screen width.
    @Input() clean?: boolean|string; // Whether all the HTML tags should be removed.
    @Input() singleLine?: boolean|string; // Whether new lines should be removed (all text in single line). Only valid if
                                          // clean=true.
    @Input() maxHeight?: number; // Max height in pixels to render the content box. It should be 50 at least to make sense.
                                 // Using this parameter will force display: block to calculate height better. If you want to
                                 // avoid this use class="inline" at the same time to use display: inline-block.
    @Input() fullOnClick?: boolean|string; // Whether it should open a new page with the full contents on click. Only if
                                           // "max-height" is set and the content has been collapsed.
    @Input() fullTitle?: string; // Title to use in full view. Defaults to "Description".
    @Output() afterRender?: EventEmitter<any>; // Called when the data is rendered.

    protected tagsToIgnore = ['AUDIO', 'VIDEO', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];
    protected element: HTMLElement;

    constructor(element: ElementRef, private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private translate: TranslateService, private platform: Platform,
            private utils: CoreUtilsProvider, private urlUtils: CoreUrlUtilsProvider, private loggerProvider: CoreLoggerProvider,
            private filepoolProvider: CoreFilepoolProvider, private appProvider: CoreAppProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider, private navCtrl: NavController) {
        this.element = element.nativeElement;
        this.element.classList.add('opacity-hide'); // Hide contents until they're treated.
        this.afterRender = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}) {
        if (changes.text) {
            this.formatAndRenderContents();
        }
    }

    /**
     * Apply CoreExternalContentDirective to a certain element.
     *
     * @param {HTMLElement} element Element to add the attributes to.
     */
    protected addExternalContent(element: HTMLElement) : void {
        // Angular 2 doesn't let adding directives dynamically. Create the CoreExternalContentDirective manually.
        let extContent = new CoreExternalContentDirective(<any>element, this.loggerProvider, this.filepoolProvider, this.platform,
                this.sitesProvider, this.domUtils, this.urlUtils, this.appProvider);

        extContent.component = this.component;
        extContent.componentId = this.componentId;
        extContent.siteId = this.siteId;

        extContent.ngAfterViewInit();
    }

    /**
     * Add class to adapt media to a certain element.
     *
     * @param {HTMLElement} element Element to add the class to.
     */
    protected addMediaAdaptClass(element: HTMLElement) : void {
        element.classList.add('core-media-adapt-width');
    }

    /**
     * Wrap an image with a container to adapt its width and, if needed, add an anchor to view it in full size.
     *
     * @param {number} elWidth Width of the directive's element.
     * @param {HTMLElement} img Image to adapt.
     */
    protected adaptImage(elWidth: number, img: HTMLElement) : void {
        let imgWidth = this.getElementWidth(img),
            // Element to wrap the image.
            container = document.createElement('span');

        container.classList.add('core-adapted-img-container');
        container.style.cssFloat = img.style.cssFloat; // Copy the float to correctly position the search icon.
        if (img.classList.contains('atto_image_button_right')) {
            container.classList.add('atto_image_button_right');
        } else if (img.classList.contains('atto_image_button_left')) {
            container.classList.add('atto_image_button_left');
        }

        this.domUtils.wrapElement(img, container);

        if (imgWidth > elWidth) {
            // The image has been adapted, add an anchor to view it in full size.
            this.addMagnifyingGlass(container, img);
        }
    }

    /**
     * Add a magnifying glass icon to view an image at full size.
     *
     * @param {HTMLElement} container The container of the image.
     * @param {HTMLElement} img The image.
     */
    addMagnifyingGlass(container: HTMLElement, img: HTMLElement) : void {
        let imgSrc = this.textUtils.escapeHTML(img.getAttribute('src')),
            label = this.textUtils.escapeHTML(this.translate.instant('core.openfullimage')),
            anchor = document.createElement('a');

        anchor.classList.add('core-image-viewer-icon');
        anchor.setAttribute('aria-label', label);
        // Add an ion-icon item to apply the right styles, but the ion-icon component won't be executed.
        anchor.innerHTML = '<ion-icon name="search" class="icon icon-md ion-md-search"></ion-icon>';

        anchor.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.domUtils.viewImage(imgSrc, img.getAttribute('alt'), this.component, this.componentId);
        });

        container.appendChild(anchor);
    }

    /**
     * Finish the rendering, displaying the element again and calling afterRender.
     */
    protected finishRender() : void {
        // Show the element again.
        this.element.classList.remove('opacity-hide');
        // Emit the afterRender output.
        this.afterRender.emit();
    }

    /**
     * Format contents and render.
     */
    protected formatAndRenderContents() : void {
        if (!this.text) {
            this.element.innerHTML = ''; // Remove current contents.
            this.finishRender();
            return;
        }

        this.text = this.text.trim();

        this.formatContents().then((div: HTMLElement) => {
            // Disable media adapt to correctly calculate the height.
            this.element.classList.add('core-disable-media-adapt');

            this.element.innerHTML = ''; // Remove current contents.
            if (this.maxHeight && div.innerHTML != "") {
                // Move the children to the current element to be able to calculate the height.
                // @todo: Display the element?
                this.domUtils.moveChildren(div, this.element);

                // Height cannot be calculated if the element is not shown while calculating.
                // Force shorten if it was previously shortened.
                // @todo: Work on calculate this height better.
                let height = this.element.style.maxHeight ? 0 : this.getElementHeight(this.element);

                // If cannot calculate height, shorten always.
                if (!height || height > this.maxHeight) {
                    let expandInFullview = this.utils.isTrueOrOne(this.fullOnClick) || false,
                        showMoreDiv = document.createElement('div');

                    showMoreDiv.classList.add('core-show-more');
                    showMoreDiv.innerHTML = this.translate.instant('core.showmore');
                    this.element.appendChild(showMoreDiv);

                    if (expandInFullview) {
                        this.element.classList.add('core-expand-in-fullview');
                    }
                    this.element.classList.add('core-text-formatted');
                    this.element.classList.add('core-shortened');
                    this.element.style.maxHeight = this.maxHeight + 'px';

                    this.element.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        let target = <HTMLElement> e.target;

                        if (this.tagsToIgnore.indexOf(target.tagName) === -1 || (target.tagName === 'A' &&
                                !target.getAttribute('href'))) {
                            if (!expandInFullview) {
                                // Change class.
                                this.element.classList.toggle('core-shortened');
                                return;
                            }
                        }

                        // Open a new state with the contents.
                        this.textUtils.expandText(this.fullTitle || this.translate.instant('core.description'), this.text,
                            this.component, this.componentId);
                    });
                }
            } else {
                this.domUtils.moveChildren(div, this.element);
            }

            this.element.classList.remove('core-disable-media-adapt');
            this.finishRender();
        });
    }

    /**
     * Apply formatText and set sub-directives.
     *
     * @return {Promise<HTMLElement>} Promise resolved with a div element containing the code.
     */
    protected formatContents() : Promise<HTMLElement> {

        let site: CoreSite;

        // Retrieve the site since it might be needed later.
        return this.sitesProvider.getSite(this.siteId).catch(() => {
            // Error getting the site. This probably means that there is no current site and no siteId was supplied.
        }).then((siteInstance: CoreSite) => {
            site = siteInstance;

            // Apply format text function.
            return this.textUtils.formatText(this.text, this.utils.isTrueOrOne(this.clean),
                this.utils.isTrueOrOne(this.singleLine));
        }).then((formatted) => {
            let div = document.createElement('div'),
                canTreatVimeo = site && site.isVersionGreaterEqualThan(['3.3.4', '3.4']),
                images,
                anchors,
                audios,
                videos,
                iframes,
                buttons;

            div.innerHTML = formatted;
            images = Array.from(div.querySelectorAll('img'));
            anchors = Array.from(div.querySelectorAll('a'));
            audios = Array.from(div.querySelectorAll('audio'));
            videos = Array.from(div.querySelectorAll('video'));
            iframes = Array.from(div.querySelectorAll('iframe'));
            buttons = Array.from(div.querySelectorAll('.button'));

            // Walk through the content to find the links and add our directive to it.
            // Important: We need to look for links first because in 'img' we add new links without core-link.
            anchors.forEach((anchor) => {
                // Angular 2 doesn't let adding directives dynamically. Create the CoreLinkDirective manually.
                let linkDir = new CoreLinkDirective(anchor, this.domUtils, this.utils, this.sitesProvider, this.urlUtils,
                        this.contentLinksHelper, this.navCtrl);
                linkDir.capture = true;
                linkDir.ngOnInit();

                this.addExternalContent(anchor);
            });

            if (images && images.length > 0) {
                // If cannot calculate element's width, use a medium number to avoid false adapt image icons appearing.
                let elWidth = this.getElementWidth(this.element) || 100;

                // Walk through the content to find images, and add our directive.
                images.forEach((img: HTMLElement) => {
                    this.addMediaAdaptClass(img);
                    this.addExternalContent(img);
                    if (this.utils.isTrueOrOne(this.adaptImg)) {
                        this.adaptImage(elWidth, img);
                    }
                });
            }

            audios.forEach((audio) => {
                this.treatMedia(audio);
                if (this.platform.is('ios')) {
                    // Set data-tap-disabled="true" to make slider work in iOS.
                    audio.setAttribute('data-tap-disabled', true);
                }
            });

            videos.forEach((video) => {
                this.treatVideoFilters(video);
                this.treatMedia(video);
                // Set data-tap-disabled="true" to make controls work in Android (see MOBILE-1452).
                video.setAttribute('data-tap-disabled', true);
            });

            iframes.forEach((iframe) => {
                this.treatIframe(iframe, site, canTreatVimeo);
            });

            // Handle buttons with inner links.
            buttons.forEach((button: HTMLElement) => {
                // Check if it has a link inside.
                if (button.querySelector('a')) {
                    button.classList.add('core-button-with-inner-link');
                }
            });

            return div;
        });
    }

    /**
     * Returns the element width in pixels.
     *
     * @param {HTMLElement} element Element to get width from.
     * @return {number} The width of the element in pixels. When 0 is returned it means the element is not visible.
     */
    protected getElementWidth(element: HTMLElement) : number {
        let width = this.domUtils.getElementWidth(element);

        if (!width) {
            // All elements inside are floating or inline. Change display mode to allow calculate the width.
            let parentWidth = this.domUtils.getElementWidth(element.parentNode, true, false, false, true),
                previousDisplay = getComputedStyle(element, null).display;

            element.style.display = 'inline-block';

            width = this.domUtils.getElementWidth(element);

            // If width is incorrectly calculated use parent width instead.
            if (parentWidth > 0 && (!width || width > parentWidth)) {
                width = parentWidth;
            }

            element.style.display = previousDisplay;
        }

        return width;
    }

    /**
     * Returns the element height in pixels.
     *
     * @param {HTMLElement} elementAng Element to get height from.
     * @return {number} The height of the element in pixels. When 0 is returned it means the element is not visible.
     */
    protected getElementHeight(element: HTMLElement) : number {
        return this.domUtils.getElementHeight(element) || 0;
    }

    /**
     * Treat video filters. Currently only treating youtube video using video JS.
     *
     * @param {HTMLElement} el Video element.
     */
    protected treatVideoFilters(video: HTMLElement) : void {
        // Treat Video JS Youtube video links and translate them to iframes.
        if (!video.classList.contains('video-js')) {
            return;
        }

        let data = JSON.parse(video.getAttribute('data-setup') || video.getAttribute('data-setup-lazy') || '{}'),
            youtubeId = data.techOrder && data.techOrder[0] && data.techOrder[0] == 'youtube' && data.sources && data.sources[0] &&
                data.sources[0].src && this.youtubeGetId(data.sources[0].src);

        if (!youtubeId) {
            return;
        }

        let iframe = document.createElement('iframe');
        iframe.id = video.id;
        iframe.src = 'https://www.youtube.com/embed/' + youtubeId;
        iframe.setAttribute('frameborder', '0');
        iframe.width = '100%';
        iframe.height = '300';

        // Replace video tag by the iframe.
        video.parentNode.replaceChild(iframe, video);
    }

    /**
     * Add media adapt class and apply CoreExternalContentDirective to the media element and its sources and tracks.
     *
     * @param {HTMLElement} element Video or audio to treat.
     */
    protected treatMedia(element: HTMLElement) : void {
        this.addMediaAdaptClass(element);
        this.addExternalContent(element);

        let sources = Array.from(element.querySelectorAll('source')),
            tracks = Array.from(element.querySelectorAll('track'));

        sources.forEach((source) => {
            source.setAttribute('target-src', source.getAttribute('src'));
            source.removeAttribute('src');
            this.addExternalContent(source);
        });

        tracks.forEach((track) => {
            this.addExternalContent(track);
        });
    }

    /**
     * Add media adapt class and treat the iframe source.
     *
     * @param {HTMLIFrameElement} iframe Iframe to treat.
     * @param {CoreSite} site Site instance.
     * @param  {Boolean} canTreatVimeo Whether Vimeo videos can be treated in the site.
     */
    protected treatIframe(iframe: HTMLIFrameElement, site: CoreSite, canTreatVimeo: boolean) : void {
        this.addMediaAdaptClass(iframe);

        if (iframe.src && canTreatVimeo) {
            // Check if it's a Vimeo video. If it is, use the wsplayer script instead to make restricted videos work.
            let matches = iframe.src.match(/https?:\/\/player\.vimeo\.com\/video\/([^\/]*)/);
            if (matches && matches[1]) {
                let newUrl = this.textUtils.concatenatePaths(site.getURL(), '/media/player/vimeo/wsplayer.php?video=') +
                        matches[1] + '&token=' + site.getToken();
                if (iframe.width) {
                    newUrl = newUrl + '&width=' + iframe.width;
                }
                if (iframe.height) {
                    newUrl = newUrl + '&height=' + iframe.height;
                }

                iframe.src = newUrl;
            }
        }
    }

    /**
     * Convenience function to extract YouTube Id to translate to embedded video.
     * Based on http://stackoverflow.com/questions/3452546/javascript-regex-how-to-get-youtube-video-id-from-url
     *
     * @param {string} url URL of the video.
     */
    protected youtubeGetId(url: string) : string {
        let regExp = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??v?=?([^#\&\?]*).*/,
            match = url.match(regExp);
        return (match && match[1].length == 11) ? match[1] : '';
    }
}
