// (C) Copyright 2015 Martin Dougiamas
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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Page to display a URL in an iframe.
 */
@IonicPage({ segment: 'core-viewer-iframe' })
@Component({
    selector: 'page-core-viewer-iframe',
    templateUrl: 'iframe.html',
})
export class CoreViewerIframePage {
    title: string; // Page title.
    url: string; // Iframe URL.

    protected autoLogin; // Whether the URL should be open with auto-login. Accepts the following values:
                         //   "yes" -> Always auto-login.
                         //   "no" -> Never auto-login.
                         //   "check" -> Auto-login only if it points to the current site. Default value.

    constructor(params: NavParams, sitesProvider: CoreSitesProvider) {
        this.title = params.get('title');
        this.autoLogin = params.get('autoLogin') || 'check';

        const url = params.get('url'),
            currentSite = sitesProvider.getCurrentSite();

        if (currentSite && (this.autoLogin == 'yes' || (this.autoLogin == 'check' && currentSite.containsUrl(url)))) {
            // Format the URL to add auto-login.
            currentSite.getAutoLoginUrl(url, false).then((url) => {
                this.url = url;
            });
        } else {
            this.url = url;
        }
    }
}
