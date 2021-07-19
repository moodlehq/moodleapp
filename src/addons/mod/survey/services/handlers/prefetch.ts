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
import { CoreFilepool } from '@services/filepool';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModSurvey, AddonModSurveyProvider } from '../survey';
import { AddonModSurveySync, AddonModSurveySyncResult } from '../survey-sync';

/**
 * Handler to prefetch surveys.
 */
@Injectable( { providedIn: 'root' })
export class AddonModSurveyPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModSurvey';
    modName = 'survey';
    component = AddonModSurveyProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^answers$/;

    /**
     * @inheritdoc
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const survey = await CoreUtils.ignoreErrors(AddonModSurvey.getSurvey(courseId, module.id));

        return this.getIntroFilesFromInstance(module, survey);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModSurvey.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        await AddonModSurvey.invalidateSurveyData(courseId);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, this.prefetchSurvey.bind(this, module, courseId));
    }

    /**
     * Prefetch a survey.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId SiteId or current site.
     * @return Promise resolved when done.
     */
    protected async prefetchSurvey(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const survey = await AddonModSurvey.getSurvey(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        });

        const promises: Promise<unknown>[] = [];
        const files = this.getIntroFilesFromInstance(module, survey);

        // Prefetch files.
        promises.push(CoreFilepool.addFilesToQueue(siteId, files, AddonModSurveyProvider.COMPONENT, module.id));

        // If survey isn't answered, prefetch the questions.
        if (!survey.surveydone) {
            promises.push(AddonModSurvey.getQuestions(survey.id, {
                cmId: module.id,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            }));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModSurveySyncResult> {
        return AddonModSurveySync.syncSurvey(module.instance!, undefined, siteId);
    }

}
export const AddonModSurveyPrefetchHandler = makeSingleton(AddonModSurveyPrefetchHandlerService);
