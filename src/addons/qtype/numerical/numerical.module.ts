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

import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { AddonQtypeNumericalHandler } from './services/handlers/numerical';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonQtypeNumericalComponent } from './component/numerical';

@NgModule({
    imports: [
        CoreSharedModule,
        AddonQtypeNumericalComponent,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreQuestionDelegate.registerHandler(AddonQtypeNumericalHandler.instance);
            },
        },
    ],
    exports: [
        AddonQtypeNumericalComponent,
    ],
})
export class AddonQtypeNumericalModule {}
