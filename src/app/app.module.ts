// (C) Copyright 2015 Martin Dougiamas
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

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { IonicApp, IonicModule, Platform } from 'ionic-angular';
import { HttpModule } from '@angular/http';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MoodleMobileApp } from './app.component';
import { CoreInterceptor } from '../classes/interceptor';
import { CoreLoggerProvider } from '../providers/logger';
import { CoreDbProvider } from '../providers/db';
import { CoreAppProvider } from '../providers/app';
import { CoreConfigProvider } from '../providers/config';
import { CoreLangProvider } from '../providers/lang';
import { CoreTextUtilsProvider } from '../providers/utils/text';
import { CoreDomUtilsProvider } from '../providers/utils/dom';
import { CoreTimeUtilsProvider } from '../providers/utils/time';
import { CoreUrlUtilsProvider } from '../providers/utils/url';
import { CoreUtilsProvider } from '../providers/utils/utils';
import { CoreMimetypeUtilsProvider } from '../providers/utils/mimetype';
import { CoreInitDelegate } from '../providers/init';
import { CoreFileProvider } from '../providers/file';
import { CoreWSProvider } from '../providers/ws';
import { CoreEventsProvider } from '../providers/events';
import { CoreSitesFactoryProvider } from '../providers/sites-factory';
import { CoreSitesProvider } from '../providers/sites';
import { CoreLocalNotificationsProvider } from '../providers/local-notifications';
import { CoreGroupsProvider } from '../providers/groups';
import { CoreCronDelegate } from '../providers/cron';
import { CoreFileSessionProvider } from '../providers/file-session';
import { CoreFilepoolProvider } from '../providers/filepool';
import { CoreUpdateManagerProvider } from '../providers/update-manager';
import { CorePluginFileDelegate } from '../providers/plugin-file-delegate';

import { CoreComponentsModule } from '../components/components.module';
import { CoreEmulatorModule } from '../core/emulator/emulator.module';
import { CoreLoginModule } from '../core/login/login.module';
import { CoreMainMenuModule } from '../core/mainmenu/mainmenu.module';
import { CoreCoursesModule } from '../core/courses/courses.module';
import { CoreFileUploaderModule } from '../core/fileuploader/fileuploader.module';
import { CoreSharedFilesModule } from '../core/sharedfiles/sharedfiles.module';
import { AddonCalendarModule } from '../addon/calendar/calendar.module';

// For translate loader. AoT requires an exported function for factories.
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

@NgModule({
    declarations: [
        MoodleMobileApp
    ],
    imports: [
        BrowserModule,
        HttpClientModule, // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        HttpModule,
        IonicModule.forRoot(MoodleMobileApp, {
            pageTransition: 'ios-transition'
        }),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        }),
        CoreEmulatorModule,
        CoreLoginModule,
        CoreMainMenuModule,
        CoreCoursesModule,
        CoreFileUploaderModule,
        CoreSharedFilesModule,
        CoreComponentsModule,
        AddonCalendarModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MoodleMobileApp
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: CoreInterceptor,
            multi: true,
        },
        CoreLoggerProvider,
        CoreDbProvider,
        CoreAppProvider,
        CoreConfigProvider,
        CoreLangProvider,
        CoreTextUtilsProvider,
        CoreDomUtilsProvider,
        CoreTimeUtilsProvider,
        CoreUrlUtilsProvider,
        CoreUtilsProvider,
        CoreMimetypeUtilsProvider,
        CoreInitDelegate,
        CoreFileProvider,
        CoreWSProvider,
        CoreEventsProvider,
        CoreSitesFactoryProvider,
        CoreSitesProvider,
        CoreLocalNotificationsProvider,
        CoreGroupsProvider,
        CoreCronDelegate,
        CoreFileSessionProvider,
        CoreFilepoolProvider,
        CoreUpdateManagerProvider,
        CorePluginFileDelegate
    ]
})
export class AppModule {
    constructor(platform: Platform, initDelegate: CoreInitDelegate, updateManager: CoreUpdateManagerProvider,
            sitesProvider: CoreSitesProvider) {
        // Register a handler for platform ready.
        initDelegate.registerProcess({
            name: 'CorePlatformReady',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 400,
            blocking: true,
            load: platform.ready
        });

        // Register the update manager as an init process.
        initDelegate.registerProcess(updateManager);

        // Restore the user's session during the init process.
        initDelegate.registerProcess({
            name: 'CoreRestoreSession',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 200,
            blocking: false,
            load: sitesProvider.restoreSession.bind(sitesProvider)
        });

        // Execute the init processes.
        initDelegate.executeInitProcesses();
    }
}
