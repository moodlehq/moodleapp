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

import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { makeSingleton } from '@singletons';
import { AddonModLti } from '../lti';
import { ADDON_MOD_LTI_COMPONENT_LEGACY, ADDON_MOD_LTI_MODNAME } from '../../constants';

/**
 * Handler to prefetch LTIs. LTIs cannot be prefetched, but the handler will be used to invalidate some data on course PTR.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLtiPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModLti';
    modName = ADDON_MOD_LTI_MODNAME;
    component = ADDON_MOD_LTI_COMPONENT_LEGACY;

    /**
     * @inheritdoc
     */
    async download(): Promise<void> {
        return;
    }

    /**
     * @inheritdoc
     */
    invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return AddonModLti.invalidateLti(courseId);
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(): Promise<boolean> {
        return false; // LTIs aren't downloadable.
    }

    /**
     * @inheritdoc
     */
    async prefetch(): Promise<void> {
        return;
    }

}

export const AddonModLtiPrefetchHandler = makeSingleton(AddonModLtiPrefetchHandlerService);
