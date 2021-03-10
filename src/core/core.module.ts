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

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ApplicationInitStatus, Injector, NgModule, Type } from '@angular/core';

import { CoreApplicationInitStatus } from './classes/application-init-status';
import { CoreFeaturesModule } from './features/features.module';
import { CoreInterceptor } from './classes/interceptor';
import { getDatabaseProviders } from './services/database';
import { getInitializerProviders } from './initializers';

import { CoreDbProvider } from '@services/db';
import { CoreAppProvider } from '@services/app';
import { CoreConfigProvider } from '@services/config';
import { CoreLangProvider } from '@services/lang';
import { CoreTextUtilsProvider } from '@services/utils/text';
import { CoreDomUtilsProvider } from '@services/utils/dom';
import { CoreIframeUtilsProvider } from '@services/utils/iframe';
import { CoreTimeUtilsProvider } from '@services/utils/time';
import { CoreUrlUtilsProvider } from '@services/utils/url';
import { CoreUtilsProvider } from '@services/utils/utils';
import { CoreMimetypeUtilsProvider } from '@services/utils/mimetype';
import { CoreFileProvider } from '@services/file';
import { CoreWSProvider } from '@services/ws';
import { CoreSitesProvider } from '@services/sites';
import { CoreLocalNotificationsProvider } from '@services/local-notifications';
import { CoreGroupsProvider } from '@services/groups';
import { CoreCronDelegateService } from '@services/cron';
import { CoreFileSessionProvider } from '@services/file-session';
import { CoreFilepoolProvider } from '@services/filepool';
import { CoreUpdateManagerProvider } from '@services/update-manager';
import { CorePluginFileDelegateService } from '@services/plugin-file-delegate';
import { CoreSyncProvider } from '@services/sync';
import { CoreFileHelperProvider } from '@services/file-helper';
import { CoreGeolocationProvider } from '@services/geolocation';
import { CoreNavigatorService } from '@services/navigator';
import { CoreScreenService } from '@services/screen';
import { CoreCustomURLSchemesProvider } from '@services/urlschemes';

export const CORE_SERVICES: Type<unknown>[] = [
    CoreAppProvider,
    CoreConfigProvider,
    CoreCronDelegateService,
    CoreCustomURLSchemesProvider,
    CoreDbProvider,
    CoreFileHelperProvider,
    CoreFileSessionProvider,
    CoreFileProvider,
    CoreFilepoolProvider,
    CoreGeolocationProvider,
    CoreGroupsProvider,
    CoreLangProvider,
    CoreLocalNotificationsProvider,
    CoreNavigatorService,
    CorePluginFileDelegateService,
    CoreScreenService,
    CoreSitesProvider,
    CoreSyncProvider,
    CoreUpdateManagerProvider,
    CoreDomUtilsProvider,
    CoreIframeUtilsProvider,
    CoreMimetypeUtilsProvider,
    CoreTextUtilsProvider,
    CoreTimeUtilsProvider,
    CoreUrlUtilsProvider,
    CoreUtilsProvider,
    CoreWSProvider,
];

@NgModule({
    imports: [
        CoreFeaturesModule,
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: CoreInterceptor, multi: true },
        { provide: ApplicationInitStatus, useClass: CoreApplicationInitStatus, deps: [Injector] },
        ...getDatabaseProviders(),
        ...getInitializerProviders(),
    ],
})
export class CoreModule {}
