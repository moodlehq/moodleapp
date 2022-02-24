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

import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChange } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ScrollDetail } from '@ionic/core';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreMath } from '@singletons/math';

/**
 * Component to show a "bar" with arrows to navigate forward/backward and an slider to move around.
 *
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next item when clicked.
 * If no previous/next item is defined, that arrow won't be shown.
 *
 * Example usage:
 * <core-navigation-bar [items]="items" (action)="goTo($event)"></core-navigation-bar>
 */
@Component({
    selector: 'core-navigation-bar',
    templateUrl: 'core-navigation-bar.html',
    styleUrls: ['navigation-bar.scss'],
})
export class CoreNavigationBarComponent implements OnDestroy, OnChanges {

    @Input() items: CoreNavigationBarItem[] = []; // List of items.
    @Input() previousTranslate = 'core.previous'; // Previous translatable text, can admit $a variable.
    @Input() nextTranslate = 'core.next'; // Next translatable text, can admit $a variable.
    @Input() component?: string; // Component the bar belongs to.
    @Input() componentId?: number; // Component ID.
    @Input() contextLevel?: string; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.

    previousTitle?: string; // Previous item title.
    nextTitle?: string; // Next item title.
    previousIndex = -1; // Previous item index. If -1, the previous arrow won't be shown.
    nextIndex = -1; // Next item index. If -1, the next arrow won't be shown.
    currentIndex = 0;
    progress = 0;
    progressText = '';

    protected element: HTMLElement;
    protected initialHeight = 0;
    protected initialPaddingBottom = 0;
    protected previousTop = 0;
    protected previousHeight = 0;
    protected stickTimeout?: number;
    protected content?: HTMLIonContentElement | null;

    // Function to call when arrow is clicked. Will receive as a param the item to load.
    @Output() action: EventEmitter<unknown> = new EventEmitter<unknown>();

    constructor(el: ElementRef, protected ionContent: IonContent) {
        this.element = el.nativeElement;
        this.element.setAttribute('slot', 'fixed'); // Just in case somebody forgets to add it.
    }

    /**
     * Setup scroll event listener.
     *
     * @param retries Number of retries left.
     */
    protected async listenScrollEvents(retries = 3): Promise<void> {
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

        this.content.classList.add('has-core-navigation');

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

        this.element.style.opacity = height <= 0 ? '0' : '1';
        this.content?.style.setProperty('--core-navigation-height', height + 'px');
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
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (!changes.items || !this.items.length) {
            return;
        }

        this.currentIndex = this.items.findIndex((item) => item.current);
        if (this.currentIndex < 0) {
            return;
        }

        this.progress = ((this.currentIndex + 1) / this.items.length) * 100;
        this.progressText = `${this.currentIndex + 1} / ${this.items.length}`;

        this.nextIndex = this.items[this.currentIndex + 1]?.enabled ? this.currentIndex + 1 : -1;
        if (this.nextIndex >= 0) {
            this.nextTitle = Translate.instant(this.nextTranslate, { $a: this.items[this.nextIndex].title || '' });
        }

        this.previousIndex = this.items[this.currentIndex - 1]?.enabled ? this.currentIndex - 1 : -1;
        if (this.previousIndex >= 0) {
            this.previousTitle = Translate.instant(this.previousTranslate, { $a: this.items[this.previousIndex].title || '' });
        }

        this.listenScrollEvents();
    }

    /**
     * Navigate to an item.
     *
     * @param itemIndex Selected item index.
     */
    navigate(itemIndex: number): void {
        if (this.currentIndex == itemIndex || !this.items[itemIndex].enabled) {
            return;
        }

        this.currentIndex = itemIndex;
        this.action.emit(this.items[itemIndex].item);
    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        this.content?.style.setProperty('--padding-bottom', this.initialPaddingBottom + 'px');
    }

}

export type CoreNavigationBarItem<T = unknown> = {
    item: T;
    title?: string;
    current: boolean;
    enabled: boolean;
};
