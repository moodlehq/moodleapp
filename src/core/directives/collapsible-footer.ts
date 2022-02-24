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
    protected initialPaddingBottom = 0;
    protected previousTop = 0;
    protected previousHeight = 0;
    protected stickTimeout?: number;
    protected content?: HTMLIonContentElement | null;

    constructor(el: ElementRef, protected ionContent: IonContent) {
        this.element = el.nativeElement;
        this.element.setAttribute('slot', 'fixed'); // Just in case somebody forgets to add it.
    }

    /**
     * Setup scroll event listener.
     *
     * @param retries Number of retries left.
     */
    protected async listenScrollEvents(retries = 5): Promise<void> {
        // Already initialized.
        if (this.initialHeight > 0) {
            return;
        }

        this.initialHeight = this.element.getBoundingClientRect().height;

        if (this.initialHeight == 0 && retries > 0) {
            await CoreUtils.nextTicks(50);

            this.listenScrollEvents(retries - 1);

            return;
        }

        // Set a minimum height value.
        this.initialHeight = this.initialHeight || 48;
        this.previousHeight = this.initialHeight;

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
        this.initialPaddingBottom = parseFloat(this.content.style.getPropertyValue('--padding-bottom') || '0');
        this.content.style.setProperty('--padding-bottom', this.initialPaddingBottom + this.initialHeight + 'px');
        const scroll = await this.content.getScrollElement();
        this.content.scrollEvents = true;

        this.setBarHeight(this.initialHeight);
        this.content.addEventListener('ionScroll', (e: CustomEvent<ScrollDetail>): void => {
            if (!this.content) {
                return;
            }

            this.onScroll(e.detail, scroll);
        });

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
        if (this.stickTimeout) {
            clearTimeout(this.stickTimeout);
        }

        this.element.classList.toggle('footer-collapsed', height <= 0);
        this.element.classList.toggle('footer-expanded', height >= this.initialHeight);
        this.content?.style.setProperty('--core-collapsible-footer-height', height + 'px');
        this.previousHeight = height;

        if (height > 0 && height < this.initialHeight) {
            // Finish opening or closing the bar.
            const newHeight = height < this.initialHeight / 2 ? 0 : this.initialHeight;

            this.stickTimeout = window.setTimeout(() => this.setBarHeight(newHeight), 500);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.listenScrollEvents();
    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        this.content?.style.setProperty('--padding-bottom', this.initialPaddingBottom + 'px');
    }

}
