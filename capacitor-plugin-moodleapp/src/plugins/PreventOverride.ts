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

import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

const PreventOverridePlugin = registerPlugin<PreventOverrideNativePlugin>('MoodleAppPreventOverride');

/**
 * Handles navigation attempts that would leave the app's WebView.
 * This includes links in WebView without core-link, or _blank and _system links opened from online iframes.
 */
export class PreventOverride {

    /**
     * Listen for intercepted URLs.
     *
     * @param listener Callback receiving the intercepted URL.
     * @returns Listener handle.
     */
    addListener(listener: (url: string) => void): Promise<PluginListenerHandle> {
        return PreventOverridePlugin.addListener('overrideUrlLoading', ({ url }) => listener(url));
    }

}

type PreventOverrideNativePlugin = {
    addListener(eventName: 'overrideUrlLoading', listener: (event: { url: string }) => void): Promise<PluginListenerHandle>;
};
