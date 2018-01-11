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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreUtilsProvider } from '../../providers/utils/utils';

/**
 * Component to display a "search box".
 *
 * @description
 * This component will display a standalone search box with its search button in order to have a better UX.
 *
 * Example usage:
 * <core-search-box (onSubmit)="search($event)" [placeholder]="'core.courses.search' | translate"
 *     [searchLabel]="'core.courses.search' | translate" autoFocus="true"></core-search-box>
 */
@Component({
    selector: 'core-search-box',
    templateUrl: 'search-box.html'
})
export class CoreSearchBoxComponent implements OnInit {
    @Input() initialValue?: string = ''; // Initial value for search text.
    @Input() searchLabel?: string ; // Label to be used on action button.
    @Input() placeholder?: string; // Placeholder text for search text input.
    @Input() autocorrect?: string = 'on'; // Enables/disable Autocorrection on search text input.
    @Input() spellcheck?: string|boolean = true; // Enables/disable Spellchecker on search text input.
    @Input() autoFocus?: string|boolean; // Enables/disable Autofocus when entering view.
    @Input() lengthCheck?: number = 3; // Check value length before submit. If 0, any string will be submitted.
    @Output() onSubmit: EventEmitter<string>; // Send data when submitting the search form.

    constructor(private translate: TranslateService, private utils: CoreUtilsProvider) {
        this.onSubmit = new EventEmitter();
    }

    ngOnInit() {
        this.searchLabel = this.searchLabel || this.translate.instant('core.search');
        this.placeholder = this.placeholder || this.translate.instant('core.search');
        this.spellcheck = this.utils.isTrueOrOne(this.spellcheck);
    }

    /**
     * Form submitted.
     *
     * @param {string} value Entered value.
     */
    submitForm(value: string) {
        if (value.length < this.lengthCheck) {
            // The view should handle this case, but we check it here too just in case.
            return;
        }

        this.onSubmit.emit(value);
    }

}
