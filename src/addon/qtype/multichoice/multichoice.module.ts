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

import { NgModule } from '@angular/core';
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CoreComponentsModule } from '@components/components.module';
import { AddonQtypeMultichoiceHandler } from './providers/handler';
import { AddonQtypeMultichoiceComponent } from './component/multichoice';

@NgModule({
    declarations: [
        AddonQtypeMultichoiceComponent
    ],
    imports: [
        IonicModule,
        TranslateModule.forChild(),
        CoreComponentsModule,
        CoreDirectivesModule
    ],
    providers: [
        AddonQtypeMultichoiceHandler
    ],
    exports: [
        AddonQtypeMultichoiceComponent
    ],
    entryComponents: [
        AddonQtypeMultichoiceComponent
    ]
})
export class AddonQtypeMultichoiceModule {
    constructor(questionDelegate: CoreQuestionDelegate, handler: AddonQtypeMultichoiceHandler) {
        questionDelegate.registerHandler(handler);
    }
}
