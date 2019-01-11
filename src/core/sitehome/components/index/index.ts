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

import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreBlockDelegate } from '@core/block/providers/delegate';
import { CoreBlockComponent } from '@core/block/components/block/block';

/**
 * Component that displays site home index.
 */
@Component({
    selector: 'core-sitehome-index',
    templateUrl: 'core-sitehome-index.html',
})
export class CoreSiteHomeIndexComponent implements OnInit {
    @ViewChildren(CoreBlockComponent) blocksComponents: QueryList<CoreBlockComponent>;

    dataLoaded = false;
    section: any;
    hasContent: boolean;
    hasSupportedBlock: boolean;
    items: any[] = [];
    siteHomeId: number;
    blocks = [];

    constructor(private domUtils: CoreDomUtilsProvider, private sitesProvider: CoreSitesProvider,
            private courseProvider: CoreCourseProvider, private courseHelper: CoreCourseHelperProvider,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate, private blockDelegate: CoreBlockDelegate) {
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
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
     * @param {any} refresher Refresher.
     */
    doRefresh(refresher: any): void {
        const promises = [],
            currentSite = this.sitesProvider.getCurrentSite();

        promises.push(this.courseProvider.invalidateSections(this.siteHomeId));
        promises.push(currentSite.invalidateConfig().then(() => {
            // Config invalidated, fetch it again.
            return currentSite.getConfig().then((config) => {
                currentSite.setConfig(config);
            });
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            promises.push(this.prefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
        }

        if (this.courseProvider.canGetCourseBlocks()) {
            promises.push(this.courseProvider.invalidateCourseBlocks(this.siteHomeId));
        }

        // Invalidate the blocks.
        this.blocksComponents.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadContent(): Promise<any> {
        this.hasContent = false;

        const config = this.sitesProvider.getCurrentSite().getStoredConfig() || { numsections: 1 };

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
            this.section = config.numsections ? sections[1] : false;
            if (this.section) {
                this.section.hasContent = this.courseHelper.sectionHasContent(this.section);
                this.hasContent = this.courseHelper.addHandlerDataForModules([this.section], this.siteHomeId) || this.hasContent;
            }

            // Add log in Moodle.
            this.courseProvider.logView(this.siteHomeId).catch(() => {
                // Ignore errors.
            });

            // Get site home blocks.
            const canGetBlocks = this.courseProvider.canGetCourseBlocks(),
                promise = canGetBlocks ? this.courseProvider.getCourseBlocks(this.siteHomeId) : Promise.reject(null);

            return promise.then((blocks) => {
                this.blocks = blocks;
                this.hasSupportedBlock = this.blockDelegate.hasSupportedBlock(blocks);

            }).catch((error) => {
                if (canGetBlocks) {
                    this.domUtils.showErrorModal(error);
                }
                this.blocks = [];

                // Cannot get the blocks, just show site main menu if needed.
                if (sections[0] && this.courseHelper.sectionHasContent(sections[0])) {
                    this.blocks.push({
                        name: 'site_main_menu'
                    });
                    this.hasSupportedBlock = true;
                } else {
                    this.hasSupportedBlock = false;
                }
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        });
    }
}
