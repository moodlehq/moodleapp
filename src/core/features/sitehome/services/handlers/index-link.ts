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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSiteHome } from '../sitehome';
import { makeSingleton } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreSiteHomeHomeHandlerService } from './sitehome-home';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { Params } from '@angular/router';

/**
 * Handler to treat links to site home index.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteHomeIndexLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreSiteHomeIndexLinkHandler';
    featureName = 'CoreMainMenuDelegate_CoreSiteHome';
    pattern = /(\/course\/view\.php.*([?&]id=\d+)|\/index\.php(\?redirect=0)?|\/?\?redirect=0)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const pageParams: Params = {};
        const matches = url.match(/#inst(\d+)/);

        if (matches && matches[1]) {
            pageParams.blockInstanceId = parseInt(matches[1], 10);
        }

        return [{
            action: (siteId: string): void => {
                CoreNavigator.navigateToSitePath(
                    `/${CoreMainMenuHomeHandlerService.PAGE_NAME}/${CoreSiteHomeHomeHandlerService.PAGE_NAME}`,
                    {
                        preferCurrentTab: false,
                        siteId,
                        params: pageParams,
                    },
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        const courseId = parseInt(params.id, 10);

        if (!courseId) {
            return url.includes('index.php') || url.includes('?redirect=0');
        }

        const site = await CoreSites.getSite(siteId);
        if (courseId != site.getSiteHomeId()) {
            // The course is not site home.
            return false;
        }

        return CoreSiteHome.isAvailable(siteId).then(() => true).catch(() => false);
    }

}

export const CoreSiteHomeIndexLinkHandler = makeSingleton(CoreSiteHomeIndexLinkHandlerService);
