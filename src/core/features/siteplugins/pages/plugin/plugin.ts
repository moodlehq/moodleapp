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

import { Component, OnInit, ViewChild } from '@angular/core';

import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CanLeave } from '@guards/can-leave';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { CoreSitePluginsPluginContentComponent } from '../../components/plugin-content/plugin-content';

/**
 * Page to render a site plugin page.
 */
@Component({
    selector: 'page-core-site-plugins-plugin',
    templateUrl: 'plugin.html',
})
export class CoreSitePluginsPluginPage implements OnInit, CanLeave {

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    title?: string; // Page title.
    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    jsData?: Record<string, unknown>; // JS variables to pass to the plugin so they can be used in the template or JS.
    preSets?: CoreSiteWSPreSets; // The preSets for the WS call.
    ptrEnabled = false;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.title = CoreNavigator.getRouteParam('title');
        this.component = CoreNavigator.getRouteParam('component');
        this.method = CoreNavigator.getRouteParam('method');
        this.args = CoreNavigator.getRouteParam('args');
        this.initResult = CoreNavigator.getRouteParam('initResult');
        this.jsData = CoreNavigator.getRouteParam('jsData');
        this.preSets = CoreNavigator.getRouteParam('preSets');
        this.ptrEnabled = !CoreUtils.isFalseOrZero(CoreNavigator.getRouteBooleanParam('ptrEnabled'));
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: HTMLIonRefresherElement): void {
        this.content?.refreshContent(false).finally(() => {
            refresher.complete();
        });
    }

    /**
     * The page is about to enter and become the active page.
     */
    ionViewWillEnter(): void {
        this.content?.callComponentFunction('ionViewWillEnter');
    }

    /**
     * The page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page.
     */
    ionViewDidEnter(): void {
        this.content?.callComponentFunction('ionViewDidEnter');
    }

    /**
     * The page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.content?.callComponentFunction('ionViewWillLeave');
    }

    /**
     * The page has finished leaving and is no longer the active page.
     */
    ionViewDidLeave(): void {
        this.content?.callComponentFunction('ionViewDidLeave');
    }

    /**
     * The page is about to be destroyed and have its elements removed.
     */
    ionViewWillUnload(): void {
        this.content?.callComponentFunction('ionViewWillUnload');
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (!this.content) {
            return true;
        }

        const result = await this.content.callComponentFunction('canLeave');

        return result === undefined || result === null ? true : !!result;
    }

}
