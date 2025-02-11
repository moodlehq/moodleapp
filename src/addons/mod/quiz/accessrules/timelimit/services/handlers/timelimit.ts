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

import { AddonModQuizAccessRuleHandler } from '@addons/mod/quiz/services/access-rules-delegate';
import { AddonModQuizAttemptWSData, AddonModQuizQuizWSData } from '@addons/mod/quiz/services/quiz';
import { makeSingleton } from '@singletons';

/**
 * Handler to support time limit access rule.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizAccessTimeLimitHandlerService implements AddonModQuizAccessRuleHandler {

    name = 'AddonModQuizAccessTimeLimit';
    ruleName = 'quizaccess_timelimit';

    /**
     * @inheritdoc
     */
    async getPreflightComponent(): Promise<Type<unknown>> {
        const { AddonModQuizAccessTimeLimitComponent } = await import('../../component/timelimit');

        return AddonModQuizAccessTimeLimitComponent;
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
    isPreflightCheckRequired(
        quiz: AddonModQuizQuizWSData,
        attempt?: AddonModQuizAttemptWSData,
    ): boolean | Promise<boolean> {
        // Warning only required if the attempt is not already started.
        return !attempt;
    }

    /**
     * @inheritdoc
     */
    shouldShowTimeLeft(attempt: AddonModQuizAttemptWSData, endTime: number, timeNow: number): boolean {
        // If this is a teacher preview after the time limit expires, don't show the time left.
        return !(attempt.preview && timeNow > endTime);
    }

}

export const AddonModQuizAccessTimeLimitHandler = makeSingleton(AddonModQuizAccessTimeLimitHandlerService);
