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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { CoreModule } from '@/core/core.module';
import { AddonsModule } from '@addons/addons.module';

import { AppRoutingModule } from './app-routing.module';

import { CoreCronDelegate } from '@services/cron';
import { CoreSiteInfoCronHandler } from '@services/handlers/site-info-cron';
import { moodleTransitionAnimation } from '@classes/page-transition';
import { TestingModule } from '@/testing/testing.module';

// Initialize debug console capture early
import '@services/debug-console';

/**
 * For translate loader. AoT requires an exported function for factories.
 *
 * @param http Http client.
 * @returns Translate loader.
 */
export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        IonicModule.forRoot(
            {
                navAnimation: moodleTransitionAnimation,
                innerHTMLTemplatesEnabled: true,
                sanitizerEnabled: true,
            },
        ),
        HttpClientModule, // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient],
            },
        }),
        AppRoutingModule,
        CoreModule,
        AddonsModule,
        TestingModule,
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCronDelegate.register(CoreSiteInfoCronHandler.instance);
            },
        },
    ],
})
export class AppModule {}
