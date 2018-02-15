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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreSiteAddonsProvider } from '../../providers/siteaddons';
import { CoreSiteAddonsAddonContentComponent } from '../../components/addon-content/addon-content';

/**
 * Page to render a site addon page.
 */
@IonicPage({ segment: 'core-site-addons-addon-page' })
@Component({
    selector: 'page-core-site-addons-addon',
    templateUrl: 'addon-page.html',
})
export class CoreSiteAddonsAddonPage {
    @ViewChild(CoreSiteAddonsAddonContentComponent) content: CoreSiteAddonsAddonContentComponent;

    title: string; // Page title.

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
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.content.refreshData().finally(() => {
            refresher.complete();
        });
    }
}
