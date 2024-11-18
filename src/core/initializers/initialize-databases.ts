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

import { CoreAppDB } from '@services/app-db';
import { CoreConfig } from '@services/config';
import { CoreCronDelegate } from '@services/cron';
import { CoreFilepool } from '@services/filepool';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreSites } from '@services/sites';
import { CoreStorage } from '@services/storage';

/**
 * Init databases instances.
 */
export default async function(): Promise<void> {
    await Promise.all([
        CoreAppDB.initializeDatabase(),
        CoreConfig.initializeDatabase(),
        CoreCronDelegate.initializeDatabase(),
        CoreFilepool.initializeDatabase(),
        CoreLocalNotifications.initializeDatabase(),
        CoreSites.initializeDatabase(),
        CoreStorage.initializeDatabase(),
    ]);
}
