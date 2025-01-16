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

import { Injectable, Type } from '@angular/core';

import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { CoreQuestionHelper, CoreQuestionQuestion } from '@features/question/services/question-helper';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';

/**
 * Handler to support drag-and-drop markers question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDdMarkerHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeDdMarker';
    type = 'qtype_ddmarker';

    /**
     * @inheritdoc
     */
    getBehaviour(question: CoreQuestionQuestionParsed, behaviour: string): string {
        if (behaviour === 'interactive') {
            return 'interactivecountback';
        }

        return behaviour;
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeDdMarkerComponent } = await import('../../component/ddmarker');

        return AddonQtypeDdMarkerComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        // If 1 dragitem is set we assume the answer is complete (like Moodle does).
        for (const name in answers) {
            if (name !== ':sequencecheck' && answers[name]) {
                return 1;
            }
        }

        return 0;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isGradableResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        return this.isCompleteResponse(question, answers);
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        return CoreQuestion.compareAllAnswers(prevAnswers, newAnswers);
    }

    /**
     * @inheritdoc
     */
    getAdditionalDownloadableFiles(question: CoreQuestionQuestionParsed, usageId?: number): CoreWSFile[] {
        const treatedQuestion: CoreQuestionQuestion = question;

        CoreQuestionHelper.extractQuestionScripts(treatedQuestion, usageId);

        if (treatedQuestion.amdArgs && typeof treatedQuestion.amdArgs[1] === 'string') {
            // Moodle 3.6+.
            return [{
                fileurl: treatedQuestion.amdArgs[1],
            }];
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        if (this.isCompleteResponse(question, answers)) {
            return;
        }

        return Translate.instant('addon.qtype_ddmarker.pleasedragatleastonemarker');
    }

}

export const AddonQtypeDdMarkerHandler = makeSingleton(AddonQtypeDdMarkerHandlerService);
