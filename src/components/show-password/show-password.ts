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

import { Component, OnInit, AfterViewInit, Input, ElementRef } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreApp } from '@providers/app';

/**
 * Component to allow showing and hiding a password. The affected input MUST have a name to identify it.
 *
 * @description
 * This directive needs to surround the input with the password.
 *
 * You need to supply the name of the input.
 *
 * Example:
 *
 * <core-show-password item-content [name]="'password'">
 *     <ion-input type="password" name="password"></ion-input>
 * </core-show-password>
 */
@Component({
    selector: 'core-show-password',
    templateUrl: 'core-show-password.html'
})
export class CoreShowPasswordComponent implements OnInit, AfterViewInit {
    @Input() name: string; // Name of the input affected.
    @Input() initialShown?: boolean | string; // Whether the password should be shown at start.

    shown: boolean; // Whether the password is shown.
    label: string; // Label for the button to show/hide.
    iconName: string; // Name of the icon of the button to show/hide.
    selector = ''; // Selector to identify the input.

    protected input: HTMLInputElement; // Input affected.
    protected element: HTMLElement; // Current element.

    constructor(
            element: ElementRef,
            private utils: CoreUtilsProvider,
            private domUtils: CoreDomUtilsProvider
            ) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.shown = this.utils.isTrueOrOne(this.initialShown);
        this.selector = 'input[name="' + this.name + '"]';
        this.setData();
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        this.searchInput();
    }

    /**
     * Search the input to show/hide.
     */
    protected searchInput(): void {
        // Search the input.
        this.input = <HTMLInputElement> this.element.querySelector(this.selector);

        if (this.input) {
            // Input found. Set the right type.
            this.input.type = this.shown ? 'text' : 'password';

            // By default, don't autocapitalize and autocorrect.
            if (!this.input.getAttribute('autocorrect')) {
                this.input.setAttribute('autocorrect', 'off');
            }
            if (!this.input.getAttribute('autocapitalize')) {
                this.input.setAttribute('autocapitalize', 'none');
            }
        }
    }

    /**
     * Set label, icon name and input type.
     */
    protected setData(): void {
        this.label = this.shown ? 'core.hide' : 'core.show';
        this.iconName = this.shown ? 'eye-off' : 'eye';
        if (this.input) {
            this.input.type = this.shown ? 'text' : 'password';
        }
    }

    /**
     * Toggle show/hide password.
     *
     * @param event The mouse event.
     */
    toggle(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const isFocused = document.activeElement === this.input;

        this.shown = !this.shown;
        this.setData();

        if (isFocused && CoreApp.instance.isAndroid()) {
            // In Android, the keyboard is closed when the input type changes. Focus it again.
            setTimeout(() => {
                this.domUtils.focusElement(this.input);
            }, 400);
        }
    }
}
