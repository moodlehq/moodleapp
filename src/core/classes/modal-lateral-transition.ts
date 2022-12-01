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
import { Animation } from '@ionic/core';
import { CorePlatform } from '@services/platform';

/**
 * Sliding transition for lateral modals on enter.
 *
 * @param baseEl Base element.
 * @returns The animation.
 */
export function CoreModalLateralTransitionEnter(baseEl: HTMLElement): Animation {
    const OFF_RIGHT = CorePlatform.isRTL ? '-100%' : '100%';

    const otherAnimations: Animation[] = [];

    const backdrop = baseEl.querySelector('ion-backdrop');
    if (backdrop) {
        const backdropAnimation = createAnimation()
            .addElement(backdrop)
            .fromTo('opacity', 0.01, 0.4);

        otherAnimations.push(backdropAnimation);
    }

    const wrapper = baseEl.querySelector('.modal-wrapper');
    if (wrapper) {
        const wrapperAnimation = createAnimation()
            .addElement(wrapper)
            .fromTo('transform', 'translateX(' + OFF_RIGHT + ')', 'translateX(0)')
            .fromTo('opacity', 0.8, 1);

        otherAnimations.push(wrapperAnimation);
    }

    return createAnimation()
        .addElement(baseEl)
        .easing('cubic-bezier(0.36,0.66,0.04,1)')
        .duration(300)
        .addAnimation(otherAnimations);
}

/**
 * Sliding transition for lateral modals on leave.
 *
 * @param baseEl Base element.
 * @returns The animation.
 */
export function CoreModalLateralTransitionLeave(baseEl: HTMLElement): Animation {
    const OFF_RIGHT = CorePlatform.isRTL ? '-100%' : '100%';

    const otherAnimations: Animation[] = [];

    const backdrop = baseEl.querySelector('ion-backdrop');
    if (backdrop) {
        const backdropAnimation = createAnimation()
            .addElement(backdrop)
            .fromTo('opacity', 0.4, 0.0);

        otherAnimations.push(backdropAnimation);
    }

    const wrapper = baseEl.querySelector('.modal-wrapper');
    if (wrapper) {
        const wrapperAnimation = createAnimation()
            .addElement(wrapper)
            .beforeStyles({ opacity: 1 })
            .fromTo('transform', 'translateX(0)', 'translateX(' + OFF_RIGHT + ')');

        otherAnimations.push(wrapperAnimation);
    }

    return createAnimation()
        .addElement(baseEl)
        .easing('cubic-bezier(0.36,0.66,0.04,1)')
        .duration(300)
        .addAnimation(otherAnimations);
}
