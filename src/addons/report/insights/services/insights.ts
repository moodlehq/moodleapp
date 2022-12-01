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

import { CoreSites } from '@services/sites';
import { CoreSite } from '@classes/site';
import { makeSingleton } from '@singletons';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreWSError } from '@classes/errors/wserror';

/**
 * Service to handle insights.
 */
@Injectable({ providedIn: 'root' })
export class AddonReportInsightsService {

    /**
     * Check if site supports sending insight actions.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's supported.
     */
    async canSendActionInSite(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canSendAction(site);
    }

    /**
     * Check if site supports sending insight actions.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's supported.
     */
    canSendAction(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('report_insights_action_executed');
    }

    /**
     * Send an action.
     *
     * @param actionName Action name.
     * @param ids List of IDs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    async sendActionExecuted(actionName: string, ids: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonReportInsightsActionExecutedWSParams = {
            actionname: actionName,
            predictionids: ids,
        };

        const result = await site.write<AddonReportInsightsActionExecutedWSResult>('report_insights_action_executed', params);

        if (result.warnings?.length) {
            throw new CoreWSError(result.warnings[0]);
        }
    }

}

export const AddonReportInsights = makeSingleton(AddonReportInsightsService);

/**
 * Params of WS report_insights_action_executed.
 */
export type AddonReportInsightsActionExecutedWSParams = {
    actionname: string; // The name of the action.
    predictionids: number[]; // Array of prediction ids.
};

/**
 * Result of WS report_insights_action_executed.
 */
export type AddonReportInsightsActionExecutedWSResult = {
    warnings?: CoreWSExternalWarning[];
};
