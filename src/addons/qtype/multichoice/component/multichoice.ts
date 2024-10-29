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

import { Component, ElementRef } from '@angular/core';

import { AddonModQuizMultichoiceQuestion, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';

/**
 * Component to render a multichoice question.
 */
@Component({
    selector: 'addon-qtype-multichoice',
    templateUrl: 'addon-qtype-multichoice.html',
    styleUrl: 'multichoice.scss',
})
export class AddonQtypeMultichoiceComponent extends CoreQuestionBaseComponent<AddonModQuizMultichoiceQuestion> {

    constructor(elementRef: ElementRef) {
        super('AddonQtypeMultichoiceComponent', elementRef);
    }

    /**
     * @inheritdoc
     */
    init(): void {
        this.initMultichoiceComponent();
    }

    /**
     * Clear selected choices.
     */
    clear(): void {
        if (!this.question) {
            return;
        }

        this.question.singleChoiceModel = undefined;
    }

}
