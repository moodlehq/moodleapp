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

import { Directive, ElementRef, OnInit, Output, EventEmitter, OnChanges, SimpleChanges, Input, inject } from '@angular/core';
import { CoreDom } from '@singletons/dom';
import { toBoolean } from '../transforms/boolean';

/**
 * Directive to emulate click and key actions following aria role button.
 */
@Directive({
    selector: '[ariaButtonClick]',
})
export class CoreAriaButtonClickDirective implements OnInit, OnChanges {

    @Input({ transform: toBoolean }) disabled = false;
    @Output() ariaButtonClick = new EventEmitter();

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        CoreDom.initializeClickableElementA11y(this.element, (event) => this.ariaButtonClick.emit(event));
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: SimpleChanges): void {
        if (!changes.disabled) {
            return;
        }

        if (this.element.getAttribute('tabindex') === '0' && this.disabled) {
            this.element.setAttribute('tabindex', '-1');
        }

        if (this.element.getAttribute('tabindex') === '-1' && !this.disabled) {
            this.element.setAttribute('tabindex', '0');
        }
    }

}
