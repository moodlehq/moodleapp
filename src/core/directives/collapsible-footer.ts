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

import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ScrollDetail } from '@ionic/core';
import { IonContent } from '@ionic/angular';
import { CoreUtils } from '@static/utils';
import { CoreMath } from '@static/math';
import { CoreDirectivesRegistry } from '@static/directives-registry';
import { CoreFormatTextDirective } from './format-text';
import { CoreEventObserver } from '@static/events';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreDom } from '@static/dom';
import { CoreWait } from '@static/wait';
import { toBoolean } from '../transforms/boolean';
import type { AsyncDirective } from '@coretypes/async-directive';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Directive to make an element fixed at the bottom collapsible when scrolling.
 *
 * Example usage:
 *
 * <div collapsible-footer>
 */
@Directive({
    selector: '[collapsible-footer]',
})
export class CoreCollapsibleFooterDirective implements OnInit, OnDestroy, AsyncDirective {

    readonly appearOnBottom = input(false, { transform: toBoolean }); // Whether footer should re-appear when reaching the bottom.

    protected id = '0';
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected expandedHeight = 48;
    protected collapsedHeight = 0;
    protected initialPaddingBottom = '0px';
    protected previousTop = 0;
    protected previousHeight = 0;
    protected content?: HTMLIonContentElement | null;
    protected loadingChangedListener?: CoreEventObserver;
    protected contentScrollListener?: EventListener;
    protected endContentScrollListener?: EventListener;
    protected resizeListener?: CoreEventObserver;
    protected slotPromise?: CoreCancellablePromise<void>;
    protected viewportPromise?: CoreCancellablePromise<void>;
    protected loadingHeight = false;
    protected pageDidEnterListener?: EventListener;
    protected keyUpListener?: EventListener;
    protected page?: HTMLElement;
    protected moduleNav: HTMLElement | null = null;
    protected ionContent = inject(IonContent);
    protected onReadyPromise = new CorePromisedValue<void>();

    constructor() {
        CoreDirectivesRegistry.register(this.element, this);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.id = String(CoreUtils.getUniqueId('CoreCollapsibleFooterDirective'));
        this.slotPromise = CoreDom.slotOnContent(this.element);

        await this.slotPromise;
        await this.waitLoadingsDone();
        await this.waitFormatTextsRendered();

        this.content = this.element.closest('ion-content');
        this.content?.setAttribute('data-collapsible-footer-id', this.id);

        await this.calculateHeight();

        CoreDom.onElementSlot(this.element, () => {
            this.calculateHeight();
        });

        this.listenEvents();
    }

    /**
     * Get the expanded height of the collapsible footer.
     *
     * @returns The expanded height of the collapsible footer.
     */
    getExpandedHeight(): number {
        return this.expandedHeight;
    }

    /**
     * Calculate the height of the footer.
     */
    protected async calculateHeight(): Promise<void> {
        if (this.loadingHeight) {
            // Already calculating, return.
            return;
        }
        this.loadingHeight = true;

        this.viewportPromise = CoreDom.waitToBeInViewport(this.element);
        await this.viewportPromise;

        this.element.classList.remove('is-active');
        await CoreWait.nextTick();

        // Set a minimum height value.
        this.expandedHeight = this.element.getBoundingClientRect().height || this.expandedHeight;
        this.moduleNav = this.element.tagName === 'CORE-COURSE-MODULE-NAVIGATION' ?
            this.element : this.element.querySelector('core-course-module-navigation');
        if (this.moduleNav && this.moduleNav !== this.element) {
            this.element.classList.add('has-module-nav');
            this.collapsedHeight = this.expandedHeight - this.moduleNav.getBoundingClientRect().height;
        }

        this.previousHeight = this.expandedHeight;

        this.content?.style.setProperty('--core-collapsible-footer-max-height', `${this.expandedHeight}px`);
        this.element.classList.add('is-active');

        this.setBarHeight(this.expandedHeight);
        this.loadingHeight = false;
        this.onReadyPromise.resolve();
    }

    /**
     * Setup event listeners.
     */
    protected async listenEvents(): Promise<void> {
        if (!this.content || this.content?.classList.contains('has-collapsible-footer')) {
            return;
        }

        this.content.classList.add('has-collapsible-footer');

        // Move element to the nearest ion-content if it's not the parent.
        if (this.element.parentElement?.nodeName != 'ION-CONTENT') {
            this.content.appendChild(this.element);
        }

        // Set a padding to not overlap elements.
        this.initialPaddingBottom = this.content.style.getPropertyValue('--padding-bottom') || this.initialPaddingBottom;
        this.content.style.setProperty(
            '--padding-bottom',
            `calc(${this.initialPaddingBottom} + var(--core-collapsible-footer-max-height, 0px))`,
        );

        const scroll = await this.content.getScrollElement();
        this.content.scrollEvents = true;

        // Init shadow.
        this.content.classList.toggle('core-footer-shadow', !CoreDom.scrollIsBottom(scroll));

        this.content.addEventListener('ionScroll', this.contentScrollListener = ((e: CustomEvent<ScrollDetail>): void => {
            if (!this.content) {
                return;
            }

            this.onScroll(e.detail, scroll);
        }) as EventListener);

        this.content.addEventListener('ionScrollEnd', this.endContentScrollListener = (): void => {
            if (!this.content) {
                return;
            }

            const height = this.previousHeight;
            const collapsed = height <= this.collapsedHeight;
            const expanded = height >= this.expandedHeight;

            if (!collapsed && !expanded) {
                // Finish opening or closing the bar.
                const newHeight = (height - this.collapsedHeight) < (this.expandedHeight - this.collapsedHeight) / 2
                    ? this.collapsedHeight
                    : this.expandedHeight;

                this.setBarHeight(newHeight);
            }
        });

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.calculateHeight();
        }, 50);

        this.page = this.content.closest<HTMLElement>('.ion-page') || undefined;
        this.page?.addEventListener(
            'ionViewDidEnter',
            this.pageDidEnterListener = () => {
                this.calculateHeight();
            },
        );

        // Handle scroll when navigating using tab key and the selected element is behind the footer.
        this.content.addEventListener('keyup', this.keyUpListener = (ev: KeyboardEvent) => {
            if (ev.key !== 'Tab' || !document.activeElement) {
                return;
            }

            if (document.activeElement.getBoundingClientRect().bottom > this.element.getBoundingClientRect().top) {
                document.activeElement.scrollIntoView({ block: 'center' });
            }
        });

        // Show footer when it is focused,
        this.moduleNav?.addEventListener('focusin', () => {
            this.setBarHeight(this.expandedHeight);
        });
    }

    /**
     * Wait until all <core-format-text> children inside the element are done rendering.
     */
    protected async waitFormatTextsRendered(): Promise<void> {
        await CoreDirectivesRegistry.waitDirectivesReady(this.element, 'core-format-text', CoreFormatTextDirective);
    }

    /**
     * On scroll function.
     *
     * @param scrollDetail Scroll detail object.
     * @param scrollElement Scroll element to calculate maxScroll.
     */
    protected onScroll(scrollDetail: ScrollDetail, scrollElement: HTMLElement): void {
        const maxScroll = scrollElement.scrollHeight - scrollElement.offsetHeight - 12;
        const footerHasFocus = this.moduleNav?.contains(document.activeElement);
        if (scrollDetail.scrollTop <= 0 || (this.appearOnBottom() && scrollDetail.scrollTop >= maxScroll) || footerHasFocus) {
            // Reset.
            this.setBarHeight(this.expandedHeight);
        } else {
            let newHeight = this.previousHeight - (scrollDetail.scrollTop - this.previousTop);
            newHeight = CoreMath.clamp(newHeight, this.collapsedHeight, this.expandedHeight);

            this.setBarHeight(newHeight);
        }
        this.previousTop = scrollDetail.scrollTop;
    }

    /**
     * Sets the bar height.
     *
     * @param height The new bar height.
     */
    protected setBarHeight(height: number): void {
        const collapsed = height <= this.collapsedHeight;
        const expanded = height >= this.expandedHeight;
        this.element.classList.toggle('footer-collapsed', collapsed);
        this.element.classList.toggle('footer-expanded', expanded);
        this.content?.style.setProperty('--core-collapsible-footer-height', `${height}px`);
        this.previousHeight = height;
    }

    /**
     * Wait until all <core-loading> children inside the page.
     *
     * @returns Promise resolved when loadings are done.
     */
    protected async waitLoadingsDone(): Promise<void> {
        const scrollElement = await this.ionContent.getScrollElement();

        await Promise.all([
            await CoreDirectivesRegistry.waitDirectivesReady(scrollElement, 'core-loading', CoreLoadingComponent),
            await CoreDirectivesRegistry.waitDirectivesReady(this.element, 'core-loading', CoreLoadingComponent),
        ]);
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        if (this.content) {
            // Only reset the variables and classes if the collapsible footer hasn't changed (avoid race conditions).
            if (this.content.getAttribute('data-collapsible-footer-id') === this.id) {
                this.content.style.setProperty('--padding-bottom', this.initialPaddingBottom);
                this.content.classList.remove('has-collapsible-footer');
            }

            if (this.contentScrollListener) {
                this.content.removeEventListener('ionScroll', this.contentScrollListener);
            }
            if (this.endContentScrollListener) {
                this.content.removeEventListener('ionScrollEnd', this.endContentScrollListener);
            }
            if (this.keyUpListener) {
                this.content.removeEventListener('keyup', this.keyUpListener);
            }
        }

        if (this.page && this.pageDidEnterListener) {
            this.page.removeEventListener('ionViewDidEnter', this.pageDidEnterListener);
        }

        this.element?.remove();
        this.resizeListener?.off();
        this.slotPromise?.cancel();
        this.viewportPromise?.cancel();
    }

}
