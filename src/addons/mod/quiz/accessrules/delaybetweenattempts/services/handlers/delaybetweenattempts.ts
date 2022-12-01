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
import { makeSingleton } from '@singletons';

/**
 * Handler to support delay between attempts access rule.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizAccessDelayBetweenAttemptsHandlerService implements AddonModQuizAccessRuleHandler {

    name = 'AddonModQuizAccessDelayBetweenAttempts';
    ruleName = 'quizaccess_delaybetweenattempts';

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

}

export const AddonModQuizAccessDelayBetweenAttemptsHandler = makeSingleton(AddonModQuizAccessDelayBetweenAttemptsHandlerService);
