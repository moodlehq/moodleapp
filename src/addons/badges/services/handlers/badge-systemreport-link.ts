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
import { makeSingleton, Translate } from '@singletons';
import { BadgeReportType } from '@addons/badges/constants';
import { CoreReportBuilder, CoreReportbuilderSystemReportParams } from '@features/reportbuilder/services/reportbuilder';
import { ContextLevel } from '@/core/constants';
import { CoreReportbuilderCanViewSystemReportWSParams } from '@features/reportbuilder/services/reportbuilder-ws';
import { AddonBadges } from '../badges';

/**
 * Handler to treat links to system reports related to badges.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesSystemReportLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBadgesSystemReportLinkHandler';
    pattern = /\/badges\/index\.php.*([?&]type=\d+)/;

    /**
     * Get the report params based on the URL params.
     *
     * @param params URL params.
     * @returns Report params or undefined if the params are not valid.
     */
    protected getReportParams(params: Record<string, string>): CoreReportbuilderCanViewSystemReportWSParams | undefined {
        const type = Number(params.type) as BadgeReportType;

        const reportParams: CoreReportbuilderCanViewSystemReportWSParams = {
            source: 'core_badges\\reportbuilder\\local\\systemreports\\badges',
            context: {},
        };

        if (type === BadgeReportType.SITE) {
            reportParams.context = { contextlevel: ContextLevel.SYSTEM, instanceid: 0 };
        } else if (type === BadgeReportType.COURSE && params.id) {
            reportParams.context = { contextlevel: ContextLevel.COURSE, instanceid: Number(params.id) };
        } else {
            return;
        }

        return reportParams;
    }

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        const reportParams = this.getReportParams(params);
        if (!reportParams) {
            return [];
        }
        const pageParams: CoreReportbuilderSystemReportParams = {
            name: Translate.instant(
                `addon.badges.${reportParams.context.contextlevel === ContextLevel.COURSE ? 'coursebadges' : 'sitebadges'}`,
            ),
            ...reportParams,
        };

        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath('/reportbuilder/system', { siteId, params: { params: pageParams } });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        let isEnabled = await AddonBadges.isPluginEnabled(siteId);
        if (!isEnabled) {
            return false;
        }

        isEnabled = await CoreReportBuilder.isEnabled();
        if (!isEnabled) {
            return false;
        }

        const reportParams = this.getReportParams(params);
        if (!reportParams) {
            return false;
        }

        return CoreReportBuilder.canViewSystemReport(reportParams);
    }

}

export const AddonBadgesSystemReportLinkHandler = makeSingleton(AddonBadgesSystemReportLinkHandlerService);
