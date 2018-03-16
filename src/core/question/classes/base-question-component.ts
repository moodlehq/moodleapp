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

import { Input, EventEmitter } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';

/**
 * Base class for components to render a question.
 */
export class CoreQuestionBaseComponent {
    @Input() question: any; // The question to render.
    @Input() component: string; // The component the question belongs to.
    @Input() componentId: number; // ID of the component the question belongs to.
    @Input() attemptId: number; // Attempt ID.
    @Input() offlineEnabled?: boolean | string; // Whether the question can be answered in offline.
    @Input() buttonClicked: EventEmitter<any>; // Should emit an event when a behaviour button is clicked.
    @Input() onAbort: EventEmitter<void>; // Should emit an event if the question should be aborted.

    protected logger;

    constructor(logger: CoreLoggerProvider, logName: string, protected questionHelper: CoreQuestionHelperProvider,
            protected domUtils: CoreDomUtilsProvider) {
        this.logger = logger.getInstance(logName);
    }

    /**
     * Initialize the component and the question text.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initComponent(): void | HTMLElement {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return this.questionHelper.showComponentError(this.onAbort);
        }

        const div = document.createElement('div');
        div.innerHTML = this.question.html;

        // Extract question text.
        this.question.text = this.domUtils.getContentsOfElement(div, '.qtext');
        if (typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        return div;
    }

    /**
     * Initialize a question component that has an input of type "text".
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initInputTextComponent(): void | HTMLElement {
        const questionDiv = this.initComponent();
        if (questionDiv) {
            // Get the input element.
            const input = <HTMLInputElement> questionDiv.querySelector('input[type="text"][name*=answer]');
            if (!input) {
                this.logger.warn('Aborting because couldn\'t find input.', this.question.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }

            this.question.input = {
                id: input.id,
                name: input.name,
                value: input.value,
                readOnly: input.readOnly
            };

            // Check if question is marked as correct.
            if (input.className.indexOf('incorrect') >= 0) {
                this.question.input.isCorrect = 0;
            } else if (input.className.indexOf('correct') >= 0) {
                this.question.input.isCorrect = 1;
            }
        }

        return questionDiv;
    }
}
