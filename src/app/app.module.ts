import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
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

// For translate loader. AoT requires an exported function for factories.
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './build/lang/', '.json');
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
        CoreConfigProvider
    ]
})
export class AppModule {}
