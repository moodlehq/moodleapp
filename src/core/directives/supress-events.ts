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

// Based on http://roblouie.com/article/198/using-gestures-in-the-ionic-2-beta/

import { Directive, ElementRef, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CoreLogger } from '@singletons/logger';

/**
 * Directive to suppress all events on an element. This is useful to prevent keyboard closing when clicking this element.
 *
 * This directive is based on some code posted by johnthackstonanderson in
 * https://github.com/ionic-team/ionic-plugin-keyboard/issues/81
 *
 * @description
 *
 * If nothing is supplied or string 'all', then all the default events will be suppressed. This is the recommended usage.
 *
 * If you only want to suppress a single event just pass the name of the event. If you want to suppress a set of events,
 * pass an array with the names of the events to suppress.
 *
 * Usage of onClick instead of click is mandatory to make this directive work.
 *
 * Example usage:
 *
 * <ion-button [core-suppress-events] (onClick)="toggle($event)">
 */
@Directive({
    selector: '[core-suppress-events]',
})
export class CoreSupressEventsDirective implements OnInit {

    @Input('core-suppress-events') suppressEvents?: string | string[];
    @Output() onClick = new EventEmitter();

    protected element: HTMLElement;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
    }

    /**
     * Initialize event listeners.
     */
    ngOnInit(): void {
        if (this.onClick.observers.length == 0) {
            CoreLogger.getInstance('CoreSupressEventsDirective')
                .error('No onClick output was defined causing this directive to fail', this.element);

            return;
        }

        let events: string[];

        if (this.suppressEvents == 'all' || this.suppressEvents === undefined || this.suppressEvents === null) {
            // Suppress all events.
            events = ['click', 'mousedown', 'touchdown', 'touchmove', 'touchstart'];

        } else if (typeof this.suppressEvents == 'string') {
            // It's a string, just suppress this event.
            events = [this.suppressEvents];

        } else if (Array.isArray(this.suppressEvents)) {
            // Array supplied.
            events = this.suppressEvents;
        } else {
            events = [];
        }

        // Suppress the events.
        for (const evName of events) {
            this.element.addEventListener(evName, (event) => this.stopBubble(event));
        }

        // Now listen to "click" events.
        this.element.addEventListener('mouseup', (event) => { // Triggered in Android & iOS.
            this.onClick.emit(event);
        });

        this.element.addEventListener('touchend', (event) => { // Triggered desktop & browser.
            this.stopBubble(event);
            this.onClick.emit(event);
        });
    }

    /**
     * Stop event default and propagation.
     *
     * @param event Event.
     */
    protected stopBubble(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
    }

}
