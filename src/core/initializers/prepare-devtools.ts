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
import { CoreApp, CoreAppProvider } from '@services/app';
import { CoreConfig, CoreConfigProvider } from '@services/config';
import { CoreDB, CoreDbProvider } from '@services/db';
import { CoreCustomURLSchemes, CoreCustomURLSchemesProvider } from '@services/urlschemes';
import { CoreBrowser } from '@singletons/browser';
import { CoreConstants } from '../constants';

type DevelopmentWindow = Window & {
    browser?: typeof CoreBrowser;
    appProvider?: CoreAppProvider;
    configProvider?: CoreConfigProvider;
    dbProvider?: CoreDbProvider;
    urlSchemes?: CoreCustomURLSchemesProvider;
    pushNotifications?: CorePushNotificationsProvider;
};

function initializeDevelopmentWindow(window: DevelopmentWindow) {
    window.browser = CoreBrowser;
    window.appProvider = CoreApp.instance;
    window.configProvider = CoreConfig.instance;
    window.dbProvider = CoreDB.instance;
    window.urlSchemes = CoreCustomURLSchemes.instance;
    window.pushNotifications = CorePushNotifications.instance;
}

export default function(): void {
    if (!CoreConstants.enableDevTools()) {
        return;
    }

    initializeDevelopmentWindow(window);
}
