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

import { CoreCustomURLSchemes } from '@services/urlschemes';
import { NgZone } from '@singletons';
import { CoreEvents } from '@singletons/events';

export default async function(): Promise<void> {
    const lastUrls: Record<string, number> = {};

    // Handle app launched with a certain URL (custom URL scheme).
    (<any> window).handleOpenURL = (url: string): void => {
        // Execute the callback in the Angular zone, so change detection doesn't stop working.
        NgZone.run(() => {
            // First check that the URL hasn't been treated a few seconds ago. Sometimes this function is called more than once.
            if (lastUrls[url] && Date.now() - lastUrls[url] < 3000) {
                // Function called more than once, stop.
                return;
            }

            if (!CoreCustomURLSchemes.isCustomURL(url)) {
                // Not a custom URL, ignore.
                return;
            }

            lastUrls[url] = Date.now();

            CoreEvents.trigger(CoreEvents.APP_LAUNCHED_URL, { url });
            CoreCustomURLSchemes.handleCustomURL(url).catch((error) => {
                CoreCustomURLSchemes.treatHandleCustomURLError(error);
            });
        });
    };
}
