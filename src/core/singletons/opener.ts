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

import { InAppBrowserObject, InAppBrowserOptions } from '@awesome-cordova-plugins/in-app-browser';
import { CoreErrorWithOptions } from '@classes/errors/errorwithoptions';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreFilepool } from '@services/filepool';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreMimetype } from '@singletons/mimetype';
import { Translate, FileOpener, WebIntent, InAppBrowser, NgZone } from '@singletons';
import { CoreConstants } from '../constants';
import { CoreFile } from '@services/file';
import { CorePromiseUtils } from './promise-utils';
import { CoreUrl } from './url';
import { CoreLogger } from './logger';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@singletons/events';
import { CoreColors } from './colors';
import { CorePrompts } from '@services/overlays/prompts';
import { CoreNativeCordovaPluginResultStatus } from '@features/native/constants';

/**
 * Singleton with helper functions to handler open files and urls.
 */
export class CoreOpener {

    protected static logger = CoreLogger.getInstance('CoreOpener');

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Show a confirm before opening a link in browser, unless the user previously marked to not show again.
     *
     * @param url URL to open.
     */
    protected static async confirmOpenBrowserIfNeeded(url: string): Promise<void> {
        if (!CoreUrl.isHttpURL(url)) {
            // Only ask confirm for http(s), other cases usually launch external apps.
            return;
        }

        // Check if the user decided not to see the warning.
        const dontShowWarning = await CoreConfig.get(CoreConstants.SETTINGS_DONT_SHOW_EXTERNAL_LINK_WARN, 0);
        if (dontShowWarning) {
            return;
        }

        // Remove common sensitive information from the URL.
        url = url
            .replace(/token=[^&#]+/gi, 'token=secret')
            .replace(/tokenpluginfile\.php\/[^/]+/gi, 'tokenpluginfile.php/secret');

        const dontShowAgain = await CorePrompts.show(Translate.instant('core.warnopeninbrowser', { url }), 'checkbox', {
            placeholderOrLabel: Translate.instant('core.dontshowagain'),
        });

        if (dontShowAgain) {
            CoreConfig.set(CoreConstants.SETTINGS_DONT_SHOW_EXTERNAL_LINK_WARN, 1);
        }
    }

    /**
     * Open a file using platform specific method.
     *
     * @param path The local path of the file to be open.
     * @param options Options.
     */
    static async openFile(path: string, options: CoreOpenerOpenFileOptions = {}): Promise<void> {
        // Convert the path to a native path if needed.
        path = CoreFile.unconvertFileSrc(path);

        const extension = CoreMimetype.getFileExtension(path);
        const mimetype = extension && CoreMimetype.getMimeType(extension);

        if (mimetype == 'text/html' && CorePlatform.isAndroid()) {
            // Open HTML local files in InAppBrowser, in system browser some embedded files aren't loaded.
            CoreOpener.openInApp(path);

            return;
        } else if (extension === 'apk' && CorePlatform.isAndroid()) {
            const url = await CorePromiseUtils.ignoreErrors(
                CoreFilepool.getFileUrlByPath(CoreSites.getCurrentSiteId(), CoreFile.removeBasePath(path)),
            );

            // @todo MOBILE-4167: Handle urls with expired tokens.

            throw new CoreErrorWithOptions(
                Translate.instant('core.cannotinstallapkinfo'),
                Translate.instant('core.cannotinstallapk'),
                url
                    ? [
                        {
                            text: Translate.instant('core.openinbrowser'),
                            handler: () => CoreOpener.openInBrowser(url),
                        },
                        {
                            text: Translate.instant('core.cancel'),
                            role: 'cancel',
                        },
                    ]
                    : undefined,
            );
        }

        // Path needs to be decoded, the file won't be opened if the path has %20 instead of spaces and so.
        try {
            path = decodeURIComponent(path);
        } catch {
            // Error, use the original path.
        }

        const openFile = async (path: string, mimetype?: string, hasFailed?: boolean) => {
            try {
                if (CoreOpener.shouldOpenWithDialog(options)) {
                    await FileOpener.showOpenWithDialog(path, mimetype || '');
                } else {
                    await FileOpener.open(path, mimetype || '');
                }
            } catch (error) {
                if (
                    hasFailed ||
                    error.status !== CoreNativeCordovaPluginResultStatus.ERROR ||
                    error.message.includes('Activity not found')
                ) {
                    throw error;
                }

                // If the file contains the % character without encoding the open can fail. Try again encoding it.
                const encodedPath = encodeURI(path);

                if (path !== encodedPath) {
                    return await openFile(encodedPath, mimetype, true);
                }

                throw error;
            }
        };

        try {
            try {
                await openFile(path, mimetype);
            } catch (error) {
                if (!extension || !error || Number(error.status) !== 9) {
                    throw error;
                }

                // Cannot open mimetype. Check if there is a deprecated mimetype for the extension.
                const deprecatedMimetype = CoreMimetype.getDeprecatedMimeType(extension);
                if (!deprecatedMimetype || deprecatedMimetype === mimetype) {
                    throw error;
                }

                await openFile(path, deprecatedMimetype);
            }
        } catch (error) {
            CoreOpener.logger.error(`Error opening file ${path} with mimetype ${mimetype}`);
            CoreOpener.logger.error('Error: ', JSON.stringify(error));

            if (!extension || extension.indexOf('/') > -1 || extension.indexOf('\\') > -1) {
                // Extension not found.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            throw new Error(Translate.instant('core.erroropenfilenoapp'));
        }
    }

    /**
     * Open a URL using a browser.
     * Do not use for files, refer to {@link CoreOpener.openFile}.
     *
     * @param url The URL to open.
     * @param options Options.
     */
    static async openInBrowser(url: string, options: CoreOpenerOpenInBrowserOptions = {}): Promise<void> {
        const originaUrl = CoreUrl.unfixPluginfileURL(options.originalUrl ?? url);
        if (options.showBrowserWarning || options.showBrowserWarning === undefined) {
            try {
                await CoreOpener.confirmOpenBrowserIfNeeded(originaUrl);
            } catch {
                // Cancelled, stop.
                return;
            }
        }

        if (CoreSites.getCurrentSite()?.containsUrl(url)) {
            url = CoreUrl.addParamsToUrl(url, { lang: await CoreLang.getCurrentLanguage(CoreLangFormat.LMS) }, {
                checkAutoLoginUrl: options.originalUrl !== url,
            });
        }

        CoreAnalytics.logEvent({ type: CoreAnalyticsEventType.OPEN_LINK, link: originaUrl });
        window.open(url, '_system');
    }

    /**
     * Open an online file using platform specific method.
     * Specially useful for audio and video since they can be streamed.
     *
     * @param url The URL of the file.
     * @returns Promise resolved when opened.
     */
    static async openOnlineFile(url: string): Promise<void> {
        if (CorePlatform.isAndroid()) {
            // In Android we need the mimetype to open it.
            const mimetype = await CorePromiseUtils.ignoreErrors(CoreMimetype.getMimeTypeFromUrl(url));

            if (!mimetype) {
                // Couldn't retrieve mimetype. Return error.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            const options = {
                action: WebIntent.ACTION_VIEW,
                url,
                type: mimetype,
            };

            try {
                await WebIntent.startActivity(options);

                CoreAnalytics.logEvent({
                    type: CoreAnalyticsEventType.OPEN_LINK,
                    link: CoreUrl.unfixPluginfileURL(url),
                });

                return;
            } catch (error) {
                CoreOpener.logger.error(`Error opening online file ${url} with mimetype ${mimetype}`);
                CoreOpener.logger.error('Error: ', JSON.stringify(error));

                throw new Error(Translate.instant('core.erroropenfilenoapp'));
            }
        }

        // In the rest of platforms we need to open them in InAppBrowser.
        CoreOpener.openInApp(url);
    }

    /**
     * Given some options, check if a file should be opened with showOpenWithDialog.
     *
     * @param options Options.
     * @returns Boolean.
     */
    static shouldOpenWithDialog(options: CoreOpenerOpenFileOptions = {}): boolean {
        const openFileAction = options.iOSOpenFileAction ?? CoreConstants.CONFIG.iOSDefaultOpenFileAction;

        return CorePlatform.isIOS() && openFileAction == OpenFileAction.OPEN_WITH;
    }

    private static iabInstance?: InAppBrowserObject;

    /**
     * Close the InAppBrowser window.
     */
    static closeInAppBrowser(): void {
        if (!CoreOpener.iabInstance) {
            return;
        }

        CoreOpener.iabInstance.close();
    }

    /**
     * Get inapp browser instance (if any).
     *
     * @returns IAB instance, undefined if not open.
     */
    static getInAppBrowserInstance(): InAppBrowserObject | undefined  {
        return CoreOpener.iabInstance;
    }

    /**
     * Check if inapp browser is open.
     *
     * @returns Whether it's open.
     */
    static isInAppBrowserOpen(): boolean {
        return !!CoreOpener.iabInstance;
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to CoreOpener.openFile.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window.
     */
    static openInApp(url: string, options?: CoreOpenerOpenInAppBrowserOptions): InAppBrowserObject {
        options = options || {};
        options.usewkwebview = 'yes'; // Force WKWebView in iOS.
        options.enableViewPortScale = options.enableViewPortScale ?? 'yes'; // Enable zoom on iOS by default.
        options.allowInlineMediaPlayback = options.allowInlineMediaPlayback ?? 'yes'; // Allow playing inline videos in iOS.

        if (!options.location && CorePlatform.isIOS() && url.indexOf('file://') === 0) {
            // The URL uses file protocol, don't show it on iOS.
            // In Android we keep it because otherwise we lose the whole toolbar.
            options.location = 'no';
        }

        CoreOpener.setInAppBrowserToolbarColors(options);

        if (CoreSites.getCurrentSite()?.containsUrl(url)) {
            url = CoreUrl.addParamsToUrl(url, { lang: CoreLang.getCurrentLanguageSync(CoreLangFormat.LMS) }, {
                checkAutoLoginUrl: options.originalUrl !== url,
            });
        }

        CoreOpener.iabInstance = InAppBrowser.create(url, '_blank', options);

        if (CorePlatform.isMobile()) {
            const loadStartUrls: string[] = [];

            const loadStartSubscription = CoreOpener.iabInstance.on('loadstart').subscribe((event) => {
                NgZone.run(() => {
                    // Store the last loaded URLs (max 10).
                    loadStartUrls.push(event.url);
                    if (loadStartUrls.length > 10) {
                        loadStartUrls.shift();
                    }

                    CoreEvents.trigger(CoreEvents.IAB_LOAD_START, event);
                });
            });

            const loadStopSubscription = CoreOpener.iabInstance.on('loadstop').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_LOAD_STOP, event);
                });
            });

            const messageSubscription = CoreOpener.iabInstance.on('message').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_MESSAGE, event.data);
                });
            });

            const exitSubscription = CoreOpener.iabInstance.on('exit').subscribe((event) => {
                NgZone.run(() => {
                    loadStartSubscription.unsubscribe();
                    loadStopSubscription.unsubscribe();
                    messageSubscription.unsubscribe();
                    exitSubscription.unsubscribe();

                    CoreOpener.iabInstance = undefined;
                    CoreEvents.trigger(CoreEvents.IAB_EXIT, event);
                });
            });
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: CoreUrl.unfixPluginfileURL(options.originalUrl ?? url),
        });

        return CoreOpener.iabInstance;
    }

    /**
     * Given some IAB options, set the toolbar colors properties to the right values.
     *
     * @param options Options to change.
     * @returns Changed options.
     */
    protected static setInAppBrowserToolbarColors(options: InAppBrowserOptions): InAppBrowserOptions {
        if (options.toolbarcolor) {
            // Color already set.
            return options;
        }

        // Color not set. Check if it needs to be changed automatically.
        let bgColor: string | undefined;
        let textColor: string | undefined;

        if (CoreConstants.CONFIG.iabToolbarColors === 'auto') {
            bgColor = CoreColors.getToolbarBackgroundColor();
        } else if (CoreConstants.CONFIG.iabToolbarColors && typeof CoreConstants.CONFIG.iabToolbarColors === 'object') {
            bgColor = CoreConstants.CONFIG.iabToolbarColors.background;
            textColor = CoreConstants.CONFIG.iabToolbarColors.text;
        }

        if (!bgColor) {
            // Use default color. In iOS, use black background color since the default is transparent and doesn't look good.
            options.locationcolor = '#000000';

            return options;
        }

        if (!textColor) {
            textColor = CoreColors.isWhiteContrastingBetter(bgColor) ? '#ffffff' : '#000000';
        }

        options.toolbarcolor = bgColor;
        options.closebuttoncolor = textColor;
        options.navigationbuttoncolor = textColor;
        options.locationcolor = bgColor;
        options.locationtextcolor = textColor;

        return options;
    }

}

/**
 * Options for opening in InAppBrowser.
 */
export type CoreOpenerOpenInAppBrowserOptions = InAppBrowserOptions & {
    originalUrl?: string; // Original URL to open (in case the URL was treated, e.g. to add a token or an auto-login).
};

/**
 * Options for opening a file.
 */
export type CoreOpenerOpenFileOptions = {
    iOSOpenFileAction?: OpenFileAction; // Action to do when opening a file.
};

/**
 * Options for opening in browser.
 */
export type CoreOpenerOpenInBrowserOptions = {
    showBrowserWarning?: boolean; // Whether to display a warning before opening in browser. Defaults to true.
    originalUrl?: string; // Original URL to open (in case the URL was treated, e.g. to add a token or an auto-login).
};

/**
 * Possible default picker actions.
 */
export enum OpenFileAction {
    OPEN = 'open',
    OPEN_WITH = 'open-with',
}
