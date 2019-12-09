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
    Directive, ElementRef, Input, Output, EventEmitter, OnChanges, SimpleChange, Optional, ViewContainerRef
} from '@angular/core';
import { Platform, NavController, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreIframeUtilsProvider } from '@providers/utils/iframe';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSite } from '@classes/site';
import { CoreLinkDirective } from '../directives/link';
import { CoreExternalContentDirective } from '../directives/external-content';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreFilterProvider, CoreFilterFilter, CoreFilterFormatTextOptions } from '@core/filter/providers/filter';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CoreFilterDelegate } from '@core/filter/providers/delegate';

/**
 * Directive to format text rendered. It renders the HTML and treats all links and media, using CoreLinkDirective
 * and CoreExternalContentDirective. It also applies filters if needed.
 *
 * Please use this directive if your text needs to be filtered or it can contain links or media (images, audio, video).
 *
 * Example usage:
 * <core-format-text [text]="myText" [component]="component" [componentId]="componentId"></core-format-text>
 */
@Directive({
    selector: 'core-format-text'
})
export class CoreFormatTextDirective implements OnChanges {
    @Input() text: string; // The text to format.
    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component for CoreExternalContentDirective.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.
    @Input() adaptImg?: boolean | string = true; // Whether to adapt images to screen width.
    @Input() clean?: boolean | string; // Whether all the HTML tags should be removed.
    @Input() singleLine?: boolean | string; // Whether new lines should be removed (all text in single line). Only if clean=true.
    @Input() maxHeight?: number; // Max height in pixels to render the content box. It should be 50 at least to make sense.
                                 // Using this parameter will force display: block to calculate height better.
                                 // If you want to avoid this use class="inline" at the same time to use display: inline-block.
    @Input() fullOnClick?: boolean | string; // Whether it should open a new page with the full contents on click.
    @Input() fullTitle?: string; // Title to use in full view. Defaults to "Description".
    @Input() highlight?: string; // Text to highlight.
    @Input() filter?: boolean | string; // Whether to filter the text. If not defined, true if contextLevel and instanceId are set.
    @Input() contextLevel?: string; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Input() wsNotFiltered?: boolean | string; // If true it means the WS didn't filter the text for some reason.
    @Output() afterRender?: EventEmitter<any>; // Called when the data is rendered.

    protected element: HTMLElement;
    protected showMoreDisplayed: boolean;
    protected loadingChangedListener;

    constructor(element: ElementRef,
            private sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider,
            private translate: TranslateService,
            private platform: Platform,
            private utils: CoreUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private loggerProvider: CoreLoggerProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private appProvider: CoreAppProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider,
            @Optional() private navCtrl: NavController,
            @Optional() private content: Content, @Optional()
            private svComponent: CoreSplitViewComponent,
            private iframeUtils: CoreIframeUtilsProvider,
            private eventsProvider: CoreEventsProvider,
            private filterProvider: CoreFilterProvider,
            private filterHelper: CoreFilterHelperProvider,
            private filterDelegate: CoreFilterDelegate,
            private viewContainerRef: ViewContainerRef) {

        this.element = element.nativeElement;
        this.element.classList.add('opacity-hide'); // Hide contents until they're treated.
        this.afterRender = new EventEmitter();

        this.element.addEventListener('click', this.elementClicked.bind(this));
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.text) {
            this.hideShowMore();
            this.formatAndRenderContents();
        }
    }

    /**
     * Apply CoreExternalContentDirective to a certain element.
     *
     * @param element Element to add the attributes to.
     * @return External content instance.
     */
    protected addExternalContent(element: HTMLElement): CoreExternalContentDirective {
        // Angular 2 doesn't let adding directives dynamically. Create the CoreExternalContentDirective manually.
        const extContent = new CoreExternalContentDirective(<any> element, this.loggerProvider, this.filepoolProvider,
            this.platform, this.sitesProvider, this.domUtils, this.urlUtils, this.appProvider, this.utils);

        extContent.component = this.component;
        extContent.componentId = this.componentId;
        extContent.siteId = this.siteId;
        extContent.src = element.getAttribute('src');
        extContent.href = element.getAttribute('href');
        extContent.targetSrc = element.getAttribute('target-src');
        extContent.poster = element.getAttribute('poster');

        extContent.ngAfterViewInit();

        return extContent;
    }

    /**
     * Add class to adapt media to a certain element.
     *
     * @param element Element to add the class to.
     */
    protected addMediaAdaptClass(element: HTMLElement): void {
        element.classList.add('core-media-adapt-width');
    }

    /**
     * Wrap an image with a container to adapt its width.
     *
     * @param img Image to adapt.
     */
    protected adaptImage(img: HTMLElement): void {
        // Element to wrap the image.
        const container = document.createElement('span'),
            originalWidth = img.attributes.getNamedItem('width');

        const forcedWidth = parseInt(originalWidth && originalWidth.value);
        if (!isNaN(forcedWidth)) {
            if (originalWidth.value.indexOf('%') < 0) {
                img.style.width = forcedWidth  + 'px';
            } else {
                img.style.width = forcedWidth  + '%';
            }
        }

        container.classList.add('core-adapted-img-container');
        container.style.cssFloat = img.style.cssFloat; // Copy the float to correctly position the search icon.
        if (img.classList.contains('atto_image_button_right')) {
            container.classList.add('atto_image_button_right');
        } else if (img.classList.contains('atto_image_button_left')) {
            container.classList.add('atto_image_button_left');
        } else if (img.classList.contains('atto_image_button_text-top')) {
            container.classList.add('atto_image_button_text-top');
        } else if (img.classList.contains('atto_image_button_middle')) {
            container.classList.add('atto_image_button_middle');
        } else if (img.classList.contains('atto_image_button_text-bottom')) {
            container.classList.add('atto_image_button_text-bottom');
        }

        this.domUtils.wrapElement(img, container);
    }

    /**
     * Add magnifying glass icons to view adapted images at full size.
     */
    addMagnifyingGlasses(): void {
        const imgs = Array.from(this.element.querySelectorAll('.core-adapted-img-container > img'));
        if (!imgs.length) {
            return;
        }

        // If cannot calculate element's width, use viewport width to avoid false adapt image icons appearing.
        const elWidth = this.getElementWidth(this.element) || window.innerWidth;

        imgs.forEach((img: HTMLImageElement) => {
            // Skip image if it's inside a link.
            if (img.closest('a')) {
                return;
            }

            let imgWidth = parseInt(img.getAttribute('width'));
            if (!imgWidth) {
                // No width attribute, use real size.
                imgWidth = img.naturalWidth;
            }

            if (imgWidth <= elWidth) {
                return;
            }

            const imgSrc = this.textUtils.escapeHTML(img.getAttribute('data-original-src') || img.getAttribute('src')),
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

            img.parentNode.appendChild(anchor);
        });
    }

    /**
     * Calculate the height and check if we need to display show more or not.
     */
    protected calculateHeight(): void {
        // @todo: Work on calculate this height better.

        // Remove max-height (if any) to calculate the real height.
        const initialMaxHeight = this.element.style.maxHeight;
        this.element.style.maxHeight = null;

        const height = this.getElementHeight(this.element);

        // Restore the max height now.
        this.element.style.maxHeight = initialMaxHeight;

        // If cannot calculate height, shorten always.
        if (!height || height > this.maxHeight) {
            if (!this.showMoreDisplayed) {
                this.displayShowMore();
            }
        } else if (this.showMoreDisplayed) {
            this.hideShowMore();
        }
    }

    /**
     * Display the "Show more" in the element.
     */
    protected displayShowMore(): void {
        const expandInFullview = this.utils.isTrueOrOne(this.fullOnClick) || false,
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

        this.showMoreDisplayed = true;
    }

    /**
     * Listener to call when the element is clicked.
     *
     * @param e Click event.
     */
    protected elementClicked(e: MouseEvent): void {
        if (e.defaultPrevented) {
            // Ignore it if the event was prevented by some other listener.
            return;
        }

        const expandInFullview = this.utils.isTrueOrOne(this.fullOnClick) || false;

        if (!expandInFullview && !this.showMoreDisplayed) {
            // Nothing to do on click, just stop.
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (!expandInFullview) {
            // Change class.
            this.element.classList.toggle('core-shortened');

            return;
        } else {
            // Open a new state with the contents.
            const filter = this.utils.isTrueOrOne(this.filter);

            this.textUtils.expandText(this.fullTitle || this.translate.instant('core.description'), this.text,
                this.component, this.componentId, undefined, filter, this.contextLevel, this.contextInstanceId, this.courseId);
        }
    }

    /**
     * Finish the rendering, displaying the element again and calling afterRender.
     */
    protected finishRender(): void {
        // Show the element again.
        this.element.classList.remove('opacity-hide');
        // Emit the afterRender output.
        this.afterRender.emit();
    }

    /**
     * Format contents and render.
     */
    protected formatAndRenderContents(): void {
        if (!this.text) {
            this.element.innerHTML = ''; // Remove current contents.
            this.finishRender();

            return;
        }

        // In AOT the inputs and ng-reflect aren't in the DOM sometimes. Add them so styles are applied.
        if (this.maxHeight && !this.element.getAttribute('maxHeight')) {
            this.element.setAttribute('maxHeight', String(this.maxHeight));
        }
        if (!this.element.getAttribute('singleLine')) {
            this.element.setAttribute('singleLine', String(this.utils.isTrueOrOne(this.singleLine)));
        }

        this.text = this.text ? this.text.trim() : '';

        this.formatContents().then((result) => {
            // Disable media adapt to correctly calculate the height.
            this.element.classList.add('core-disable-media-adapt');

            this.element.innerHTML = ''; // Remove current contents.
            if (this.maxHeight && result.div.innerHTML != '') {

                // Move the children to the current element to be able to calculate the height.
                this.domUtils.moveChildren(result.div, this.element);

                // Calculate the height now.
                this.calculateHeight();

                // Add magnifying glasses to images.
                this.addMagnifyingGlasses();

                if (!this.loadingChangedListener) {
                    // Recalculate the height if a parent core-loading displays the content.
                    this.loadingChangedListener = this.eventsProvider.on(CoreEventsProvider.CORE_LOADING_CHANGED, (data) => {
                        if (data.loaded && this.domUtils.closest(this.element.parentElement, '#' + data.uniqueId)) {
                            // The format-text is inside the loading, re-calculate the height.
                            this.calculateHeight();
                        }
                    });
                }
            } else {
                this.domUtils.moveChildren(result.div, this.element);

                // Add magnifying glasses to images.
                this.addMagnifyingGlasses();
            }

            if (result.options.filter) {
                // Let filters hnadle HTML. We do it here because we don't want them to block the render of the text.
                this.filterDelegate.handleHtml(this.element, result.filters, this.viewContainerRef, result.options, [],
                        this.component, this.componentId, result.siteId);
            }

            this.element.classList.remove('core-disable-media-adapt');
            this.finishRender();
        });
    }

    /**
     * Apply formatText and set sub-directives.
     *
     * @return Promise resolved with a div element containing the code.
     */
    protected formatContents(): Promise<{div: HTMLElement, filters: CoreFilterFilter[], options: CoreFilterFormatTextOptions,
            siteId: string}> {

        const result = {
            div: <HTMLElement> null,
            filters: <CoreFilterFilter[]> [],
            options: <CoreFilterFormatTextOptions> {},
            siteId: this.siteId
        };
        let site: CoreSite;

        // Retrieve the site since it might be needed later.
        return this.sitesProvider.getSite(this.siteId).catch(() => {
            // Error getting the site. This probably means that there is no current site and no siteId was supplied.
        }).then((siteInstance: CoreSite) => {
            site = siteInstance;

            if (site) {
                result.siteId = site.getId();
            }

            if (this.contextLevel == 'course' && this.contextInstanceId <= 0) {
                this.contextInstanceId = site.getSiteHomeId();
            }

            this.filter = typeof this.filter == 'undefined' ? !!(this.contextLevel && this.contextInstanceId) : !!this.filter;

            result.options = {
                clean: this.utils.isTrueOrOne(this.clean),
                singleLine: this.utils.isTrueOrOne(this.singleLine),
                highlight: this.highlight,
                courseId: this.courseId,
                wsNotFiltered: this.utils.isTrueOrOne(this.wsNotFiltered)
            };

            if (this.filter) {
                return this.filterHelper.getFiltersAndFormatText(this.text, this.contextLevel, this.contextInstanceId,
                        result.options, result.siteId).then((res) => {

                    result.filters = res.filters;

                    return res.text;
                });
            } else {
                return this.filterProvider.formatText(this.text, result.options, [], result.siteId);
            }

        }).then((formatted) => {
            const div = document.createElement('div'),
                canTreatVimeo = site && site.isVersionGreaterEqualThan(['3.3.4', '3.4']),
                navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
            let images,
                anchors,
                audios,
                videos,
                iframes,
                buttons,
                elementsWithInlineStyles,
                stopClicksElements,
                frames;

            div.innerHTML = formatted;
            images = Array.from(div.querySelectorAll('img'));
            anchors = Array.from(div.querySelectorAll('a'));
            audios = Array.from(div.querySelectorAll('audio'));
            videos = Array.from(div.querySelectorAll('video'));
            iframes = Array.from(div.querySelectorAll('iframe'));
            buttons = Array.from(div.querySelectorAll('.button'));
            elementsWithInlineStyles = Array.from(div.querySelectorAll('*[style]'));
            stopClicksElements = Array.from(div.querySelectorAll('button,input,select,textarea'));
            frames = Array.from(div.querySelectorAll(CoreIframeUtilsProvider.FRAME_TAGS.join(',').replace(/iframe,?/, '')));

            // Walk through the content to find the links and add our directive to it.
            // Important: We need to look for links first because in 'img' we add new links without core-link.
            anchors.forEach((anchor) => {
                // Angular 2 doesn't let adding directives dynamically. Create the CoreLinkDirective manually.
                const linkDir = new CoreLinkDirective(anchor, this.domUtils, this.utils, this.sitesProvider, this.urlUtils,
                    this.contentLinksHelper, this.navCtrl, this.content, this.svComponent, this.textUtils);
                linkDir.capture = true;
                linkDir.ngOnInit();

                this.addExternalContent(anchor);
            });

            const externalImages: CoreExternalContentDirective[] = [];
            if (images && images.length > 0) {
                // Walk through the content to find images, and add our directive.
                images.forEach((img: HTMLElement) => {
                    this.addMediaAdaptClass(img);

                    const externalImage = this.addExternalContent(img);
                    if (!externalImage.invalid) {
                        externalImages.push(externalImage);
                    }

                    if (this.utils.isTrueOrOne(this.adaptImg) && !img.classList.contains('icon')) {
                        this.adaptImage(img);
                    }
                });
            }

            audios.forEach((audio) => {
                this.treatMedia(audio);
            });

            videos.forEach((video) => {
                this.treatMedia(video);
            });

            iframes.forEach((iframe) => {
                this.treatIframe(iframe, site, canTreatVimeo, navCtrl);
            });

            // Handle buttons with inner links.
            buttons.forEach((button: HTMLElement) => {
                // Check if it has a link inside.
                if (button.querySelector('a')) {
                    button.classList.add('core-button-with-inner-link');
                }
            });

            // Handle inline styles.
            elementsWithInlineStyles.forEach((el: HTMLElement) => {
                // Only add external content for tags that haven't been treated already.
                if (el.tagName != 'A' && el.tagName != 'IMG' && el.tagName != 'AUDIO' && el.tagName != 'VIDEO'
                        && el.tagName != 'SOURCE' && el.tagName != 'TRACK') {
                    this.addExternalContent(el);
                }
            });

            // Stop propagating click events.
            stopClicksElements.forEach((element: HTMLElement) => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });

            // Handle all kind of frames.
            frames.forEach((frame: any) => {
                this.iframeUtils.treatFrame(frame, false, navCtrl);
            });

            this.domUtils.handleBootstrapTooltips(div);

            // Wait for images to load.
            let promise: Promise<any> = null;
            if (externalImages.length) {
                // Automatically reject the promise after 5 seconds to prevent blocking the user forever.
                promise = this.utils.timeoutPromise(this.utils.allPromises(externalImages.map((externalImage): any => {
                    if (externalImage.loaded) {
                        // Image has already been loaded, no need to wait.
                        return Promise.resolve();
                    }

                    return new Promise((resolve): void => {
                        const subscription = externalImage.onLoad.subscribe(() => {
                            subscription.unsubscribe();
                            resolve();
                        });
                    });
                })), 5000);
            } else {
                promise = Promise.resolve();
            }

            return promise.catch(() => {
                // Ignore errors. So content gets always shown.
            }).then(() => {
                result.div = div;

                return result;
            });
        });
    }

    /**
     * Returns the element width in pixels.
     *
     * @param element Element to get width from.
     * @return The width of the element in pixels. When 0 is returned it means the element is not visible.
     */
    protected getElementWidth(element: HTMLElement): number {
        let width = this.domUtils.getElementWidth(element);

        if (!width) {
            // All elements inside are floating or inline. Change display mode to allow calculate the width.
            const parentWidth = this.domUtils.getElementWidth(element.parentNode, true, false, false, true),
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
     * @param elementAng Element to get height from.
     * @return The height of the element in pixels. When 0 is returned it means the element is not visible.
     */
    protected getElementHeight(element: HTMLElement): number {
        return this.domUtils.getElementHeight(element) || 0;
    }

    /**
     * "Hide" the "Show more" in the element if it's shown.
     */
    protected hideShowMore(): void {
        const showMoreDiv = this.element.querySelector('div.core-show-more');

        if (showMoreDiv) {
            showMoreDiv.remove();
        }

        this.element.classList.remove('core-expand-in-fullview');
        this.element.classList.remove('core-text-formatted');
        this.element.classList.remove('core-shortened');
        this.element.style.maxHeight = null;
        this.showMoreDisplayed = false;
    }

    /**
     * Add media adapt class and apply CoreExternalContentDirective to the media element and its sources and tracks.
     *
     * @param element Video or audio to treat.
     */
    protected treatMedia(element: HTMLElement): void {
        this.addMediaAdaptClass(element);
        this.addExternalContent(element);

        const sources = Array.from(element.querySelectorAll('source')),
            tracks = Array.from(element.querySelectorAll('track'));

        sources.forEach((source) => {
            source.setAttribute('target-src', source.getAttribute('src'));
            source.removeAttribute('src');
            this.addExternalContent(source);
        });

        tracks.forEach((track) => {
            this.addExternalContent(track);
        });

        // Stop propagating click events.
        element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Add media adapt class and treat the iframe source.
     *
     * @param iframe Iframe to treat.
     * @param site Site instance.
     * @param canTreatVimeo Whether Vimeo videos can be treated in the site.
     * @param navCtrl NavController to use.
     */
    protected treatIframe(iframe: HTMLIFrameElement, site: CoreSite, canTreatVimeo: boolean, navCtrl: NavController): void {
        const src = iframe.src,
            currentSite = this.sitesProvider.getCurrentSite();

        this.addMediaAdaptClass(iframe);

        if (currentSite && currentSite.containsUrl(src)) {
            // URL points to current site, try to use auto-login.
            currentSite.getAutoLoginUrl(src, false).then((finalUrl) => {
                iframe.src = finalUrl;

                this.iframeUtils.treatFrame(iframe, false, navCtrl);
            });

            return;
        }

        if (src && canTreatVimeo) {
            // Check if it's a Vimeo video. If it is, use the wsplayer script instead to make restricted videos work.
            const matches = iframe.src.match(/https?:\/\/player\.vimeo\.com\/video\/([0-9]+)/);
            if (matches && matches[1]) {
                let newUrl = this.textUtils.concatenatePaths(site.getURL(), '/media/player/vimeo/wsplayer.php?video=') +
                    matches[1] + '&token=' + site.getToken();

                // Width and height are mandatory, we need to calculate them.
                let width, height;

                if (iframe.width) {
                    width = iframe.width;
                } else {
                    width = this.getElementWidth(iframe);
                    if (!width) {
                        width = window.innerWidth;
                    }
                }

                if (iframe.height) {
                    height = iframe.height;
                } else {
                    height = this.getElementHeight(iframe);
                    if (!height) {
                        height = width;
                    }
                }

                // Width and height parameters are required in 3.6 and older sites.
                if (!site.isVersionGreaterEqualThan('3.7')) {
                    newUrl += '&width=' + width + '&height=' + height;
                }
                iframe.src = newUrl;

                if (!iframe.width) {
                    iframe.width = width;
                }
                if (!iframe.height) {
                    iframe.height = height;
                }

                // Do the iframe responsive.
                if (iframe.parentElement.classList.contains('embed-responsive')) {
                    iframe.addEventListener('load', () => {
                        if (iframe.contentDocument) {
                            const css = document.createElement('style');
                            css.setAttribute('type', 'text/css');
                            css.innerHTML = 'iframe {width: 100%;height: 100%;}';
                            iframe.contentDocument.head.appendChild(css);
                        }
                    });
                }
            }
        }

        this.iframeUtils.treatFrame(iframe, false, navCtrl);
    }
}
