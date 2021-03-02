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

// Based on https://medium.com/madewithply/ionic-4-long-press-gestures-96cf1e44098b

import { Directive, ElementRef, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Gesture } from '@ionic/angular';
import { GestureController } from '@singletons';
/**
 * Directive to add long press actions to html elements.
 */
@Directive({
    selector: '[longPress]',
})
export class CoreLongPressDirective implements OnInit, OnDestroy {

    element: HTMLElement;
    pressGesture?: Gesture;

    @Output() longPress = new EventEmitter();

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
        this.element.setAttribute('tappable', '');
    }

    /**
     * Initialize gesture listening.
     */
    ngOnInit(): void {
        this.pressGesture = GestureController.create({
            el: this.element,
            threshold: 0,
            gestureName: 'longpress',
            onEnd: ev => this.longPress.emit(ev.event),
        }, true);

        this.pressGesture.enable();
    }

    /**
     * Destroy gesture listening.
     */
    ngOnDestroy(): void {
        this.pressGesture?.destroy();
    }

}
