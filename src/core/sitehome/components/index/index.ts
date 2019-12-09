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

import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreBlockCourseBlocksComponent } from '@core/block/components/course-blocks/course-blocks';
import { CoreSite } from '@classes/site';

/**
 * Component that displays site home index.
 */
@Component({
    selector: 'core-sitehome-index',
    templateUrl: 'core-sitehome-index.html',
})
export class CoreSiteHomeIndexComponent implements OnInit {
    @Input() downloadEnabled: boolean;
    @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent: CoreBlockCourseBlocksComponent;

    dataLoaded = false;
    section: any;
    hasContent: boolean;
    items: any[] = [];
    siteHomeId: number;
    currentSite: CoreSite;

    constructor(private domUtils: CoreDomUtilsProvider, sitesProvider: CoreSitesProvider,
            private courseProvider: CoreCourseProvider, private courseHelper: CoreCourseHelperProvider,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate) {
        this.currentSite = sitesProvider.getCurrentSite();
        this.siteHomeId = this.currentSite.getSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher: any): void {
        const promises = [];

        promises.push(this.courseProvider.invalidateSections(this.siteHomeId));
        promises.push(this.currentSite.invalidateConfig().then(() => {
            // Config invalidated, fetch it again.
            return this.currentSite.getConfig().then((config) => {
                this.currentSite.setConfig(config);
            });
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            promises.push(this.prefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
        }

        promises.push(this.courseBlocksComponent.invalidateBlocks());

        Promise.all(promises).finally(() => {
            const p2 = [];

            p2.push(this.loadContent());
            p2.push(this.courseBlocksComponent.loadContent());

            return Promise.all(p2).finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return Promise resolved when done.
     */
    protected loadContent(): Promise<any> {
        this.hasContent = false;

        const config = this.currentSite.getStoredConfig() || { numsections: 1 };

        if (config.frontpageloggedin) {
            // Items with index 1 and 3 were removed on 2.5 and not being supported in the app.
            const frontpageItems = [
                    'news', // News items.
                    false,
                    'categories', // List of categories.
                    false,
                    'categories', // Combo list.
                    'enrolled-course-list', // Enrolled courses.
                    'all-course-list', // List of courses.
                    'course-search' // Course search box.
                ],
                items = config.frontpageloggedin.split(',');

            this.items = [];

            items.forEach((itemNumber) => {
                // Get the frontpage item "name".
                const item = frontpageItems[parseInt(itemNumber, 10)];
                if (!item || this.items.indexOf(item) >= 0) {
                    return;
                }

                this.hasContent = true;
                this.items.push(item);
            });
        }

        return this.courseProvider.getSections(this.siteHomeId, false, true).then((sections) => {

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections ? sections.find((section) => section.section == 1) : false;
            if (this.section) {
                this.section.hasContent = this.courseHelper.sectionHasContent(this.section);
                this.hasContent = this.courseHelper.addHandlerDataForModules([this.section], this.siteHomeId, undefined,
                        undefined, true) || this.hasContent;
            }

            // Add log in Moodle.
            this.courseProvider.logView(this.siteHomeId, undefined, undefined,
                    this.currentSite && this.currentSite.getInfo().sitename).catch(() => {
                // Ignore errors.
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        });
    }
}
