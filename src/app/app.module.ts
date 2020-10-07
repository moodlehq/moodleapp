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

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Import core services.
import { CoreAppProvider } from '@services/app';
import { CoreConfigProvider } from '@services/config';
import { CoreCronDelegate } from '@services/cron';
import { CoreDbProvider } from '@services/db';
import { CoreEventsProvider } from '@services/events';
import { CoreFileHelperProvider } from '@services/file-helper';
import { CoreFileSessionProvider } from '@services/file-session';
import { CoreFileProvider } from '@services/file';
import { CoreFilepoolProvider } from '@services/filepool';
import { CoreGeolocationProvider } from '@services/geolocation';
import { CoreGroupsProvider } from '@services/groups';
import { CoreInitDelegate } from '@services/init';
import { CoreLangProvider } from '@services/lang';
import { CoreLocalNotificationsProvider } from '@services/local-notifications';
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSitesProvider } from '@services/sites';
import { CoreSyncProvider } from '@services/sync';
import { CoreUpdateManager } from '@services/update-manager';
import { CoreWSProvider } from '@services/ws';
import { CoreDomUtilsProvider } from '@services/utils/dom';
import { CoreIframeUtilsProvider } from '@services/utils/iframe';
import { CoreMimetypeUtilsProvider } from '@services/utils/mimetype';
import { CoreTextUtilsProvider } from '@services/utils/text';
import { CoreTimeUtilsProvider } from '@services/utils/time';
import { CoreUrlUtilsProvider } from '@services/utils/url';
import { CoreUtilsProvider } from '@services/utils/utils';

import { CoreEmulatorModule } from '@core/emulator/emulator.module';
import { CoreLoginModule } from '@core/login/login.module';

import { setSingletonsInjector } from '@singletons/core.singletons';

@NgModule({
    declarations: [AppComponent],
    entryComponents: [],
    imports: [
        BrowserModule,
        IonicModule.forRoot(),
        AppRoutingModule,
        CoreEmulatorModule,
        CoreLoginModule,
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        CoreAppProvider,
        CoreConfigProvider,
        CoreCronDelegate,
        CoreDbProvider,
        CoreEventsProvider,
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
        CoreUpdateManager,
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
    constructor(injector: Injector,
            initDelegate: CoreInitDelegate,
            ) {

        // Set the injector.
        setSingletonsInjector(injector);

        // Execute the init processes.
        initDelegate.executeInitProcesses();
    }
}
