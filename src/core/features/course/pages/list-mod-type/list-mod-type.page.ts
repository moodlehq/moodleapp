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

import { Component, OnInit } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseHelper, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreConstants } from '@/core/constants';
import { IonRefresher } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page that displays all modules of a certain type in a course.
 */
@Component({
    selector: 'page-core-course-list-mod-type',
    templateUrl: 'list-mod-type.html',
})
export class CoreCourseListModTypePage implements OnInit {

    sections: CoreCourseSection[] = [];
    title = '';
    loaded = false;
    downloadEnabled = false;
    courseId?: number;

    protected modName?: string;
    protected archetypes: Record<string, number> = {}; // To speed up the check of modules.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.title = CoreNavigator.getRouteParam('title') || '';
        this.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.modName = CoreNavigator.getRouteParam('modName');
        this.downloadEnabled = !CoreSites.getCurrentSite()?.isOfflineDisabled();

        try {
            await this.fetchData();
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Fetches the data.
     *
     * @return Resolved when done.
     */
    protected async fetchData(): Promise<void> {
        if (!this.courseId) {
            return;
        }

        try {
            // Get all the modules in the course.
            let sections = await CoreCourse.getSections(this.courseId, false, true);

            sections = sections.filter((section) => {
                if (!section.modules) {
                    return false;
                }

                section.modules = section.modules.filter((mod) => {
                    if (mod.uservisible === false || !CoreCourse.moduleHasView(mod)) {
                        // Ignore this module.
                        return false;
                    }

                    if (this.modName === 'resources') {
                        // Check that the module is a resource.
                        if (typeof this.archetypes[mod.modname] == 'undefined') {
                            this.archetypes[mod.modname] = CoreCourseModuleDelegate.supportsFeature<number>(
                                mod.modname,
                                CoreConstants.FEATURE_MOD_ARCHETYPE,
                                CoreConstants.MOD_ARCHETYPE_OTHER,
                            );
                        }

                        if (this.archetypes[mod.modname] == CoreConstants.MOD_ARCHETYPE_RESOURCE) {
                            return true;
                        }

                    } else if (mod.modname == this.modName) {
                        return true;
                    }
                });

                return section.modules.length > 0;
            });

            const result = CoreCourseHelper.addHandlerDataForModules(sections, this.courseId);

            this.sections = result.sections;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting data');
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    async refreshData(refresher: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreCourse.invalidateSections(this.courseId || 0));

        try {
            await this.fetchData();
        } finally {
            refresher.complete();
        }
    }

}
