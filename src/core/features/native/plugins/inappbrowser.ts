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
import { CoreInAppBrowserOptions, CoreInAppBrowserInstance, CoreOpener } from '@services/opener';

/**
 * Retains the legacy InAppBrowser service.
 *
 * This is a compatibility wrapper that delegates.
 *
 * @deprecated since 6.0. Use CoreOpener for InAppBrowser functionality.
 */
@Injectable({ providedIn: 'root' })
export class InAppBrowser {

    /**
     * Open a URL in the InAppBrowser.
     *
     * Redirects to CoreOpener.openInApp to centralize browser window management.
     *
     * @param url The URL to load.
     * @param target Not used anymore.
     * @param options Options for the InAppBrowser. Can be a string in comma-separated format (key1=value1,key2=value2)
     *  or a JSON string, or an options object.
     * @returns CoreInAppBrowserInstance bridge.
     * @deprecated since 6.0. Use CoreOpener.openInApp instead.
     */
    create(
        url: string,
        target?: string,
        options?: string | CoreInAppBrowserOptions,
    ): CoreInAppBrowserInstance {
        const parsedOptions = parseInAppBrowserOptions(options);

        return CoreOpener.openInApp(url, parsedOptions);
    }

}

/**
 * Parses InAppBrowser options from string or object format.
 * Handles comma-separated key=value pairs (Cordova format) or JSON string.
 *
 * @param options Options for the InAppBrowser. Can be a string in comma-separated format (key1=value1,key2=value2)
 *  or a JSON string, or an options object.
 * @returns Parsed InAppBrowser options as an object.
 */
function parseInAppBrowserOptions(options?: string | CoreInAppBrowserOptions): CoreInAppBrowserOptions {
    if (!options) {
        return {};
    }

    if (typeof options === 'object') {
        return options;
    }

    // Parse string format: "key1=value1,key2=value2" or JSON string
    const parsed: CoreInAppBrowserOptions = {};

    try {
        // Try JSON parsing first
        const jsonParsed = JSON.parse(options);
        if (typeof jsonParsed === 'object') {
            return jsonParsed;
        }
    } catch {
        // Not JSON, continue to comma-separated parsing
    }

    // Parse comma-separated key=value pairs (Cordova format)
    const pairs = options.split(',');
    pairs.forEach(pair => {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (key && value) {
            (parsed as any)[key] = value;
        }
    });

    return parsed;
}
