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

import { Injectable } from '@angular/core';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreCourseProvider } from './course';
import { CoreCourseModuleDelegate } from './module-delegate';

/**
 * Helper to gather some common course functions.
 */
@Injectable()
export class CoreCourseHelperProvider {

    constructor(private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private moduleDelegate: CoreCourseModuleDelegate) {}

    /**
     * This function treats every module on the sections provided to load the handler data, treat completion
     * and navigate to a module page if required. It also returns if sections has content.
     *
     * @param {any[]} sections List of sections to treat modules.
     * @param {number} courseId Course ID of the modules.
     * @param {number} [moduleId] Module to navigate to if needed.
     * @param {any[]} [completionStatus] List of completion status.
     * @return {boolean} Whether the sections have content.
     */
    addHandlerDataForModules(sections: any[], courseId: number, moduleId?: number, completionStatus?: any) {
        let hasContent = false;

        sections.forEach((section) => {
            if (!section || !this.sectionHasContent(section) || !section.modules) {
                return;
            }

            hasContent = true;

            section.modules.forEach((module) => {
                module.handlerData = this.moduleDelegate.getModuleDataFor(module.modname, module, courseId, section.id);

                if (completionStatus && typeof completionStatus[module.id] != 'undefined') {
                    // Check if activity has completions and if it's marked.
                    module.completionstatus = completionStatus[module.id];
                    module.completionstatus.courseId = courseId;
                }

                if (module.id == moduleId) {
                    // This is the module we're looking for. Open it.
                    module.handlerData.action(new Event('click'), module, courseId);
                }
            });
        });

        return hasContent;
    }

    /**
     * Get the course ID from a module instance ID, showing an error message if it can't be retrieved.
     *
     * @param {number} id Instance ID.
     * @param {string} module Name of the module. E.g. 'glossary'.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the module's course ID.
     */
    getModuleCourseIdByInstance(id: number, module: any, siteId?: string) : Promise<number> {
        return this.courseProvider.getModuleBasicInfoByInstance(id, module, siteId).then((cm) => {
            return cm.course;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
            return Promise.reject(null);
        });
    }

    /**
     * Check if a section has content.
     *
     * @param {any} section Section to check.
     * @return {boolean} Whether the section has content.
     */
    sectionHasContent(section: any) : boolean {
        if (section.id == CoreCourseProvider.ALL_SECTIONS_ID || section.hiddenbynumsections) {
            return false;
        }

        return (typeof section.availabilityinfo != 'undefined' && section.availabilityinfo != '') ||
                section.summary != '' || (section.modules && section.modules.length > 0);
    }
}
