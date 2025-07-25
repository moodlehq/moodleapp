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
    ElementRef,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChange,
    ViewContainerRef,
    ViewChild,
    OnDestroy,
    ChangeDetectorRef,
    inject,
} from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreIframe } from '@singletons/iframe';
import { CoreText } from '@singletons/text';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreSite } from '@classes/sites/site';
import { NgZone, Translate } from '@singletons';
import { CoreExternalContentDirective } from './external-content';
import { CoreLinkDirective } from './link';
import { CoreFilter, CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreFilterDelegate } from '@features/filter/services/filter-delegate';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreCollapsibleItemDirective } from './collapsible-item';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { AsyncDirective } from '@classes/async-directive';
import { CoreDom } from '@singletons/dom';
import { CoreEvents } from '@singletons/events';
import { CoreRefreshContext, CORE_REFRESH_CONTEXT } from '@/core/utils/refresh-context';
import { CorePlatform } from '@services/platform';
import { ElementController } from '@classes/element-controllers/ElementController';
import { MediaElementController } from '@classes/element-controllers/MediaElementController';
import { FrameElement, FrameElementController } from '@classes/element-controllers/FrameElementController';
import { CoreUrl } from '@singletons/url';
import { CoreIcons } from '@singletons/icons';
import { ContextLevel } from '../constants';
import { CoreWait } from '@singletons/wait';
import { toBoolean } from '../transforms/boolean';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreBootstrap } from '@singletons/bootstrap';

/**
 * Directive to format text rendered. It renders the HTML and treats all links and media, using CoreLinkDirective
 * and CoreExternalContentDirective. It also applies filters if needed.
 *
 * Please use this directive if your text needs to be filtered or it can contain links or media (images, audio, video).
 *
 * Example usage:
 * <core-format-text [text]="myText" [component]="component" [componentId]="componentId" />
 */
@Directive({
    selector: 'core-format-text',
})
export class CoreFormatTextDirective implements OnChanges, OnDestroy, AsyncDirective {

    @ViewChild(CoreCollapsibleItemDirective) collapsible?: CoreCollapsibleItemDirective;

    @Input() text?: string; // The text to format.
    @Input() siteId?: string; // Site ID to use.
    @Input() component?: string; // Component for CoreExternalContentDirective.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.
    @Input({ transform: toBoolean }) adaptImg = true; // Whether to adapt images to screen width.
    @Input({ transform: toBoolean }) clean = false; // Whether all the HTML tags should be removed.
    @Input({ transform: toBoolean }) singleLine = false; // Whether new lines should be removed. Only if clean=true.
    @Input({ transform: toBoolean }) sanitize = false; // Whether to sanitize the text.
    @Input() highlight?: string; // Text to highlight.
    @Input({ transform: toBoolean }) filter?: boolean; // Whether to filter the text.
                                                       // If not defined, true if contextLevel and instanceId are set.
    @Input() contextLevel?: ContextLevel; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) wsNotFiltered = false; // If true it means the WS didn't filter the text for some reason.
    @Input({ transform: toBoolean }) captureLinks = true; // Whether links should tried to be opened inside the app.
    @Input({ transform: toBoolean }) openLinksInApp?: boolean; // Whether links should be opened in InAppBrowser.
    @Input({ transform: toBoolean }) showBrowserWarningInLinks = true; // Whether to show browser warning in all links.
    @Input({ transform: toBoolean }) disabled = false; // If disabled, autoplay elements will be disabled.

    /**
     * @deprecated since 5.0. Not used anymore.
     */
    @Input() hideIfEmpty = false; // If true, the tag will contain nothing if text is empty.

    @Output() afterRender = new EventEmitter<void>(); // Called when the data is rendered.
    @Output() filterContentRenderingComplete = new EventEmitter<void>(); // Called when the filters have finished rendering content.
    @Output() onClick: EventEmitter<void> = new EventEmitter(); // Called when clicked.

    protected elementControllers: ElementController[] = [];
    protected domPromises: CoreCancellablePromise<void>[] = [];
    protected domElementPromise?: CoreCancellablePromise<void>;
    protected externalContentInstances: CoreExternalContentDirective[] = [];
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected viewContainerRef = inject(ViewContainerRef);
    protected refreshContext = inject<CoreRefreshContext>(CORE_REFRESH_CONTEXT, { optional: true });

    protected static readonly EMPTY_TEXT = '&nbsp;';

    constructor() {
        CoreDirectivesRegistry.register(this.element, this);

        this.element.classList.add('core-loading'); // Hide contents until they're treated.

        this.element.innerHTML = CoreFormatTextDirective.EMPTY_TEXT;

        this.element.addEventListener('click', (event: MouseEvent) => this.elementClicked(event));
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        this.siteId = this.siteId ?? CoreSites.getCurrentSiteId();

        if (changes.text || changes.filter || changes.contextLevel || changes.contextInstanceId) {
            this.formatAndRenderContents();

            return;
        }

        if ('disabled' in changes) {
            const disabled = changes['disabled'].currentValue;

            this.elementControllers.forEach(controller => disabled ? controller.disable() : controller.enable());
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.domElementPromise?.cancel();
        this.domPromises.forEach((promise) => { promise.cancel();});
        this.elementControllers.forEach(controller => controller.destroy());
        this.externalContentInstances.forEach(extContent => extContent.ngOnDestroy());
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        if (!this.element.classList.contains('core-loading')) {
            return;
        }

        await new Promise<void>(resolve => {
            const subscription = this.afterRender.subscribe(() => {
                subscription.unsubscribe();
                resolve();
            });
        });
    }

    /**
     * Apply CoreExternalContentDirective to a certain element.
     *
     * @param element Element to add the attributes to.
     * @param onlyInlineStyles Whether to only handle inline styles.
     * @returns External content instance or undefined if siteId is not provided.
     */
    protected addExternalContent(element: Element, onlyInlineStyles = false): CoreExternalContentDirective | undefined {
        if (!this.siteId) {
            return;
        }

        // Angular doesn't let adding directives dynamically. Create the CoreExternalContentDirective manually.
        const extContent = new CoreExternalContentDirective(new ElementRef(element));

        extContent.component = this.component;
        extContent.componentId = this.componentId;
        extContent.siteId = this.siteId;
        extContent.url = element.getAttribute('src') ?? element.getAttribute('href') ?? element.getAttribute('xlink:href');
        extContent.posterUrl = element.getAttribute('poster');

        if (!onlyInlineStyles) {
            // Remove the original attributes to avoid performing requests to untreated URLs.
            element.removeAttribute('src');
            element.removeAttribute('href');
            element.removeAttribute('xlink:href');
            element.removeAttribute('poster');
        }

        extContent.ngAfterViewInit();

        this.externalContentInstances.push(extContent);

        const changeDetectorRef = this.viewContainerRef.injector.get(ChangeDetectorRef);
        changeDetectorRef.markForCheck();

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
        if (img.classList.contains('texrender')) {
            return;
        }

        // Element to wrap the image.
        const container = document.createElement('span');
        const originalWidth = img.attributes.getNamedItem('width');

        const forcedWidth = Number(originalWidth?.value);
        if (originalWidth && !isNaN(forcedWidth)) {
            if (originalWidth.value.indexOf('%') < 0) {
                img.style.width = `${forcedWidth}px`;
            } else {
                img.style.width = `${forcedWidth}%`;
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

        CoreDom.wrapElement(img, container);
    }

    /**
     * Add image viewer button to view adapted images at full size.
     */
    protected async addImageViewerButton(): Promise<void> {
        const imgs = Array.from(this.element.querySelectorAll('.core-adapted-img-container > img'));
        if (!imgs.length) {
            return;
        }

        // If cannot calculate element's width, use viewport width to avoid false adapt image icons appearing.
        const elWidth = await this.getElementWidth();

        imgs.forEach((img: HTMLImageElement) => {
            // Skip image if it's inside a link.
            if (img.closest('a')) {
                return;
            }

            let imgWidth = Number(img.getAttribute('width'));
            if (!imgWidth) {
                // No width attribute, use real size.
                imgWidth = img.naturalWidth;
            }

            if (imgWidth <= elWidth) {
                return;
            }

            const label = Translate.instant('core.openfullimage');
            const button = document.createElement('button');

            button.classList.add('core-image-viewer-icon');
            button.classList.add('hidden');
            button.setAttribute('aria-label', label);
            const iconName = 'up-right-and-down-left-from-center';
            const src = CoreIcons.getIconSrc('font-awesome', 'solid', iconName);
            // Add an ion-icon item to apply the right styles, but the ion-icon component won't be executed.
            button.innerHTML = `<ion-icon name="fas-${iconName}" aria-hidden="true" src="${src}"></ion-icon>`;

            button.addEventListener('click', (e: Event) => {
                const imgSrc = CoreText.escapeHTML(img.getAttribute('data-original-src') || img.getAttribute('src'));

                e.preventDefault();
                e.stopPropagation();
                CoreViewer.viewImage(imgSrc, img.getAttribute('alt'), this.component, this.componentId);
            });

            img.parentNode?.appendChild(button);

            if (img.complete && img.naturalWidth > 0) {
                // Image has already loaded, show the button.
                button.classList.remove('hidden');
            } else {
                // Show the button when the image is loaded.
                img.onload = () => button.classList.remove('hidden');
            }
        });
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

        if (this.onClick.observed) {
            this.onClick.emit();

            return;
        }

        if (!this.text) {
            return;
        }

        this.collapsible?.elementClicked(e);
    }

    /**
     * Finish the rendering, displaying the element again and calling afterRender.
     *
     * @param triggerFilterRender Whether to emit the filterContentRenderingComplete output too.
     */
    protected async finishRender(triggerFilterRender = true): Promise<void> {
        // Show the element again.
        this.element.classList.remove('core-loading');

        await CoreWait.nextTick();

        // Emit the afterRender output.
        this.afterRender.emit();
        if (triggerFilterRender) {
            this.filterContentRenderingComplete.emit();
        }
    }

    /**
     * Format contents and render.
     */
    protected async formatAndRenderContents(): Promise<void> {
        // Destroy previous instances of external-content.
        this.externalContentInstances.forEach(extContent => extContent.ngOnDestroy());
        this.externalContentInstances = [];

        if (!this.text) {
            this.element.innerHTML = CoreFormatTextDirective.EMPTY_TEXT; // Remove current contents.

            await this.finishRender();

            return;
        }

        if (!this.element.getAttribute('singleLine')) {
            this.element.setAttribute('singleLine', String(this.singleLine));
        }

        this.text = this.text ? this.text.trim() : '';

        const result = await this.formatContents();

        // Disable media adapt to correctly calculate the height.
        this.element.classList.add('core-disable-media-adapt');

        this.element.innerHTML = ''; // Remove current contents.

        // Move the children to the current element to be able to calculate the height.
        CoreDom.moveChildren(result.div, this.element);

        this.elementControllers.forEach(controller => controller.destroy());
        this.elementControllers = result.elementControllers;

        await CoreWait.nextTick();

        // Add magnifying glasses to images.
        this.addImageViewerButton();

        if (result.options.filter) {
            // Let filters handle HTML. We do it here because we don't want them to block the render of the text.
            CoreFilterDelegate.handleHtml(
                this.element,
                result.filters,
                this.viewContainerRef,
                result.options,
                [],
                this.component,
                this.componentId,
                result.siteId,
            ).finally(() => {
                this.filterContentRenderingComplete.emit();
            });
        }

        this.element.classList.remove('core-disable-media-adapt');
        await this.finishRender(!result.options.filter);
    }

    /**
     * Apply formatText and set sub-directives.
     *
     * @returns Promise resolved with a div element containing the code.
     */
    protected async formatContents(): Promise<FormatContentsResult> {
        // Retrieve the site since it might be needed later.
        const site = await CorePromiseUtils.ignoreErrors(CoreSites.getSite(this.siteId));

        const siteId = site?.getId();

        if (
            site && this.contextLevel === ContextLevel.COURSE && this.contextInstanceId !== undefined && this.contextInstanceId <= 0
        ) {
            this.contextInstanceId = site.getSiteHomeId();
        }

        if (this.contextLevel === ContextLevel.COURSE && this.contextInstanceId === undefined && this.courseId !== undefined) {
            this.contextInstanceId = this.courseId;
        }

        const filter = this.filter ?? !!(this.contextLevel && this.contextInstanceId !== undefined);

        const options: CoreFilterFormatTextOptions = {
            clean: this.clean,
            sanitize: this.sanitize,
            singleLine: this.singleLine,
            highlight: this.highlight,
            courseId: this.courseId,
            wsNotFiltered: this.wsNotFiltered,
        };

        let formatted: string;
        let filters: CoreFilterFilter[] = [];

        if (filter && siteId) {
            const filterResult = await CoreFilterHelper.getFiltersAndFormatText(
                this.text || '',
                this.contextLevel || ContextLevel.SYSTEM,
                this.contextInstanceId ?? -1,
                options,
                siteId,
            );

            filters = filterResult.filters;
            formatted = filterResult.text;
        } else {
            formatted = await CoreFilter.formatText(this.text || '', options, [], siteId);
        }

        formatted = this.treatWindowOpen(formatted);

        const div = document.createElement('div');

        div.innerHTML = formatted;

        const elementControllers = this.treatHTMLElements(div, site);

        return {
            div,
            filters,
            options,
            siteId,
            elementControllers,
        };
    }

    /**
     * Treat HTML elements when formatting contents.
     *
     * @param div Div element.
     * @param site Site instance.
     * @returns Promise resolved when done.
     */
    protected treatHTMLElements(div: HTMLElement, site?: CoreSite): ElementController[] {
        const images = Array.from(div.querySelectorAll('img'));
        const anchors = Array.from(div.querySelectorAll('a'));
        const audios = Array.from(div.querySelectorAll('audio'));
        const videos = Array.from(div.querySelectorAll('video'));
        const iframes = Array.from(div.querySelectorAll('iframe'));
        const buttons = Array.from(div.querySelectorAll<HTMLElement>('.button'));
        const elementsWithInlineStyles = Array.from(div.querySelectorAll<HTMLElement>('*[style]'));
        const stopClicksElements = Array.from(div.querySelectorAll<HTMLElement>('button,input,select,textarea'));
        const frames = Array.from(
            div.querySelectorAll<FrameElement>(CoreIframe.FRAME_TAGS.join(',').replace(/iframe,?/, '')),
        );
        const svgImages = Array.from(div.querySelectorAll('image'));
        const promises: Promise<void>[] = [];

        this.treatAppUrlElements(div, site);

        // Walk through the content to find the links and add our directive to it.
        // Important: We need to look for links first because in 'img' we add new links without core-link.
        anchors.forEach((anchor) => {
            if (anchor.dataset.appUrl) {
                // Link already treated in treatAppUrlElements, ignore it.
                return;
            }

            // Angular doesn't let adding directives dynamically. Create the CoreLinkDirective manually.
            const linkDir = new CoreLinkDirective(new ElementRef(anchor));
            linkDir.capture = this.captureLinks ?? true;
            linkDir.inApp = this.openLinksInApp;
            linkDir.showBrowserWarning = this.showBrowserWarningInLinks;
            linkDir.ngOnInit();

            this.addExternalContent(anchor);
        });

        const externalImages: CoreExternalContentDirective[] = [];
        if (images && images.length > 0) {
            // Walk through the content to find images, and add our directive.
            images.forEach((img: HTMLElement) => {
                this.addMediaAdaptClass(img);

                const externalImage = this.addExternalContent(img);
                if (externalImage && !externalImage.invalid) {
                    externalImages.push(externalImage);
                }

                if (this.adaptImg && !img.classList.contains('icon')) {
                    this.adaptImage(img);
                }
            });
        }

        const audioControllers = audios.map(audio => {
            this.treatMedia(audio);

            return new MediaElementController(audio, !this.disabled);
        });

        const videoControllers = videos.map(video => {
            this.treatMedia(video, true);

            return new MediaElementController(video, !this.disabled);
        });

        const iframeControllers = iframes.map(iframe => {
            const { launchExternal, label } = CoreIframe.frameShouldLaunchExternal(iframe);
            if (launchExternal && this.replaceFrameWithButton(iframe, site, label)) {
                return;
            }

            promises.push(this.treatIframe(iframe, site));

            return new FrameElementController(iframe, !this.disabled);
        }).filter((controller): controller is FrameElementController => controller !== undefined);

        svgImages.forEach((image) => {
            this.addExternalContent(image);
        });

        // Handle buttons with inner links.
        buttons.forEach((button: HTMLElement) => {
            // Check if it has a link inside.
            if (button.querySelector('a')) {
                button.classList.add('core-button-with-inner-link');
            }
        });

        // Handle Font Awesome icons to be rendered by the app.
        const icons = Array.from(div.querySelectorAll('.fa,.fas,.far,.fab,.fa-solid,.fa-regular,.fa-brands'));
        icons.forEach((icon) => {
            CoreIcons.replaceCSSIcon(icon);
        });

        // Handle inline styles.
        elementsWithInlineStyles.forEach((el: HTMLElement) => {
            // Only add external content for tags that haven't been treated already.
            if (el.tagName !== 'A' && el.tagName !== 'IMG' && el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO'
                    && el.tagName !== 'SOURCE' && el.tagName !== 'TRACK' && el.tagName !== 'IMAGE') {
                this.addExternalContent(el, true);
            }
        });

        // Stop propagating click events.
        stopClicksElements.forEach((element: HTMLElement) => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Handle all kind of frames.
        const frameControllers = frames.map((frame) => {
            const { launchExternal, label } = CoreIframe.frameShouldLaunchExternal(frame);
            if (launchExternal && this.replaceFrameWithButton(frame, site, label)) {
                return;
            }

            CoreIframe.treatFrame(frame, false);

            return new FrameElementController(frame, !this.disabled);
        }).filter((controller): controller is FrameElementController => controller !== undefined);

        CoreBootstrap.handleJS(div, {
            siteId: this.siteId,
            component: this.component,
            componentId: this.componentId,
            contextLevel: this.contextLevel,
            contextInstanceId: this.contextInstanceId,
            courseId: this.courseId,
        });

        if (externalImages.length) {
            // Wait for images to load.
            const promise = CorePromiseUtils.allPromises(externalImages.map((externalImage) => {
                if (externalImage.loaded) {
                    // Image has already been loaded, no need to wait.
                    return Promise.resolve();
                }

                return new Promise(resolve => CoreSubscriptions.once(externalImage.onLoad, resolve));
            }));

            // Automatically reject the promise after 5 seconds to prevent blocking the user forever.
            promises.push(CorePromiseUtils.ignoreErrors(CorePromiseUtils.timeoutPromise(promise, 5000)));
        }

        // Run asynchronous operations in the background to avoid blocking rendering.
        Promise.all(promises).catch(error => CoreErrorHelper.logUnhandledError('Error treating format-text elements', error));

        return [
            ...videoControllers,
            ...audioControllers,
            ...iframeControllers,
            ...frameControllers,
        ];
    }

    /**
     * Treat elements with an app-url data attribute.
     *
     * @param div Div containing the elements.
     * @param site Site.
     */
    protected treatAppUrlElements(div: HTMLElement, site?: CoreSite): void {
        const appUrlElements = Array.from(div.querySelectorAll<HTMLElement>('*[data-app-url]'));

        appUrlElements.forEach((element) => {
            let url = element.dataset.appUrl;
            if (!url) {
                return;
            }

            CoreDom.initializeClickableElementA11y(element, async (event) => {
                event.preventDefault();
                event.stopPropagation();

                site = site || CoreSites.getCurrentSite();
                if (!site || !url) {
                    return;
                }

                // Try to convert the URL to absolute if needed.
                url = CoreUrl.toAbsoluteURL(site.getURL(), url);
                const confirmMessage = element.dataset.appUrlConfirm;
                const openInApp = element.dataset.openIn === 'app';
                const refreshOnResume = element.dataset.appUrlResumeAction === 'refresh';

                if (confirmMessage) {
                    try {
                        await CoreAlerts.confirm(Translate.instant(confirmMessage));
                    } catch {
                        return;
                    }
                }

                if (openInApp) {
                    site.openInAppWithAutoLogin(url);

                    if (refreshOnResume && this.refreshContext) {
                        // Refresh the context when the IAB is closed.
                        CoreEvents.once(CoreEvents.IAB_EXIT, () => {
                            this.refreshContext?.refreshContext();
                        });
                    }
                } else {
                    site.openInBrowserWithAutoLogin(url, undefined, {
                        showBrowserWarning: !confirmMessage,
                    });

                    if (refreshOnResume && this.refreshContext) {
                        // Refresh the context when the app is resumed.
                        CoreSubscriptions.once(CorePlatform.resume, () => {
                            NgZone.run(async () => {
                                this.refreshContext?.refreshContext();
                            });
                        });
                    }
                }
            });
        });
    }

    /**
     * Returns the element width in pixels.
     *
     * @returns The width of the element in pixels.
     */
    protected async getElementWidth(): Promise<number> {
        if (!this.domElementPromise) {
            this.domElementPromise = CoreDom.waitToBeInDOM(this.element);
        }
        await this.domElementPromise;

        let width = this.element.getBoundingClientRect().width;
        if (!width) {
            // All elements inside are floating or inline. Change display mode to allow calculate the width.
            const previousDisplay = getComputedStyle(this.element).display;

            this.element.style.display = 'inline-block';
            await CoreWait.nextTick();

            width = this.element.getBoundingClientRect().width;

            this.element.style.display = previousDisplay;
        }

        // Aproximate using parent elements.
        let element = this.element;
        while (!width && element.parentElement) {
            element = element.parentElement;
            const computedStyle = getComputedStyle(element);

            const padding = CoreDom.getComputedStyleMeasure(computedStyle, 'paddingLeft') +
                    CoreDom.getComputedStyleMeasure(computedStyle, 'paddingRight');

            // Use parent width as an aproximation.
            width = element.getBoundingClientRect().width - padding;
        }

        return width > 0 && width < window.innerWidth
            ? width
            : window.innerWidth;
    }

    /**
     * Add media adapt class and apply CoreExternalContentDirective to the media element and its sources and tracks.
     *
     * @param element Video or audio to treat.
     * @param isVideo Whether it's a video.
     */
    protected treatMedia(element: HTMLElement, isVideo: boolean = false): void {
        if (isVideo) {
            this.fixVideoSrcPlaceholder(element);
        }

        this.addMediaAdaptClass(element);
        this.addExternalContent(element);

        // Hide download button if not hidden already.
        let controlsList = element.getAttribute('controlsList') || '';
        if (!controlsList.includes('nodownload')) {
            if (!controlsList.trim()) {
                controlsList = 'nodownload';
            } else {
                controlsList = controlsList.split(' ').concat('nodownload').join(' ');
            }

            element.setAttribute('controlsList', controlsList);
        }

        const sources = Array.from(element.querySelectorAll('source'));
        const tracks = Array.from(element.querySelectorAll('track'));

        sources.forEach((source) => {
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
     * Try to fix the placeholder displayed when a video doesn't have a poster.
     *
     * @param videoElement Element to fix.
     */
    protected fixVideoSrcPlaceholder(videoElement: HTMLElement): void {
        if (videoElement.getAttribute('poster')) {
            // Video has a poster, nothing to fix.
            return;
        }

        // Fix the video and its sources.
        [videoElement].concat(Array.from(videoElement.querySelectorAll('source'))).forEach((element) => {
            const src = element.getAttribute('src');
            if (!src || src.match(/#t=\d/)) {
                return;
            }

            element.setAttribute('src', `${src}#t=0.001`);
        });
    }

    /**
     * Add media adapt class and treat the iframe source.
     *
     * @param iframe Iframe to treat.
     * @param site Site instance.
     */
    protected async treatIframe(iframe: HTMLIFrameElement, site: CoreSite | undefined): Promise<void> {
        const src = this.getFrameUrl(iframe, site);
        const currentSite = CoreSites.getCurrentSite();

        this.addMediaAdaptClass(iframe);

        if (CoreIframe.shouldDisplayHelpForUrl(src)) {
            this.addIframeHelp(iframe);
        }

        if (currentSite?.containsUrl(src)) {
            // URL points to current site, try to use auto-login.
            // Remove iframe src, otherwise it can cause auto-login issues if there are several iframes with auto-login.
            iframe.src = '';

            let finalUrl = await CoreIframe.getAutoLoginUrlForIframe(iframe, src);

            const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);
            finalUrl = CoreUrl.addParamsToUrl(finalUrl, { lang }, {
                checkAutoLoginUrl: src !== finalUrl,
            });

            await CoreIframe.fixIframeCookies(finalUrl);

            iframe.src = finalUrl;
            CoreIframe.treatFrame(iframe, false);

            return;
        }

        await CoreIframe.fixIframeCookies(src);

        if (src !== iframe.src) {
            // URL was converted, update it in the iframe.
            iframe.src = src;
        }

        if (site && src) {
            let vimeoUrl = CoreUrl.getVimeoPlayerUrl(src, site);
            if (vimeoUrl) {
                const domPromise = CoreDom.waitToBeInDOM(iframe);
                this.domPromises.push(domPromise);

                await domPromise;

                // Width and height are mandatory, we need to calculate them.
                let width: string | number;
                let height: string | number;

                if (iframe.width) {
                    width = iframe.width;
                } else {
                    width = iframe.getBoundingClientRect().width;
                    if (!width) {
                        width = window.innerWidth;
                    }
                }

                if (iframe.height) {
                    height = iframe.height;
                } else {
                    height = iframe.getBoundingClientRect().height;
                    if (!height) {
                        height = width;
                    }
                }

                // Width and height parameters are required in 3.6 and older sites.
                if (site && !site.isVersionGreaterEqualThan('3.7')) {
                    vimeoUrl += `&width=${width}&height=${height}`;
                }

                await CoreIframe.fixIframeCookies(vimeoUrl);

                iframe.src = vimeoUrl;

                if (!iframe.width) {
                    iframe.width = String(width);
                }
                if (!iframe.height) {
                    iframe.height = String(height);
                }

                // Do the iframe responsive.
                if (iframe.parentElement?.classList.contains('embed-responsive')) {
                    iframe.addEventListener('load', () => {
                        if (iframe.contentDocument) {
                            const css = document.createElement('style');
                            css.setAttribute('type', 'text/css');
                            css.innerHTML = 'iframe {width: 100%;height: 100%;position:absolute;top:0; left:0;}';
                            iframe.contentDocument.head.appendChild(css);
                        }
                    });
                }
            }
        }

        CoreIframe.treatFrame(iframe, false);
    }

    /**
     * Get the URL for a frame. It will be converted to absolute URL if needed.
     *
     * @param frame Frame element.
     * @param site Site instance.
     * @returns URL.
     */
    protected getFrameUrl(frame: FrameElement, site: CoreSite | undefined): string {
        if (!site) {
            // Cannot treat the URL, just return it as it is.
            return 'src' in frame ? frame.src : frame.data;
        }

        // Use getAttribute to obtain the original URL, since src and data properties convert the URL to absolute using
        // the current location (app's URL).
        const url = 'src' in frame ? frame.getAttribute('src') : frame.getAttribute('data');
        if (!url) {
            // Attribute not found, return the property.
            return 'src' in frame ? frame.src : frame.data;
        }

        return CoreUrl.toAbsoluteURL(site.getURL(), url);
    }

    /**
     * Replace a frame with a button to open the frame's URL in an external app.
     *
     * @param frame Frame element to replace.
     * @param site Site instance.
     * @param label The text to put in the button.
     * @returns Whether iframe was replaced.
     */
    protected replaceFrameWithButton(frame: FrameElement, site: CoreSite | undefined, label: string): boolean {
        const url = this.getFrameUrl(frame, site);
        if (!url) {
            return false;
        }

        const button = document.createElement('ion-button');
        button.setAttribute('expand', 'block');
        button.classList.add('ion-text-wrap');
        button.innerHTML = label;

        button.addEventListener('click', () => {
            CoreIframe.frameLaunchExternal(url, {
                site,
                component: this.component,
                componentId: this.componentId,
            });
        });

        frame.replaceWith(button);

        return true;
    }

    /**
     * Add iframe help option.
     *
     * @param iframe Iframe.
     */
    protected addIframeHelp(iframe: HTMLIFrameElement): void {
        const helpDiv = document.createElement('div');

        helpDiv.classList.add('ion-text-center', 'ion-text-wrap', 'core-iframe-help');

        const button = document.createElement('ion-button');
        button.setAttribute('fill', 'clear');
        button.setAttribute('aria-haspopup', 'dialog');
        button.classList.add('core-iframe-help', 'core-button-as-link');
        button.innerHTML = Translate.instant('core.iframehelp');

        button.addEventListener('click', () => {
            CoreIframe.openIframeHelpModal();
        });

        helpDiv.appendChild(button);

        iframe.after(helpDiv);
    }

    /**
     * Convert window.open to window.openWindowSafely inside HTML tags.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    protected treatWindowOpen(text: string): string {
        // Get HTML tags that include window.open. Script tags aren't executed so there's no need to treat them.
        const matches = text.match(/<[^>]+window\.open\([^)]*\)[^>]*>/g);

        if (matches) {
            matches.forEach((match) => {
                // Replace all the window.open inside the tag.
                const treated = match.replace(/window\.open\(/g, 'window.openWindowSafely(');

                text = text.replace(match, treated);
            });
        }

        return text;
    }

}

type FormatContentsResult = {
    div: HTMLElement;
    filters: CoreFilterFilter[];
    elementControllers: ElementController[];
    options: CoreFilterFormatTextOptions;
    siteId?: string;
};
