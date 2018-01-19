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

import { Component, OnInit, Input } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreCourseProvider } from '../../../course/providers/course';
import { CoreCourseHelperProvider } from '../../../course/providers/helper';
import { CoreCourseModulePrefetchDelegate } from '../../../course/providers/module-prefetch-delegate';

/**
 * Component that displays site home index.
 */
@Component({
    selector: 'core-sitehome-index',
    templateUrl: 'index.html',
})
export class CoreSiteHomeIndexComponent implements OnInit {
    @Input() moduleId?: number;

    dataLoaded: boolean;
    section: any;
    block: any;
    hasContent: boolean;
    items: any[] = [];
    siteHomeId: number;

    protected sectionsLoaded: any[];

    constructor(private domUtils: CoreDomUtilsProvider, private sitesProvider: CoreSitesProvider,
            private courseProvider: CoreCourseProvider, private courseHelper: CoreCourseHelperProvider,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate) {
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    doRefresh(refresher: any) {
        const promises = [],
            currentSite = this.sitesProvider.getCurrentSite();

        promises.push(this.courseProvider.invalidateSections(this.siteHomeId));
        promises.push(currentSite.invalidateConfig().then(() => {
            // Config invalidated, fetch it again.
            return currentSite.getConfig().then((config) => {
                currentSite.setConfig(config);
            });
        }));

        if (this.sectionsLoaded) {
            // Invalidate modules prefetch data.
            const modules = this.courseProvider.getSectionsModules(this.sectionsLoaded);
            promises.push(this.prefetchDelegate.invalidateModules(modules, this.siteHomeId));
        }

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Convenience function to fetch the data.
     */
    protected loadContent() {
        this.hasContent = false;

        let config = this.sitesProvider.getCurrentSite().getStoredConfig() || {numsections: 1};

        if (config.frontpageloggedin) {
            // Items with index 1 and 3 were removed on 2.5 and not being supported in the app.
            let frontpageItems = [
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
            this.sectionsLoaded = Array.from(sections);

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections && sections.length > 0 ? sections.pop() : false;
            if (this.section) {
                this.section.hasContent = this.courseHelper.sectionHasContent(this.section);
            }

            this.block = sections.length > 0 ? sections.pop() : false;
            if (this.block) {
                this.block.hasContent = this.courseHelper.sectionHasContent(this.block);
            }

            this.hasContent = this.courseHelper.addHandlerDataForModules(this.sectionsLoaded, this.siteHomeId, this.moduleId) ||
                              this.hasContent;

            // Add log in Moodle.
            this.courseProvider.logView(this.siteHomeId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        });
    }
}
