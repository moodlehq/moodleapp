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

import { Component, Input, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Directive to add a red asterisk for required input fields.
 *
 * @description
 * For forms with required and not required fields, it is recommended to use this directive to mark the required ones.
 *
 * This directive should be applied in the label. Example:
 *
 * <ion-label core-mark-required="{{field.required}}">{{ 'core.login.username' | translate }}</ion-label>
 */
@Component({
    selector: '[core-mark-required]',
    templateUrl: 'core-mark-required.html'
})
export class CoreMarkRequiredComponent implements OnInit, AfterViewInit {
    @Input('core-mark-required') coreMarkRequired: boolean | string = true;
    protected element: HTMLElement;
    requiredLabel: string;

    constructor(element: ElementRef, private translate: TranslateService, private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider) {
        this.element = element.nativeElement;
        this.requiredLabel = this.translate.instant('core.required');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.coreMarkRequired = this.utils.isTrueOrOne(this.coreMarkRequired);
    }

    /**
     * Called after the view is initialized.
     */
    ngAfterViewInit(): void {
        if (this.coreMarkRequired) {
            // Add the "required" to the aria-label.
            const ariaLabel = this.element.getAttribute('aria-label') || this.textUtils.cleanTags(this.element.innerHTML, true);
            if (ariaLabel) {
                this.element.setAttribute('aria-label', ariaLabel + ' ' + this.requiredLabel);
            }
        } else {
            // Remove the "required" from the aria-label.
            const ariaLabel = this.element.getAttribute('aria-label');
            if (ariaLabel) {
                this.element.setAttribute('aria-label', ariaLabel.replace(' ' + this.requiredLabel, ''));
            }
        }
    }
}
