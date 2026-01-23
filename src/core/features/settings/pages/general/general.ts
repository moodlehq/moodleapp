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

import { Component, Type } from '@angular/core';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@singletons/events';
import { CoreLang } from '@services/lang';
import { CoreSettingsHelper, CoreColorScheme, CoreZoomLevel } from '../../services/settings-helper';
import { CoreIframe } from '@singletons/iframe';
import { Translate } from '@singletons';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { AlertButton } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { CoreAnalytics } from '@services/analytics';
import { CoreNative } from '@features/native/services/native';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreEditorService } from '@features/editor/services/editor';

/**
 * Page that displays the general settings.
 */
@Component({
    selector: 'page-core-app-settings-general',
    templateUrl: 'general.html',
    styleUrl: 'general.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreSettingsGeneralPage {

    languages: { code: string; name: string }[] = [];
    selectedLanguage = '';
    zoomLevels: { value: CoreZoomLevel; style: number; selected: boolean }[] = [];
    selectedZoomLevel = CoreZoomLevel.NONE;
    pinchToZoom = false;
    debugDisplay = false;
    analyticsAvailable = false;
    analyticsEnabled = false;
    colorSchemes: CoreColorScheme[] = [];
    selectedScheme: CoreColorScheme = CoreColorScheme.LIGHT;
    colorSchemeDisabled = false;
    isAndroid = false;
    displayIframeHelp = false;

    protected editorSettingsComponentClass?: Type<unknown>;

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
        this.selectedLanguage = await CoreLang.getCurrentLanguage();

        // Configure color schemes.
        if (!CoreConstants.CONFIG.forceColorScheme) {
            this.colorSchemeDisabled = CoreSettingsHelper.isColorSchemeDisabledInSite();

            if (this.colorSchemeDisabled) {
                this.colorSchemes.push(CoreColorScheme.LIGHT);
                this.selectedScheme = this.colorSchemes[0];
            } else {
                this.isAndroid = CorePlatform.isAndroid();
                this.colorSchemes = CoreSettingsHelper.getAllowedColorSchemes();
                this.selectedScheme = await CoreConfig.get(CoreConstants.SETTINGS_COLOR_SCHEME, CoreColorScheme.LIGHT);
            }
        }

        this.selectedZoomLevel = await CoreSettingsHelper.getZoomLevel();

        this.zoomLevels = Object.keys(CoreConstants.CONFIG.zoomlevels).map((value: CoreZoomLevel) =>
            ({
                value,
                // Absolute pixel size based on 1.4rem body text when this size is selected.
                style: Math.round(CoreConstants.CONFIG.zoomlevels[value] * 16 / 100),
                selected: value === this.selectedZoomLevel,
            }));

        this.pinchToZoom = await CoreSettingsHelper.getPinchToZoom();

        this.editorSettingsComponentClass = await CoreEditorService.getSettingsComponentClass();

        this.debugDisplay = await CoreConfig.get(CoreConstants.SETTINGS_DEBUG_DISPLAY, false);

        this.analyticsAvailable = await CoreAnalytics.isAnalyticsAvailable();
        if (this.analyticsAvailable) {
            this.analyticsEnabled = await CoreConfig.get(CoreConstants.SETTINGS_ANALYTICS_ENABLED, true);
        }

        this.displayIframeHelp = CoreIframe.shouldDisplayHelp();
    }

    /**
     * Called when a new language is selected.
     *
     * @param ev Event
     */
    async languageChanged(ev: Event): Promise<void> {
        ev.stopPropagation();
        ev.preventDefault();

        const previousLanguage = await CoreLang.getCurrentLanguage();
        if (this.selectedLanguage === previousLanguage) {
            // Prevent opening again.

            return;
        }

        const previousLanguageCancel = Translate.instant('core.cancel');

        try {
            await CoreLang.changeCurrentLanguage(this.selectedLanguage);
        } finally {
            const langName = this.languages.find((lang) => lang.code === this.selectedLanguage)?.name;

            const buttons: AlertButton[] = [
                {
                    text: previousLanguageCancel,
                    role: 'cancel',
                    handler: (): void => {
                        clearTimeout(timeout);
                        this.selectedLanguage = previousLanguage;
                        CoreLang.changeCurrentLanguage(this.selectedLanguage);
                    },
                },
                {
                    text: Translate.instant('core.settings.changelanguage', { $a: langName }),
                    cssClass: 'timed-button',
                    handler: (): void => {
                        clearTimeout(timeout);
                        this.applyLanguageAndRestart();
                    },
                },
            ];

            const alert = await CoreAlerts.show(
                {
                    message: Translate.instant('core.settings.changelanguagealert'),
                    buttons,
                },
            );
            const timeout = window.setTimeout(async () => {
                await alert.dismiss();
                this.applyLanguageAndRestart();
            }, 10000);
        }
    }

    /**
     * Apply language changes and restart the app.
     *
     * IMPORTANT NOTE: If for any reason we decide to remove this method,
     * we'll need to listen to lang change on Slides to change direction.
     */
    protected async applyLanguageAndRestart(): Promise<void> {
        // Invalidate cache for all sites to get the content in the right language.
        const sites = await CoreSites.getSitesInstances();
        await CorePromiseUtils.ignoreErrors(Promise.all(sites.map((site) => site.invalidateWsCache())));

        CoreEvents.trigger(CoreEvents.LANGUAGE_CHANGED, this.selectedLanguage);

        CoreNavigator.navigate('/reload', {
            reset: true,
        });
    }

    /**
     * Called when a new zoom level is selected.
     *
     * @param ev Event
     * @param value New value
     */
    zoomLevelChanged(ev: Event, value: CoreZoomLevel): void {
        ev.stopPropagation();
        ev.preventDefault();

        this.selectedZoomLevel = value;

        this.zoomLevels = this.zoomLevels.map((fontSize) => {
            fontSize.selected = fontSize.value === this.selectedZoomLevel;

            return fontSize;
        });

        CoreSettingsHelper.applyZoomLevel(this.selectedZoomLevel);
        CoreConfig.set(CoreConstants.SETTINGS_ZOOM_LEVEL, this.selectedZoomLevel);
    }

    /**
     * Called when pinch-to-zoom is enabled or disabled.
     *
     * @param ev Event
     */
    pinchToZoomChanged(ev: Event): void {
        ev.stopPropagation();
        ev.preventDefault();

        CoreSettingsHelper.applyPinchToZoom(this.pinchToZoom);
        CoreConfig.set(CoreConstants.SETTINGS_PINCH_TO_ZOOM, this.pinchToZoom ? 1 : 0);
    }

    /**
     * Called when a new color scheme is selected.
     *
     * @param ev Event
     */
    colorSchemeChanged(ev: Event): void {
        ev.stopPropagation();
        ev.preventDefault();

        CoreSettingsHelper.setColorScheme(this.selectedScheme);
        CoreConfig.set(CoreConstants.SETTINGS_COLOR_SCHEME, this.selectedScheme);
    }

    /**
     * Called when the debug display setting is enabled or disabled.
     *
     * @param ev Event
     */
    debugDisplayChanged(ev: Event): void {
        ev.stopPropagation();
        ev.preventDefault();

        CoreConfig.set(CoreConstants.SETTINGS_DEBUG_DISPLAY, this.debugDisplay ? 1 : 0);
        CoreAlerts.setDebugDisplay(this.debugDisplay);
    }

    /**
     * Called when the analytics setting is enabled or disabled.
     *
     * @param ev Event
     */
    async analyticsEnabledChanged(ev: Event):  Promise<void> {
        ev.stopPropagation();
        ev.preventDefault();

        await CoreAnalytics.enableAnalytics(this.analyticsEnabled);

        CoreConfig.set(CoreConstants.SETTINGS_ANALYTICS_ENABLED, this.analyticsEnabled ? 1 : 0);
    }

    /**
     * Open native settings.
     *
     * @param ev Event
     */
    openNativeSettings(ev: Event): void {
        ev.stopPropagation();
        ev.preventDefault();

        CoreNative.plugin('diagnostic')?.switchToSettings();
    }

}
