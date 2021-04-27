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

import { AfterViewInit, Directive, ElementRef, Input, OnChanges, SimpleChange } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { Http } from '@singletons';
import { CoreConstants } from '@/core/constants';

/**
 * Directive to enable font-awesome 5 as ionicons.
 * Check available icons at https://fontawesome.com/icons?d=gallery&m=free
 *
 * Example usage:
 *
 * <ion-icon name="fas-icon">
 */
@Directive({
    selector: 'ion-icon[name]',
})
export class CoreFaIconDirective implements AfterViewInit, OnChanges {

    @Input() name = '';

    protected element: HTMLElement;

    protected logger: CoreLogger;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
        this.logger = CoreLogger.getInstance('CoreFaIconDirective');
    }

    /**
     * Detect icon name and use svg.
     */
    async setIcon(): Promise<void> {
        let library = 'ionic';
        let iconName = this.name;
        const parts = iconName.split('-', 2);
        if (parts.length == 2) {
            switch (parts[0]) {
                case 'far':
                    library = 'regular';
                    iconName = iconName.substr(4);
                    break;
                case 'fa':
                case 'fas':
                    library = 'solid';
                    iconName = iconName.substr(parts[0].length + 1);
                    break;
                case 'fab':
                    library = 'brands';
                    iconName = iconName.substr(4);
                    break;
                default:
                    break;
            }
        }

        if (library != 'ionic') {
            const src = `assets/fonts/font-awesome/${library}/${iconName}.svg`;
            this.element.setAttribute('src', src);
            this.element.classList.add('faicon');

            if (CoreConstants.BUILD.isDevelopment || CoreConstants.BUILD.isTesting) {
                try {
                    await Http.get(src, { responseType: 'text' }).toPromise();
                } catch (error) {
                    this.logger.error(`Icon ${this.name} not found`);
                }
            }
        } else {
            this.element.removeAttribute('src');
            this.logger.warn(`Ionic icon ${this.name} detected`);
        }

        return;
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.element.getAttribute('aria-label') &&
            !this.element.getAttribute('aria-labelledby') &&
            this.element.getAttribute('aria-hidden') != 'true') {
            this.logger.warn('Aria label not set on icon ' + this.name, this.element);

            this.element.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (!changes.name || !this.name) {
            return;
        }

        this.setIcon();
    }

}
