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
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { makeSingleton } from '@singletons';
import { CoreSites } from '@services/sites';
import { QuestionCompleteGradableResponse } from '@features/question/constants';

/**
 * Handler to support ordering question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeOrderingHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeOrdering';
    type = 'qtype_ordering';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeOrderingComponent } = await import('@addons/qtype/ordering/component/ordering');

        return AddonQtypeOrderingComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(): QuestionCompleteGradableResponse {
        return QuestionCompleteGradableResponse.YES;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return !!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.4');
    }

    /**
     * @inheritdoc
     */
    isGradableResponse(): QuestionCompleteGradableResponse {
        return QuestionCompleteGradableResponse.YES;
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

}

export const AddonQtypeOrderingHandler = makeSingleton(AddonQtypeOrderingHandlerService);
