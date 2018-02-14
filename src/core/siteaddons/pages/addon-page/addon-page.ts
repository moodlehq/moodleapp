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
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreSiteAddonsProvider } from '../../providers/siteaddons';

/**
 * Page to render a site addon page.
 */
@IonicPage({ segment: 'core-site-addons-addon-page' })
@Component({
    selector: 'page-core-site-addons-addon',
    templateUrl: 'addon-page.html',
})
export class CoreSiteAddonsAddonPage {
    title: string; // Page title.
    content: string; // Page content.
    dataLoaded: boolean;

    protected component: string;
    protected method: string;
    protected args: any;

    constructor(params: NavParams, protected domUtils: CoreDomUtilsProvider, protected siteAddonsProvider: CoreSiteAddonsProvider) {
        this.title = params.get('title');
        this.component = params.get('component');
        this.method = params.get('method');
        this.args = params.get('args');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Fetches the content of the page.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchContent(): Promise<any> {
        return this.siteAddonsProvider.getContent(this.component, this.method, this.args).then((result) => {
            this.content = result.html;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.siteAddonsProvider.invalidatePageContent(this.component, this.method, this.args).finally(() => {
            this.fetchContent().finally(() => {
                refresher.complete();
            });
        });
    }
}
