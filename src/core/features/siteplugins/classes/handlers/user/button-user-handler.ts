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
    CoreUserProfileButtonHandlerData,
} from '@features/user/services/user-delegate';
import { CoreSitePluginsBaseUserProfileHandler } from './base-user-handler';

/**
 * Handler to display a button site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileButtonHandler extends CoreSitePluginsBaseUserProfileHandler
    implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.BUTTON;

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileButtonHandlerData {
        return this.getActionDisplayData();
    }

}
