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

import { registerPlugin } from '@capacitor/core';

const BrowserLauncherPlugin = registerPlugin<BrowserLauncherNativePlugin>('MoodleAppBrowserLauncher');

/**
 * Opens URLs in the system default browser.
 */
export class BrowserLauncher {

    /**
     * Open a URL in the system default browser.
     * On web, falls back to window.open.
     *
     * @param url The URL to open.
     */
    async openInExternalBrowser(url: string): Promise<void> {
        await BrowserLauncherPlugin.openInExternalBrowser({ url });
    }

}

type BrowserLauncherNativePlugin = {
    openInExternalBrowser(options: { url: string }): Promise<void>;
};
