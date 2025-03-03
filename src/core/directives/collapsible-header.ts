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

import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChange } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreTabsOutletComponent } from '@components/tabs-outlet/tabs-outlet';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { ScrollDetail } from '@ionic/core';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreMath } from '@singletons/math';
import { Subscription } from 'rxjs';
import { CoreFormatTextDirective } from './format-text';
import { CoreWait } from '@singletons/wait';
import { toBoolean } from '../transforms/boolean';
import { AsyncDirective } from '@classes/async-directive';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [COLLAPSIBLE_HEADER_UPDATED]: { collapsed: boolean };
    }

}

export const COLLAPSIBLE_HEADER_UPDATED = 'collapsible_header_updated';

/**
 * Directive to make <ion-header> collapsible.
 *
 * This directive expects h1 titles to be duplicated in a header and an item inside the page, and it will transition
 * from one state to another listening to the scroll in the page content. The item to be used as the expanded form
 * should also have the [collapsed] attribute.
 *
 * Example usage:
 *
 * <ion-header collapsible>
 *     <ion-toolbar>
 *         <ion-title>
 *             <h1>Title</h1>
 *         </ion-title>
 *     </ion-toolbar>
 * </ion-header>
 *
 * <ion-content>
 *     <ion-item collapsible>
 *         <ion-label>
 *             <h1>Title</h1>
 *         </ion-label>
 *     </ion-item>
 *     ...
 * </ion-content>
 */
@Directive({
    selector: 'ion-header[collapsible]',
    standalone: true,
})
export class CoreCollapsibleHeaderDirective implements OnInit, OnChanges, OnDestroy, AsyncDirective {

    @Input({ transform: toBoolean }) collapsible = true;

    protected page?: HTMLElement;
    protected collapsedHeader: HTMLIonHeaderElement;
    protected collapsedFontStyles?: Partial<CSSStyleDeclaration>;
    protected expandedHeader?: HTMLIonItemElement;
    protected expandedHeaderHeight?: number;
    protected expandedFontStyles?: Partial<CSSStyleDeclaration>;
    protected content?: HTMLIonContentElement;
    protected contentScrollListener?: EventListener;
    protected endContentScrollListener?: EventListener;
    protected pageDidEnterListener?: EventListener;
    protected resizeListener?: CoreEventObserver;
    protected floatingTitle?: HTMLHeadingElement;
    protected scrollingHeight?: number;
    protected subscriptions: Subscription[] = [];
    protected enabled = true;
    protected isWithinContent = false;
    protected enteredPromise = new CorePromisedValue<void>();
    protected mutationObserver?: MutationObserver;
    protected loadingFloatingTitle = false;
    protected visiblePromise?: CoreCancellablePromise<void>;
    protected onReadyPromise = new CorePromisedValue<void>();

    constructor(el: ElementRef) {
        this.collapsedHeader = el.nativeElement;
        CoreDirectivesRegistry.register(this.collapsedHeader, this);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (CoreDom.closest(this.collapsedHeader, 'core-tabs-outlet')) {
            this.collapsible = false;
        }

        this.init();
    }

    /**
     * Init function.
     */
    async init(): Promise<void> {
        if (!this.collapsible || this.expandedHeader) {
            this.onReadyPromise.resolve();

            return;
        }

        this.initializePage();

        await Promise.all([
            this.initializeCollapsedHeader(),
            this.initializeExpandedHeader(),
            await this.enteredPromise,
        ]);

        this.listenEvents();

        await this.initializeFloatingTitle();
        await this.initializeContent();

        this.onReadyPromise.resolve();
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: {[name: string]: SimpleChange}): Promise<void> {
        if (changes.collapsible && !changes.collapsible.firstChange) {
            this.enabled = this.collapsible;

            await this.init();

            setTimeout(() => {
                this.setEnabled(this.enabled);
            }, 200);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());

        if (this.content && this.contentScrollListener) {
            this.content.removeEventListener('ionScroll', this.contentScrollListener);
        }
        if (this.content && this.endContentScrollListener) {
            this.content.removeEventListener('ionScrollEnd', this.endContentScrollListener);
        }
        if (this.page && this.pageDidEnterListener) {
            this.page.removeEventListener('ionViewDidEnter', this.pageDidEnterListener);
        }

        this.resizeListener?.off();
        this.mutationObserver?.disconnect();
        this.visiblePromise?.cancel();
    }

    /**
     * Update collapsed status of the header.
     *
     * @param collapsed Whether header is collapsed or not.
     */
    protected setCollapsed(collapsed: boolean): void {
        if (!this.page) {
            return;
        }

        const isCollapsed = this.page.classList.contains('collapsible-header-page-is-collapsed');

        if (isCollapsed === collapsed) {
            return;
        }

        this.page.classList.toggle('collapsible-header-page-is-collapsed', collapsed);

        CoreEvents.trigger(COLLAPSIBLE_HEADER_UPDATED, { collapsed });
    }

    /**
     * Listen to changing events.
     */
    protected listenEvents(): void {
        this.resizeListener = CoreDom.onWindowResize(() => {
            this.initializeFloatingTitle();
        }, 50);

        this.subscriptions.push(CoreSettingsHelper.onDarkModeChange().subscribe(() => {
            this.initializeFloatingTitle();
        }));

        this.mutationObserver = new MutationObserver(() => {
            if (!this.expandedHeader) {
                return;
            }

            const originalTitle = this.expandedHeader.querySelector('h1.collapsible-header-original-title') ||
                this.expandedHeader.querySelector('h1') as HTMLHeadingElement;

            const floatingTitleWrapper = originalTitle.parentElement as HTMLElement;
            const floatingTitle = floatingTitleWrapper.querySelector('.collapsible-header-floating-title') as HTMLHeadingElement;

            if (!floatingTitle || !originalTitle) {
                return;
            }

            // Original title changed, change the contents.
            const newFloatingTitle = originalTitle.cloneNode(true) as HTMLHeadingElement;
            newFloatingTitle.classList.add('collapsible-header-floating-title');
            newFloatingTitle.classList.remove('collapsible-header-original-title');

            floatingTitleWrapper.replaceChild(newFloatingTitle, floatingTitle);

            this.initializeFloatingTitle();
        });
    }

    /**
     * Search the page element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected initializePage(): void {
        if (!this.collapsedHeader.parentElement) {
            throw new Error('[collapsible-header] Couldn\'t get page');
        }

        // Find element and prepare classes.
        this.page = this.collapsedHeader.parentElement;
        this.page.classList.add('collapsible-header-page');

        this.page.addEventListener(
            'ionViewDidEnter',
            this.pageDidEnterListener = () => {
                clearTimeout(timeout);
                this.enteredPromise.resolve();
                if (this.page && this.pageDidEnterListener) {
                    this.page.removeEventListener('ionViewDidEnter', this.pageDidEnterListener);
                }
            },
        );

        // Timeout in case event is never fired.
        const timeout = window.setTimeout(() => {
            this.enteredPromise.reject(new Error('[collapsible-header] Waiting for ionViewDidEnter timeout reached'));
        }, 5000);
    }

    /**
     * Search the collapsed header element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeCollapsedHeader(): Promise<void> {
        this.collapsedHeader.classList.add('collapsible-header-collapsed');

        await this.waitFormatTextsRendered(this.collapsedHeader);
    }

    /**
     * Search the expanded header element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeExpandedHeader(): Promise<void> {
        await this.waitLoadingsDone();

        this.expandedHeader = this.page?.querySelector('ion-item[collapsible]') ?? undefined;

        if (!this.expandedHeader) {
            this.enabled = false;
            this.setEnabled(this.enabled);

            throw new Error('[collapsible-header] Couldn\'t initialize expanded header');

        }
        this.expandedHeader.classList.add('collapsible-header-expanded');

        await this.waitFormatTextsRendered(this.expandedHeader);
    }

    /**
     * Search the page content, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeContent(): Promise<void> {
        if (!this.page) {
            return;
        }

        // Initialize from tabs.
        const tabs = CoreDirectivesRegistry.resolve(this.page.querySelector('core-tabs-outlet'), CoreTabsOutletComponent);

        if (tabs) {
            const outlet = tabs.getOutlet();
            const onOutletUpdated = () => {
                const activePage = outlet.nativeEl.querySelector('.ion-page:not(.ion-page-hidden)');

                this.updateContent(activePage?.querySelector('ion-content:not(.disable-scroll-y)') as HTMLIonContentElement);
            };

            this.subscriptions.push(outlet.activateEvents.subscribe(onOutletUpdated));

            onOutletUpdated();

            return;
        }

        // Initialize from page content.
        const content = this.page.querySelector('ion-content:not(.disable-scroll-y)');

        if (!content) {
            throw new Error('[collapsible-header] Couldn\'t get content');
        }

        this.trackContentScroll(content as HTMLIonContentElement);
    }

    /**
     * Initialize a floating title to mimic transitioning the title from one state to the other.
     */
    protected async initializeFloatingTitle(): Promise<void> {
        if (!this.page || !this.expandedHeader) {
            return;
        }

        if (this.loadingFloatingTitle) {
            // Already calculating, return.
            return;
        }
        this.loadingFloatingTitle = true;

        this.visiblePromise = CoreDom.waitToBeVisible(this.expandedHeader);
        await this.visiblePromise;

        this.page.classList.remove('collapsible-header-page-is-active');
        await CoreWait.nextTick();

        // Add floating title and measure initial position.
        const collapsedHeaderTitle = this.collapsedHeader.querySelector('h1') as HTMLHeadingElement;
        const originalTitle = this.expandedHeader.querySelector('h1.collapsible-header-original-title') ||
            this.expandedHeader.querySelector('h1') as HTMLHeadingElement;

        const floatingTitleWrapper = originalTitle.parentElement as HTMLElement;
        let floatingTitle = floatingTitleWrapper.querySelector('.collapsible-header-floating-title') as HTMLHeadingElement;
        if (!floatingTitle) {
            // First time, create it.
            floatingTitle = originalTitle.cloneNode(true) as HTMLHeadingElement;
            floatingTitle.classList.add('collapsible-header-floating-title');

            floatingTitleWrapper.classList.add('collapsible-header-floating-title-wrapper');
            floatingTitleWrapper.insertBefore(floatingTitle, originalTitle);

            originalTitle.classList.add('collapsible-header-original-title');
            this.mutationObserver?.observe(originalTitle, { childList: true, subtree: true });
        }

        const floatingTitleBoundingBox = floatingTitle.getBoundingClientRect();

        // Prepare styles variables.
        const collapsedHeaderTitleBoundingBox = collapsedHeaderTitle.getBoundingClientRect();
        const collapsedTitleStyles = getComputedStyle(collapsedHeaderTitle);
        const expandedHeaderHeight = this.expandedHeader.clientHeight;
        const expandedTitleStyles = getComputedStyle(originalTitle);
        const originalTitleBoundingBox = originalTitle.getBoundingClientRect();
        const textProperties = ['overflow', 'white-space', 'text-overflow', 'color'];
        const [collapsedFontStyles, expandedFontStyles] = Array
            .from(collapsedTitleStyles)
            .filter(
                property =>
                    property.startsWith('font-') ||
                    property.startsWith('letter-') ||
                    textProperties.includes(property),
            )
            .reduce((styles, property) => {
                styles[0][property] = CoreDom.getCSSPropertyValue(collapsedTitleStyles, property);
                styles[1][property] = CoreDom.getCSSPropertyValue(expandedTitleStyles, property);

                return styles;
            }, [{}, {}]);
        const cssVariables = {
            '--collapsible-header-collapsed-height': `${this.collapsedHeader.clientHeight}px`,
            '--collapsible-header-expanded-y-delta': `-${this.collapsedHeader.clientHeight}px`,
            '--collapsible-header-expanded-height': `${expandedHeaderHeight}px`,
            '--collapsible-header-floating-title-top': `${originalTitleBoundingBox.top - floatingTitleBoundingBox.top}px`,
            '--collapsible-header-floating-title-left': `${originalTitleBoundingBox.left - floatingTitleBoundingBox.left}px`,
            '--collapsible-header-floating-title-width': `${originalTitle.clientWidth}px`,
            '--collapsible-header-floating-title-x-delta':
                `${collapsedHeaderTitleBoundingBox.left - originalTitleBoundingBox.left}px`,
            '--collapsible-header-floating-title-width-delta': `${collapsedHeaderTitle.clientWidth - originalTitle.clientWidth}px`,
        };

        Object
            .entries(cssVariables)
            .forEach(([property, value]) => this.page?.style.setProperty(property, value));

        Object
            .entries(expandedFontStyles)
            .forEach(([property, value]) => floatingTitle.style.setProperty(property, value as string));

        // Activate styles.
        this.page.classList.add('collapsible-header-page-is-active');

        this.floatingTitle = floatingTitle;
        this.scrollingHeight = originalTitleBoundingBox.top - collapsedHeaderTitleBoundingBox.top;
        this.collapsedFontStyles = collapsedFontStyles;
        this.expandedFontStyles = expandedFontStyles;
        this.expandedHeaderHeight = expandedHeaderHeight;

        this.loadingFloatingTitle = false;
    }

    /**
     * Wait until all <core-loading> children inside the page.
     */
    protected async waitLoadingsDone(): Promise<void> {
        if (!this.page) {
            return;
        }

        // Make sure elements have been added to the DOM.
        await CoreWait.nextTick();

        // Wait all loadings and tabs to finish loading.
        await CoreDirectivesRegistry.waitMultipleDirectivesReady(this.page, [
            { selector: 'core-loading', class: CoreLoadingComponent },
            { selector: 'core-tabs', class: CoreTabsComponent },
            { selector: 'core-tabs-outlet', class: CoreTabsOutletComponent },
        ]);
    }

    /**
     * Wait until all <core-format-text> children inside the element are done rendering.
     *
     * @param element Element.
     * @returns Promise resolved when texts are rendered.
     */
    protected async waitFormatTextsRendered(element: Element): Promise<void> {
        await CoreDirectivesRegistry.waitDirectivesReady(element, 'core-format-text', CoreFormatTextDirective);
    }

    /**
     * Update content element whos scroll is being tracked.
     *
     * @param content Content element.
     */
    protected updateContent(content?: HTMLIonContentElement | null): void {
        if (content === (this.content ?? null)) {
            return;
        }

        if (this.content) {
            if (this.contentScrollListener) {
                this.content.removeEventListener('ionScroll', this.contentScrollListener);
                delete this.contentScrollListener;
            }

            if (this.endContentScrollListener) {
                this.content.removeEventListener('ionScrollEnd', this.endContentScrollListener);
                delete this.endContentScrollListener;
            }

            delete this.content;
        }

        content && this.trackContentScroll(content);
    }

    /**
     * Set collapsed/expanded based on properties.
     *
     * @param enable True to enable, false otherwise
     */
    async setEnabled(enable: boolean): Promise<void> {
        if (!this.page) {
            return;
        }

        if (enable && this.content) {
            const contentScroll = await this.content.getScrollElement();

            // Do nothing, since scroll has already started on the page.
            if (contentScroll.scrollTop > 0) {
                return;
            }
        }

        this.setCollapsed(!enable);
        this.page.style.setProperty('--collapsible-header-progress', enable ? '0' : '1');
    }

    /**
     * Listen to a content element for scroll events that will control the header state transition.
     *
     * @param content Content element.
     */
    protected async trackContentScroll(content: HTMLIonContentElement): Promise<void> {
        if (content === this.content) {
            return;
        }

        this.content = content;

        const page = this.page;
        const expandedHeader = this.expandedHeader;
        const expandedFontStyles = this.expandedFontStyles;
        const collapsedFontStyles = this.collapsedFontStyles;
        const floatingTitle = this.floatingTitle;
        const contentScroll = await this.content.getScrollElement();

        if (
            !page ||
            !expandedHeader ||
            !expandedFontStyles ||
            !collapsedFontStyles ||
            !floatingTitle
        ) {
            page?.classList.remove('collapsible-header-page-is-active');
            throw new Error('[collapsible-header] Couldn\'t set up scrolling');
        }

        this.isWithinContent = content.contains(expandedHeader);
        page.classList.toggle('collapsible-header-page-is-within-content', this.isWithinContent);
        this.setEnabled(this.enabled);

        Object
            .entries(expandedFontStyles)
            .forEach(([property, value]) => floatingTitle.style.setProperty(property, value as string));

        this.content.scrollEvents = true;
        this.content.addEventListener('ionScroll', this.contentScrollListener = ({ target }: CustomEvent<ScrollDetail>): void => {
            if (target !== this.content || !this.enabled || !this.scrollingHeight) {
                return;
            }

            const frozen = this.isFrozen(contentScroll);

            const progress = frozen
                ? 0
                : CoreMath.clamp(contentScroll.scrollTop / this.scrollingHeight, 0, 1);

            this.setCollapsed(progress === 1);
            page.style.setProperty('--collapsible-header-progress', `${progress}`);
            page.classList.toggle('collapsible-header-page-is-frozen', frozen);

            Object
                .entries(progress > .5 ? collapsedFontStyles : expandedFontStyles)
                .forEach(([property, value]) => floatingTitle.style.setProperty(property, value as string));
        });

        this.content.addEventListener(
            'ionScrollEnd',
            this.endContentScrollListener = ({ target }: CustomEvent<ScrollDetail>): void => {
                if (target !== this.content || !this.enabled) {
                    return;
                }

                if (page.classList.contains('collapsible-header-page-is-frozen')) {
                    // Check it has to be frozen.
                    const frozen = this.isFrozen(contentScroll);

                    if (frozen) {
                        return;
                    }

                    page.classList.toggle('collapsible-header-page-is-frozen', frozen);
                }

                const progress = parseFloat(page.style.getPropertyValue('--collapsible-header-progress'));
                const scrollTop = contentScroll.scrollTop;
                const collapse = progress > 0.5;

                this.setCollapsed(collapse);
                page.style.setProperty('--collapsible-header-progress', collapse ? '1' : '0');

                if (collapse && this.scrollingHeight && this.scrollingHeight > 0 && scrollTop < this.scrollingHeight) {
                    this.content?.scrollToPoint(null, this.scrollingHeight);
                }

                if (!collapse && this.scrollingHeight && this.scrollingHeight > 0 && scrollTop > 0) {
                    this.content?.scrollToPoint(null, 0);
                }
            },
        );
    }

    /**
     * Check if the header is frozen.
     *
     * @param contentScroll Content scroll element.
     * @returns Whether the header is frozen or not.
     */
    protected isFrozen(contentScroll: HTMLElement): boolean {
        const scrollingHeight = this.scrollingHeight ?? 0;
        const expandedHeaderClientHeight = this.expandedHeader?.clientHeight ?? 0;
        const expandedHeaderHeight = this.expandedHeaderHeight ?? 0;
        const scrollableHeight = contentScroll.scrollHeight - contentScroll.clientHeight;

        let frozen = false;
        if (this.isWithinContent) {
            frozen = scrollableHeight <= scrollingHeight;
        } else {
            const collapsedHeight = expandedHeaderHeight - (expandedHeaderClientHeight);
            frozen = scrollableHeight + collapsedHeight <= 2 * expandedHeaderHeight;
        }

        return frozen;
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
    }

}
