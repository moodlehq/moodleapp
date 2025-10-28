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

import {
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileListHandlerData,
} from '@features/user/services/user-delegate';
import { CoreSitePluginsBaseUserProfileHandler } from './base-user-handler';
import { CoreSitePluginsUserProfileItemComponent } from '@features/siteplugins/components/user-profile-item/user-profile-item';

/**
 * Handler to display a list site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileListHandler extends CoreSitePluginsBaseUserProfileHandler
    implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ITEM;

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        if (!this.handlerSchema.displayinline) {
            return this.getActionDisplayData();
        }

        return {
            component: CoreSitePluginsUserProfileItemComponent,
            componentData: {
                component: this.plugin.component,
                method: this.handlerSchema.method,
                initResult: this.initResult,
            },
        };
    }

}
