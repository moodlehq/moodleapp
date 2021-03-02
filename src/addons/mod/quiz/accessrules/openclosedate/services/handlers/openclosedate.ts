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
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether the rule requires a preflight check when prefetch/start/continue an attempt.
     *
     * @param quiz The quiz the rule belongs to.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Whether the rule requires a preflight check.
     */
    isPreflightCheckRequired(): boolean | Promise<boolean> {
        return false;
    }

    /**
     * Whether or not the time left of an attempt should be displayed.
     *
     * @param attempt The attempt.
     * @param endTime The attempt end time (in seconds).
     * @param timeNow The current time in seconds.
     * @return Whether it should be displayed.
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
