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
import { Platform } from '@singletons';

/**
 * Sliding transition for lateral modals.
 */
export function CoreModalLateralTransitionEnter(baseEl: HTMLElement): Animation {
    const OFF_RIGHT = Platform.isRTL ? '-100%' : '100%';

    const backdropAnimation = createAnimation()
        .addElement(baseEl.querySelector('ion-backdrop')!)
        .fromTo('opacity', 0.01, 0.4);

    const wrapperAnimation = createAnimation()
        .addElement(baseEl.querySelector('.modal-wrapper')!)
        .fromTo('transform', 'translateX(' + OFF_RIGHT + ')', 'translateX(0)')
        .fromTo('opacity', 0.8, 1);

    return createAnimation()
        .addElement(baseEl)
        .easing('cubic-bezier(0.36,0.66,0.04,1)')
        .duration(300)
        .addAnimation([backdropAnimation, wrapperAnimation]);
}

export function CoreModalLateralTransitionLeave(baseEl: HTMLElement): Animation {
    const OFF_RIGHT = Platform.isRTL ? '-100%' : '100%';

    const backdropAnimation = createAnimation()
        .addElement(baseEl.querySelector('ion-backdrop')!)
        .fromTo('opacity', 0.4, 0.0);

    const wrapperAnimation = createAnimation()
        .addElement(baseEl.querySelector('.modal-wrapper')!)
        .beforeStyles({ opacity: 1 })
        .fromTo('transform', 'translateX(0)', 'translateX(' + OFF_RIGHT + ')');

    return createAnimation()
        .addElement(baseEl)
        .easing('cubic-bezier(0.36,0.66,0.04,1)')
        .duration(300)
        .addAnimation([backdropAnimation, wrapperAnimation]);
}
