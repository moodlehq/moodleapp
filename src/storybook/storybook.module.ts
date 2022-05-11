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

import { IonicModule } from '@ionic/angular';
import { NgModule, ApplicationInitStatus, APP_INITIALIZER } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import englishTranslations from '@/assets/lang/en.json';
import { CoreApplicationInitStatus } from '@classes/application-init-status';
import { Translate } from '@singletons';

// For translate loader. AoT requires an exported function for factories.
export class StaticTranslateLoader extends TranslateLoader {

    getTranslation(): Observable<typeof englishTranslations> {
        return of(englishTranslations);
    }

}

/**
 * Module declaring dependencies for Storybook components.
 */
@NgModule({
    imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useClass: StaticTranslateLoader,
            },
        }),
    ],
    providers: [
        { provide: ApplicationInitStatus, useClass: CoreApplicationInitStatus },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                Translate.setDefaultLang('en');
                Translate.use('en');
            },
        },
    ],
    exports: [
        IonicModule,
        TranslateModule,
    ],
})
export class StorybookModule {}
