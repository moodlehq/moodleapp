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
  computed,
  linkedSignal,
} from '@angular/core';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreSites } from '@services/sites';
import { CoreText } from '@static/text';
import { CoreUrl } from '@static/url';
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
        '[class]': 'iconVersion() + " " + purposeClass()',
        '[class.branded]': 'addBrandedClass()',
        '[class.colorize]': 'addColorizeClass()',
    },
})
export class CoreModIconComponent {

    readonly modname = input(''); // The module name. Used also as component if set.
    readonly fallbackTranslation = input(''); // Fallback translation string if cannot auto translate.
    readonly componentId = input<number>(); // Component Id for external icons.
    readonly modicon = input<string>(); // Module icon url or local url.
    readonly showAlt = input(true, { transform: toBoolean }); // Show alt otherwise it's only presentation icon.
    readonly purpose = input<ModPurpose>(ModPurpose.OTHER); // Purpose of the module.
    readonly colorize = input(true, { transform: toBoolean }); // Colorize the icon. Only applies on 4.0+.
    readonly isBranded = input(false, { transform: toBoolean }); // If icon is branded and no colorize will be applied.

    readonly iconUrl = linkedSignal(() => CoreText.decodeHTMLEntities(this.modicon() || this.getFallbackIcon()));
    readonly isLocalUrl = computed(() => this.iconUrl().startsWith(assetsPath));

    // Cache icon if the url is not the theme generic one.
    // If modname is not set icon won't be cached.
    // Also if the url matches the regexp (the theme will manage the image so it's not cached).
    readonly linkIconWithComponent = computed(() => !!this.computedModName() && !!this.componentId() && !this.isLocalUrl() &&
            this.getComponentNameFromIconUrl(this.iconUrl()) !== this.computedModName());

    readonly computedModName = computed(() => this.modname() || this.getComponentNameFromIconUrl(this.modicon() ?? ''));
    readonly modNameTranslated = computed(() =>
        CoreCourseModuleHelper.translateModuleName(this.computedModName(), this.fallbackTranslation()));

    protected readonly iconVersion = signal(IconVersion.LEGACY_VERSION);
    protected readonly purposeClass = computed(() => this.calculatePurposeClass());
    protected readonly addBrandedClass = computed(() => this.calculateAddBranded());
    protected readonly addColorizeClass = computed(() => this.colorize() && this.iconVersion() !== IconVersion.LEGACY_VERSION);

    constructor() {
        this.iconVersion.set(this.getIconVersion());
    }

    /**
     * Calculates whether the branded class should be added or not.
     *
     * @returns Whether the branded class should be added.
     */
    protected calculateAddBranded(): boolean {
        if (!this.colorize()) {
            // It doesn't matter.
            return false;
        }

        if (this.iconVersion() === IconVersion.LEGACY_VERSION) {
            return false;
        }

        // Exception for bigbluebuttonbn, it's the only one that has a branded icon.
        if (this.iconVersion() === IconVersion.VERSION_4_0 && this.computedModName() === 'bigbluebuttonbn') {
            // Known issue, if the icon is overridden by theme it won't be colorized.
            return true;
        }

        const isBranded = this.isBranded();

        // No icon or local icon (not legacy), use the input.
        if (!this.iconUrl() || this.isLocalUrl()) {
            return isBranded ?? false;
        }

        if (isBranded !== undefined) {
            return isBranded;
        }

        // If it's a Moodle Theme icon, check if filtericon is set and use it.
        if (CoreUrl.isThemeImageUrl(this.iconUrl())) {
            const filter = CoreUrl.getThemeImageUrlParam(this.iconUrl(), 'filtericon');
            if (filter === '1') {
                return false;
            }

            // filtericon was introduced in 4.2 and backported to 4.1.3 and 4.0.8.
            if (this.computedModName() && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan(['4.0.8', '4.1.3', '4.2'])) {
                // If version is prior to that, check if the url is a module icon and filter it.
                if (this.getComponentNameFromIconUrl(this.iconUrl()) === this.computedModName()) {
                    return false;
                }
            }
        }

        // External icons, or non monologo, do not filter.
        return true;
    }

    /**
     * Get icon to load on error.
     *
     * @returns Icon URL.
     */
    getFallbackIcon(): string {
        const moduleName = !this.computedModName() || !CoreCourseModuleHelper.isCoreModule(this.computedModName())
            ? fallbackModName
            : this.computedModName();

        const path = CoreCourseModuleHelper.getModuleIconsPath();

        return `${path + moduleName}.svg`;
    }

    /**
     * Load fallback icon.
     */
    loadFallbackIcon(): void {
        this.iconUrl.set(this.getFallbackIcon());
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
