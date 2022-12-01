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

import { Component, Input, OnChanges, ElementRef, SimpleChange } from '@angular/core';
import { CoreLogger } from '@singletons/logger';

/**
 * Core Icon is a component that enables the posibility to add fontawesome icon to the html. It
 * To use fontawesome just place the full icon name with the fa- prefix and
 * the component will detect it.
 *
 * Check available icons at https://fontawesome.com/icons?d=gallery&m=free
 *
 * @deprecated since 3.9.3. Please use <ion-icon name="fas-icon"> instead.
 */
@Component({
    selector: 'core-icon',
    template: '<ion-icon [name]="name"><ng-content></ng-content></ion-icon>',
    styleUrls: ['icon.scss'],
})
export class CoreIconComponent implements OnChanges {

    // Common params.
    @Input() name = '';
    @Input() color?: string;
    @Input() slash?: boolean; // Display a red slash over the icon.

    // FontAwesome params.
    @Input('fixed-width') fixedWidth?: boolean; // eslint-disable-line @angular-eslint/no-input-rename

    @Input() label?: string;
    @Input() flipRtl?: boolean; // Whether to flip the icon in RTL. Defaults to false.

    protected element: HTMLElement;

    constructor(
        el: ElementRef,
    ) {
        this.element = el.nativeElement;

        CoreLogger.getInstance('CoreIconComponent').error('CoreIconComponent is deprecated. Please use ion-icon instead.');
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (!changes.name || !this.name) {
            return;
        }

        setTimeout(() => {
            this.updateIcon(this.element.children[0]);
        });
    }

    protected updateIcon(iconElement: Element): void {
        !this.label && iconElement.setAttribute('aria-hidden', 'true');
        !this.label && iconElement.setAttribute('role', 'presentation');
        this.label && iconElement.setAttribute('aria-label', this.label);
        this.label && iconElement.setAttribute('title', this.label);

        const attrs = this.element.attributes;
        for (let i = attrs.length - 1; i >= 0; i--) {
            if (attrs[i].name != 'name') {
                iconElement.setAttribute(attrs[i].name, attrs[i].value);
            }
        }

        if (this.isTrueProperty(this.slash)) {
            iconElement.classList.add('icon-slash');
        } else {
            iconElement.classList.remove('icon-slash');
        }

        if (this.isTrueProperty(this.flipRtl)) {
            iconElement.classList.add('icon-flip-rtl');
        } else {
            iconElement.classList.remove('icon-flip-rtl');
        }

        if (this.isTrueProperty(this.fixedWidth)) {
            iconElement.classList.add('fa-fw');
        } else {
            iconElement.classList.remove('fa-fw');
        }
    }

    /**
     * Check if the value is true or on.
     *
     * @param val Value to be checked.
     * @returns If has a value equivalent to true.
     */
    isTrueProperty(val: unknown): boolean {
        if (typeof val === 'string') {
            val = val.toLowerCase().trim();

            return (val === 'true' || val === 'on' || val === '');
        }

        return !!val;
    }

}
