
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

import { Injectable } from '@angular/core';
import { AddonModQuizAccessRuleHandler } from '../../../providers/access-rules-delegate';
import { AddonModQuizProvider } from '../../../providers/quiz';

/**
 * Handler to support open/close date access rule.
 */
@Injectable()
export class AddonModQuizAccessOpenCloseDateHandler implements AddonModQuizAccessRuleHandler {
    name = 'AddonModQuizAccessOpenCloseDate';
    ruleName = 'quizaccess_openclosedate';

    constructor() {
        // Nothing to do.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether the rule requires a preflight check when prefetch/start/continue an attempt.
     *
     * @param {any} quiz The quiz the rule belongs to.
     * @param {any} [attempt] The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param {boolean} [prefetch] Whether the user is prefetching the quiz.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {boolean|Promise<boolean>} Whether the rule requires a preflight check.
     */
    isPreflightCheckRequired(quiz: any, attempt?: any, prefetch?: boolean, siteId?: string): boolean | Promise<boolean> {
        return false;
    }

    /**
     * Whether or not the time left of an attempt should be displayed.
     *
     * @param {any} attempt The attempt.
     * @param {number} endTime The attempt end time (in seconds).
     * @param {number} timeNow The current time in seconds.
     * @return {boolean} Whether it should be displayed.
     */
    shouldShowTimeLeft(attempt: any, endTime: number, timeNow: number): boolean {
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
