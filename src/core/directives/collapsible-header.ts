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
import { CoreTabsOutletComponent } from '@components/tabs-outlet/tabs-outlet';
import { ScrollDetail } from '@ionic/core';
import { CoreUtils } from '@services/utils/utils';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CoreMath } from '@singletons/math';
import { Subscription } from 'rxjs';
import { CoreFormatTextDirective } from './format-text';

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
})
export class CoreCollapsibleHeaderDirective implements OnInit, OnChanges, OnDestroy {

    @Input() collapsible = true;

    protected page?: HTMLElement;
    protected collapsedHeader?: Element;
    protected collapsedFontStyles?: Partial<CSSStyleDeclaration>;
    protected expandedHeader?: Element;
    protected expandedHeaderHeight?: number;
    protected expandedFontStyles?: Partial<CSSStyleDeclaration>;
    protected content?: HTMLIonContentElement;
    protected contentScrollListener?: EventListener;
    protected floatingTitle?: HTMLElement;
    protected scrollingHeight?: number;
    protected subscriptions: Subscription[] = [];
    protected enabled = true;
    protected endAnimationTimeout?: number;

    constructor(protected el: ElementRef) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.collapsedHeader = this.el.nativeElement;

        await Promise.all([
            this.initializePage(),
            this.initializeCollapsedHeader(),
            this.initializeExpandedHeader(),
        ]);

        this.initializeFloatingTitle();
        this.initializeContent();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.collapsible) {
            this.enabled = !CoreUtils.isFalseOrZero(changes.collapsible.currentValue);
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
    }

    /**
     * Search the page element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializePage(): Promise<void> {
        if (!this.collapsedHeader?.parentElement) {
            throw new Error('[collapsible-header] Couldn\'t get page');
        }

        // Find element and prepare classes.
        this.page = this.collapsedHeader.parentElement;

        this.page.classList.add('collapsible-header-page');
    }

    /**
     * Search the collapsed header element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeCollapsedHeader(): Promise<void> {
        if (!this.collapsedHeader) {
            throw new Error('[collapsible-header] Couldn\'t initialize collapsed header');
        }

        this.collapsedHeader.classList.add('collapsible-header-collapsed');

        await this.waitFormatTextsRendered(this.collapsedHeader);
    }

    /**
     * Search the expanded header element, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeExpandedHeader(): Promise<void> {
        do {
            await CoreUtils.wait(50);

            this.expandedHeader = this.page?.querySelector('ion-item[collapsible]') ?? undefined;

            if (!this.expandedHeader) {
                continue;
            }

            await this.waitFormatTextsRendered(this.expandedHeader);
        } while (
            !this.expandedHeader ||
            this.expandedHeader.clientHeight === 0 ||
            this.expandedHeader.closest('ion-content.animating')
        );

        this.expandedHeader.classList.add('collapsible-header-expanded');
    }

    /**
     * Search the page content, initialize it, and wait until it's ready for the transition to trigger on scroll.
     */
    protected async initializeContent(): Promise<void> {
        // Initialize from tabs.
        const tabs = CoreComponentsRegistry.resolve(this.page?.querySelector('core-tabs-outlet'), CoreTabsOutletComponent);

        if (tabs) {
            const outlet = tabs.getOutlet();
            const onOutletUpdated = () => {
                const activePage = outlet.nativeEl.querySelector('.ion-page:not(.ion-page-hidden)');

                this.updateContent(activePage?.querySelector('ion-content:not(.disable-scroll-y)') as HTMLIonContentElement);
            };

            this.subscriptions.push(outlet.activateEvents.subscribe(onOutletUpdated));

            return;
        }

        // Initialize from page content.
        const content = this.page?.querySelector('ion-content:not(.disable-scroll-y)');

        if (!content) {
            throw new Error('[collapsible-header] Couldn\'t get content');
        }

        this.trackContentScroll(content as HTMLIonContentElement);
    }

    /**
     * Initialize a floating title to mimic transitioning the title from one state to the other.
     */
    protected initializeFloatingTitle(): void {
        if (!this.page || !this.collapsedHeader || !this.expandedHeader) {
            throw new Error('[collapsible-header] Couldn\'t create floating title');
        }

        // Add floating title and measure initial position.
        const collapsedHeaderTitle = this.collapsedHeader.querySelector('h1') as HTMLElement;
        const originalTitle = this.expandedHeader.querySelector('h1') as HTMLElement;
        const floatingTitleWrapper = originalTitle.parentElement as HTMLElement;
        const floatingTitle = originalTitle.cloneNode(true) as HTMLElement;

        originalTitle.classList.add('collapsible-header-original-title');
        floatingTitle.classList.add('collapsible-header-floating-title');
        floatingTitleWrapper.classList.add('collapsible-header-floating-title-wrapper');
        floatingTitleWrapper.insertBefore(floatingTitle, originalTitle);

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
                styles[0][property] = collapsedTitleStyles.getPropertyValue(property);
                styles[1][property] = expandedTitleStyles.getPropertyValue(property);

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
        this.page.classList.add('is-active');

        this.floatingTitle = floatingTitle;
        this.scrollingHeight = originalTitleBoundingBox.top - collapsedHeaderTitleBoundingBox.top;
        this.collapsedFontStyles = collapsedFontStyles;
        this.expandedFontStyles = expandedFontStyles;
        this.expandedHeaderHeight = expandedHeaderHeight;
    }

    /**
     * Wait until all <core-format-text> children inside the element are done rendering.
     *
     * @param element Element.
     */
    protected async waitFormatTextsRendered(element: Element): Promise<void> {
        const formatTexts = Array
            .from(element.querySelectorAll('core-format-text'))
            .map(element => CoreComponentsRegistry.resolve(element, CoreFormatTextDirective));

        await Promise.all(formatTexts.map(formatText => formatText?.rendered()));
    }

    /**
     * Update content element whos scroll is being tracked.
     *
     * @param content Content element.
     */
    protected updateContent(content?: HTMLIonContentElement | null): void {
        if (this.content && this.contentScrollListener) {
            this.content.removeEventListener('ionScroll', this.contentScrollListener);

            delete this.content;
            delete this.contentScrollListener;
        }

        content && this.trackContentScroll(content);
    }

    /**
     * Set collapsed/expanded based on properties.
     *
     * @param enable True to enable, false otherwise
     */
    async setEnabled(enable: boolean): Promise<void> {
        if (!this.page || !this.content) {
            return;
        }

        if (enable) {
            const contentScroll = await this.content.getScrollElement();

            // Do nothing, since scroll has already started on the page.
            if (contentScroll.scrollTop > 0) {
                return;
            }
        }

        this.page.style.setProperty('--collapsible-header-progress', enable ? '0' : '1');
        this.page.classList.toggle('is-collapsed', !enable);
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
        const scrollingHeight = this.scrollingHeight;
        const expandedHeader = this.expandedHeader;
        const expandedHeaderHeight = this.expandedHeaderHeight;
        const expandedFontStyles = this.expandedFontStyles;
        const collapsedFontStyles = this.collapsedFontStyles;
        const floatingTitle = this.floatingTitle;
        const contentScroll = await this.content.getScrollElement();

        if (
            !page ||
            !scrollingHeight ||
            !expandedHeader ||
            !expandedHeaderHeight ||
            !expandedFontStyles ||
            !collapsedFontStyles ||
            !floatingTitle
        ) {
            throw new Error('[collapsible-header] Couldn\'t set up scrolling');
        }

        page.classList.toggle('is-within-content', content.contains(expandedHeader));
        this.setEnabled(this.enabled);

        Object
            .entries(expandedFontStyles)
            .forEach(([property, value]) => floatingTitle.style.setProperty(property, value as string));

        this.content.addEventListener('ionScroll', this.contentScrollListener = ({ target }: CustomEvent<ScrollDetail>): void => {
            if (target !== this.content || !this.enabled) {
                return;
            }

            if (this.endAnimationTimeout) {
                clearTimeout(this.endAnimationTimeout);
            }

            const scrollableHeight = contentScroll.scrollHeight - contentScroll.clientHeight;
            const frozen = scrollableHeight <=  scrollingHeight;
            const progress = frozen
                ? 0
                :  CoreMath.clamp(contentScroll.scrollTop / scrollingHeight, 0, 1);

            page.style.setProperty('--collapsible-header-progress', `${progress}`);
            page.classList.toggle('is-frozen', frozen);
            page.classList.toggle('is-collapsed', progress === 1);

            Object
                .entries(progress > .5 ? collapsedFontStyles : expandedFontStyles)
                .forEach(([property, value]) => floatingTitle.style.setProperty(property, value as string));

            if (progress > 0 && progress < 1) {
                // Finish opening or closing the bar.
                this.endAnimationTimeout = window.setTimeout(() => this.endAnimation(progress), 500);
            }
        });
    }

    /**
     * End of animation when stop scrolling.
     *
     * @param progress Progress.
     */
    protected endAnimation(progress: number): void {
        if(!this.page) {
            return;
        }

        const collapse = progress > 0.5;

        this.page.style.setProperty('--collapsible-header-progress', collapse ? '1' : '0');
        this.page.classList.toggle('is-collapsed', collapse);
    }

}
