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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '../../providers/course';
import { CoreCourseModuleDelegate } from '../../providers/module-delegate';
import { CoreCourseHelperProvider } from '../../providers/helper';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConstants } from '@core/constants';

/**
 * Page that displays comments.
 */
@IonicPage({ segment: 'core-course-list-mod-type' })
@Component({
    selector: 'page-core-course-list-mod-type',
    templateUrl: 'list-mod-type.html',
})
export class CoreCourseListModTypePage {

    sections = [];
    title: string;
    loaded = false;
    downloadEnabled = false;

    protected courseId: number;
    protected modName: string;
    protected archetypes = {}; // To speed up the check of modules.

    constructor(navParams: NavParams, private courseProvider: CoreCourseProvider, private moduleDelegate: CoreCourseModuleDelegate,
             private domUtils: CoreDomUtilsProvider, private courseHelper: CoreCourseHelperProvider,
             private sitesProvider: CoreSitesProvider) {

        this.title = navParams.get('title');
        this.courseId = navParams.get('courseId');
        this.modName = navParams.get('modName');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.downloadEnabled = !this.sitesProvider.getCurrentSite().isOfflineDisabled();

        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetches the data.
     *
     * @return Resolved when done.
     */
    protected fetchData(): Promise<any> {
        // Get all the modules in the course.
        return this.courseProvider.getSections(this.courseId, false, true).then((sections) => {

            this.sections = sections.filter((section) => {
                if (!section.modules) {
                    return false;
                }

                section.modules = section.modules.filter((mod) => {
                    if (mod.uservisible === false || !this.courseProvider.moduleHasView(mod)) {
                        // Ignore this module.
                        return false;
                    }

                    if (this.modName === 'resources') {
                        // Check that the module is a resource.
                        if (typeof this.archetypes[mod.modname] == 'undefined') {
                            this.archetypes[mod.modname] = this.moduleDelegate.supportsFeature(mod.modname,
                                    CoreConstants.FEATURE_MOD_ARCHETYPE, CoreConstants.MOD_ARCHETYPE_OTHER);
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

            this.courseHelper.addHandlerDataForModules(this.sections, this.courseId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting data');
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.courseProvider.invalidateSections(this.courseId).finally(() => {
            return this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }
}
