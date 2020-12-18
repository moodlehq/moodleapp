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

import { Component } from '@angular/core';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@singletons/events';
import { CoreLang } from '@services/lang';
import { CoreDomUtils } from '@services/utils/dom';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CoreSettingsHelper, CoreColorScheme } from '../../services/settings-helper';

/**
 * Page that displays the general settings.
 */
@Component({
    selector: 'page-core-app-settings-general',
    templateUrl: 'general.html',
    styleUrls: ['general.scss'],
})
export class CoreSettingsGeneralPage {

    languages: { code: string; name: string }[] = [];
    selectedLanguage = '';
    fontSizes: { size: number; style: number; selected: boolean }[] = [];
    selectedFontSize = 0;
    richTextEditor = true;
    debugDisplay = false;
    analyticsSupported = false;
    analyticsEnabled = false;
    colorSchemes: CoreColorScheme[] = [];
    selectedScheme: CoreColorScheme = CoreColorScheme.LIGHT;
    colorSchemeDisabled = false;

    constructor() {
        this.asyncInit();
    }

    /**
     * Async part of the constructor.
     */
    protected async asyncInit(): Promise<void> {

        // Get the supported languages.
        const languages = CoreConstants.CONFIG.languages;
        for (const code in languages) {
            this.languages.push({
                code: code,
                name: languages[code],
            });
        }
        // Sort them by name.
        this.languages.sort((a, b) => a.name.localeCompare(b.name));
        this.selectedLanguage = await CoreLang.instance.getCurrentLanguage();

        // Configure color schemes.
        if (!CoreConstants.CONFIG.forceColorScheme) {
            this.colorSchemeDisabled = CoreSettingsHelper.instance.isColorSchemeDisabledInSite();

            if (this.colorSchemeDisabled) {
                this.colorSchemes.push(CoreColorScheme.LIGHT);
                this.selectedScheme = this.colorSchemes[0];
            } else {
                this.colorSchemes.push(CoreColorScheme.LIGHT);
                this.colorSchemes.push(CoreColorScheme.DARK);

                if (window.matchMedia('(prefers-color-scheme: dark)').matches ||
                                    window.matchMedia('(prefers-color-scheme: light)').matches) {
                    this.colorSchemes.push(CoreColorScheme.AUTO);
                }

                this.selectedScheme = await CoreConfig.instance.get(CoreConstants.SETTINGS_COLOR_SCHEME, CoreColorScheme.LIGHT);
            }
        }

        this.selectedFontSize = await CoreConfig.instance.get(
            CoreConstants.SETTINGS_FONT_SIZE,
            CoreConstants.CONFIG.font_sizes[0],
        );

        this.fontSizes = CoreConstants.CONFIG.font_sizes.map((size) =>
            ({
                size,
                // Absolute pixel size based on 1.4rem body text when this size is selected.
                style: Math.round(size * 16 / 100),
                selected: size === this.selectedFontSize,
            }));


        this.richTextEditor = await CoreConfig.instance.get(CoreConstants.SETTINGS_RICH_TEXT_EDITOR, true);

        this.debugDisplay = await CoreConfig.instance.get(CoreConstants.SETTINGS_DEBUG_DISPLAY, false);

        this.analyticsSupported = CoreConstants.CONFIG.enableanalytics;
        if (this.analyticsSupported) {
            this.analyticsEnabled = await CoreConfig.instance.get(CoreConstants.SETTINGS_ANALYTICS_ENABLED, true);
        }
    }

    /**
     * Called when a new language is selected.
     */
    languageChanged(): void {
        CoreLang.instance.changeCurrentLanguage(this.selectedLanguage).finally(() => {
            CoreEvents.trigger(CoreEvents.LANGUAGE_CHANGED, this.selectedLanguage);
        });
    }

    /**
     * Called when a new font size is selected.
     */
    fontSizeChanged(): void {
        this.fontSizes = this.fontSizes.map((fontSize) => {
            fontSize.selected = fontSize.size === this.selectedFontSize;

            return fontSize;
        });

        CoreSettingsHelper.instance.setFontSize(this.selectedFontSize);
        CoreConfig.instance.set(CoreConstants.SETTINGS_FONT_SIZE, this.selectedFontSize);
    }

    /**
     * Called when a new color scheme is selected.
     */
    colorSchemeChanged(): void {
        CoreSettingsHelper.instance.setColorScheme(this.selectedScheme);
        CoreConfig.instance.set(CoreConstants.SETTINGS_COLOR_SCHEME, this.selectedScheme);
    }

    /**
     * Called when the rich text editor is enabled or disabled.
     */
    richTextEditorChanged(): void {
        CoreConfig.instance.set(CoreConstants.SETTINGS_RICH_TEXT_EDITOR, this.richTextEditor ? 1 : 0);
    }

    /**
     * Called when the debug display setting is enabled or disabled.
     */
    debugDisplayChanged(): void {
        CoreConfig.instance.set(CoreConstants.SETTINGS_DEBUG_DISPLAY, this.debugDisplay ? 1 : 0);
        CoreDomUtils.instance.setDebugDisplay(this.debugDisplay);
    }

    /**
     * Called when the analytics setting is enabled or disabled.
     *
     * @todo
     */
    async analyticsEnabledChanged(): Promise<void> {
        await CorePushNotifications.instance.enableAnalytics(this.analyticsEnabled);

        CoreConfig.instance.set(CoreConstants.SETTINGS_ANALYTICS_ENABLED, this.analyticsEnabled ? 1 : 0);
    }

}
