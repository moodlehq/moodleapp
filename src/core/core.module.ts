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

import { CoreAppProvider } from '@services/app';
import { CoreConfigProvider } from '@services/config';
import { CoreCronDelegateService } from '@services/cron';
import { CoreCustomURLSchemesProvider } from '@services/urlschemes';
import { CoreDbProvider } from '@services/db';
import { CoreDomUtilsProvider } from '@services/utils/dom';
import { CoreFileHelperProvider } from '@services/file-helper';
import { CoreFilepoolProvider } from '@services/filepool';
import { CoreFileProvider } from '@services/file';
import { CoreFileSessionProvider } from '@services/file-session';
import { CoreForms } from '@singletons/form';
import { CoreGeolocationProvider } from '@services/geolocation';
import { CoreGroupsProvider } from '@services/groups';
import { CoreIframeUtilsProvider } from '@services/utils/iframe';
import { CoreLangProvider } from '@services/lang';
import { CoreLocalNotificationsProvider } from '@services/local-notifications';
import { CoreMimetypeUtilsProvider } from '@services/utils/mimetype';
import { CoreNavigatorService } from '@services/navigator';
import { CorePluginFileDelegateService } from '@services/plugin-file-delegate';
import { CoreScreenService } from '@services/screen';
import { CoreSitesProvider } from '@services/sites';
import { CoreSyncProvider } from '@services/sync';
import { CoreTextUtilsProvider } from '@services/utils/text';
import { CoreTimeUtilsProvider } from '@services/utils/time';
import { CoreUpdateManagerProvider } from '@services/update-manager';
import { CoreUrlUtilsProvider } from '@services/utils/url';
import { CoreUtilsProvider } from '@services/utils/utils';
import { CoreWSProvider } from '@services/ws';

export const CORE_SERVICES: Type<unknown>[] = [
    CoreAppProvider,
    CoreConfigProvider,
    CoreCronDelegateService,
    CoreCustomURLSchemesProvider,
    CoreDbProvider,
    CoreDomUtilsProvider,
    CoreFileHelperProvider,
    CoreFilepoolProvider,
    CoreFileProvider,
    CoreFileSessionProvider,
    CoreForms,
    CoreGeolocationProvider,
    CoreGroupsProvider,
    CoreIframeUtilsProvider,
    CoreLangProvider,
    CoreLocalNotificationsProvider,
    CoreMimetypeUtilsProvider,
    CoreNavigatorService,
    CorePluginFileDelegateService,
    CoreScreenService,
    CoreSitesProvider,
    CoreSyncProvider,
    CoreTextUtilsProvider,
    CoreTimeUtilsProvider,
    CoreUpdateManagerProvider,
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
