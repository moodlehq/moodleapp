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

import { Component, OnInit, viewChild } from '@angular/core';

import { CoreSitePluginsPluginContentComponent } from '@features/siteplugins/components/plugin-content/plugin-content';
import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreUtils } from '@singletons/utils';
import { CoreNavigator } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the index of a course option site plugin.
 */
@Component({
    selector: 'core-site-plugins-course-option',
    templateUrl: 'core-siteplugins-course-option.html',
    imports: [
        CoreSharedModule,
        CoreSitePluginsPluginContentComponent,
    ],
})
export default class CoreSitePluginsCourseOptionPage implements OnInit {

    readonly content = viewChild(CoreSitePluginsPluginContentComponent);

    courseId?: number;
    handlerUniqueName?: string;
    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    ptrEnabled = true;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.handlerUniqueName = CoreNavigator.getRouteParam('handlerUniqueName');

        if (!this.handlerUniqueName) {
            return;
        }

        const handler = CoreSitePlugins.getSitePluginHandler(this.handlerUniqueName);
        if (!handler) {
            return;
        }

        this.component = handler.plugin.component;
        this.method = handler.handlerSchema.method;
        this.args = {
            courseid: this.courseId,
        };
        this.initResult = handler.initResult;
        this.ptrEnabled = !('ptrenabled' in handler.handlerSchema) ||
            !CoreUtils.isFalseOrZero(handler.handlerSchema.ptrenabled);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refreshData(refresher: HTMLIonRefresherElement): Promise<void> {
        try {
            await this.content()?.refreshContent(false);
        } finally {
            refresher.complete();
        }
    }

    /**
     * The page is about to enter and become the active page.
     */
    ionViewWillEnter(): void {
        this.content()?.callComponentFunction('ionViewWillEnter');
    }

    /**
     * The page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page.
     */
    ionViewDidEnter(): void {
        this.content()?.callComponentFunction('ionViewDidEnter');
    }

    /**
     * The page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.content()?.callComponentFunction('ionViewWillLeave');
    }

    /**
     * The page has finished leaving and is no longer the active page.
     */
    ionViewDidLeave(): void {
        this.content()?.callComponentFunction('ionViewDidLeave');
    }

    /**
     * The page is about to be destroyed and have its elements removed.
     */
    ionViewWillUnload(): void {
        this.content()?.callComponentFunction('ionViewWillUnload');
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        const content = this.content();
        if (!content) {
            return true;
        }

        const result = await content.callComponentFunction('canLeave');

        return result === undefined || result === null ? true : !!result;
    }

}
