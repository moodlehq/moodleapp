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

import { Component, OnInit, AfterViewInit, Input, ElementRef, ContentChild } from '@angular/core';
import { IonInput } from '@ionic/angular';

import { CorePlatform } from '@services/platform';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

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
 * <core-show-password [name]="'password'">
 *     <ion-input type="password" name="password"></ion-input>
 * </core-show-password>
 */
@Component({
    selector: 'core-show-password',
    templateUrl: 'core-show-password.html',
    styleUrls: ['show-password.scss'],
})
export class CoreShowPasswordComponent implements OnInit, AfterViewInit {

    @Input() name?: string; // Name of the input affected.
    @Input() initialShown?: boolean | string; // Whether the password should be shown at start.
    @ContentChild(IonInput) ionInput?: IonInput;

    shown = false; // Whether the password is shown.

    protected input?: HTMLInputElement; // Input affected.
    protected element: HTMLElement; // Current element.

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.shown = CoreUtils.isTrueOrOne(this.initialShown);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        if (this.ionInput) {
            // It's an ion-input, use it to get the native element.
            this.input = await this.ionInput.getInputElement();
            this.setData(this.input);

            return;
        }

        // Search the input.
        this.input = this.element.querySelector<HTMLInputElement>('input[name="' + this.name + '"]') ?? undefined;

        if (!this.input) {
            return;
        }

        this.setData(this.input);

        // By default, don't autocapitalize and autocorrect.
        if (!this.input.getAttribute('autocorrect')) {
            this.input.setAttribute('autocorrect', 'off');
        }
        if (!this.input.getAttribute('autocapitalize')) {
            this.input.setAttribute('autocapitalize', 'none');
        }
    }

    /**
     * Set label, icon name and input type.
     *
     * @param input The input element.
     */
    protected setData(input: HTMLInputElement): void {
        input.type = this.shown ? 'text' : 'password';
    }

    /**
     * Toggle show/hide password.
     *
     * @param event The mouse event.
     */
    toggle(event: Event): void {
        if (event.type == 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const isFocused = document.activeElement === this.input;
        this.shown = !this.shown;

        if (!this.input) {
            return;
        }

        this.setData(this.input);
        // In Android, the keyboard is closed when the input type changes. Focus it again.
        if (isFocused && CorePlatform.isAndroid()) {
            CoreDomUtils.focusElement(this.input);
        }
    }

    /**
     * Do not loose focus.
     *
     * @param event The mouse event.
     */
    doNotBlur(event: Event): void {
        if (event.type === 'keydown' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Checks if Space or Enter have been pressed.
     *
     * @param event Keyboard Event.
     * @returns Wether space or enter have been pressed.
     */
    protected isValidKeyboardKey(event: KeyboardEvent): boolean {
        return event.key === ' ' || event.key === 'Enter';
    }

}
