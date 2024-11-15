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
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CorePlatform } from '@services/platform';
import { InAppBrowser, NgZone } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreUrl } from './url';
import { CoreConstants } from '../constants';
import { CoreColors } from './colors';

/**
 * Singleton with helper functions for InAppBrowser.
 */
export class CoreInAppBrowser {

    private static iabInstance?: InAppBrowserObject;

    /**
     * Close the InAppBrowser window.
     */
    static closeInAppBrowser(): void {
        if (!CoreInAppBrowser.iabInstance) {
            return;
        }

        CoreInAppBrowser.iabInstance.close();
    }

    /**
     * Get inapp browser instance (if any).
     *
     * @returns IAB instance, undefined if not open.
     */
    static getInAppBrowserInstance(): InAppBrowserObject | undefined  {
        return CoreInAppBrowser.iabInstance;
    }

    /**
     * Check if inapp browser is open.
     *
     * @returns Whether it's open.
     */
    static isInAppBrowserOpen(): boolean {
        return !!CoreInAppBrowser.iabInstance;
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to {@link CoreUtilsProvider.openFile}.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window.
     */
    static open(url: string, options?: CoreInAppBrowserOpenOptions): InAppBrowserObject {
        options = options || {};
        options.usewkwebview = 'yes'; // Force WKWebView in iOS.
        options.enableViewPortScale = options.enableViewPortScale ?? 'yes'; // Enable zoom on iOS by default.
        options.allowInlineMediaPlayback = options.allowInlineMediaPlayback ?? 'yes'; // Allow playing inline videos in iOS.

        if (!options.location && CorePlatform.isIOS() && url.indexOf('file://') === 0) {
            // The URL uses file protocol, don't show it on iOS.
            // In Android we keep it because otherwise we lose the whole toolbar.
            options.location = 'no';
        }

        CoreInAppBrowser.setInAppBrowserToolbarColors(options);

        CoreInAppBrowser.iabInstance = InAppBrowser.create(url, '_blank', options);

        if (CorePlatform.isMobile()) {
            const loadStartUrls: string[] = [];

            const loadStartSubscription = CoreInAppBrowser.iabInstance.on('loadstart').subscribe((event) => {
                NgZone.run(() => {
                    // Store the last loaded URLs (max 10).
                    loadStartUrls.push(event.url);
                    if (loadStartUrls.length > 10) {
                        loadStartUrls.shift();
                    }

                    CoreEvents.trigger(CoreEvents.IAB_LOAD_START, event);
                });
            });

            const loadStopSubscription = CoreInAppBrowser.iabInstance.on('loadstop').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_LOAD_STOP, event);
                });
            });

            const messageSubscription = CoreInAppBrowser.iabInstance.on('message').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_MESSAGE, event.data);
                });
            });

            const exitSubscription = CoreInAppBrowser.iabInstance.on('exit').subscribe((event) => {
                NgZone.run(() => {
                    loadStartSubscription.unsubscribe();
                    loadStopSubscription.unsubscribe();
                    messageSubscription.unsubscribe();
                    exitSubscription.unsubscribe();

                    CoreInAppBrowser.iabInstance = undefined;
                    CoreEvents.trigger(CoreEvents.IAB_EXIT, event);
                });
            });
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: CoreUrl.unfixPluginfileURL(options.originalUrl ?? url),
        });

        return CoreInAppBrowser.iabInstance;
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
export type CoreInAppBrowserOpenOptions = InAppBrowserOptions & {
    originalUrl?: string; // Original URL to open (in case the URL was treated, e.g. to add a token or an auto-login).
};
