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
import { InAppBrowser, InAppBrowserObject } from '@awesome-cordova-plugins/in-app-browser/ngx';

/**
 * Emulates the Cordova InAppBrowser plugin in desktop apps.
 */
@Injectable()
export class InAppBrowserMock extends InAppBrowser {

    /**
     * Opens a URL in a new InAppBrowser instance, the current browser instance, or the system browser.
     *
     * @param url The URL to load.
     * @param target The target in which to load the URL, an optional parameter that defaults to _self.
     * @param options Options for the InAppBrowser.
     * @returns The new instance.
     */
    create(url: string, target?: string, options: string = 'location=yes'): InAppBrowserObject {
        if (options && typeof options !== 'string') {
            // Convert to string.
            options = Object.keys(options).map((key) => key + '=' + options[key]).join(',');
        }

        return super.create(url, target, options);
    }

}
