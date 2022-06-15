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

import { CoreConfig } from '@services/config';
import { CoreFilepool } from '@services/filepool';
import { CoreLang } from '@services/lang';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUpdateManager } from '@services/update-manager';
import { CoreTimeUtils } from '@services/utils/time';

export default async function(): Promise<void> {
    await Promise.all([
        CoreConfig.initialize(),
        CoreFilepool.initialize(),
        CoreSites.initialize(),
        CoreLang.initialize(),
        CoreLocalNotifications.initialize(),
        CoreNetwork.initialize(),
        CoreUpdateManager.initialize(),
        CoreTimeUtils.initialize(),
    ]);
}
