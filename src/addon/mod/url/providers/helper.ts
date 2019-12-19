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
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Service that provides helper functions for urls.
 */
@Injectable()
export class AddonModUrlHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
        private contentLinksHelper: CoreContentLinksHelperProvider) { }

    /**
     * Opens a URL.
     *
     * @param url The URL to go to.
     */
    open(url: string): void {
        const modal = this.domUtils.showModalLoading();
        this.contentLinksHelper.handleLink(url, undefined, undefined, true, true).then((treated) => {
            if (!treated) {
                return this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
            }
        }).finally(() => {
            modal.dismiss();
        });
    }
}
