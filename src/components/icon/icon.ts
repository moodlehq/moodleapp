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

import { Component, Input, OnChanges, OnDestroy, ElementRef, SimpleChange } from '@angular/core';
import { Config } from 'ionic-angular';

/**
 * Core Icon is a component that enabled a posibility to add fontawesome icon to the html. It's recommended if both fontawesome
 * or ionicons can be used in the name attribute. To use fontawesome just place the full icon name with the fa- prefix and
 * the component will detect it.
 * Check available icons https://fontawesome.com/v4.7.0/icons/.
 */
@Component({
    selector: 'core-icon',
    templateUrl: 'core-icon.html',
})
export class CoreIconComponent implements OnChanges, OnDestroy {
    // Common params.
    @Input() name: string;
    @Input('color') color?: string;
    @Input('slash') slash?: boolean; // Display a red slash over the icon.

    // Ionicons params.
    @Input('isActive') isActive?: boolean;
    @Input('md') md?: string;
    @Input('ios') ios?: string;

    // FontAwesome params.
    @Input('fixed-width') fixedWidth: string;

    @Input('label') ariaLabel?: string;

    protected element: HTMLElement;
    protected newElement: HTMLElement;

    constructor(el: ElementRef, private config: Config) {
        this.element = el.nativeElement;
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (!changes.name || !this.name) {
            return;
        }

        const oldElement = this.newElement ? this.newElement : this.element;

        // Use a new created element to avoid ion-icon working.
        // This is necessary to make the FontAwesome stuff work.
        // It is also required to stop Ionic overriding the aria-label attribute.
        this.newElement = document.createElement('ion-icon');
        if (this.name.startsWith('fa-')) {
            this.newElement.classList.add('icon');
            this.newElement.classList.add('fa');
            this.newElement.classList.add(this.name);
            if (this.isTrueProperty(this.fixedWidth)) {
                this.newElement.classList.add('fa-fw');
            }
            if (this.color) {
                this.newElement.classList.add('fa-' + this.color);
            }
        } else {
            const mode = this.config.get('iconMode');
            this.newElement.classList.add('icon');
            this.newElement.classList.add('icon-' + mode);
            this.newElement.classList.add('ion-' + mode + '-' + this.name);
        }

        !this.ariaLabel && this.newElement.setAttribute('aria-hidden', 'true');
        !this.ariaLabel && this.newElement.setAttribute('role', 'presentation');
        this.ariaLabel && this.newElement.setAttribute('aria-label', this.ariaLabel);
        this.ariaLabel && this.newElement.setAttribute('title', this.ariaLabel);

        const attrs = this.element.attributes;
        for (let i = attrs.length - 1; i >= 0; i--) {
            if (attrs[i].name == 'class') {
                // We don't want to override the classes we already added. Add them one by one.
                if (attrs[i].value) {
                    const classes = attrs[i].value.split(' ');
                    for (let j = 0; j < classes.length; j++) {
                        if (classes[j]) {
                            this.newElement.classList.add(classes[j]);
                        }
                    }
                }

            } else {
                this.newElement.setAttribute(attrs[i].name, attrs[i].value);
            }
        }

        if (this.slash) {
            this.newElement.classList.add('icon-slash');
        }

        oldElement.parentElement.replaceChild(this.newElement, oldElement);
    }

    /**
     * Check if the value is true or on.
     *
     * @param val value to be checked.
     * @return If has a value equivalent to true.
     */
    isTrueProperty(val: any): boolean {
        if (typeof val === 'string') {
            val = val.toLowerCase().trim();

            return (val === 'true' || val === 'on' || val === '');
        }

        return !!val;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        if (this.newElement) {
            this.newElement.remove();
        }
    }
}
