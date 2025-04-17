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
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigationOptions } from '@services/navigator';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to SCORM player.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormPlayerLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModScormPlayerLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModScorm';
    pattern = /\/mod\/scorm\/player\.php.*([?&](id|a)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>, courseId?: number): CoreContentLinksAction[] {

        return [{
            action: async (siteId) => {
                const cmId = Number(params.id);
                const instanceId = Number(params.a);
                courseId = Number(courseId || params.courseid || params.cid);

                if (!cmId && !instanceId) {
                    // Shouldn't happen, the regex should handle this.
                    return;
                }

                const navOptions: CoreNavigationOptions = {
                    params: {
                        autoPlay: true,
                        mode: params.mode || undefined,
                        newAttempt: params.newattempt === 'on',
                        organizationId: params.currentorg,
                        scoId: Number(params.scoid) || undefined,
                    },
                };

                if (cmId) {
                    await CoreCourseHelper.navigateToModule(
                        cmId,
                        {
                            courseId,
                            modNavOptions: navOptions,
                            siteId,
                        },
                    );
                } else {
                    await CoreCourseHelper.navigateToModuleByInstance(
                        instanceId,
                        'scorm',
                        {
                            courseId,
                            modNavOptions: navOptions,
                            siteId,
                        },
                    );
                }
            },
        }];
    }

}

export const AddonModScormPlayerLinkHandler = makeSingleton(AddonModScormPlayerLinkHandlerService);
