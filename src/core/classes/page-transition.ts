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

import { createAnimation } from '@ionic/angular';
import { Animation, NavOptions } from '@ionic/core';

/**
 * Adaptation from Ionic 5 iOs transition.
 *
 * https://github.com/ionic-team/ionic-framework/blob/5.8.x/core/src/utils/transition/ios.transition.ts
 * Removed large title options, translucent header, buttons-collapse and header-collapse-condense-inactive.
 * Changed large title check by collapsible header.
 */

const DURATION = 540;

const getIonPageElement = (element: HTMLElement): HTMLElement | null => {
    if (element.classList.contains('ion-page')) {
        return element;
    }

    const ionPage: HTMLElement | null = element.querySelector(':scope > .ion-page, :scope > ion-nav, :scope > ion-tabs');
    if (ionPage) {
        return ionPage;
    }

    // idk, return the original element so at least something animates and we don't have a null pointer
    return element;
};

export interface TransitionOptions extends NavOptions {
    progressCallback?: ((ani: Animation | undefined) => void);
    baseEl: HTMLElement;
    enteringEl: HTMLElement;
    leavingEl: HTMLElement | undefined;
}

export const shadow = <T extends Element>(el: T): ShadowRoot | T => el.shadowRoot || el;

export const moodleTransitionAnimation = (navEl: HTMLElement, opts: TransitionOptions): Animation => {
    const EASING = 'cubic-bezier(0.32,0.72,0,1)';
    const OPACITY = 'opacity';
    const TRANSFORM = 'transform';
    const CENTER = '0%';
    const OFF_OPACITY = 0.8;

    const isRTL = navEl.ownerDocument.dir === 'rtl';
    const OFF_RIGHT = isRTL ? '-99.5%' : '99.5%';
    const OFF_LEFT = isRTL ? '33%' : '-33%';

    const enteringEl = opts.enteringEl;
    const leavingEl = opts.leavingEl;

    const backDirection = (opts.direction === 'back');
    const contentEl = enteringEl.querySelector(':scope > ion-content');
    const headerEls = enteringEl.querySelectorAll(':scope > ion-header > *:not(ion-toolbar), :scope > ion-footer > *');
    const enteringToolBarEls = enteringEl.querySelectorAll(':scope > ion-header > ion-toolbar');

    const rootAnimation = createAnimation();
    const enteringContentAnimation = createAnimation();

    rootAnimation
        .addElement(enteringEl)
        .duration(opts.duration || DURATION)
        .easing(opts.easing || EASING)
        .fill('both')
        .beforeRemoveClass('ion-page-invisible');

    if (leavingEl && navEl) {
        const navDecorAnimation = createAnimation();
        navDecorAnimation.addElement(navEl);
        rootAnimation.addAnimation(navDecorAnimation);
    }

    if (!contentEl && enteringToolBarEls.length === 0 && headerEls.length === 0) {
        enteringContentAnimation.addElement(
            enteringEl.querySelector(':scope > .ion-page, :scope > ion-nav, :scope > ion-tabs') || [],
        );
    } else {
        enteringContentAnimation.addElement(contentEl || []);
        enteringContentAnimation.addElement(headerEls);
    }

    rootAnimation.addAnimation(enteringContentAnimation);
    enteringContentAnimation.beforeAddClass('animating').afterRemoveClass('animating');

    if (backDirection) {
        enteringContentAnimation
            .beforeClearStyles([OPACITY])
            .fromTo('transform', `translateX(${OFF_LEFT})`, `translateX(${CENTER})`)
            .fromTo(OPACITY, OFF_OPACITY, 1);
    } else {
        // entering content, forward direction
        enteringContentAnimation
            .beforeClearStyles([OPACITY])
            .fromTo('transform', `translateX(${OFF_RIGHT})`, `translateX(${CENTER})`);
    }

    if (contentEl) {
        const enteringTransitionEffectEl: HTMLElement | null = shadow(contentEl).querySelector('.transition-effect');
        if (enteringTransitionEffectEl) {
            const enteringTransitionCoverEl: HTMLElement | null = enteringTransitionEffectEl.querySelector('.transition-cover');
            const enteringTransitionShadowEl: HTMLElement | null = enteringTransitionEffectEl.querySelector('.transition-shadow');

            if (!enteringTransitionCoverEl || !enteringTransitionShadowEl) {
                return rootAnimation;
            }

            const enteringTransitionEffect = createAnimation();
            const enteringTransitionCover = createAnimation();
            const enteringTransitionShadow = createAnimation();

            enteringTransitionEffect
                .addElement(enteringTransitionEffectEl)
                .beforeStyles({ opacity: '1', display: 'block' })
                .afterStyles({ opacity: '', display: '' });

            enteringTransitionCover
                .addElement(enteringTransitionCoverEl)
                .beforeClearStyles([OPACITY])
                .fromTo(OPACITY, 0, 0.1);

            enteringTransitionShadow
                .addElement(enteringTransitionShadowEl)
                .beforeClearStyles([OPACITY])
                .fromTo(OPACITY, 0.03, 0.70);

            enteringTransitionEffect.addAnimation([enteringTransitionCover, enteringTransitionShadow]);
            enteringContentAnimation.addAnimation([enteringTransitionEffect]);
        }
    }

    const enteringContentHasCollapsibleTitle = enteringEl.querySelector('ion-header[collapsible]');
    enteringToolBarEls.forEach(enteringToolBarEl => {
        const enteringToolBar = createAnimation();
        enteringToolBar.addElement(enteringToolBarEl);
        rootAnimation.addAnimation(enteringToolBar);

        const enteringTitle = createAnimation();
        enteringTitle.addElement(enteringToolBarEl.querySelector('ion-title') || []);

        const enteringToolBarButtons = createAnimation();
        const buttons: HTMLIonButtonsElement[] = Array.from(enteringToolBarEl.querySelectorAll('ion-buttons,[menuToggle]'));

        enteringToolBarButtons.addElement(buttons);

        const enteringToolBarItems = createAnimation();
        enteringToolBarItems.addElement(
            enteringToolBarEl.querySelectorAll(':scope > *:not(ion-title):not(ion-buttons):not([menuToggle])'),
        );

        const enteringToolBarBg = createAnimation();
        enteringToolBarBg.addElement(shadow(enteringToolBarEl).querySelector('.toolbar-background') || []);

        const enteringBackButton = createAnimation();
        const backButtonEl = enteringToolBarEl.querySelector('ion-back-button');

        if (backButtonEl) {
            enteringBackButton.addElement(backButtonEl);
        }

        enteringToolBar.addAnimation(
            [enteringTitle, enteringToolBarButtons, enteringToolBarItems, enteringToolBarBg, enteringBackButton],
        );
        enteringToolBarButtons.fromTo(OPACITY, 0.01, 1);
        enteringToolBarItems.fromTo(OPACITY, 0.01, 1);

        if (backDirection) {
            enteringTitle
                .fromTo('transform', `translateX(${OFF_LEFT})`, `translateX(${CENTER})`)
                .fromTo(OPACITY, 0.01, 1);

            enteringToolBarItems.fromTo('transform', `translateX(${OFF_LEFT})`, `translateX(${CENTER})`);

            // back direction, entering page has a back button
            enteringBackButton.fromTo(OPACITY, 0.01, 1);
        } else {
            // entering toolbar, forward direction
            if (!enteringContentHasCollapsibleTitle) {
                enteringTitle
                    .fromTo('transform', `translateX(${OFF_RIGHT})`, `translateX(${CENTER})`)
                    .fromTo(OPACITY, 0.01, 1);
            }

            enteringToolBarItems.fromTo('transform', `translateX(${OFF_RIGHT})`, `translateX(${CENTER})`);
            enteringToolBarBg.beforeClearStyles([OPACITY, 'transform']);

            enteringToolBarBg.fromTo(OPACITY, 0.01, 'var(--opacity)');

            // forward direction, entering page has a back button
            enteringBackButton.fromTo(OPACITY, 0.01, 1);

            if (backButtonEl) {
                const enteringBackBtnText = createAnimation();
                enteringBackBtnText
                    .addElement(shadow(backButtonEl).querySelector('.button-text') || [])
                    .fromTo('transform', (isRTL ? 'translateX(-100px)' : 'translateX(100px)'), 'translateX(0px)');

                enteringToolBar.addAnimation(enteringBackBtnText);
            }
        }
    });

    // setup leaving view
    if (leavingEl) {
        const leavingContent = createAnimation();
        leavingContent.beforeAddClass('animating').afterRemoveClass('animating');

        const leavingContentEl = leavingEl.querySelector(':scope > ion-content');
        const leavingToolBarEls = leavingEl.querySelectorAll(':scope > ion-header > ion-toolbar');
        const leavingHeaderEls = leavingEl.querySelectorAll(':scope > ion-header > *:not(ion-toolbar), :scope > ion-footer > *');

        if (!leavingContentEl && leavingToolBarEls.length === 0 && leavingHeaderEls.length === 0) {
            leavingContent.addElement(
                leavingEl.querySelector(':scope > .ion-page, :scope > ion-nav, :scope > ion-tabs') || [],
            );
        } else {
            leavingContent.addElement(leavingContentEl || []);
            leavingContent.addElement(leavingHeaderEls);
        }

        rootAnimation.addAnimation(leavingContent);

        // Check if leaving content is being translated using transform styles and decide to use fromTo or only To animation.
        const hasTransformStyle = !!leavingContentEl && (leavingContentEl as HTMLElement).style.transform !== '';
        if (backDirection) {
            // leaving content, back direction
            if (hasTransformStyle) {
                leavingContent
                    .to('transform', (isRTL ? 'translateX(-100%)' : 'translateX(100%)'))
                    .fromTo(OPACITY, 1, OFF_OPACITY);
            } else {
                leavingContent
                    .beforeClearStyles([OPACITY])
                    .fromTo('transform', `translateX(${CENTER})`, (isRTL ? 'translateX(-100%)' : 'translateX(100%)'));
            }

            const leavingPage = getIonPageElement(leavingEl) as HTMLElement;
            rootAnimation.afterAddWrite(() => {
                if (rootAnimation.getDirection() === 'normal') {
                    leavingPage.style.setProperty('display', 'none');
                }
            });

        } else {
            // leaving content, forward direction
            if (hasTransformStyle) {
                leavingContent
                    .to('transform', (isRTL ? 'translateX(100%)' : 'translateX(-100%)'))
                    .fromTo(OPACITY, 1, OFF_OPACITY);
            } else {
                leavingContent
                    .fromTo('transform', `translateX(${CENTER})`, `translateX(${OFF_LEFT})`)
                    .fromTo(OPACITY, 1, OFF_OPACITY);
            }
        }

        if (leavingContentEl) {
            const leavingTransitionEffectEl = shadow(leavingContentEl).querySelector('.transition-effect');

            if (leavingTransitionEffectEl) {
                const leavingTransitionCoverEl = leavingTransitionEffectEl.querySelector('.transition-cover');
                const leavingTransitionShadowEl = leavingTransitionEffectEl.querySelector('.transition-shadow');

                const leavingTransitionEffect = createAnimation();
                const leavingTransitionCover = createAnimation();
                const leavingTransitionShadow = createAnimation();

                leavingTransitionEffect
                    .addElement(leavingTransitionEffectEl)
                    .beforeStyles({ opacity: '1', display: 'block' })
                    .afterStyles({ opacity: '', display: '' });

                leavingTransitionCover
                    .addElement(leavingTransitionCoverEl || [])
                    .beforeClearStyles([OPACITY])
                    .fromTo(OPACITY, 0.1, 0);

                leavingTransitionShadow
                    .addElement(leavingTransitionShadowEl || [])
                    .beforeClearStyles([OPACITY])
                    .fromTo(OPACITY, 0.70, 0.03);

                leavingTransitionEffect.addAnimation([leavingTransitionCover, leavingTransitionShadow]);
                leavingContent.addAnimation([leavingTransitionEffect]);
            }
        }

        leavingToolBarEls.forEach(leavingToolBarEl => {
            const leavingToolBar = createAnimation();
            leavingToolBar.addElement(leavingToolBarEl);

            const leavingTitle = createAnimation();
            leavingTitle.addElement(leavingToolBarEl.querySelector('ion-title') || []);

            const leavingToolBarButtons = createAnimation();
            const buttons: HTMLIonButtonsElement[] = Array.from(leavingToolBarEl.querySelectorAll('ion-buttons,[menuToggle]'));

            leavingToolBarButtons.addElement(buttons);

            const leavingToolBarItems = createAnimation();
            const leavingToolBarItemEls =
                leavingToolBarEl.querySelectorAll(':scope > *:not(ion-title):not(ion-buttons):not([menuToggle])');
            if (leavingToolBarItemEls.length > 0) {
                leavingToolBarItems.addElement(leavingToolBarItemEls);
            }

            const leavingToolBarBg = createAnimation();
            leavingToolBarBg.addElement(shadow(leavingToolBarEl).querySelector('.toolbar-background') || []);

            const leavingBackButton = createAnimation();
            const backButtonEl = leavingToolBarEl.querySelector('ion-back-button');
            if (backButtonEl) {
                leavingBackButton.addElement(backButtonEl);
            }

            leavingToolBar.addAnimation(
                [leavingTitle, leavingToolBarButtons, leavingToolBarItems, leavingBackButton, leavingToolBarBg],
            );
            rootAnimation.addAnimation(leavingToolBar);

            // fade out leaving toolbar items
            leavingBackButton.fromTo(OPACITY, 0.99, 0);

            leavingToolBarButtons.fromTo(OPACITY, 0.99, 0);
            leavingToolBarItems.fromTo(OPACITY, 0.99, 0);

            if (backDirection) {
                // leaving toolbar, back direction
                leavingTitle
                    .fromTo('transform', `translateX(${CENTER})`, (isRTL ? 'translateX(-100%)' : 'translateX(100%)'))
                    .fromTo(OPACITY, 0.99, 0);

                leavingToolBarItems.fromTo(
                    'transform',
                    `translateX(${CENTER})`,
                    (isRTL ? 'translateX(-100%)' : 'translateX(100%)'),
                );
                leavingToolBarBg.beforeClearStyles([OPACITY, 'transform']);
                // leaving toolbar, back direction, and there's no entering toolbar
                // should just slide out, no fading out
                leavingToolBarBg.fromTo(OPACITY, 'var(--opacity)', 0);

                if (backButtonEl) {
                    const leavingBackBtnText = createAnimation();
                    leavingBackBtnText
                        .addElement(shadow(backButtonEl).querySelector('.button-text') || [])
                        .fromTo('transform', `translateX(${CENTER})`, `translateX(${(isRTL ? -124 : 124) + 'px'})`);
                    leavingToolBar.addAnimation(leavingBackBtnText);
                }

            } else {
                // leaving toolbar, forward direction
                leavingTitle
                    .fromTo('transform', `translateX(${CENTER})`, `translateX(${OFF_LEFT})`)
                    .fromTo(OPACITY, 0.99, 0)
                    .afterClearStyles([TRANSFORM, OPACITY]);

                leavingToolBarItems
                    .fromTo('transform', `translateX(${CENTER})`, `translateX(${OFF_LEFT})`)
                    .afterClearStyles([TRANSFORM, OPACITY]);

                leavingBackButton.afterClearStyles([OPACITY]);
                leavingTitle.afterClearStyles([OPACITY]);
                leavingToolBarButtons.afterClearStyles([OPACITY]);
            }
        });
    }

    return rootAnimation;

};
