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

import { CoreConstants } from '@/core/constants';
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreSwipeNavigationTourComponent } from '@features/usertours/components/swipe-navigation-tour/swipe-navigation-tour';
import { CoreUserTours } from '@features/usertours/services/user-tours';
import { Gesture, GestureDetail } from '@ionic/angular';
import { CorePlatform } from '@services/platform';
import { GestureController } from '@singletons';

const ACTIVATION_THRESHOLD = 150;
const SWIPE_FRICTION = 0.6;

/**
 * Directive to enable content navigation with swipe.
 *
 * Example usage:
 *
 * <ion-content [core-swipe-navigation]="manager">
 */
@Directive({
    selector: 'ion-content[core-swipe-navigation]',
})
export class CoreSwipeNavigationDirective implements AfterViewInit, OnDestroy {

    readonly manager = input<CoreSwipeNavigationItemsManager>(undefined, { alias: 'core-swipe-navigation' });

    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected swipeGesture?: Gesture;

    constructor() {
        if (CoreConstants.enableDevTools()) {
            this.element['swipeNavigation'] = this;
            this.element.classList.add('uses-swipe-navigation');
        }
    }

    get enabled(): boolean {
        return !!this.manager();
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        // Set up gesture listener
        const style = this.element.style;
        this.swipeGesture = GestureController.create({
            el: this.element,
            gestureName: 'swipe',
            threshold: 10,
            direction: 'x',
            gesturePriority: 10,
            maxAngle: 20,
            canStart: () => this.enabled,
            onStart: () => {
                style.transition = '';
            },
            onMove: (ev) => {
                style.transform = `translateX(${ev.deltaX * SWIPE_FRICTION }px)`;
            },
            onEnd: (ev) => {
                this.onRelease(ev);
            },
        });

        const source = this.manager()?.getSource();
        if (!source) {
            return;
        }

        await source.waitForLoaded();

        const items = source.getItems() ?? [];
        if (!this.enabled || items.length < 2) {
            return;
        }

        this.swipeGesture.enable();

        // Show user tour.
        await CoreUserTours.showIfPending({
            id: 'swipe-navigation',
            component: CoreSwipeNavigationTourComponent,
            watch: this.element,
        });
    }

    /**
     * Move to item to the left.
     */
    swipeLeft(): void {
        if (!this.enabled) {
            return;
        }

        CorePlatform.isRTL
            ? this.manager()?.navigateToPreviousItem()
            : this.manager()?.navigateToNextItem();
    }

    /**
     * Move to item to the right.
     */
    swipeRight(): void {
        if (!this.enabled) {
            return;
        }

        CorePlatform.isRTL
            ? this.manager()?.navigateToNextItem()
            : this.manager()?.navigateToPreviousItem();
    }

    /**
     * Check whether there is an item to the right of the current selection.
     *
     * @returns If has an item to the right.
     */
    protected async hasItemRight(): Promise<boolean> {
        const manager = this.manager();
        if (!manager) {
            return false;
        }

        return CorePlatform.isRTL
            ? await manager.hasNextItem()
            : await manager.hasPreviousItem();
    }

    /**
     * Check whether there is an item to the left of the current selection.
     *
     * @returns If has an item to the left.
     */
    protected async hasItemLeft(): Promise<boolean> {
        const manager = this.manager();
        if (!manager) {
            return false;
        }

        return CorePlatform.isRTL
            ? await manager.hasPreviousItem()
            : await manager.hasNextItem();
    }

    /**
     * Prevent click event by capturing the click before happening.
     */
    protected preventClickOnElement(): void {
        this.element.addEventListener(
            'click',
            (ev: Event) => {
                ev.preventDefault();
                ev.stopPropagation();

                return false;
            },
            true, // Register event on the capture phase.
        );

    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.swipeGesture?.destroy();
    }

    /**
     * Handle swipe release event.
     *
     * @param event Event.
     */
    protected async onRelease(event: GestureDetail): Promise<void> {
        this.element.style.transition = '.5s ease-out';

        if (event.deltaX > ACTIVATION_THRESHOLD && await this.hasItemRight()) {
            this.preventClickOnElement();
            this.swipeRight();

            this.element.style.transform = 'translateX(100%) !important';

            return;
        }

        if (event.deltaX < -ACTIVATION_THRESHOLD && await this.hasItemLeft()) {
            this.element.style.transform = 'translateX(-100%) !important';

            this.preventClickOnElement();
            this.swipeLeft();

            return;
        }

        this.element.style.transform = '';
    }

}
