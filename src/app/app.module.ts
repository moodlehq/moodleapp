import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClient } from '@angular/common/http';

import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { SQLite } from '@ionic-native/sqlite';
import { Keyboard } from '@ionic-native/keyboard';
import { Network } from '@ionic-native/network';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MyApp } from './app.component';
import { CoreLoggerProvider } from '../providers/logger';
import { CoreDbProvider } from '../providers/db';
import { CoreAppProvider } from '../providers/app';
import { CoreConfigProvider } from '../providers/config';

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
        IonicModule.forRoot(MyApp),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        })
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
        Network,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        CoreLoggerProvider,
        CoreDbProvider,
        CoreAppProvider,
        CoreConfigProvider,
    ]
})
export class AppModule {}
