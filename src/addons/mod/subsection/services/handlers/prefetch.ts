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

import { Injectable } from '@angular/core';
import { CoreCourseResourcePrefetchHandlerBase } from '@features/course/classes/resource-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseWSSection } from '@features/course/services/course';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_SUBSECTION_COMPONENT } from '../../constants';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreSites } from '@services/sites';

/**
 * Handler to prefetch subsections.
 */
@Injectable({ providedIn: 'root' })
export class AddonModSubsectionPrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModSubsection';
    modName = 'subsection';
    component = ADDON_MOD_SUBSECTION_COMPONENT;

    /**
     * @inheritdoc
     */
    protected async performDownloadOrPrefetch(
        siteId: string,
        module: CoreCourseModuleData,
        courseId: number,
    ): Promise<void> {
        const section = await this.getSection(module, courseId, siteId);
        if (!section) {
            return;
        }

        await CoreCourseHelper.prefetchSections([section], courseId);
    }

    /**
     * @inheritdoc
     */
    async getDownloadSize(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreFileSizeSum> {
        const section = await this.getSection(module, courseId);
        if (!section) {
            return { size: 0, total: true };
        }

        return await CoreCourseModulePrefetchDelegate.getDownloadSize(section.modules, courseId);
    }

    /**
     * @inheritdoc
     */
    async getDownloadedSize(module: CoreCourseAnyModuleData, courseId: number): Promise<number> {
        const section = await this.getSection(module, courseId);
        if (!section) {
            return 0;
        }

        return CoreCourseHelper.getModulesDownloadedSize(section.modules, courseId);

    }

    /**
     * Get the section of a module.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the section if found.
     */
    protected async getSection(
        module: CoreCourseAnyModuleData,
        courseId: number,
        siteId?: string,
    ): Promise<CoreCourseWSSection | undefined> {
        siteId = siteId ?? CoreSites.getCurrentSiteId();

        const sections = await CoreCourse.getSections(courseId, false, true, undefined, siteId);

        return sections.find((section) =>
            section.component === 'mod_subsection' && section.itemid === module.instance);
    }

}
export const AddonModSubsectionPrefetchHandler = makeSingleton(AddonModSubsectionPrefetchHandlerService);
