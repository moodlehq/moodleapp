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

import { Directive, ElementRef, OnInit, inject, input, OnDestroy } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { CoreLogger } from '@static/logger';
import { Subject } from 'rxjs';

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
export class CoreSuppressEventsDirective implements OnInit, OnDestroy {

    readonly suppressEvents = input<string | string[]>(undefined, { alias: 'core-suppress-events' });

    // Use a subject and outputFromObservable because direct output syntax doesn't have the 'observed' property.
    readonly onClickEmitter = new Subject<Event>();
    readonly onClick = outputFromObservable(this.onClickEmitter);

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.onClickEmitter.observed) {
            CoreLogger.getInstance('CoreSuppressEventsDirective')
                .error('No onClick output was defined causing this directive to fail', this.element);

            return;
        }

        let events: string[];

        const suppressEvents = this.suppressEvents();
        if (suppressEvents === 'all' || suppressEvents === undefined || suppressEvents === null) {
            // Suppress all events.
            events = ['click', 'mousedown', 'touchdown', 'touchmove', 'touchstart'];

        } else if (typeof suppressEvents === 'string') {
            // It's a string, just suppress this event.
            events = [suppressEvents];

        } else if (Array.isArray(suppressEvents)) {
            // Array supplied.
            events = suppressEvents;
        } else {
            events = [];
        }

        // Suppress the events.
        for (const evName of events) {
            this.element.addEventListener(evName, (event) => this.stopBubble(event));
        }

        // Now listen to "click" events.
        this.element.addEventListener('mouseup', (event) => { // Triggered in Android & iOS.
            this.onClickEmitter.next(event);
        });

        this.element.addEventListener('touchend', (event) => { // Triggered desktop & browser.
            this.stopBubble(event);
            this.onClickEmitter.next(event);
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

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.onClickEmitter.complete();
    }

}
