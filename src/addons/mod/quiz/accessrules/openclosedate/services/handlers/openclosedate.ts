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

import { Injectable } from '@angular/core';

import { AddonModQuizAccessRuleHandler } from '@addons/mod/quiz/services/access-rules-delegate';
import { AddonModQuizAttemptWSData, AddonModQuizProvider } from '@addons/mod/quiz/services/quiz';
import { makeSingleton } from '@singletons';

/**
 * Handler to support open/close date access rule.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizAccessOpenCloseDateHandlerService implements AddonModQuizAccessRuleHandler {

    name = 'AddonModQuizAccessOpenCloseDate';
    ruleName = 'quizaccess_openclosedate';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isPreflightCheckRequired(): boolean | Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    shouldShowTimeLeft(attempt: AddonModQuizAttemptWSData, endTime: number, timeNow: number): boolean {
        // If this is a teacher preview after the close date, do not show the time.
        if (attempt.preview && timeNow > endTime) {
            return false;
        }

        // Show the time left only if it's less than QUIZ_SHOW_TIME_BEFORE_DEADLINE.
        if (timeNow > endTime - AddonModQuizProvider.QUIZ_SHOW_TIME_BEFORE_DEADLINE) {
            return true;
        }

        return false;
    }

}

export const AddonModQuizAccessOpenCloseDateHandler = makeSingleton(AddonModQuizAccessOpenCloseDateHandlerService);
