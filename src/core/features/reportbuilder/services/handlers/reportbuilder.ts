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
import {
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreReportBuilder } from '../reportbuilder';
import { CORE_REPORT_BUILDER_PAGE_NAME } from '@features/reportbuilder/constants';

/**
 * Handler to visualize custom reports.
 */
@Injectable({ providedIn: 'root' })
export class CoreReportBuilderHandlerService implements CoreUserProfileHandler {

    type = CoreUserProfileHandlerType.LIST_ITEM;
    cacheEnabled = true;
    name = 'CoreReportBuilderDelegate';
    priority = 350;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return await CoreReportBuilder.isEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext): Promise<boolean> {
        // Custom reports only available in user menu.
        if (context !== CoreUserDelegateContext.USER_MENU) {
            return false;
        }

        return this.isEnabled();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            class: 'core-report-builder',
            icon: 'fas-rectangle-list',
            title: 'core.reportbuilder.reports',
            action: async (event): Promise<void> => {
                event.preventDefault();
                event.stopPropagation();
                await CoreNavigator.navigateToSitePath(CORE_REPORT_BUILDER_PAGE_NAME);
            },
        };
    }

}

export const CoreReportBuilderHandler = makeSingleton(CoreReportBuilderHandlerService);
