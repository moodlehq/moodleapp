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
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FEEDBACK_PAGE_NAME, AddonModFeedbackIndexTabName } from '../../constants';
import { CoreLoadings } from '@services/loadings';

/**
 * Content links handler for a feedback analysis.
 * Match mod/feedback/analysis.php with a valid feedback id.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackAnalysisLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModFeedbackAnalysisLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModFeedback';
    pattern = /\/mod\/feedback\/analysis\.php.*([&?]id=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string) => {
                const modal = await CoreLoadings.show();

                const moduleId = Number(params.id);

                try {
                    // Get the module.
                    const module = await CoreCourse.getModule(
                        moduleId,
                        undefined,
                        undefined,
                        false,
                        false,
                        siteId,
                    );

                    await CoreNavigator.navigateToSitePath(
                        ADDON_MOD_FEEDBACK_PAGE_NAME + `/${module.course}/${module.id}`,
                        {
                            params: {
                                module,
                                tab: AddonModFeedbackIndexTabName.ANALYSIS,
                            },
                            siteId,
                        },
                    );
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'Error opening link.');
                } finally {
                    modal.dismiss();
                }
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.id === undefined) {
            // Cannot treat the URL.
            return false;
        }

        return true;
    }

}

export const AddonModFeedbackAnalysisLinkHandler = makeSingleton(AddonModFeedbackAnalysisLinkHandlerService);
