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

import { enableProdMode, importProvidersFrom, provideAppInitializer } from '@angular/core';

import { CoreConstants } from './core/constants';
import { AppComponent } from './app/app.component';
import { TestingModule } from '@/testing/testing.module';
import { AddonsModule } from '@addons/addons.module';
import { CoreModule } from '@/core/core.module';
import { AppRoutingModule } from './app/app-routing.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { withInterceptorsFromDi, provideHttpClient, HttpClient } from '@angular/common/http';
import { moodleTransitionAnimation } from '@classes/page-transition';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { CoreSiteInfoCronHandler } from '@services/handlers/site-info-cron';
import { CoreCronDelegate } from '@services/cron';
import { IonicRouteStrategy, IonicModule } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';

if (CoreConstants.BUILD.isProduction) {
    enableProdMode();
}

/**
 * For translate loader. AoT requires an exported function for factories.
 *
 * @param http Http client.
 * @returns Translate loader.
 */
export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            BrowserModule,
            IonicModule.forRoot({
                navAnimation: moodleTransitionAnimation,
                innerHTMLTemplatesEnabled: true,
                sanitizerEnabled: true,
            }),
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
        ),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideAppInitializer(() => {
            CoreCronDelegate.register(CoreSiteInfoCronHandler.instance);
        }),
        provideAnimations(),
        // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        provideHttpClient(withInterceptorsFromDi()),
    ],
}).catch(err => {
    // eslint-disable-next-line no-console
    console.log(err);
});
