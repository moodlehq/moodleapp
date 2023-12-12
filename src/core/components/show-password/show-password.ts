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
import { CoreLogger } from '@singletons/logger';

/**
 * This component allows to show/hide a password.
 * It's meant to be used with ion-input.
 * It's recommended to use it as a slot of the input.
 *
 * @description
 *
 * There are 2 ways to use ths component:
 * - Slot it to start or end on the ion-input element.
 * - Surround the ion-input with the password with this component. This is deprecated.
 *
 * In order to help finding the input you can specify the name of the input or the ion-input element.
 *
 *
 * Example of new usage:
 *
 * <ion-input type="password" name="password">
 *     <core-show-password slot="end" />
 * </ion-input>
 *
 * Example deprecated usage:
 *
 * <core-show-password>
 *     <ion-input type="password" name="password"></ion-input>
 * </core-show-password>
 */
@Component({
    selector: 'core-show-password',
    templateUrl: 'core-show-password.html',
    styleUrls: ['show-password.scss'],
})
export class CoreShowPasswordComponent implements OnInit, AfterViewInit {

    @Input() initialShown?: boolean | string; // Whether the password should be shown at start.

    @Input() name = ''; // Deprecated. Not used anymore.
    @ContentChild(IonInput) ionInput?: IonInput | HTMLIonInputElement; // Deprecated. Use slot instead.

    protected input?: HTMLInputElement;
    protected hostElement: HTMLElement;
    protected logger: CoreLogger;

    constructor(element: ElementRef) {
        this.hostElement = element.nativeElement;
        this.logger = CoreLogger.getInstance('CoreShowPasswordComponent');
    }

    get shown(): boolean {
        return this.input?.type === 'text';
    }

    set shown(shown: boolean) {
        if (!this.input) {
            return;
        }

        this.input.type = shown ? 'text' : 'password';
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
        await this.setInputElement();

        if (!this.input) {
            return;
        }

        // By default, don't autocapitalize and autocorrect.
        if (!this.input.getAttribute('autocorrect')) {
            this.input.setAttribute('autocorrect', 'off');
        }
        if (!this.input.getAttribute('autocapitalize')) {
            this.input.setAttribute('autocapitalize', 'none');
        }
    }

    /**
     * Set the input element to affect.
     */
    protected async setInputElement(): Promise<void> {
        if (!this.ionInput) {
            this.ionInput = this.hostElement.closest('ion-input') ?? undefined;

            this.hostElement.setAttribute('slot', 'end');
        } else {
            // It's outside ion-input, warn devs.
            this.logger.warn('Deprecated CoreShowPasswordComponent usage, it\'s not needed to surround ion-input anymore.');
        }

        if (!this.ionInput) {
            return;
        }

        try {
            this.input = await this.ionInput.getInputElement();
        } catch {
            // This should never fail, but it does in some testing environment because Ionic elements are not
            // rendered properly. So in case this fails it will try to find through the name and ignore the error.
            const name = this.ionInput.name;
            if (!name) {
                return;
            }
            this.input = this.hostElement.querySelector<HTMLInputElement>('input[name="' + name + '"]') ?? undefined;
        }
    }

    /**
     * Toggle show/hide password.
     *
     * @param event The mouse event.
     */
    toggle(event: Event): void {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const isFocused = document.activeElement === this.input;
        this.shown = !this.shown;

        // In Android, the keyboard is closed when the input type changes. Focus it again.
        if (this.input && isFocused && CorePlatform.isAndroid()) {
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
