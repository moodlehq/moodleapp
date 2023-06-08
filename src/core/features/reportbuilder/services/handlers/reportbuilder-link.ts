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
import { Params } from '@angular/router';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreReportBuilder } from '../reportbuilder';
import { CoreReportBuilderHandlerService } from './reportbuilder';

/**
 * Content links handler for report builder
 * Match reportbuilder/view.php?id=6 with a valid data and report id.
 */
@Injectable({ providedIn: 'root' })
export class CoreReportBuilderLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreReportBuilderLinkHandler';
    pattern = /\/reportbuilder\/view\.php.*([?&]id=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Params): CoreContentLinksAction[] {
        return [{
            action: async (siteId): Promise<void> => {
                CoreNavigator.navigateToSitePath(`${CoreReportBuilderHandlerService.PAGE_NAME}/${params.id || ''}`, { siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return await CoreReportBuilder.isEnabled();
    }

}

export const CoreReportBuilderLinkHandler = makeSingleton(CoreReportBuilderLinkHandlerService);
