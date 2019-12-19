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

import { Component, OnInit, OnDestroy, Injector, ElementRef, ViewChild } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';
import { AddonQtypeDdwtosQuestion } from '../classes/ddwtos';

/**
 * Component to render a drag-and-drop words into sentences question.
 */
@Component({
    selector: 'addon-qtype-ddwtos',
    templateUrl: 'addon-qtype-ddwtos.html'
})
export class AddonQtypeDdwtosComponent extends CoreQuestionBaseComponent implements OnInit, OnDestroy {
    @ViewChild('questiontext') questionTextEl: ElementRef;

    protected element: HTMLElement;
    protected questionInstance: AddonQtypeDdwtosQuestion;
    protected inputIds: string[] = []; // Ids of the inputs of the question (where the answers will be stored).
    protected destroyed = false;
    protected textIsRendered = false;
    protected answerAreRendered = false;

    constructor(protected loggerProvider: CoreLoggerProvider, injector: Injector, element: ElementRef) {
        super(loggerProvider, 'AddonQtypeDdwtosComponent', injector);

        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return this.questionHelper.showComponentError(this.onAbort);
        }

        const element = this.domUtils.convertToElement(this.question.html);

        // Replace Moodle's correct/incorrect and feedback classes with our own.
        this.questionHelper.replaceCorrectnessClasses(element);
        this.questionHelper.replaceFeedbackClasses(element);

        // Treat the correct/incorrect icons.
        this.questionHelper.treatCorrectnessIcons(element);

        const answerContainer = element.querySelector('.answercontainer');
        if (!answerContainer) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        this.question.readOnly = answerContainer.classList.contains('readonly');
        this.question.answers = answerContainer.outerHTML;

        this.question.text = this.domUtils.getContentsOfElement(element, '.qtext');
        if (typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        // Get the inputs where the answers will be stored and add them to the question text.
        const inputEls = <HTMLElement[]> Array.from(element.querySelectorAll('input[type="hidden"]:not([name*=sequencecheck])'));

        inputEls.forEach((inputEl) => {
            this.question.text += inputEl.outerHTML;
            this.inputIds.push(inputEl.getAttribute('id'));
        });

        this.question.loaded = false;
    }

    /**
     * The question answers have been rendered.
     */
    answersRendered(): void {
        this.answerAreRendered = true;
        if (this.textIsRendered) {
            this.questionRendered();
        }
    }

    /**
     * The question text has been rendered.
     */
    textRendered(): void {
        this.textIsRendered = true;
        if (this.answerAreRendered) {
            this.questionRendered();
        }
    }

    /**
     * The question has been rendered.
     */
    protected questionRendered(): void {
        if (!this.destroyed) {
            this.domUtils.waitForImages(this.questionTextEl.nativeElement).then(() => {
                // Create the instance.
                this.questionInstance = new AddonQtypeDdwtosQuestion(this.loggerProvider, this.domUtils, this.element,
                        this.question, this.question.readOnly, this.inputIds, this.textUtils);

                this.questionHelper.treatCorrectnessIconsClicks(this.element, this.component, this.componentId, this.contextLevel,
                        this.contextInstanceId, this.courseId);

                this.question.loaded = true;
            });
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.questionInstance && this.questionInstance.destroy();
    }
}
