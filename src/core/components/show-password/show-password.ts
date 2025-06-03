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

import { Component, AfterViewInit, Input, ContentChild, ViewEncapsulation } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';

import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreLogger } from '@singletons/logger';
import { CoreBaseModule } from '@/core/base.module';

/**
 * This component allows to show/hide a password.
 * It's meant to be used with ion-input as a slot of the input.
 *
 * @description
 *
 * There are 2 ways to use ths component:
 * - Slot it to start or end on the ion-input element.
 * - Surround the ion-input with the password with this component. Not recommended.
 *
 * Example of new usage:
 *
 * <ion-input type="password">
 *     <core-show-password slot="end" />
 * </ion-input>
 *
 * Example surrounding usage:
 *
 * <core-show-password>
 *     <ion-input type="password" />
 * </core-show-password>
 *
 * @deprecated since 4.5. Use <ion-input-password-toggle slot="end" showIcon="fas-eye" hideIcon="fas-eye-slash" /> instead.
 */
@Component({
    selector: 'core-show-password',
    templateUrl: 'core-show-password.html',
    styles: 'core-show-password { display: contents; }',
    encapsulation: ViewEncapsulation.None,
    imports: [CoreBaseModule],
})
export class CoreShowPasswordComponent implements AfterViewInit {

    /**
     * @deprecated since 4.5. Not used anymore.
     */
    @Input() initialShown = '';

    /**
     * @deprecated since 4.4. Not used anymore.
     */
    @Input() name = '';

    /**
     * @deprecated since 4.4. Use slotted solution instead.
     */
    @ContentChild(IonInput) ionInput?: IonInput | HTMLIonInputElement;

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        CoreLogger.getInstance('CoreShowPasswordComponent')
            .warn('Deprecated component, use <ion-input-password-toggle /> instead.');

        // eslint-disable-next-line deprecation/deprecation
        if (!this.ionInput) {
            return;
        }

        // eslint-disable-next-line deprecation/deprecation
        const input = await CorePromiseUtils.ignoreErrors(this.ionInput.getInputElement());
        if (!input) {
            return;
        }

        const toggle = convertTextToHTMLElement('<ion-input-password-toggle slot="end" />');
        input.parentElement?.appendChild(toggle.children[0]);
    }

}
