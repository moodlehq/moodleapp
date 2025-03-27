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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { makeSingleton, Translate } from '@singletons';
import { AddonReportInsights } from '../insights';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';

// Bulk actions supported, along with the related lang string.
const BULK_ACTIONS = {
    fixed: 'addon.report_insights.fixedack',
    incorrectlyflagged: 'addon.report_insights.incorrectlyflagged',
    notapplicable: 'addon.report_insights.notapplicable',
    notuseful: 'addon.report_insights.notuseful',
    useful: 'addon.report_insights.useful',
};

/**
 * Content links handler for calendar view page.
 */
@Injectable({ providedIn: 'root' })
export class AddonReportInsightsActionLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonReportInsightsActionLinkHandler';
    pattern = /\/report\/insights\/action\.php/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId?: string): Promise<void> => {
                // Send the action.
                const modal = await CoreLoadings.show('core.sending', true);

                try {
                    await AddonReportInsights.sendActionExecuted(params.action, [Number(params.predictionid)], siteId);
                } catch (error) {
                    CoreAlerts.showError(error);

                    return;
                } finally {
                    modal.dismiss();
                }

                if (BULK_ACTIONS[params.action]) {
                    // Done, display a toast.
                    CoreToasts.show({
                        message: Translate.instant('addon.report_insights.actionsaved', {
                            $a: Translate.instant(BULK_ACTIONS[params.action]),
                        }),
                    });
                } else if (!params.forwardurl) {
                    // Forward URL not defined, display a toast.
                    CoreToasts.show({
                        message: 'core.success',
                        translateMessage: true,
                    });
                } else {
                    // Try to open the link in the app.
                    const forwardUrl = decodeURIComponent(params.forwardurl);

                    await CoreContentLinksHelper.visitLink(forwardUrl, { siteId });
                }
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (!params.action || !params.predictionid) {
            // Required params missing.
            return false;
        }

        return AddonReportInsights.canSendActionInSite(siteId);
    }

}

export const AddonReportInsightsActionLinkHandler = makeSingleton(AddonReportInsightsActionLinkHandlerService);
