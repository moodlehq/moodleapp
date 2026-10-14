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

import { App } from '@capacitor/app';
import { CorePlatform } from '@services/platform';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { NgZone } from '@singletons';
import { CoreUrl } from '@static/url';

/**
 * Asynchronous function to handle custom URLs when the app is launched.
 */
export default async function(): Promise<void> {
    // Handle app launched with a certain URL (custom URL scheme).
    const handleOpenURL = (url: string): void => {
        // Execute the callback in the Angular zone, so change detection doesn't stop working.
        NgZone.run(() => CoreCustomURLSchemes.handleLaunchURL(url));
    };

    await CorePlatform.ready();

    if (CorePlatform.isMobile()) {
        await App.addListener('appUrlOpen', ({ url }) => {
            handleOpenURL(url);
        });
    } else {
        // Allow launching the app with a deep link in web app.
        const searchParams = new URLSearchParams(window.location.search);

        const url = searchParams.get('webAppDeepLink');
        if (url) {
            handleOpenURL(CoreUrl.decodeURIComponent(url));
        }

        // Assign the handleOpenURL function to the global window object for web apps.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any> window).handleOpenURL = handleOpenURL;
    }
}
