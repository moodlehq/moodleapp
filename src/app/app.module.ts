import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule, Platform } from 'ionic-angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { SQLite } from '@ionic-native/sqlite';
import { Keyboard } from '@ionic-native/keyboard';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MyApp } from './app.component';
import { CoreLoggerProvider } from '../providers/logger';
import { CoreDbProvider } from '../providers/db';
import { CoreAppProvider } from '../providers/app';
import { CoreConfigProvider } from '../providers/config';
import { CoreEmulatorModule } from '../core/emulator/emulator.module';
import { CoreLangProvider } from '../providers/lang';
import { CoreTextUtilsProvider } from '../providers/utils/text';
import { CoreDomUtilsProvider } from '../providers/utils/dom';
import { CoreTimeUtilsProvider } from '../providers/utils/time';
import { CoreUrlUtilsProvider } from '../providers/utils/url';
import { CoreUtilsProvider } from '../providers/utils/utils';
import { CoreMimetypeUtilsProvider } from '../providers/utils/mimetype';
import { CoreInitDelegate } from '../providers/init';

// For translate loader. AoT requires an exported function for factories.
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

@NgModule({
    declarations: [
        MyApp
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        IonicModule.forRoot(MyApp),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        }),
        CoreEmulatorModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp
    ],
    providers: [
        StatusBar,
        SplashScreen,
        SQLite,
        Keyboard,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
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
        CoreInitDelegate
    ]
})
export class AppModule {
    constructor(platform: Platform, initDelegate: CoreInitDelegate) {
        // Create a handler for platform ready and register it in the init delegate.
        let handler = {
            name: 'CorePlatformReady',
            priority: initDelegate.MAX_RECOMMENDED_PRIORITY + 400,
            blocking: true,
            load: platform.ready
        };
        initDelegate.registerProcess(handler);

        // Execute the init processes.
        initDelegate.executeInitProcesses();
    }
}
