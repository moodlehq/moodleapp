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

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { InAppBrowser as CapgoInAppBrowser, OpenWebViewOptions, ToolBarType } from '@capgo/capacitor-inappbrowser';
import { CoreErrorWithOptions } from '@classes/errors/errorwithoptions';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreFilepool } from '@services/filepool';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreMimetype } from '@static/mimetype';
import { Translate, FileOpener, NgZone, makeSingleton } from '@singletons';
import { CoreConstants, CoreConfigSettingKey } from '../constants';
import { CoreFile } from '@services/file';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreUrl } from '@static/url';
import { CoreLogger } from '@static/logger';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@static/events';
import { CoreColors } from '@static/colors';
import { CorePrompts } from '@services/overlays/prompts';
import { CoreNativeCapacitorFileOpenerErrorCode } from '@features/native/constants';
import { CoreViewer } from '@features/viewer/services/viewer';
import { FileOpenerOptions } from '@capacitor-community/file-opener';
import { CoreIntentLauncher } from '@services/native/intent-launcher';
import { CorePromisedValue } from '@classes/promised-value';
import { PluginListenerHandle } from '@capacitor/core';
import { CoreCustomURLSchemes } from './urlschemes';

/**
 * Service with helper functions to handle opening files and URLs.
 */
@Injectable({ providedIn: 'root' })
export class CoreOpenerService {

    protected logger = CoreLogger.getInstance('CoreOpenerService');
    protected iabInstance?: CoreInAppBrowserInstance;

    /**
     * Show a confirm before opening a link in browser, unless the user previously marked to not show again.
     *
     * @param url URL to open.
     */
    protected async confirmOpenBrowserIfNeeded(url: string): Promise<void> {
        if (!CoreUrl.isHttpURL(url)) {
            // Only ask confirm for http(s), other cases usually launch external apps.
            return;
        }

        // Check if the user decided not to see the warning.
        const dontShowWarning = await CoreConfig.get(CoreConfigSettingKey.DONT_SHOW_EXTERNAL_LINK_WARN, 0);
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
            CoreConfig.set(CoreConfigSettingKey.DONT_SHOW_EXTERNAL_LINK_WARN, 1);
        }
    }

    /**
     * Open a file using platform specific method.
     *
     * @param path The local path of the file to be open.
     * @param options Options.
     */
    async openFile(path: string, options: CoreOpenerOpenFileOptions = {}): Promise<void> {
        // Convert the path to a native path if needed.
        path = CoreFile.unconvertFileSrc(path);

        const extension = CoreMimetype.getFileExtension(path);
        const mimetype = extension && CoreMimetype.getMimeType(extension);

        if (mimetype === 'text/html' && CorePlatform.isAndroid()) {
            // Open HTML local files in a fullscreen modal iframe.
            // This used to open an InAppBrowser, but with AndroidInsecureFileModeEnabled=false it's no longer allowed.
            const title = path.substring(path.lastIndexOf('/') + 1) || path;

            await CoreViewer.openIframeViewerModal(title, path, false);

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
                            handler: () => this.openInBrowser(url),
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
                const openOptions: FileOpenerOptions = {
                    filePath: path,
                    contentType: mimetype,
                    openWithDefault: !this.shouldOpenWithDialog(options),
                };
                await FileOpener.open(openOptions);
            } catch (error) {
                if (
                    hasFailed ||
                    error.code !== CoreNativeCapacitorFileOpenerErrorCode.FILE_NOT_FOUND
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
                if (!extension || !error || error.code !== CoreNativeCapacitorFileOpenerErrorCode.FILE_NOT_SUPPORTED) {
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
            this.logger.error(`Error opening file ${path} with mimetype ${mimetype}`);
            this.logger.error('Error: ', JSON.stringify(error));

            if (!extension || extension.includes('/') || extension.includes('\\')) {
                // Extension not found.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            if (error.code === CoreNativeCapacitorFileOpenerErrorCode.FILE_NOT_SUPPORTED) {
                throw new Error(Translate.instant('core.erroropenfilenoapp'));
            }
            throw new Error(error.message);
        }
    }

    /**
     * Open a URL using a browser.
     * Do not use for files, refer to {@link CoreOpenerService.openFile}.
     *
     * @param url The URL to open.
     * @param options Options.
     */
    async openInBrowser(url: string, options: CoreOpenerOpenInBrowserOptions = {}): Promise<void> {
        const originaUrl = CoreUrl.unfixPluginfileURL(options.originalUrl ?? url);
        if (options.showBrowserWarning || options.showBrowserWarning === undefined) {
            try {
                await this.confirmOpenBrowserIfNeeded(originaUrl);
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
    async openOnlineFile(url: string): Promise<void> {
        if (CorePlatform.isAndroid()) {
            // In Android we need the mimetype to open it.
            const mimetype = await CorePromiseUtils.ignoreErrors(CoreMimetype.getMimeTypeFromUrl(url));

            if (!mimetype) {
                // Couldn't retrieve mimetype. Return error.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            const options = {
                data: url,
                type: mimetype,
            };

            try {
                await CoreIntentLauncher.startViewActivity(options);

                CoreAnalytics.logEvent({
                    type: CoreAnalyticsEventType.OPEN_LINK,
                    link: CoreUrl.unfixPluginfileURL(url),
                });

                return;
            } catch (error) {
                this.logger.error(`Error opening online file ${url} with mimetype ${mimetype}`);
                this.logger.error('Error: ', JSON.stringify(error));

                throw new Error(Translate.instant('core.erroropenfilenoapp'));
            }
        }

        // In the rest of platforms we need to open them in InAppBrowser.
        await this.openInAppAsync(url);
    }

    /**
     * Given some options, check if a file should be opened with showOpenWithDialog.
     *
     * @param options Options.
     * @returns Boolean.
     */
    shouldOpenWithDialog(options: CoreOpenerOpenFileOptions = {}): boolean {
        const openFileAction = options.iOSOpenFileAction ?? CoreConstants.CONFIG.iOSDefaultOpenFileAction;

        return CorePlatform.isIOS() && openFileAction === OpenFileAction.OPEN_WITH;
    }

    /**
     * Get the web view options for opening a URL in InAppBrowser.
     *
     * @param url The URL to open.
     * @param options Options passed to InAppBrowser.
     * @returns The web view options.
     */
    protected getWebViewOptions(url: string, options?: CoreOpenerOpenInAppBrowserOptions): OpenWebViewOptions {
        const { originalUrl, ...otherOptions } = options || {};

        const openWebViewOptions = this.mapCordovaInAppBrowserOptions({ ...otherOptions });

        openWebViewOptions.toolbarColor = this.calculateInAppBrowserToolbarColor(openWebViewOptions?.toolbarColor);

        if (CoreSites.getCurrentSite()?.containsUrl(url)) {
            url = CoreUrl.addParamsToUrl(url, { lang: CoreLang.getCurrentLanguageSync(CoreLangFormat.LMS) }, {
                checkAutoLoginUrl: originalUrl !== url,
            });
        }

        openWebViewOptions.enableZoom = openWebViewOptions.enableZoom ?? true;

        const debug = CoreConstants.BUILD.isDevelopment;

        return {
            ...openWebViewOptions,
            toolbarType: ToolBarType.NAVIGATION,
            url,
            title: '', // Empty title will show domain of the visited webpage on Android and empty on iOS by default.
            isInspectable: debug, // Enable web view inspection on iOs in development mode.
            customUserAgent: navigator.userAgent,
            enableReloadGesture: true,
        };
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to CoreOpenerService.openFile.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window bridge instance.
     */
    async openInAppAsync(url: string, options?: CoreOpenerOpenInAppBrowserOptions): Promise<CoreInAppBrowserInstance> {
        const { originalUrl } = options || {};

        const wvOptions = this.getWebViewOptions(url, options);

        const data = await CapgoInAppBrowser.openWebView(wvOptions);

        const iabInstance = new CoreInAppBrowserInstance(url, data.id);

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: CoreUrl.unfixPluginfileURL(originalUrl ?? url),
        });

        this.iabInstance = iabInstance;

        return iabInstance;
    }

    /**
     * Open a URL using InAppBrowser. Synchronously.
     * Do not use for files, refer to CoreOpenerService.openFile.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window bridge instance.
     * @deprecated since 6.0. In the future this function will be async.
     */
    openInApp(url: string, options?: CoreOpenerOpenInAppBrowserOptions): CoreInAppBrowserInstance {
        const { originalUrl } = options || {};

        const wvOptions = this.getWebViewOptions(url, options);

        const iabInstance = new CoreInAppBrowserInstance(url);

        CapgoInAppBrowser.openWebView(wvOptions).then((data) => {
            iabInstance.setId(data.id);

            return;
        }).finally(() => {
            // Nothing to do here.
        });

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: CoreUrl.unfixPluginfileURL(originalUrl ?? url),
        });

        this.iabInstance = iabInstance;

        return iabInstance;
    }

    /**
     * Calculate the appropriate toolbar color for the InAppBrowser on Android.
     *
     * @param toolbarColor Original color.
     * @returns Calculated toolbar color.
     */
    protected calculateInAppBrowserToolbarColor(toolbarColor?: string): string | undefined {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        if (toolbarColor) {
            return toolbarColor;
        }

        if (CoreConstants.CONFIG.iabToolbarColors === 'auto') {
            return CoreColors.getToolbarBackgroundColor();
        }

        if (CoreConstants.CONFIG.iabToolbarColors && typeof CoreConstants.CONFIG.iabToolbarColors === 'object') {
            return CoreConstants.CONFIG.iabToolbarColors.background;
        }
    }

    /**
     * Maps Cordova-style InAppBrowser options to the format expected by the underlying browser implementation.
     *
     * @param options InAppBrowser options to translate.
     * @returns Translated InAppBrowser options.
     */
    protected mapCordovaInAppBrowserOptions(options: CoreOpenerOpenInAppBrowserOptions): CoreInAppBrowserOptions {
        const mappedOptions: CoreInAppBrowserOptions = { };

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (options.clearsessioncache === 'yes' && options.clearCookiesOnOpen === undefined) {
            mappedOptions.clearCookiesOnOpen = true;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        } else if (options.clearsessioncache === 'no' && options.clearCookiesOnOpen === undefined) {
            mappedOptions.clearCookiesOnOpen = false;
        } else {
            mappedOptions.clearCookiesOnOpen = options.clearCookiesOnOpen;
        }

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        mappedOptions.toolbarColor = options.toolbarColor ?? options.toolbarcolor;

        return mappedOptions;
    }

    /**
     * Close the InAppBrowser window.
     */
    async closeInAppBrowser(): Promise<void> {
        if (this.iabInstance) {
            await this.iabInstance.close();

            delete this.iabInstance;
        } else {
            // Will close the currently open InAppBrowser instance via Capgo.
            await CapgoInAppBrowser.close();
        }
    }

    /**
     * Get inapp browser instance (if any).
     *
     * @returns IAB bridge instance, undefined if not open.
     * @deprecated since 6.0. Use the InAppBrowserInstance returned by openInAppAsync  instead.
     */
    getInAppBrowserInstance(): CoreInAppBrowserInstance | undefined  {
        return this.iabInstance;
    }

    /**
     * Check if inapp browser is open.
     *
     * @returns Whether it's open.
     * @deprecated since 6.0. Use the InAppBrowserInstance returned by openInApp instead.
     */
    isInAppBrowserOpen(): boolean {
        return !!this.iabInstance;
    }

}
export const CoreOpener = makeSingleton(CoreOpenerService);

/**
 * InAppBrowser instance bridge.
 * Adapts InAppBrowserObject to expose only the methods actually used in the app.
 * This facilitates future migration to alternative browser implementations.
 *
 * Supports both Cordova InAppBrowserObject and Capgo instances (identified by ID).
 */
export class CoreInAppBrowserInstance {

    protected idPromise = new CorePromisedValue<string>();
    protected subscriptions: PluginListenerHandle[] = [];
    protected id?: string;

    constructor(protected url: string, id?: string) {
        if (id) {
            this.setId(id);
        }

        this.onUrlChange((data) => {
            this.url = data.url;
        });

        this.customAppSchemeIntercepted((eventData) => {
            if (CoreCustomURLSchemes.isCustomURL(eventData.url)) {
                // Close the browser if our app is handling the link.
                this.close();

                return;
            }
        });

        this.onClose(async () => {
            // Add a small delay to allow pending onClosed handlers to be executed before removing subscriptions.
            await new Promise(resolve => setTimeout(resolve, 100));

            // Remove all subscriptions for this instance.
            await Promise.all(this.subscriptions.map((handle) => handle.remove()));
        });
    }

    /**
     * Register a listener for an InAppBrowser event.
     *
     * @param event Event name: 'loadstart', 'loadstop', 'message', 'exit' etc.
     * @returns Observable that emits when the event occurs. Unsubscribe to stop listening.
     * @deprecated since 6.0. Use onLoaded, onMessage or onClose instead.
     */
    on(event: 'loadstart' | 'loadstop' | 'message' | 'exit'): Observable<unknown> {
        const subject = new Subject<unknown>();

        if (event === 'loadstart') {
            // Load start event mapped to URL change to have the url available immediately.
            this.onUrlChange(() => {
                subject.next({ url: this.url });
            });
        } else if (event === 'loadstop') {
            this.onLoaded(() => {
                subject.next({ url: this.url });
            });
        } else if (event === 'message') {
            this.onMessage((data) => {
                subject.next(data);
            });
        } else if (event === 'exit') {
            this.onClose(() => {
                subject.next({});
            });
        }

        return subject.asObservable();
    }

    /**
     * Register a listener for URL change events.
     *
     * @param listenerFunc Function to call when the URL changes.
     */
    protected async onUrlChange(listenerFunc: (event: { url: string }) => void): Promise<void> {
        const handle = await CapgoInAppBrowser.addListener('urlChangeEvent', (eventData) => {
            if (eventData.id === this.id) {
                listenerFunc({ url: eventData.url });
            }
        });
        this.subscriptions.push(handle);
    }

    /**
     * Register a listener for custom app scheme interception events.
     *
     * @param listenerFunc Function to call when a custom app scheme is intercepted.
     */
    async customAppSchemeIntercepted(listenerFunc: (event: { url: string }) => void): Promise<void> {
        const handle = await CapgoInAppBrowser.addListener('customSchemeIntercepted', (eventData) => {
            if (eventData.id === this.id && eventData.opened) {
                listenerFunc({
                    url: eventData.url,
                });
            }
        });
        this.subscriptions.push(handle);
    }

    /**
     * Register a listener for close events.
     *
     * @param listenerFunc Function to call when the browser is closed.
     */
    async onClose(listenerFunc: () => void): Promise<void> {
        const handle = await CapgoInAppBrowser.addListener('closeEvent', (eventData) => {
            if (eventData.id === this.id) {
                listenerFunc();
            }
        });
        this.subscriptions.push(handle);
    }

    /**
     * Wait until the browser is closed.
     *
     * @returns Promise resolved when the browser is closed.
     */
    async waitClosed(): Promise<void> {
        return new Promise((resolve) => {
            this.onClose(() => {
                resolve();
            });
        });
    }

    /**
     * Register a listener for load stop events.
     *
     * @param listenerFunc Function to call when the page finishes loading.
     * @returns Promise resolved with the plugin listener handle.
     */
    async onLoaded(listenerFunc: (event: { url: string }) => void): Promise<PluginListenerHandle> {
        const handle = await CapgoInAppBrowser.addListener('browserPageLoaded', (eventData) => {
            if (eventData.id === this.id) {
                listenerFunc({ url: this.url });
            }
        });
        this.subscriptions.push(handle);

        return handle;
    }

    /**
     * Register a listener for message events from the webview.
     *
     * @param listenerFunc Function to call when a message is received.
     * @returns Promise resolved with the plugin listener handle.
     */
    async onMessage(listenerFunc: (event: {
        data: Record<string, any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
        url: string;
    }) => void): Promise<PluginListenerHandle> {
        const handle = await CapgoInAppBrowser.addListener('messageFromWebview', (eventData) => {
            if (eventData.id === this.id) {
                delete(eventData.id);
                const data = eventData.detail ?
                    eventData.detail :
                    eventData.rawMessage ? JSON.parse(eventData.rawMessage) : '';

                listenerFunc({ data, url: this.url });
            }
        });
        this.subscriptions.push(handle);

        return handle;
    }

    /**
     * Set the Capgo InAppBrowser instance ID.
     *
     * @param id Capgo InAppBrowser instance ID.
     */
    setId(id: string): void {
        // Only set once.
        if (this.id) {
            return;
        }

        this.id = id;
        this.idPromise.resolve(id);

        this.setLegacyEventHandlers();
    }

    /**
     * Set up legacy event handlers for the InAppBrowser instance.
     * This includes load start, load stop, message, and close events.
     * This events are deprecated since 6.0 and will be removed in future versions.
     */
    protected setLegacyEventHandlers(): void {
        this.onUrlChange((event) => {
            NgZone.run(() => {
                const e = new Event('loadstart');
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                CoreEvents.trigger(CoreEvents.IAB_LOAD_START, {
                    ...event,
                    ...e,
                });
            });
        });

        this.onClose(() => {
            NgZone.run(() => {
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                CoreEvents.trigger(CoreEvents.IAB_EXIT);
            });
        });

        this.onLoaded((event) => {
            NgZone.run(() => {
                const e = new Event('loadstop');
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                CoreEvents.trigger(CoreEvents.IAB_LOAD_STOP, {
                    ...event,
                    ...e,
                });
            });
        });

        this.onMessage((event) => {
            NgZone.run(() => {
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                CoreEvents.trigger(CoreEvents.IAB_MESSAGE, event.data);
            });
        });
    }

    /**
     * Execute JavaScript code in the InAppBrowser context.
     *
     * @param script Script to execute: { code?: string; file?: string } or a string containing JavaScript code.
     * @returns Promise resolving when the script has been executed.
     */
    async executeScript(script: string): Promise<void>;
    /**
     * @param script Script to execute: { code?: string; file?: string }
     * @param script.code JavaScript code to execute.
     * @param script.file Path to a JavaScript file to execute.
     *
     * @deprecated since 6.0. File-based scripts are not supported. Use code directly instead.
     */
    async executeScript(script: { code?: string; file?: string }): Promise<void>;
    async executeScript(script: string | { code?: string; file?: string }): Promise<void> {
        const code = typeof script === 'string' ? script : script.code;

        // For Capgo, only code is supported (not file paths)
        if (code) {
            const id = await this.idPromise;

            await CapgoInAppBrowser.executeScript({ id, code });

            return;
        }

        if (script && typeof script !== 'string' && script.file) {
            return Promise.reject(new Error('InAppBrowser does not support file-based scripts'));
        }
    }

    /**
     * Execute JavaScript code once the InAppBrowser has finished loading.
     *
     * @param code JavaScript code to execute once the InAppBrowser has loaded.
     */
    async executeScriptOnLoad(code: string): Promise<void> {
        // Wait until the browser is loaded before executing the script.
        const loadPromise = new CorePromisedValue<void>();

        const subscription = await this.onLoaded(async () => {
            loadPromise.resolve();

            subscription.remove();
        });

        await loadPromise;

        await this.executeScript(code);
    }

    /**
     * Close the InAppBrowser window.
     */
    async close(): Promise<void> {
        const id = await this.idPromise;

        await CapgoInAppBrowser.close({ id });
    }

}

/**
 * Subset of full Cordova InAppBrowser options, containing only those we actually support in the app.
 */
export type CoreInAppBrowserOptionsLegacy = {
    /**
     * Set to yes to have the session cookie cache cleared before the new window is opened.
     * For WKWebView, requires iOS 11+ on target device.
     *
     * @deprecated since 6.0. Use `clearCookiesOnOpen` instead.
     */
    clearsessioncache?: 'yes' | 'no';
    /**
     * Set the toolbar background color (hex string, e.g., #00ff00).
     *
     * @deprecated since 6.0. Use `toolbarColor` instead. (only Android).
     */
    toolbarcolor?: string;
};

/**
 * Core InAppBrowser options used in the Moodle App.
 */
type CoreInAppBrowserOptions = {

    /**
     * Clear all cookies from the InAppBrowser data store before the first navigation of this webview.
     *
     * Cordova `clearcache: 'yes'` parity. On Android, uses process-global `CookieManager.removeAllCookies()`
     * and starts the first navigation after the wipe callback (does not block the UI thread). On iOS, clears
     * cookies from the webview's `WKWebsiteDataStore` (isolated plugin store by default). On Web this is a no-op.
     *
     * @default false
     */
    clearCookiesOnOpen?: boolean;

    /**
     * enableZoom: enables pinch-to-zoom gestures in the Android WebView.
     * When true, built-in zoom controls are enabled and the zoom buttons are hidden.
     * **Android only** — ignored on iOS where zoom is enabled by default.
     *
     * @default true
     * @example
     * enableZoom: true
     */
    enableZoom?: boolean;

    /**
     * Toolbar background color in hex format (e.g., "#1A1A2E").
     * Applied to both light and dark color schemes.
     * Also sets the navigation bar color to match.
     * **Android only** — ignored on iOS.
     */
    toolbarColor?: string;
};

/**
 * Options for opening in InAppBrowser.
 */
export type CoreOpenerOpenInAppBrowserOptions = CoreInAppBrowserOptions & CoreInAppBrowserOptionsLegacy & {
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
