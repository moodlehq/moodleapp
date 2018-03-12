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

import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';

/**
 * Directive to adapt a textarea rows depending on the input text. It's based on Moodle's data-auto-rows.
 *
 * @description
 * Usage:
 * <textarea class="core-textarea" [(ngModel)]="message" rows="1" core-auto-rows></textarea>
 */
@Directive({
    selector: 'textarea[core-auto-rows]'
})
export class CoreAutoRowsDirective {
    protected element: HTMLTextAreaElement;
    protected height = 0;

    @Output() onResize: EventEmitter<void>; // Emit when resizing the textarea.

    constructor(element: ElementRef) {
        this.element = element.nativeElement || element;
        this.height = this.element.scrollHeight;
        this.onResize = new EventEmitter();
    }

    @HostListener('input') onInput(): void {
        this.resize();
    }

    @HostListener('change') onChange(): void {
        // Fired on reset. Wait to the change to be finished.
        setTimeout(() => {
            this.resize();
        }, 300);
    }

    /**
     * Resize after init.
     */
    ngAfterViewInit(): void {
        this.resize();
    }

    /**
     * Resize the textarea.
     * @param {any} $event Event fired.
     */
    protected resize($event?: any): void {
        // Set height to 1px to force scroll height to calculate correctly.
        this.element.style.height = '1px';
        this.element.style.height = this.element.scrollHeight + 'px';

        // Emit event when resizing.
        if (this.height != this.element.scrollHeight) {
            this.height = this.element.scrollHeight;
            this.onResize.emit();
        }
    }
}
