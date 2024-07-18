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

/**
 * Get core services.
 *
 * @returns Core services.
 */
export async function getCoreServices(): Promise<Type<unknown>[]> {

    const { CoreAppProvider } = await import('@services/app');
    const { CoreConfigProvider } = await import('@services/config');
    const { CoreCronDelegateService } = await import('@services/cron');
    const { CoreCustomURLSchemesProvider } = await import('@services/urlschemes');
    const { CoreDbProvider } = await import('@services/db');
    const { CoreDomUtilsProvider } = await import('@services/utils/dom');
    const { CoreToastsService } = await import('@services/toasts');
    const { CoreFileHelperProvider } = await import('@services/file-helper');
    const { CoreFilepoolProvider } = await import('@services/filepool');
    const { CoreFileProvider } = await import('@services/file');
    const { CoreFileSessionProvider } = await import('@services/file-session');
    const { CoreGeolocationProvider } = await import('@services/geolocation');
    const { CoreGroupsProvider } = await import('@services/groups');
    const { CoreIframeUtilsProvider } = await import('@services/utils/iframe');
    const { CoreLangProvider } = await import('@services/lang');
    const { CoreLocalNotificationsProvider } = await import('@services/local-notifications');
    const { CoreMimetypeUtilsProvider } = await import('@services/utils/mimetype');
    const { CoreNavigatorService } = await import('@services/navigator');
    const { CorePluginFileDelegateService } = await import('@services/plugin-file-delegate');
    const { CorePopoversService } = await import('@services/popovers');
    const { CoreScreenService } = await import('@services/screen');
    const { CoreSitesProvider } = await import('@services/sites');
    const { CoreSyncProvider } = await import('@services/sync');
    const { CoreTextUtilsProvider } = await import('@services/utils/text');
    const { CoreTimeUtilsProvider } = await import('@services/utils/time');
    const { CoreUpdateManagerProvider } = await import('@services/update-manager');
    const { CoreUrlUtilsProvider } = await import('@services/utils/url');
    const { CoreUtilsProvider } = await import('@services/utils/utils');
    const { CoreWSProvider } = await import('@services/ws');
    const { CorePlatformService } = await import('@services/platform');
    const { CoreQRScanService } = await import('@services/qrscan');

    return [
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
        CoreGeolocationProvider,
        CoreGroupsProvider,
        CoreIframeUtilsProvider,
        CoreLangProvider,
        CoreLocalNotificationsProvider,
        CoreMimetypeUtilsProvider,
        CoreNavigatorService,
        CorePluginFileDelegateService,
        CorePopoversService,
        CorePlatformService,
        CoreQRScanService,
        CoreScreenService,
        CoreSitesProvider,
        CoreSyncProvider,
        CoreTextUtilsProvider,
        CoreTimeUtilsProvider,
        CoreToastsService,
        CoreUpdateManagerProvider,
        CoreUrlUtilsProvider,
        CoreUtilsProvider,
        CoreWSProvider,
    ];
}

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
