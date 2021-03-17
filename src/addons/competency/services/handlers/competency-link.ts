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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';
import { AddonCompetencyMainMenuHandlerService } from './mainmenu';

/**
 * Handler to treat links to a competency in a plan or in a course.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyCompetencyLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonCompetencyCompetencyLinkHandler';
    pattern = /\/admin\/tool\/lp\/(user_competency_in_course|user_competency_in_plan)\.php/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>, courseId?: number): CoreContentLinksAction[] {
        courseId = courseId || parseInt(params.courseid || params.cid, 10);

        return [{
            action: (siteId: string): void => {
                const pageParams = {
                    planId: params.planid,
                    courseId: courseId,
                    userId: params.userid,
                };

                CoreNavigator.navigateToSitePath(
                    '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/competencies/' + params.competencyid,
                    { params: pageParams, siteId },
                );

            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        // Handler is disabled if all competency features are disabled.
        const disabled = await AddonCompetency.allCompetenciesDisabled(siteId);

        return !disabled;
    }

}
export const AddonCompetencyCompetencyLinkHandler = makeSingleton(AddonCompetencyCompetencyLinkHandlerService);
