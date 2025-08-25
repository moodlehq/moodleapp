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

import { Component, OnDestroy, ElementRef, viewChild } from '@angular/core';

import { AddonModQuizQuestionBasicData, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreWait } from '@singletons/wait';
import { AddonQtypeDdwtosQuestion } from '../classes/ddwtos';
import { CoreText } from '@singletons/text';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render a drag-and-drop words into sentences question.
 */
@Component({
    selector: 'addon-qtype-ddwtos',
    templateUrl: 'addon-qtype-ddwtos.html',
    styleUrls: ['../../../../core/features/question/question.scss', 'ddwtos.scss'],
    imports: [
        CoreSharedModule,
    ],
})
export class AddonQtypeDdwtosComponent extends CoreQuestionBaseComponent<AddonModQuizDdwtosQuestionData> implements OnDestroy {

    readonly questionTextEl = viewChild<ElementRef>('questiontext');

    protected questionInstance?: AddonQtypeDdwtosQuestion;
    protected inputIds: string[] = []; // Ids of the inputs of the question (where the answers will be stored).
    protected destroyed = false;
    protected textIsRendered = false;
    protected answerAreRendered = false;

    /**
     * @inheritdoc
     */
    init(): void {
        if (!this.question) {
            this.onReadyPromise.resolve();

            return;
        }

        const questionElement = this.initComponent();
        if (!questionElement) {
            this.onReadyPromise.resolve();

            return;
        }

        // Replace Moodle's correct/incorrect and feedback classes with our own.
        CoreQuestionHelper.replaceCorrectnessClasses(questionElement);
        CoreQuestionHelper.replaceFeedbackClasses(questionElement);

        // Treat the correct/incorrect icons.
        CoreQuestionHelper.treatCorrectnessIcons(questionElement);

        const answerContainer = questionElement.querySelector('.answercontainer');
        if (!answerContainer) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);
            this.onReadyPromise.resolve();

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        this.question.readOnly = answerContainer.classList.contains('readonly');

        // Decode content of drag homes. This must be done before filters are applied, otherwise some things don't work as expected.
        const groupItems = Array.from(answerContainer.querySelectorAll<HTMLElement>('span.draghome'));
        groupItems.forEach((item) => {
            item.innerHTML = CoreText.decodeHTML(item.innerHTML);
        });

        // Add the drags container inside the answers so it's rendered inside core-format-text,
        // otherwise some styles could be different between the drag homes and the draggables.
        this.question.answers = `${answerContainer.outerHTML}<div class="drags"></div>`;

        // Get the inputs where the answers will be stored and add them to the question text.
        const inputEls = Array.from(
            questionElement.querySelectorAll<HTMLInputElement>('input[type="hidden"]:not([name*=sequencecheck])'),
        );

        let questionText = this.question.text;
        inputEls.forEach((inputEl) => {
            questionText += inputEl.outerHTML;
            const id = inputEl.getAttribute('id');
            if (id) {
                this.inputIds.push(id);
            }
        });

        this.question.text = questionText;

        this.question.loaded = false;
        this.onReadyPromise.resolve();
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
    protected async questionRendered(): Promise<void> {
        if (this.destroyed || !this.question) {
            return;
        }

        const questionTextEl = this.questionTextEl();
        if (questionTextEl) {
            await CoreWait.waitForImages(questionTextEl.nativeElement);
        }

        // Create the instance.
        this.questionInstance = new AddonQtypeDdwtosQuestion(
            this.hostElement,
            this.question,
            !!this.question.readOnly,
            this.inputIds,
        );

        CoreQuestionHelper.treatCorrectnessIconsClicks(
            this.hostElement,
            this.component,
            this.componentId,
            this.contextLevel,
            this.contextInstanceId,
            this.courseId,
        );

        this.question.loaded = true;

    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.questionInstance?.destroy();
    }

}

/**
 * Data for DD WtoS question.
 */
export type AddonModQuizDdwtosQuestionData = AddonModQuizQuestionBasicData & {
    loaded?: boolean;
    readOnly?: boolean;
    answers?: string;
};
