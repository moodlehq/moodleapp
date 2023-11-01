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

import { CoreConstants, ModPurpose } from '@/core/constants';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChange } from '@angular/core';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';

const assetsPath = 'assets/img/';
const fallbackModName = 'external-tool';

/**
 * Component to handle a module icon.
 */
@Component({
    selector: 'core-mod-icon',
    templateUrl: 'mod-icon.html',
    styleUrls: ['mod-icon.scss'],
})
export class CoreModIconComponent implements OnInit, OnChanges {

    @Input() modname = ''; // The module name. Used also as component if set.
    @Input() fallbackTranslation = ''; // Fallback translation string if cannot auto translate.
    @Input() componentId?: number; // Component Id for external icons.
    @Input() modicon?: string; // Module icon url or local url.
    @Input() showAlt = true; // Show alt otherwise it's only presentation icon.
    @Input() purpose: ModPurpose = ModPurpose.MOD_PURPOSE_OTHER; // Purpose of the module.

    icon = '';
    noFilter = false;
    modNameTranslated = '';
    isLocalUrl = true;
    linkIconWithComponent = false;

    protected legacyIcon = true; // @deprecatedonmoodle since 3.11.

    constructor(protected el: ElementRef) { }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.modname && this.modicon) {
            // Guess module from the icon url.
            this.modname = this.getComponentNameFromIconUrl(this.modicon);
        }

        this.modNameTranslated = CoreCourse.translateModuleName(this.modname, this.fallbackTranslation);
        if (CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            this.legacyIcon = false;

            const purposeClass =
                CoreCourseModuleDelegate.supportsFeature<ModPurpose>(
                    this.modname || '',
                    CoreConstants.FEATURE_MOD_PURPOSE,
                    this.purpose,
                );

            if (purposeClass) {
                const element: HTMLElement = this.el.nativeElement;
                element.classList.add(purposeClass);
            }
        }

        await this.setIcon();
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        if (changes && changes.modicon && changes.modicon.previousValue !== undefined) {
            await this.setIcon();
        }
    }

    /**
     * Set icon.
     */
    async setIcon(): Promise<void> {
        this.icon = this.modicon || this.icon;
        this.isLocalUrl = this.icon.startsWith(assetsPath);

        // Cache icon if the url is not the theme generic one.
        // If modname is not set icon won't be cached.
        // Also if the url matches the regexp (the theme will manage the image so it's not cached).
        this.linkIconWithComponent =
            !!this.modname &&
            !!this.componentId &&
            !this.isLocalUrl &&
            this.getComponentNameFromIconUrl(this.icon) != this.modname;

        this.noFilter = await this.getIconNoFilter();
    }

    /**
     * Icon to load on error.
     */
    async loadFallbackIcon(): Promise<void> {
        this.isLocalUrl = true;
        const moduleName = !this.modname || CoreCourse.CORE_MODULES.indexOf(this.modname) < 0
            ? fallbackModName
            : this.modname;

        let path = assetsPath + 'mod/';
        if (this.legacyIcon) {
            // @deprecatedonmoodle since 3.11.
            path = assetsPath + 'mod_legacy/';
        }

        this.icon = path + moduleName + '.svg';
        this.noFilter = await this.getIconNoFilter();
    }

    /**
     * Returns if the icon does not need to be filtered.
     *
     * @returns wether the icon does not need to be filtered.
     */
    protected async getIconNoFilter(): Promise<boolean> {
        // Earlier 4.0, icons were never filtered.
        if (this.legacyIcon) {
            return true;
        }

        // No icon or local icon (not legacy), filter it.
        if (!this.icon || this.isLocalUrl) {
            return false;
        }

        this.icon = CoreTextUtils.decodeHTMLEntities(this.icon);

        // If it's an Moodle Theme icon, check if filtericon is set and use it.
        if (this.icon && CoreUrlUtils.isThemeImageUrl(this.icon)) {
            const iconParams = CoreUrlUtils.extractUrlParams(this.icon);
            if (iconParams['filtericon'] === '1') {
                return false;
            }

            // filtericon was introduced in 4.2 and backported to 4.1.3 and 4.0.8.
            if (this.modname && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan(['4.0.8', '4.1.3', '4.2'])) {
                // If version is prior to that, check if the url is a module icon and filter it.
                if (this.getComponentNameFromIconUrl(this.icon) === this.modname) {
                    return false;
                }
            }
        }

        // External icons, or non monologo, do not filter.
        return true;
    }

    /**
     * Guesses the mod name form the url.
     *
     * @param iconUrl Icon url.
     * @returns Guessed modname.
     */
    protected getComponentNameFromIconUrl(iconUrl: string): string {
        if (!CoreUrlUtils.isThemeImageUrl(this.icon)) {
            // Cannot be guessed.
            return '';
        }

        const iconParams = CoreUrlUtils.extractUrlParams(iconUrl);
        let component = iconParams['component'];

        if (!component) {
            const matches = iconUrl.match('/theme/image.php/[^/]+/([^/]+)/[-0-9]*/');
            component = (matches && matches[1]) || '';
        }

        // Some invalid components (others may be added later on).
        if (component === 'core' || component === 'theme') {
            return '';
        }

        if (component.startsWith('mod_')) {
            component = component.substring(4);
        }

        return component;
    }

}
