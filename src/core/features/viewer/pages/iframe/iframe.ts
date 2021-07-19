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

import { Component, OnInit } from '@angular/core';
import { CoreNavigator } from '@services/navigator';

import { CoreSites } from '@services/sites';

/**
 * Page to display a URL in an iframe.
 */
@Component({
    selector: 'core-viewer-iframe',
    templateUrl: 'iframe.html',
})
export class CoreViewerIframePage implements OnInit {

    title?: string; // Page title.
    url?: string; // Iframe URL.
    /* Whether the URL should be open with auto-login. Accepts the following values:
        "yes" -> Always auto-login.
        "no" -> Never auto-login.
        "check" -> Auto-login only if it points to the current site. Default value. */
    autoLogin?: string;
    finalUrl?: string;

    async ngOnInit(): Promise<void> {
        this.title = CoreNavigator.getRouteParam('title');
        this.url = CoreNavigator.getRouteParam('url');
        this.autoLogin = CoreNavigator.getRouteParam('autoLogin') || 'check';

        if (!this.url) {
            return;
        }

        const currentSite = CoreSites.getCurrentSite();

        if (currentSite && (this.autoLogin == 'yes' || (this.autoLogin == 'check' && currentSite.containsUrl(this.url)))) {
            // Format the URL to add auto-login.
            this.finalUrl = await currentSite.getAutoLoginUrl(this.url, false);
        } else {
            this.finalUrl = this.url;
        }
    }

}
