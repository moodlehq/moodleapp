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
import { CoreIcons } from '@singletons/icons';
import { CoreConstants } from '../constants';

/**
 * Directive to enable font-awesome 6.4 as ionicons.
 * Check available icons at https://fontawesome.com/search?o=r&m=free
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
     * Validate icon, e.g. checking if it's using a deprecated name.
     */
    async validateIcon(): Promise<void> {
        if (CoreConstants.BUILD.isDevelopment && !CoreIcons.isIconNamePrefixed(this.name)) {
            this.logger.warn(`Not prefixed icon ${this.name} detected, it could be an Ionic icon. Font-awesome is preferred.`);
        }

        if (this.name.includes('_')) {
            // Ionic icons cannot contain a '_' in the name, Ionic doesn't load them, replace it with '-'.
            this.logger.warn(`Icon ${this.name} contains '_' character and it's not allowed, replacing it with '-'.`);
            this.updateName(this.name.replace(/_/g, '-'));
        }

        if (this.name.match(/^fa[brs]?-/)) {
            // It's a font-awesome icon, check if it's using a deprecated name.
            const iconName = this.name.substring(this.name.indexOf('-') + 1);
            const { fileName, newLibrary } = await CoreIcons.getFontAwesomeIconFileName(iconName);

            if (newLibrary) {
                this.updateName(CoreIcons.prefixIconName('font-awesome', newLibrary, fileName));
            } else if (fileName !== iconName) {
                this.updateName(this.name.replace(iconName, fileName));
            }
        }
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.element.getAttribute('aria-label') &&
            !this.element.getAttribute('aria-labelledby') &&
            this.element.getAttribute('aria-hidden') !== 'true') {
            this.logger.warn(`Aria label not set on icon ${this.name}`, this.element);

            this.element.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (!changes.name || !this.name) {
            return;
        }

        this.validateIcon();
    }

    /**
     * Update the icon name.
     *
     * @param newName New name to use.
     */
    protected updateName(newName: string): void {
        this.name = newName;
        this.element.setAttribute('name', newName);
    }

}
