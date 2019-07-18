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
import { CoreSitePluginsPluginContentComponent } from '../../components/plugin-content/plugin-content';

/**
 * Page to render a site plugin page.
 */
@IonicPage({ segment: 'core-site-plugins-plugin-page' })
@Component({
    selector: 'page-core-site-plugins-plugin',
    templateUrl: 'plugin-page.html',
})
export class CoreSitePluginsPluginPage {
    @ViewChild(CoreSitePluginsPluginContentComponent) content: CoreSitePluginsPluginContentComponent;

    title: string; // Page title.

    component: string;
    method: string;
    args: any;
    initResult: any;
    jsData: any; // JS variables to pass to the plugin so they can be used in the template or JS.
    preSets: any; // The preSets for the WS call.

    constructor(params: NavParams) {
        this.title = params.get('title');
        this.component = params.get('component');
        this.method = params.get('method');
        this.args = params.get('args');
        this.initResult = params.get('initResult');
        this.jsData = params.get('jsData');
        this.preSets = params.get('preSets');
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.content.refreshContent(false).finally(() => {
            refresher.complete();
        });
    }

    /**
     * The page is about to enter and become the active page.
     */
    ionViewWillEnter(): void {
        this.content.callComponentFunction('ionViewWillEnter');
    }

    /**
     * The page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page.
     */
    ionViewDidEnter(): void {
        this.content.callComponentFunction('ionViewDidEnter');
    }

    /**
     * The page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.content.callComponentFunction('ionViewWillLeave');
    }

    /**
     * The page has finished leaving and is no longer the active page.
     */
    ionViewDidLeave(): void {
        this.content.callComponentFunction('ionViewDidLeave');
    }

    /**
     * The page is about to be destroyed and have its elements removed.
     */
    ionViewWillUnload(): void {
        this.content.callComponentFunction('ionViewWillUnload');
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        return this.content.callComponentFunction('ionViewCanLeave');
    }
}
