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

import { toBoolean } from '@/core/transforms/boolean';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  input,
  effect,
  computed,
} from '@angular/core';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUrl } from '@singletons/url';
import { CoreBaseModule } from '@/core/base.module';
import { CoreExternalContentDirective } from '@directives/external-content';
import { ModFeature, ModPurpose } from '@addons/mod/constants';

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
    styleUrl: 'mod-icon.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreBaseModule,
        CoreExternalContentDirective,
    ],
    host: {
        '[attr.role]': 'showAlt() ? "img" : "presentation"',
        '[attr.aria-label]': 'showAlt() ? modNameTranslated() : ""',
        '[class]': 'iconVersion() + " " + purposeClass() ?? ""',
        '[class.branded]': 'addBrandedClass()',
        '[class.colorize]': 'addColorizeClass()',
    },
})
export class CoreModIconComponent {

    modname = input(''); // The module name. Used also as component if set.
    fallbackTranslation = input(''); // Fallback translation string if cannot auto translate.
    componentId = input<number>(); // Component Id for external icons.
    modicon = input<string>(); // Module icon url or local url.
    showAlt = input(true, { transform: toBoolean }); // Show alt otherwise it's only presentation icon.
    purpose = input<ModPurpose>(ModPurpose.OTHER); // Purpose of the module.
    colorize = input(true, { transform: toBoolean }); // Colorize the icon. Only applies on 4.0+.
    isBranded = input(false, { transform: toBoolean }); // If icon is branded and no colorize will be applied.

    iconUrl = signal('');
    isLocalUrl = signal(false);
    linkIconWithComponent = signal(false);

    computedModName = computed(() => this.modname() || this.getComponentNameFromIconUrl(this.modicon() ?? ''));
    modNameTranslated = computed(() =>
        CoreCourseModuleHelper.translateModuleName(this.computedModName(), this.fallbackTranslation()));

    protected iconVersion = signal(IconVersion.LEGACY_VERSION);
    protected purposeClass = computed(() => this.calculatePurposeClass());
    protected addBrandedClass = signal<boolean|undefined>(undefined);
    protected addColorizeClass = computed(() => this.colorize() && this.iconVersion() !== IconVersion.LEGACY_VERSION);

    constructor() {
        this.iconVersion.set(this.getIconVersion());

        effect(() => {
            // @todo: Move as much code from this effect to computed properties.
            this.setIcon(this.modicon());
        });
    }

    /**
     * Sets the isBranded property when undefined.
     */
    protected async setBrandedClass(): Promise<void> {
        if (!this.colorize()) {
            this.addBrandedClass.set(false);

            // It doesn't matter.
            return;
        }

        if (this.iconVersion() === IconVersion.LEGACY_VERSION) {
            this.addBrandedClass.set(false);

            return;
        }

        // Reset the branded class to the original value.
        this.addBrandedClass.set(this.isBranded());

        // Exception for bigbluebuttonbn, it's the only one that has a branded icon.
        if (this.iconVersion() === IconVersion.VERSION_4_0 && this.computedModName() === 'bigbluebuttonbn') {
            // Known issue, if the icon is overriden by theme it won't be colorized.
            this.addBrandedClass.set(true);

            return;
        }

        // No icon or local icon (not legacy), colorize it.
        if (!this.iconUrl() || this.isLocalUrl()) {
            this.addBrandedClass.update(addBrandedClass => addBrandedClass ?? false);

            return;
        }

        this.iconUrl.update(value => CoreText.decodeHTMLEntities(value));
        if (this.addBrandedClass() !== undefined) {
            return;
        }

        // If it's an Moodle Theme icon, check if filtericon is set and use it.
        if (CoreUrl.isThemeImageUrl(this.iconUrl())) {
            const filter = CoreUrl.getThemeImageUrlParam(this.iconUrl(), 'filtericon');
            if (filter === '1') {
                this.addBrandedClass.set(false);

                return;
            }

            // filtericon was introduced in 4.2 and backported to 4.1.3 and 4.0.8.
            if (this.computedModName() && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan(['4.0.8', '4.1.3', '4.2'])) {
                // If version is prior to that, check if the url is a module icon and filter it.
                if (this.getComponentNameFromIconUrl(this.iconUrl()) === this.computedModName()) {
                    this.addBrandedClass.set(false);

                    return;
                }
            }
        }

        // External icons, or non monologo, do not filter.
        this.addBrandedClass.set(true);
    }

    /**
     * Set icon.
     *
     * @param modicon Mod icon to use.
     */
    async setIcon(modicon?: string): Promise<void> {
        this.iconUrl.update(value => modicon || value);

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
            !!this.computedModName() &&
            !!this.componentId() &&
            !this.isLocalUrl() &&
            this.getComponentNameFromIconUrl(this.iconUrl()) !== this.computedModName(),
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

        const moduleName = !this.computedModName() || !CoreCourseModuleHelper.isCoreModule(this.computedModName())
            ? fallbackModName
            : this.computedModName();

        const path = CoreCourseModuleHelper.getModuleIconsPath();

        this.iconUrl.set(`${path + moduleName  }.svg`);
    }

    /**
     * Guesses the mod name form the url.
     *
     * @param iconUrl Icon url.
     * @returns Guessed modname.
     */
    protected getComponentNameFromIconUrl(iconUrl: string): string {
        if (!iconUrl) {
            return '';
        }

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
     * Calculates the purpose class.
     *
     * @returns The purpose class.
     */
    protected calculatePurposeClass(): string {
        if (this.iconVersion() === IconVersion.LEGACY_VERSION) {
            return '';
        }

        const purposeClass = CoreCourseModuleDelegate.supportsFeature<ModPurpose>(
            this.computedModName() || '',
            ModFeature.MOD_PURPOSE,
            this.purpose(),
        );

        if (this.iconVersion() === IconVersion.VERSION_4_0) {
            if (purposeClass === ModPurpose.INTERACTIVECONTENT) {
                // Interactive content was introduced on 4.4, on previous versions CONTENT is used instead.
                return ModPurpose.CONTENT;
            }

            if (this.computedModName() === 'lti') {
                // LTI had content purpose with 4.0 icons.
                return ModPurpose.CONTENT;
            }
        }

        return purposeClass;
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
