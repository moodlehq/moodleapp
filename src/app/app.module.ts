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

import { NgModule, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreInterceptor } from '@classes/interceptor';

// Import core services.
import { CoreAppProvider } from '@services/app';
import { CoreConfigProvider } from '@services/config';
import { CoreCronDelegate } from '@services/cron';
import { CoreDbProvider } from '@services/db';
import { CoreFileHelperProvider } from '@services/file-helper';
import { CoreFileSessionProvider } from '@services/file-session';
import { CoreFileProvider, CoreFile } from '@services/file';
import { CoreFilepoolProvider } from '@services/filepool';
import { CoreGeolocationProvider } from '@services/geolocation';
import { CoreGroupsProvider } from '@services/groups';
import { CoreInitDelegate, CoreInit } from '@services/init';
import { CoreLangProvider } from '@services/lang';
import { CoreLocalNotificationsProvider } from '@services/local-notifications';
import { CorePluginFileDelegate } from '@services/plugin-file.delegate';
import { CoreSitesProvider, CoreSites } from '@services/sites';
import { CoreSyncProvider } from '@services/sync';
import { CoreUpdateManagerProvider, CoreUpdateManager } from '@services/update-manager';
import { CoreWSProvider } from '@services/ws';
import { CoreDomUtilsProvider } from '@services/utils/dom';
import { CoreIframeUtilsProvider } from '@services/utils/iframe';
import { CoreMimetypeUtilsProvider } from '@services/utils/mimetype';
import { CoreTextUtilsProvider } from '@services/utils/text';
import { CoreTimeUtilsProvider } from '@services/utils/time';
import { CoreUrlUtilsProvider } from '@services/utils/url';
import { CoreUtilsProvider } from '@services/utils/utils';

// Import init DB functions of core services.
import { initCoreFilepoolDB } from '@services/filepool.db';
import { initCoreSitesDB } from '@services/sites.db';
import { initCoreSyncDB } from '@services/sync.db';
import { initCoreSearchHistoryDB } from '@features/search/services/search.history.db';

// Import core modules.
import { CoreEmulatorModule } from '@features/emulator/emulator.module';
import { CoreLoginModule } from '@features/login/login.module';
import { CoreCoursesModule } from '@features/courses/courses.module';
import { CoreSettingsInitModule } from '@features/settings/settings-init.module';
import { CoreFileUploaderInitModule } from '@features/fileuploader/fileuploader-init.module';

// Import addons init modules.
import { AddonPrivateFilesInitModule } from '@/addons/privatefiles/privatefiles-init.module';

import { setSingletonsInjector } from '@singletons/core.singletons';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// For translate loader. AoT requires an exported function for factories.
export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

@NgModule({
    declarations: [AppComponent],
    entryComponents: [],
    imports: [
        BrowserModule,
        IonicModule.forRoot(),
        HttpClientModule, // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient],
            },
        }),
        AppRoutingModule,
        CoreEmulatorModule,
        CoreLoginModule,
        CoreCoursesModule,
        CoreSettingsInitModule,
        CoreFileUploaderInitModule,
        AddonPrivateFilesInitModule,
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        { provide: HTTP_INTERCEPTORS, useClass: CoreInterceptor, multi: true },
        CoreAppProvider,
        CoreConfigProvider,
        CoreCronDelegate,
        CoreDbProvider,
        CoreFileHelperProvider,
        CoreFileSessionProvider,
        CoreFileProvider,
        CoreFilepoolProvider,
        CoreGeolocationProvider,
        CoreGroupsProvider,
        CoreInitDelegate,
        CoreLangProvider,
        CoreLocalNotificationsProvider,
        CorePluginFileDelegate,
        CoreSitesProvider,
        CoreSyncProvider,
        CoreUpdateManagerProvider,
        CoreWSProvider,
        CoreDomUtilsProvider,
        CoreIframeUtilsProvider,
        CoreMimetypeUtilsProvider,
        CoreTextUtilsProvider,
        CoreTimeUtilsProvider,
        CoreUrlUtilsProvider,
        CoreUtilsProvider,
    ],
    bootstrap: [AppComponent],
})
export class AppModule {

    constructor(injector: Injector, platform: Platform) {
        // Set the injector.
        setSingletonsInjector(injector);

        this.initCoreServicesDB();

        // Register a handler for platform ready.
        CoreInit.instance.registerProcess({
            name: 'CorePlatformReady',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 400,
            blocking: true,
            load: async () => {
                await platform.ready();
            },
        });

        // Register the update manager as an init process.
        CoreInit.instance.registerProcess(CoreUpdateManager.instance);

        // Restore the user's session during the init process.
        CoreInit.instance.registerProcess({
            name: 'CoreRestoreSession',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 200,
            blocking: false,
            load: CoreSites.instance.restoreSession.bind(CoreSites.instance),
        });

        // Register clear app tmp folder.
        CoreInit.instance.registerProcess({
            name: 'CoreClearTmpFolder',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 150,
            blocking: false,
            load: CoreFile.instance.clearTmpFolder.bind(CoreFile.instance),
        });

        // Execute the init processes.
        CoreInit.instance.executeInitProcesses();
    }

    /**
     * Init the DB of core services.
     */
    protected initCoreServicesDB(): void {
        initCoreFilepoolDB();
        initCoreSitesDB();
        initCoreSyncDB();
        initCoreSearchHistoryDB();
    }

}
