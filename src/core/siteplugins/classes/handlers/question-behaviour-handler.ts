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

import { Injector } from '@angular/core';
import { CoreQuestionBehaviourBaseHandler } from '@core/question/classes/base-behaviour-handler';
import { CoreSitePluginsQuestionBehaviourComponent } from '../../components/question-behaviour/question-behaviour';
import { CoreQuestionProvider } from '@core/question/providers/question';

/**
 * Handler to display a question behaviour site plugin.
 */
export class CoreSitePluginsQuestionBehaviourHandler extends CoreQuestionBehaviourBaseHandler {

    constructor(questionProvider: CoreQuestionProvider, public name: string, public type: string, public hasTemplate: boolean) {
        super(questionProvider);
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question.
     * @return {any[]|Promise<any[]>} Components (or promise resolved with components) to render some extra data in the question
     *                                (e.g. certainty options). Don't return anything if no extra data is required.
     */
    handleQuestion(injector: Injector, question: any): any[] | Promise<any[]> {
        if (this.hasTemplate) {
            return [CoreSitePluginsQuestionBehaviourComponent];
        }
    }
}
