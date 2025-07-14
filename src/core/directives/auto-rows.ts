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

import { Directive, ElementRef, Output, EventEmitter, AfterViewInit, Input, OnChanges, inject } from '@angular/core';

/**
 * Directive to adapt a textarea rows depending on the input text. It's based on Moodle's data-auto-rows.
 *
 * @description
 * Usage:
 * <textarea class="core-textarea" [(ngModel)]="message" rows="1" [core-auto-rows]="message"></textarea>
 */
@Directive({
    selector: 'textarea[core-auto-rows], ion-textarea[core-auto-rows]',
})
export class CoreAutoRowsDirective implements AfterViewInit, OnChanges {

    protected height = 0;
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    @Input('core-auto-rows') value?: string;
    @Output() onResize: EventEmitter<void>; // Emit when resizing the textarea.

    constructor() {
        this.onResize = new EventEmitter();
    }

    /**
     * Resize after initialized.
     */
    ngAfterViewInit(): void {
        // Wait for rendering of child views.
        setTimeout(() => {
            this.resize();
        }, 300);
    }

    /**
     * Resize when content changes.
     */
    ngOnChanges(): void {
        this.resize();

        if (this.value === '') {
            // Maybe the form was resetted. In that case it takes a bit to update the height.
            setTimeout(() => this.resize(), 300);
        }
    }

    /**
     * Resize the textarea.
     */
    protected resize(): void {
        if (this.element.tagName == 'ION-TEXTAREA') {
            // Search the actual textarea.
            const textarea = this.element.querySelector('textarea');
            if (!textarea) {
                return;
            }

            this.element = textarea;
        }

        // Set height to 1px to force scroll height to calculate correctly.
        this.element.style.height = '1px';
        this.element.style.height = `${this.element.scrollHeight}px`;

        // Emit event when resizing.
        if (this.height != this.element.scrollHeight) {
            this.height = this.element.scrollHeight;
            this.onResize.emit();
        }
    }

}
