// (C) Copyright 2015 Martin Dougiamas
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

import { Animation } from 'ionic-angular/animations/animation';
import { isPresent } from 'ionic-angular/util/util';
import { PageTransition } from 'ionic-angular/transitions/page-transition';

const DURATION = 500;
const EASING = 'cubic-bezier(0.36,0.66,0.04,1)';
const OPACITY = 'opacity';
const TRANSFORM = 'transform';
const TRANSLATEX = 'translateX';
const CENTER = '0%';
const OFF_OPACITY = 0.8;
const SHOW_BACK_BTN_CSS = 'show-back-button';

/**
 * This class overrides the default transition to avoid glitches with new tabs and split view.
 * Is based on IOSTransition class but it has some changes:
 *  - The animation is done to the full page not header, footer and content separetely.
 *  - On the Navbar only the back button is animated (title and other buttons will be done as a whole). Otherwise back button won't
 *  appear.
 */
export class CorePageTransition extends PageTransition {
    init(): void {
        super.init();
        const plt = this.plt;
        const OFF_RIGHT = plt.isRTL ? '-99.5%' : '99.5%';
        const OFF_LEFT = plt.isRTL ? '33%' : '-33%';
        const enteringView = this.enteringView;
        const leavingView = this.leavingView;
        const opts = this.opts;
        this.duration(isPresent(opts.duration) ? opts.duration : DURATION);
        this.easing(isPresent(opts.easing) ? opts.easing : EASING);
        const backDirection = (opts.direction === 'back');
        const enteringHasNavbar = (enteringView && enteringView.hasNavbar());
        const leavingHasNavbar = (leavingView && leavingView.hasNavbar());
        if (enteringView) {
            // Get the native element for the entering page.
            const enteringPageEle = enteringView.pageRef().nativeElement;
            // Entering content.
            const enteringContent = new Animation(plt, enteringPageEle);
            this.add(enteringContent);
            if (backDirection) {
                // Entering content, back direction.
                enteringContent
                    .fromTo(TRANSLATEX, OFF_LEFT, CENTER, true)
                    .fromTo(OPACITY, OFF_OPACITY, 1, true);
            }
            else {
                // Entering content, forward direction.
                enteringContent
                    .beforeClearStyles([OPACITY])
                    .fromTo(TRANSLATEX, OFF_RIGHT, CENTER, true);
            }
            if (enteringHasNavbar) {
                // Entering page has a navbar.
                const enteringNavbarEle = enteringPageEle.querySelector('ion-navbar');
                const enteringNavBar = new Animation(plt, enteringNavbarEle);
                this.add(enteringNavBar);
                const enteringBackButton = new Animation(plt, enteringNavbarEle.querySelector('.back-button'));
                enteringNavBar
                    .add(enteringBackButton);
                // Set properties depending on direction.
                if (backDirection) {
                    // Entering navbar, back direction.
                    if (enteringView.enableBack()) {
                        // Back direction, entering page has a back button.
                        enteringBackButton
                            .beforeAddClass(SHOW_BACK_BTN_CSS)
                            .fromTo(OPACITY, 0.01, 1, true);
                    }
                }
                else {
                    // Entering navbar, forward direction.
                    if (enteringView.enableBack()) {
                        // Forward direction, entering page has a back button.
                        enteringBackButton
                            .beforeAddClass(SHOW_BACK_BTN_CSS)
                            .fromTo(OPACITY, 0.01, 1, true);
                        const enteringBackBtnText = new Animation(plt, enteringNavbarEle.querySelector('.back-button-text'));
                        enteringBackBtnText.fromTo(TRANSLATEX, (plt.isRTL ? '-100px' : '100px'), '0px');
                        enteringNavBar.add(enteringBackBtnText);
                    }
                    else {
                        enteringBackButton.beforeRemoveClass(SHOW_BACK_BTN_CSS);
                    }
                }
            }
        }
        // Setup leaving view.
        if (leavingView && leavingView.pageRef()) {
            // Leaving content.
            const leavingPageEle = leavingView.pageRef().nativeElement;
            const leavingContent = new Animation(plt, leavingPageEle);
            this.add(leavingContent);
            if (backDirection) {
                // Leaving content, back direction.
                leavingContent
                    .beforeClearStyles([OPACITY])
                    .fromTo(TRANSLATEX, CENTER, (plt.isRTL ? '-100%' : '100%'));
            }
            else {
                // Leaving content, forward direction.
                leavingContent
                    .fromTo(TRANSLATEX, CENTER, OFF_LEFT)
                    .fromTo(OPACITY, 1, OFF_OPACITY)
                    .afterClearStyles([TRANSFORM, OPACITY]);
            }
            if (leavingHasNavbar) {
                // Leaving page has a navbar.
                const leavingNavbarEle = leavingPageEle.querySelector('ion-navbar');
                const leavingNavBar = new Animation(plt, leavingNavbarEle);
                const leavingBackButton = new Animation(plt, leavingNavbarEle.querySelector('.back-button'));
                leavingNavBar
                    .add(leavingBackButton);
                this.add(leavingNavBar);
                // Fade out leaving navbar items.
                leavingBackButton.fromTo(OPACITY, 0.99, 0);
                if (backDirection) {
                    const leavingBackBtnText = new Animation(plt, leavingNavbarEle.querySelector('.back-button-text'));
                    leavingBackBtnText.fromTo(TRANSLATEX, CENTER, (plt.isRTL ? -300 : 300) + 'px');
                    leavingNavBar.add(leavingBackBtnText);
                }
                else {
                    // Leaving navbar, forward direction.
                    leavingBackButton.afterClearStyles([OPACITY]);
                }
            }
        }
    }
}
