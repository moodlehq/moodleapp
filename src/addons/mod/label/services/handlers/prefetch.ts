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
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModLabel } from '../label';
import { ADDON_MOD_LABEL_COMPONENT } from '../../constants';

/**
 * Handler to prefetch labels.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLabelPrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModLabel';
    modName = 'label';
    component = ADDON_MOD_LABEL_COMPONENT;
    updatesNames = /^.*files$/;

    /**
     * @inheritdoc
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number, ignoreCache?: boolean): Promise<CoreWSFile[]> {
        const label = await AddonModLabel.getLabel(courseId, module.id, {
            readingStrategy: ignoreCache ? CoreSitesReadingStrategy.ONLY_NETWORK : undefined,
        });

        return this.getIntroFilesFromInstance(module, label);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModLabel.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModLabel.invalidateLabelData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await CoreUtils.allPromises(promises);
    }

    /**
     * @inheritdoc
     */
    async loadContents(module: CoreCourseAnyModuleData): Promise<void> {
        // Labels don't have contents.
        module.contents = [];
    }

}
export const AddonModLabelPrefetchHandler = makeSingleton(AddonModLabelPrefetchHandlerService);
