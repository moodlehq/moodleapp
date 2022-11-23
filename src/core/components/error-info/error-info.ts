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

import { Component, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
import { Translate } from '@singletons';
import { CoreForms } from '@singletons/form';
import ChevronUpSVG from '!raw-loader!ionicons/dist/svg/chevron-up.svg';
import ChevronDownSVG from '!raw-loader!ionicons/dist/svg/chevron-down.svg';

/**
 * Component to show error details.
 *
 * Given that this component has to be injected dynamically in some situations (for example, error alerts),
 * it can be rendered using the static render() method to get the raw HTML.
 */
@Component({
    selector: 'core-error-info',
    templateUrl: 'core-error-info.html',
    styleUrls: ['error-info.scss'],
})
export class CoreErrorInfoComponent implements OnInit, OnChanges {

    /**
     * Render an instance of the component into an HTML string.
     *
     * @param errorDetails Error details.
     * @param errorCode Error code.
     * @returns Component HTML.
     */
    static render(errorDetails: string, errorCode?: string): string {
        const toggleId = CoreForms.uniqueId('error-info-toggle');
        const errorCodeLabel = Translate.instant('core.errorcode', { errorCode });
        const hideDetailsLabel = Translate.instant('core.errordetailshide');
        const showDetailsLabel = Translate.instant('core.errordetailsshow');

        return `
            <div class="core-error-info">
                <input id="${toggleId}" type="checkbox" class="core-error-info--checkbox" />
                ${errorCode ? `<div class="core-error-info--code"><strong>${errorCodeLabel}</strong></div>` : ''}
                <div class="core-error-info--details">
                    <p>${errorDetails}</p>
                </div>
                <label for="${toggleId}" class="core-error-info--toggle" aria-hidden="true">
                    <span class="core-error-info--hide-content">
                        ${hideDetailsLabel}
                        ${ChevronUpSVG}
                    </span>
                    <span class="core-error-info--show-content">
                        ${showDetailsLabel}
                        ${ChevronDownSVG}
                    </span>
                </label>
            </div>
        `;
    }

    @Input() errorDetails!: string;
    @Input() errorCode?: string;

    constructor(private element: ElementRef) {}

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.render();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.render();
    }

    /**
     * Render component html in the element created by Angular.
     */
    private render(): void {
        this.element.nativeElement.innerHTML = CoreErrorInfoComponent.render(this.errorDetails, this.errorCode);
    }

}
