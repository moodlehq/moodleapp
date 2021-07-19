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

import { Type } from '@angular/core';

import { CoreQuestionBehaviourBaseHandler } from '@features/question/classes/base-behaviour-handler';
import { CoreSitePluginsQuestionBehaviourComponent } from '@features/siteplugins/components/question-behaviour/question-behaviour';

/**
 * Handler to display a question behaviour site plugin.
 */
export class CoreSitePluginsQuestionBehaviourHandler extends CoreQuestionBehaviourBaseHandler {

    constructor(public name: string, public type: string, public hasTemplate: boolean) {
        super();
    }

    /**
     * @inheritdoc
     */
    handleQuestion(): undefined | Type<unknown>[] {
        if (this.hasTemplate) {
            return [CoreSitePluginsQuestionBehaviourComponent];
        }
    }

}
