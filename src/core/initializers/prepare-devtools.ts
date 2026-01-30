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

import { CorePushNotifications, CorePushNotificationsProvider } from '@features/pushnotifications/services/pushnotifications';
import { CoreConfig, CoreConfigProvider } from '@services/config';
import { CoreDB, CoreDbProvider } from '@services/db';
import { CoreCustomURLSchemes, CoreCustomURLSchemesProvider } from '@services/urlschemes';
import { CoreBrowser } from '@static/browser';
import { CoreConstants } from '../constants';
import { CoreAppDB, CoreAppDBService } from '@services/app-db';

type DevelopmentWindow = Window & {
    browser?: typeof CoreBrowser;
    appDBService?: CoreAppDBService;
    configProvider?: CoreConfigProvider;
    dbProvider?: CoreDbProvider;
    urlSchemes?: CoreCustomURLSchemesProvider;
    pushNotifications?: CorePushNotificationsProvider;
};

/**
 * Initializes the development window with necessary providers and configurations.
 *
 * @param window The development window object to be initialized.
 */
function initializeDevelopmentWindow(window: DevelopmentWindow) {
    window.browser = CoreBrowser;
    window.appDBService = CoreAppDB.instance;
    window.configProvider = CoreConfig.instance;
    window.dbProvider = CoreDB.instance;
    window.urlSchemes = CoreCustomURLSchemes.instance;
    window.pushNotifications = CorePushNotifications.instance;
}

/**
 * Initializes the development tools if enabled by CoreConstants.
 */
export default function(): void {
    if (!CoreConstants.isDevOrTestingBuild()) {
        return;
    }

    initializeDevelopmentWindow(window);
}
