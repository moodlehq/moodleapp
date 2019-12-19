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

export const coreShowHideAnimation = trigger('coreShowHideAnimation', [
    transition(':enter', [
        style({opacity: 0}),
        animate('500ms ease-in-out', style({opacity: 1}))
    ]),
    transition(':leave', [
        style({opacity: 1}),
        animate('500ms ease-in-out', style({opacity: 0}))
    ])
]);

export const coreSlideInOut = trigger('coreSlideInOut', [
    // Enter animation.
    transition('void => fromLeft', [
        style({transform: 'translateX(0)', opacity: 1}),
        animate(300, keyframes([
            style({opacity: 0, transform: 'translateX(-100%)', offset: 0}),
            style({opacity: 1, transform: 'translateX(5%)',  offset: 0.7}),
            style({opacity: 1, transform: 'translateX(0)',     offset: 1.0})
        ]))
    ]),
    // Leave animation.
    transition('fromLeft => void', [
        style({transform: 'translateX(-100%)', opacity: 0}),
        animate(300, keyframes([
            style({opacity: 1, transform: 'translateX(0)', offset: 0}),
            style({opacity: 1, transform: 'translateX(5%)',  offset: 0.3}),
            style({opacity: 0, transform: 'translateX(-100%)',     offset: 1.0})
        ]))
    ]),
    // Enter animation.
    transition('void => fromRight', [
        style({transform: 'translateX(0)', opacity: 1}),
        animate(300, keyframes([
            style({opacity: 0, transform: 'translateX(100%)',     offset: 0}),
            style({opacity: 1, transform: 'translateX(-5%)', offset: 0.7}),
            style({opacity: 1, transform: 'translateX(0)',  offset: 1.0})
        ]))
    ]),
    // Leave animation.
    transition('fromRight => void', [
        style({transform: 'translateX(-100%)', opacity: 0}),
        animate(300, keyframes([
            style({opacity: 1, transform: 'translateX(0)', offset: 0}),
            style({opacity: 1, transform: 'translateX(-5%)',  offset: 0.3}),
            style({opacity: 0, transform: 'translateX(100%)',     offset: 1.0})
        ]))
    ])
]);
