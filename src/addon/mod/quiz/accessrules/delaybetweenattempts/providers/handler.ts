
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
import { AddonModQuizAccessRuleHandler } from '../../../providers/access-rules-delegate';

/**
 * Handler to support delay between attempts access rule.
 */
@Injectable()
export class AddonModQuizAccessDelayBetweenAttemptsHandler implements AddonModQuizAccessRuleHandler {
    name = 'AddonModQuizAccessDelayBetweenAttempts';
    ruleName = 'quizaccess_delaybetweenattempts';

    constructor() {
        // Nothing to do.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
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
    isPreflightCheckRequired(quiz: any, attempt?: any, prefetch?: boolean, siteId?: string): boolean | Promise<boolean> {
        return false;
    }
}
