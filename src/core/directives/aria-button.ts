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

import { Directive, ElementRef, OnInit, Output, EventEmitter } from '@angular/core';

/**
 * Directive to emulate click and key actions following aria role button.
 */
@Directive({
    selector: '[ariaButtonClick]',
})
export class CoreAriaButtonClickDirective implements OnInit {

    protected element: HTMLElement;

    @Output() ariaButtonClick = new EventEmitter();

    constructor(
        element: ElementRef,
    ) {
        this.element = element.nativeElement;
    }

    /**
     * Initialize actions.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', async (event) => {
            this.ariaButtonClick.emit(event);
        });

        this.element.addEventListener('keydown', async (event) => {
            if ((event.key == ' ' || event.key == 'Enter')) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.element.addEventListener('keyup', async (event) => {
            if ((event.key == ' ' || event.key == 'Enter')) {
                this.ariaButtonClick.emit(event);
            }
        });
    }

}
