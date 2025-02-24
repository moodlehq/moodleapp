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
import { CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FEEDBACK_FEATURE_NAME, ADDON_MOD_FEEDBACK_PAGE_NAME } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
/**
 * Content links handler for feedback show non respondents.
 * Match mod/feedback/show_nonrespondents.php with a valid feedback id.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackShowNonRespondentsLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModFeedbackShowNonRespondentsLinkHandler';
    featureName = ADDON_MOD_FEEDBACK_FEATURE_NAME;
    pattern = /\/mod\/feedback\/show_nonrespondents\.php.*([?&](id)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string) => {
                const modal = await CoreLoadings.show();

                const moduleId = Number(params.id);

                try {
                    const module = await CoreCourse.getModuleBasicInfo(
                        moduleId,
                        { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                    );

                    await CoreNavigator.navigateToSitePath(
                        ADDON_MOD_FEEDBACK_PAGE_NAME + `/${module.course}/${module.id}/nonrespondents`,
                        { siteId },
                    );
                } catch (error) {
                    CoreAlerts.showError(error, { default: 'Error opening link.' });
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

export const AddonModFeedbackShowNonRespondentsLinkHandler = makeSingleton(AddonModFeedbackShowNonRespondentsLinkHandlerService);
