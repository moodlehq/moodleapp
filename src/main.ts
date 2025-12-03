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
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { moodleTransitionAnimation } from '@classes/page-transition';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { CoreSiteInfoCronHandler } from '@services/handlers/site-info-cron';
import { CoreCronDelegate } from '@services/cron';
import { IonicRouteStrategy, IonicModule } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { coreInterceptorFn } from '@classes/interceptor';

if (CoreConstants.BUILD.isProduction) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            BrowserModule,
            IonicModule.forRoot({
                navAnimation: moodleTransitionAnimation,
                innerHTMLTemplatesEnabled: true,
                sanitizerEnabled: true,
                useSetInputAPI: true,
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
        provideTranslateService({
            loader: provideTranslateHttpLoader({ prefix:'./assets/lang/', suffix:'.json' }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        provideAnimations(),
        // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        provideHttpClient(withInterceptors([coreInterceptorFn])),
    ],
}).catch(err => {
    // eslint-disable-next-line no-console
    console.log(err);
});
