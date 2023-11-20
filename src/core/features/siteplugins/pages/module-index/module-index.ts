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

import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CanLeave } from '@guards/can-leave';
import { CoreNavigator } from '@services/navigator';
import { CoreSitePluginsModuleIndexComponent } from '../../components/module-index/module-index';
import { CoreSites } from '@services/sites';
import { CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';

/**
 * Page to render the index page of a module site plugin.
 */
@Component({
    selector: 'page-core-site-plugins-module-index',
    templateUrl: 'module-index.html',
})
export class CoreSitePluginsModuleIndexPage implements OnInit, CanLeave {

    @ViewChild(CoreSitePluginsModuleIndexComponent) content?: CoreSitePluginsModuleIndexComponent;

    title?: string; // Page title.
    module?: CoreCourseModuleData;
    courseId?: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.title = CoreNavigator.getRouteParam('title');
        this.module = CoreNavigator.getRouteParam('module');
        this.courseId = CoreNavigator.getRouteNumberParam('courseId');

        if (this.title) {
            const siteId = CoreSites.getCurrentSiteId();

            const options: CoreFilterFormatTextOptions = {
                clean: false,
                courseId: this.courseId,
                wsNotFiltered: false,
                singleLine: true,
            };

            const filteredTitle = await CoreFilterHelper.getFiltersAndFormatText(
                this.title.trim(),
                'module',
                this.module?.id ?? -1,
                options,
                siteId,
            );

            this.title = filteredTitle.text;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: HTMLIonRefresherElement): void {
        this.content?.doRefresh().finally(() => {
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
