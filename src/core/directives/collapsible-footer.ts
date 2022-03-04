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

import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ScrollDetail } from '@ionic/core';
import { IonContent } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';
import { CoreMath } from '@singletons/math';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CoreFormatTextDirective } from './format-text';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventLoadingChangedData, CoreEventObserver, CoreEvents } from '@singletons/events';

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
export class CoreCollapsibleFooterDirective implements OnInit, OnDestroy {

    protected element: HTMLElement;
    protected initialHeight = 0;
    protected initialPaddingBottom = '0px';
    protected previousTop = 0;
    protected previousHeight = 0;
    protected endAnimationTimeout?: number;
    protected content?: HTMLIonContentElement | null;
    protected loadingChangedListener?: CoreEventObserver;

    constructor(el: ElementRef, protected ionContent: IonContent) {
        this.element = el.nativeElement;
        this.element.setAttribute('slot', 'fixed'); // Just in case somebody forgets to add it.
    }

    /**
     * Calculate the height of the footer.
     */
    protected async calculateHeight(): Promise<void> {
        await this.waitFormatTextsRendered(this.element);

        await CoreUtils.nextTick();

        // Set a minimum height value.
        this.initialHeight = this.element.getBoundingClientRect().height || 48;
        this.previousHeight = this.initialHeight;

        this.content?.style.setProperty('--core-collapsible-footer-max-height', this.initialHeight + 'px');

        this.setBarHeight(this.initialHeight);
    }

    /**
     * Setup scroll event listener.
     */
    protected async listenScrollEvents(): Promise<void> {
        if (this.content) {
            return;
        }

        this.content = this.element.closest('ion-content');

        if (!this.content) {
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

        this.content.addEventListener('ionScroll', (e: CustomEvent<ScrollDetail>): void => {
            if (!this.content) {
                return;
            }

            this.onScroll(e.detail, scroll);
        });

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
     * On scroll function.
     *
     * @param scrollDetail Scroll detail object.
     * @param scrollElement Scroll element to calculate maxScroll.
     */
    protected onScroll(scrollDetail: ScrollDetail, scrollElement: HTMLElement): void {
        const maxScroll = scrollElement.scrollHeight - scrollElement.offsetHeight;
        if (scrollDetail.scrollTop <= 0 || scrollDetail.scrollTop >= maxScroll) {
            // Reset.
            this.setBarHeight(this.initialHeight);
        } else {
            let newHeight = this.previousHeight - (scrollDetail.scrollTop - this.previousTop);
            newHeight = CoreMath.clamp(newHeight, 0, this.initialHeight);

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
        if (this.endAnimationTimeout) {
            clearTimeout(this.endAnimationTimeout);
        }

        this.element.classList.toggle('footer-collapsed', height <= 0);
        this.element.classList.toggle('footer-expanded', height >= this.initialHeight);
        this.content?.style.setProperty('--core-collapsible-footer-height', height + 'px');
        this.previousHeight = height;

        if (height > 0 && height < this.initialHeight) {
            // Finish opening or closing the bar.
            this.endAnimationTimeout = window.setTimeout(() => this.endAnimation(height), 500);
        }
    }

    /**
     * End of animation when not scrolling.
     *
     * @param height Last height used.
     */
    protected endAnimation(height: number): void {
        const newHeight = height < this.initialHeight / 2 ? 0 : this.initialHeight;

        this.setBarHeight(newHeight);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Calculate the height now.
        await this.calculateHeight();
        setTimeout(() => this.calculateHeight(), 200); // Try again, sometimes the first calculation is wrong.

        this.listenScrollEvents();

        // Recalculate the height if a parent core-loading displays the content.
        this.loadingChangedListener =
            CoreEvents.on(CoreEvents.CORE_LOADING_CHANGED, async (data: CoreEventLoadingChangedData) => {
                if (data.loaded && CoreDomUtils.closest(this.element.parentElement, '#' + data.uniqueId)) {
                    // The format-text is inside the loading, re-calculate the height.
                    await this.calculateHeight();
                    setTimeout(() => this.calculateHeight(), 200);
                }
            });
    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        this.content?.style.setProperty('--padding-bottom', this.initialPaddingBottom);
    }

}
