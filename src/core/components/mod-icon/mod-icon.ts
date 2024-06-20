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
import { toBoolean } from '@/core/transforms/boolean';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostBinding,
    Input,
    OnChanges,
    OnInit,
    SimpleChange,
    signal,
} from '@angular/core';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrl } from '@singletons/url';

const assetsPath = 'assets/img/';
const fallbackModName = 'external-tool';

const enum IconVersion {
    LEGACY_VERSION = 'version_legacy',
    VERSION_4_0 = 'version_40',
    CURRENT_VERSION = 'version_current',
}

/**
 * Component to handle a module icon.
 */
@Component({
    selector: 'core-mod-icon',
    templateUrl: 'mod-icon.html',
    styleUrls: ['mod-icon.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreModIconComponent implements OnInit, OnChanges {

    @Input() modname = ''; // The module name. Used also as component if set.
    @Input() fallbackTranslation = ''; // Fallback translation string if cannot auto translate.
    @Input() componentId?: number; // Component Id for external icons.
    @Input() modicon?: string; // Module icon url or local url.
    @Input({ transform: toBoolean }) showAlt = true; // Show alt otherwise it's only presentation icon.
    @Input() purpose: ModPurpose = ModPurpose.MOD_PURPOSE_OTHER; // Purpose of the module.
    @Input({ transform: toBoolean }) @HostBinding('class.colorize') colorize = true; // Colorize the icon. Only applies on 4.0+.
    @Input({ transform: toBoolean }) isBranded = false; // If icon is branded and no colorize will be applied.

    @HostBinding('class.branded') brandedClass?: boolean;

    @HostBinding('attr.role')
    get getRole(): string | null {
        return this.showAlt ? 'img' : 'presentation';
    }

    @HostBinding('attr.aria-label')
    get getAriaLabel(): string {
        return this.showAlt ? this.modNameTranslated() : '';
    }

    iconUrl = signal('');
    modNameTranslated = signal('');
    isLocalUrl = signal(false);
    linkIconWithComponent = signal(false);

    protected iconVersion: IconVersion = IconVersion.LEGACY_VERSION;
    protected purposeClass = '';
    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.iconVersion = this.getIconVersion();
        this.element.classList.add(this.iconVersion);

        if (!this.modname && this.modicon) {
            // Guess module from the icon url.
            this.modname = this.getComponentNameFromIconUrl(this.modicon);
        }

        this.modNameTranslated.set(CoreCourse.translateModuleName(this.modname, this.fallbackTranslation));

        this.setPurposeClass();

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
     * Sets the isBranded property when undefined.
     */
    protected async setBrandedClass(): Promise<void> {
        if (!this.colorize) {
            this.brandedClass = false;

            // It doesn't matter.
            return;
        }

        // Earlier 4.0, icons were never colorized.
        if (this.iconVersion === IconVersion.LEGACY_VERSION) {
            this.brandedClass = false;
            this.colorize = false;

            return;
        }

        // Reset the branded class to the original value.
        this.brandedClass = this.isBranded;

        // Exception for bigbluebuttonbn, it's the only one that has a branded icon.
        if (this.iconVersion === IconVersion.VERSION_4_0 && this.modname === 'bigbluebuttonbn') {
            // Known issue, if the icon is overriden by theme it won't be colorized.
            this.brandedClass = true;

            return;
        }

        // No icon or local icon (not legacy), colorize it.
        if (!this.iconUrl() || this.isLocalUrl()) {
            this.brandedClass ??= false;

            return;
        }

        this.iconUrl.update(value => CoreTextUtils.decodeHTMLEntities(value));
        if (this.brandedClass !== undefined) {
            return;
        }

        // If it's an Moodle Theme icon, check if filtericon is set and use it.
        if (CoreUrl.isThemeImageUrl(this.iconUrl())) {
            const filter = CoreUrl.getThemeImageUrlParam(this.iconUrl(), 'filtericon');
            if (filter === '1') {
                this.brandedClass = false;

                return;
            }

            // filtericon was introduced in 4.2 and backported to 4.1.3 and 4.0.8.
            if (this.modname && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan(['4.0.8', '4.1.3', '4.2'])) {
                // If version is prior to that, check if the url is a module icon and filter it.
                if (this.getComponentNameFromIconUrl(this.iconUrl()) === this.modname) {
                    this.brandedClass =  false;

                    return;
                }
            }
        }

        // External icons, or non monologo, do not filter.
        this.brandedClass = true;
    }

    /**
     * Set icon.
     */
    async setIcon(): Promise<void> {
        this.iconUrl.update(value => this.modicon || value);

        if (!this.iconUrl()) {
            this.loadFallbackIcon();
            this.setBrandedClass();

            return;
        }

        this.isLocalUrl.set(this.iconUrl().startsWith(assetsPath));

        // Cache icon if the url is not the theme generic one.
        // If modname is not set icon won't be cached.
        // Also if the url matches the regexp (the theme will manage the image so it's not cached).
        this.linkIconWithComponent.set(
            !!this.modname &&
            !!this.componentId &&
            !this.isLocalUrl() &&
            this.getComponentNameFromIconUrl(this.iconUrl()) != this.modname,
        );

        this.setBrandedClass();
    }

    /**
     * Icon to load on error.
     */
    async loadFallbackIcon(): Promise<void> {
        if (this.isLocalUrl()) {
            return;
        }

        this.isLocalUrl.set(true);
        this.linkIconWithComponent.set(false);

        const moduleName = !this.modname || !CoreCourse.isCoreModule(this.modname)
            ? fallbackModName
            : this.modname;

        const path = CoreCourse.getModuleIconsPath();

        this.iconUrl.set(path + moduleName + '.svg');
    }

    /**
     * Guesses the mod name form the url.
     *
     * @param iconUrl Icon url.
     * @returns Guessed modname.
     */
    protected getComponentNameFromIconUrl(iconUrl: string): string {
        const component = CoreUrl.getThemeImageUrlParam(iconUrl, 'component');

        // Some invalid components (others may be added later on).
        if (component === 'core' || component === 'theme') {
            return '';
        }

        if (component.startsWith('mod_')) {
            return component.substring(4);
        }

        return component;
    }

    /**
     * Set the purpose class.
     */
    protected setPurposeClass(): void {
        if (this.iconVersion === IconVersion.LEGACY_VERSION) {
            return;
        }

        this.purposeClass =
            CoreCourseModuleDelegate.supportsFeature<ModPurpose>(
                this.modname || '',
                CoreConstants.FEATURE_MOD_PURPOSE,
                this.purpose,
            );

        if (this.iconVersion === IconVersion.VERSION_4_0) {
            if (this.purposeClass === ModPurpose.MOD_PURPOSE_INTERACTIVECONTENT) {
                // Interactive content was introduced on 4.4, on previous versions CONTENT is used instead.
                this.purposeClass = ModPurpose.MOD_PURPOSE_CONTENT;
            }

            if (this.modname === 'lti') {
                // LTI had content purpose with 4.0 icons.
                this.purposeClass = ModPurpose.MOD_PURPOSE_CONTENT;
            }
        }

        if (this.purposeClass) {
            this.element.classList.add(this.purposeClass);
        }
    }

    /**
     * Get the icon version depending on site version.
     *
     * @returns Icon version.
     */
    protected getIconVersion(): IconVersion {
        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            // @deprecatedonmoodle since 3.11.
            return IconVersion.LEGACY_VERSION;
        }

        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.4')) {
            // @deprecatedonmoodle since 4.3.
            return IconVersion.VERSION_4_0;
        }

        return IconVersion.CURRENT_VERSION;
    }

}
