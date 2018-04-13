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
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AddonModQuizAccessTimeLimitHandler } from './providers/handler';
import { AddonModQuizAccessTimeLimitComponent } from './component/timelimit';
import { AddonModQuizAccessRuleDelegate } from '../../providers/access-rules-delegate';

@NgModule({
    declarations: [
        AddonModQuizAccessTimeLimitComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
    ],
    providers: [
        AddonModQuizAccessTimeLimitHandler
    ],
    exports: [
        AddonModQuizAccessTimeLimitComponent
    ],
    entryComponents: [
        AddonModQuizAccessTimeLimitComponent
    ]
})
export class AddonModQuizAccessTimeLimitModule {
    constructor(accessRuleDelegate: AddonModQuizAccessRuleDelegate, handler: AddonModQuizAccessTimeLimitHandler) {
        accessRuleDelegate.registerHandler(handler);
    }
}
