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
 * Handler to treat links to user plans.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyPlansLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonCompetencyPlansLinkHandler';
    pattern = /\/admin\/tool\/lp\/plans\.php/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: (siteId: string): void => {
                CoreNavigator.navigateToSitePath(
                    '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME,
                    { params: { userId: params.userid }, siteId },
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
export const AddonCompetencyPlansLinkHandler = makeSingleton(AddonCompetencyPlansLinkHandlerService);
