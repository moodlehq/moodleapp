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
    Output,
    EventEmitter,
    ViewContainerRef,
    OnDestroy,
    ChangeDetectorRef,
    inject,
    viewChild,
    input,
    computed,
    effect,
    untracked,
} from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreIframe } from '@static/iframe';
import { CoreText } from '@static/text';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreSite } from '@classes/sites/site';
import { NgZone, Translate } from '@singletons';
import { CoreExternalContentDirective } from './external-content';
import { CoreLinkDirective } from './link';
import { CoreFilter, CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreFilterDelegate } from '@features/filter/services/filter-delegate';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreSubscriptions } from '@static/subscriptions';
import { CoreDirectivesRegistry } from '@static/directives-registry';
import { CoreCollapsibleItemDirective } from './collapsible-item';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import type { AsyncDirective } from '@coretypes/async-directive';
import { CoreDom } from '@static/dom';
import { CoreEvents } from '@static/events';
import { CoreRefreshContext, CORE_REFRESH_CONTEXT } from '@/core/utils/refresh-context';
import { CorePlatform } from '@services/platform';
import { ElementController } from '@classes/element-controllers/ElementController';
import { MediaElementController } from '@classes/element-controllers/MediaElementController';
import { FrameElement, FrameElementController } from '@classes/element-controllers/FrameElementController';
import { CoreUrl } from '@static/url';
import { CoreIcons } from '@static/icons';
import {
    ContextLevel,
    CoreLinkOpenMethod,
    DATA_APP_ALT_MSG,
    DATA_APP_ALT_URL,
    DATA_APP_URL,
    DataAppAltUrlType,
    DATASET_APP_ALT_MSG,
    DATASET_APP_ALT_URL,
    DATASET_APP_ALT_URL_LABEL,
    DATASET_APP_ALT_URL_TYPE,
    DATASET_APP_OPEN_IN,
    DATASET_APP_OPEN_IN_LEGACY,
    DATASET_APP_SITE_REFERER,
    DATASET_APP_URL,
    DATASET_APP_URL_CONFIRM,
    DATASET_APP_URL_RESUME_ACTION,
} from '../constants';
import { CoreWait } from '@static/wait';
import { toBoolean } from '../transforms/boolean';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreBootstrap } from '@static/bootstrap';

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
export class CoreFormatTextDirective implements OnDestroy, AsyncDirective {

    protected readonly collapsible = viewChild(CoreCollapsibleItemDirective);

    /**
     * The text to format.
     */
    readonly text = input<string>('');
    protected readonly textComputed = computed(() => {
        const text = this.text();

        return text ? text.trim() : '';
    });

    /**
     * Site ID to use. If not defined, current site.
     * Do not use it directly, use getSiteId() instead.
     */
    readonly siteId = input<string>();

    /**
     * Component and componentId to use when treating links and media for CoreExternalContentDirective.
     */
    readonly component = input<string>();
    /**
     * Component ID to use in conjunction with the component.
     */
    readonly componentId = input<string | number>();
    /**
     * Whether to adapt images to screen width.
     */
    readonly adaptImg = input(true, { transform: toBoolean });
    /**
     * Whether all the HTML tags should be removed.
     */
    readonly clean = input(false, { transform: toBoolean });
    /**
     * Whether to remove new lines from the text. Only if clean=true.
     */
    readonly singleLine = input(false, { transform: toBoolean });
    /**
     * Whether to sanitize the text.
     */
    readonly sanitize = input(false, { transform: toBoolean });
    /**
     * Text to highlight.
     */
    readonly highlight = input<string>();
    /**
     * Whether to filter the text. If not defined, true if contextLevel and instanceId are set.
     */
    readonly filter = input<boolean, undefined>(undefined, { transform: toBoolean });
    /**
     * The context level of the text.
     */
    readonly contextLevel = input<ContextLevel>();
    /**
     * The instance ID related to the context.
     * Do not use it directly, use getContextInstanceId() instead.
     */
    readonly contextInstanceId = input<number>();

    /**
     * The course ID the text belongs to. It can be used to improve performance with filters.
     */
    readonly courseId = input<number>();
    /**
     * Whether the text has been returned from a web service that doesn't filter it, so we should always filter it.
     */
    readonly wsNotFiltered = input(false, { transform: toBoolean });
    /**
     * Whether links should be captured. If not, they will be opened in the system browser.
     */
    readonly captureLinks = input(true, { transform: toBoolean });
    /**
     * If set, force the open method for links.
     */
    readonly openLinksIn = input<Exclude<CoreLinkOpenMethod, CoreLinkOpenMethod.APP> | undefined>(undefined);
    /**
     * Whether links should be opened in InAppBrowser.
     *
     * @deprecated since 5.2. Use openLinksIn instead.
     */
    readonly openLinksInApp = input<boolean, undefined>(undefined, { transform: toBoolean });
    /**
     * Whether to show browser warning in all links.
     */
    readonly showBrowserWarningInLinks = input(true, { transform: toBoolean });
    /**
     * If true, autoplay elements will be disabled.
     */
    readonly disabled = input(false, { transform: toBoolean });

    /**
     * If true, the tag will contain nothing if text is empty.
     *
     * @deprecated since 5.0. Not used anymore.
     */
    readonly hideIfEmpty = input(false);

    /**
     * Called when the data is rendered.
     */
    @Output() afterRender = new EventEmitter<void>();
    /**
     * Called when the filters have finished rendering content.
     */
    @Output() filterContentRenderingComplete = new EventEmitter<void>();
    /**
     * Called when the element is clicked.
     */
    @Output() onClick: EventEmitter<void> = new EventEmitter();

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

        effect(async () => {
            // Refresh the contents if any of the relevant inputs change.
            this.textComputed();
            this.filter();
            this.contextLevel();
            this.contextInstanceId();

            await untracked(async () => {
                await this.formatAndRenderContents();
            });
        });

        effect(() => {
            const disabled = this.disabled();
            this.elementControllers.forEach(controller => disabled ? controller.disable() : controller.enable());
        });
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
     * Get the siteId to use.
     *
     * @returns The siteId. Empty if no site is logged in.
     */
    protected getSiteId(): string {
        return this.siteId() ?? CoreSites.getCurrentSiteId();
    }

    /**
     * Get the site to use.
     *
     * @returns The site. Undefined if no site is logged in.
     */
    protected async getSite(): Promise<CoreSite | undefined> {
        const siteId = this.getSiteId();

        return await CorePromiseUtils.ignoreErrors(CoreSites.getSite(siteId));
    }

    /**
     * Get the context instance ID to use.
     *
     * @returns The context instance ID. Undefined if not available.
     */
    protected async getContextInstanceId(): Promise<number | undefined> {
        const contextLevel = this.contextLevel();
        const courseId = this.courseId();
        const contextInstanceId = this.contextInstanceId();

        if (contextLevel !== ContextLevel.COURSE) {
            return contextInstanceId;
        }

        if (contextInstanceId === undefined && courseId !== undefined) {
            return courseId;
        }

        const site = await this.getSite();
        if (site && contextInstanceId !== undefined && contextInstanceId <= 0) {
            return site.getSiteHomeId();
        }

        return contextInstanceId;
    }

    /**
     * Apply CoreExternalContentDirective to a certain element.
     *
     * @param element Element to add the attributes to.
     * @param onlyInlineStyles Whether to only handle inline styles.
     * @returns External content instance or undefined if siteId is not provided.
     */
    protected addExternalContent(element: Element, onlyInlineStyles = false): CoreExternalContentDirective | undefined {
        const siteId = this.getSiteId();
        if (!siteId) {
            return;
        }

        // Angular doesn't let adding directives dynamically. Create the CoreExternalContentDirective manually.
        const extContent = new CoreExternalContentDirective(new ElementRef(element));

        extContent.component = this.component();
        extContent.componentId = this.componentId();
        extContent.siteId = siteId;
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
                CoreViewer.viewImage(imgSrc, img.getAttribute('alt'), this.component(), this.componentId());
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

        if (!this.textComputed()) {
            return;
        }

        this.collapsible()?.elementClicked(e);
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
            this.finishFilterContentRendering();
        }
    }

    /**
     * Finish the rendering once filters have been applied.
     */
    protected async finishFilterContentRendering(): Promise<void> {
        // Force redraw to make sure emojis are displayed on iOS.
        if (CorePlatform.isIOS() && CoreText.containsEmoji(this.element.innerText)) {
            await CoreDom.forceElementRedraw(this.element);
        }
        this.filterContentRenderingComplete.emit();
    }

    /**
     * Format contents and render.
     */
    protected async formatAndRenderContents(): Promise<void> {
        // Destroy previous instances of external-content.
        this.externalContentInstances.forEach(extContent => extContent.ngOnDestroy());
        this.externalContentInstances = [];

        if (!this.textComputed()) {
            this.element.innerHTML = CoreFormatTextDirective.EMPTY_TEXT; // Remove current contents.

            await this.finishRender();

            return;
        }

        if (!this.element.getAttribute('singleLine')) {
            this.element.setAttribute('singleLine', String(this.singleLine()));
        }

        const contentsFormatted = await this.formatContents();

        // Disable media adapt to correctly calculate the height.
        this.element.classList.add('core-disable-media-adapt');

        this.element.innerHTML = ''; // Remove current contents.

        // Move the children to the current element to be able to calculate the height.
        CoreDom.moveChildren(contentsFormatted.div, this.element);

        this.elementControllers.forEach(controller => controller.destroy());
        this.elementControllers = contentsFormatted.elementControllers;

        await CoreWait.nextTick();

        // Add magnifying glasses to images.
        this.addImageViewerButton();

        if (contentsFormatted.options.filter) {
            // Let filters handle HTML. We do it here because we don't want them to block the render of the text.
            CoreFilterDelegate.handleHtml(
                this.element,
                contentsFormatted.filters,
                this.viewContainerRef,
                contentsFormatted.options,
                [],
                this.component(),
                this.componentId(),
                this.getSiteId(),
            ).finally(() => {
                this.finishFilterContentRendering();
            });
        }

        this.element.classList.remove('core-disable-media-adapt');
        await this.finishRender(!contentsFormatted.options.filter);
    }

    /**
     * Apply formatText and set sub-directives.
     *
     * @returns Promise resolved with a div element containing the code.
     */
    protected async formatContents(): Promise<FormatContentsResult> {
        const siteId = this.getSiteId();

        const contextLevel = this.contextLevel();
        const courseId = this.courseId();
        const contextInstanceId = await this.getContextInstanceId();
        const text = this.textComputed();

        const filter = this.filter() ?? !!(contextLevel && contextInstanceId !== undefined);

        const options: CoreFilterFormatTextOptions = {
            clean: this.clean(),
            sanitize: this.sanitize(),
            singleLine: this.singleLine(),
            highlight: this.highlight(),
            courseId: courseId,
            wsNotFiltered: this.wsNotFiltered(),
        };

        let formatted: string;
        let filters: CoreFilterFilter[] = [];

        if (filter && siteId) {
            const filterResult = await CoreFilterHelper.getFiltersAndFormatText(
                text,
                contextLevel ?? ContextLevel.SYSTEM,
                contextInstanceId ?? -1,
                options,
                siteId,
            );

            filters = filterResult.filters;
            formatted = filterResult.text;
        } else {
            formatted = await CoreFilter.formatText(text, options, [], siteId);
        }

        formatted = this.treatWindowOpen(formatted);

        const div = document.createElement('div');

        div.innerHTML = formatted;

        const elementControllers = await this.treatHTMLElements(div);

        return {
            div,
            filters,
            options,
            elementControllers,
        };
    }

    /**
     * Treat HTML elements when formatting contents.
     *
     * @param div Div element.
     * @returns Promise resolved when done.
     */
    protected async treatHTMLElements(div: HTMLElement): Promise<ElementController[]> {
        // Treat alternative content elements first, that way the search of elements won't treat the elements that are removed.
        this.treatAlternativeContentElements(div);

        const site = await this.getSite();

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

        this.treatAppUrlElements(div);

        // Walk through the content to find the links and add our directive to it.
        // Important: We need to look for links first because in 'img' we add new links without core-link.
        anchors.forEach((anchor) => {
            if (anchor.dataset[DATASET_APP_URL]) {
                // Link already treated in treatAppUrlElements, ignore it.
                return;
            }

            // Angular doesn't let adding directives dynamically. Create the CoreLinkDirective manually.
            const linkDir = new CoreLinkDirective(new ElementRef(anchor));
            linkDir.capture = this.captureLinks() ?? true;
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            linkDir.openIn = this.openLinksIn() ?? (this.openLinksInApp() ? CoreLinkOpenMethod.INAPPBROWSER : undefined);
            linkDir.showBrowserWarning = this.showBrowserWarningInLinks();
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

                if (this.adaptImg() && !img.classList.contains('icon')) {
                    this.adaptImage(img);
                }
            });
        }

        const audioControllers = audios.map(audio => {
            this.treatMedia(audio);

            return new MediaElementController(audio, !this.disabled());
        });

        const videoControllers = videos.map(video => {
            this.treatMedia(video, true);

            return new MediaElementController(video, !this.disabled());
        });

        const iframeControllers = iframes.map(iframe => {
            const { launchExternal, label } = CoreIframe.frameShouldLaunchExternal(iframe);
            if (launchExternal && this.replaceFrameWithButton(iframe, site, label)) {
                return;
            }

            promises.push(this.treatIframe(iframe, site));

            return new FrameElementController(iframe, !this.disabled());
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

            return new FrameElementController(frame, !this.disabled());
        }).filter((controller): controller is FrameElementController => controller !== undefined);

        const contextInstanceId = await this.getContextInstanceId();

        CoreBootstrap.handleJS(div, {
            siteId: this.getSiteId(),
            component: this.component(),
            componentId: this.componentId(),
            contextLevel: this.contextLevel(),
            contextInstanceId,
            courseId: this.courseId(),
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
     * Treat elements with data attributes to display an alternative content in the app.
     *
     * @param div Container where to search the elements.
     */
    protected treatAlternativeContentElements(div: HTMLElement): void {
        const appAltElements = Array.from(div.querySelectorAll<HTMLElement>(
            `*[${DATA_APP_ALT_URL}],*[${DATA_APP_ALT_MSG}]`,
        ));

        appAltElements.forEach((element) => {
            const url = element.dataset[DATASET_APP_ALT_URL];
            const message = element.dataset[DATASET_APP_ALT_MSG];
            if (!message && !url) {
                return;
            }

            // Remove the original attributes and also app-url to avoid possible conflicts.
            element.removeAttribute(DATA_APP_ALT_URL);
            element.removeAttribute(DATA_APP_ALT_MSG);
            element.removeAttribute(DATA_APP_URL);

            let newContent = message ? `<p>${message}</p>` : '';
            if (url) {
                // Create a link or button using the APP_URL format to reuse all the logic of APP_URL data attributes.
                const label = element.dataset[DATASET_APP_ALT_URL_LABEL] || url;
                let dataAttributes = `${DATA_APP_URL}="${url}"`;
                for (const attr in element.dataset) {
                    dataAttributes += ` data-${CoreText.camelCaseToKebabCase(attr)}="${element.dataset[attr]}"`;
                }

                if (element.dataset[DATASET_APP_ALT_URL_TYPE] === DataAppAltUrlType.BUTTON) {
                    newContent += `<ion-button expand="block" class="ion-text-wrap" ${dataAttributes}>${label}</ion-button>`;
                } else {
                    newContent += `<p><a href="${url}" ${dataAttributes}>${label}</a></p>`;
                }
            }

            element.innerHTML = newContent;
        });
    }

    /**
     * Treat elements with an app-url data attribute.
     *
     * @param div Div containing the elements.
     */
    protected treatAppUrlElements(div: HTMLElement): void {
        const appUrlElements = Array.from(div.querySelectorAll<HTMLElement>(`*[${DATA_APP_URL}]`));

        appUrlElements.forEach((element) => {
            let url = element.dataset[DATASET_APP_URL];
            if (!url) {
                return;
            }

            CoreDom.initializeClickableElementA11y(element, async (event) => {
                event.preventDefault();
                event.stopPropagation();

                const site = await this.getSite();
                if (!site || !url) {
                    return;
                }

                // Try to convert the URL to absolute if needed.
                url = CoreUrl.toAbsoluteURL(site.getURL(), url);
                const confirmMessage = element.dataset[DATASET_APP_URL_CONFIRM];
                const openIn = element.dataset[DATASET_APP_OPEN_IN] || element.dataset[DATASET_APP_OPEN_IN_LEGACY];
                const refreshOnResume = element.dataset[DATASET_APP_URL_RESUME_ACTION] === 'refresh';

                if (confirmMessage) {
                    try {
                        await CoreAlerts.confirm(Translate.instant(confirmMessage));
                    } catch {
                        return;
                    }
                }

                if (openIn === CoreLinkOpenMethod.EMBEDDED) {
                    await CoreViewer.openIframeViewer((element.textContent || element.innerText || '').trim(), url);
                } else if (openIn === CoreLinkOpenMethod.INAPPBROWSER || openIn === CoreLinkOpenMethod.APP) {
                    // For backwards compatibility, consider APP as INAPPBROWSER. @deprecated since 5.2.
                    await site.openInAppWithAutoLogin(url);

                    if (refreshOnResume && this.refreshContext) {
                        // Refresh the context when the IAB is closed.
                        CoreEvents.once(CoreEvents.IAB_EXIT, () => {
                            this.refreshContext?.refreshContext();
                        });
                    }
                } else {
                    await site.openInBrowserWithAutoLogin(url, undefined, {
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
    protected treatMedia(element: HTMLElement, isVideo = false): void {
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
        let src = this.getFrameUrl(iframe, site);
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
        } else if (site && (iframe.dataset[DATASET_APP_SITE_REFERER] === 'true' || CoreUrl.urlNeedsReferer(src))) {
            src = site.fixRefererForUrl(src);
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
                component: this.component(),
                componentId: this.componentId(),
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
};
