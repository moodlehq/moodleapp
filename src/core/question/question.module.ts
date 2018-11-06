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
import { CoreQuestionProvider } from './providers/question';
import { CoreQuestionDelegate } from './providers/delegate';
import { CoreQuestionBehaviourDelegate } from './providers/behaviour-delegate';
import { CoreQuestionDefaultHandler } from './providers/default-question-handler';
import { CoreQuestionBehaviourDefaultHandler } from './providers/default-behaviour-handler';
import { CoreQuestionHelperProvider } from './providers/helper';

// List of providers (without handlers).
export const CORE_QUESTION_PROVIDERS: any[] = [
    CoreQuestionProvider,
    CoreQuestionDelegate,
    CoreQuestionBehaviourDelegate,
    CoreQuestionHelperProvider
];

@NgModule({
    declarations: [],
    imports: [
    ],
    providers: [
        CoreQuestionProvider,
        CoreQuestionDelegate,
        CoreQuestionBehaviourDelegate,
        CoreQuestionHelperProvider,
        CoreQuestionDefaultHandler,
        CoreQuestionBehaviourDefaultHandler
    ],
    exports: []
})
export class CoreQuestionModule {}
