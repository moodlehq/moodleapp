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

import { trigger, style, transition, animate, keyframes } from '@angular/animations';

/**
 * Defines core animations.
 */
export class CoreAnimations {

    static readonly SHOW_HIDE = trigger('coreShowHideAnimation', [
        transition(':enter', [
            style({ opacity: 0 }),
            animate('500ms ease-in-out', style({ opacity: 1 })),
        ]),
        transition(':leave', [
            style({ opacity: 1 }),
            animate('500ms ease-in-out', style({ opacity: 0 })),
        ]),
    ]);

    static readonly SLIDE_IN_OUT = trigger('coreSlideInOut', [
        // Enter animation.
        transition('void => fromLeft', [
            animate(300, keyframes([
                style({ opacity: 0, transform: 'translateX(-100%)', offset: 0 }),
                style({ opacity: 1, transform: 'translateX(5%)', offset: 0.7 }),
                style({ opacity: 1, transform: 'translateX(0)', offset: 1.0 }),
            ])),
        ]),
        // Leave animation.
        transition('fromLeft => void', [
            animate(300, keyframes([
                style({ opacity: 1, transform: 'translateX(0)', offset: 0 }),
                style({ opacity: 1, transform: 'translateX(5%)', offset: 0.3 }),
                style({ opacity: 0, transform: 'translateX(-100%)', offset: 1.0 }),
            ])),
        ]),
        // Enter animation.
        transition('void => fromRight', [
            animate(300, keyframes([
                style({ opacity: 0, transform: 'translateX(100%)', offset: 0 }),
                style({ opacity: 1, transform: 'translateX(-5%)', offset: 0.7 }),
                style({ opacity: 1, transform: 'translateX(0)', offset: 1.0 }),
            ])),
        ]),
        // Leave animation.
        transition('fromRight => void', [
            animate(300, keyframes([
                style({ opacity: 1, transform: 'translateX(0)', offset: 0 }),
                style({ opacity: 1, transform: 'translateX(-5%)', offset: 0.3 }),
                style({ opacity: 0, transform: 'translateX(100%)', offset: 1.0 }),
            ])),
        ]),
    ]);

}
