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

import {  AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { Gesture } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
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

    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('core-swipe-navigation') manager?: CoreSwipeNavigationItemsManager;

    protected element: HTMLElement;
    protected swipeGesture?: Gesture;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
    }

    get enabled(): boolean {
        return CoreScreen.isMobile && !!this.manager;
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        const style = this.element.style;
        this.swipeGesture = GestureController.create({
            el: this.element,
            gestureName: 'swipe',
            threshold: 10,
            gesturePriority: 10,
            canStart: () => this.enabled,
            onStart: () => {
                style.transition = '';
            },
            onMove: (ev) => {
                style.transform = `translateX(${ev.deltaX * SWIPE_FRICTION }px)`;
            },
            onEnd: (ev) => {
                style.transition = '.5s ease-out';

                if (ev.deltaX > ACTIVATION_THRESHOLD) {
                    this.manager?.hasNextItem().then((hasNext) => {
                        if (hasNext) {
                            this.preventClickOnElement();

                            style.transform = 'translateX(100%) !important';
                            this.swipeRight();
                        } else {
                            style.transform = '';
                        }

                        return;
                    });

                    return;
                }

                if (ev.deltaX < -ACTIVATION_THRESHOLD) {
                    this.manager?.hasPreviousItem().then((hasPrevious) => {
                        if (hasPrevious) {

                            this.preventClickOnElement();

                            style.transform = 'translateX(-100%) !important';
                            this.swipeLeft();
                        } else {
                            style.transform = '';
                        }

                        return;
                    });

                    return;
                }

                style.transform = '';

            },
        });
        this.swipeGesture.enable();
    }

    /**
     * Swipe to previous item.
     */
    swipeLeft(): void {
        if (!this.enabled) {
            return;
        }

        this.manager?.navigateToPreviousItem();
    }

    /**
     * Swipe to next item.
     */
    swipeRight(): void {
        if (!this.enabled) {
            return;
        }

        this.manager?.navigateToNextItem();
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

}
