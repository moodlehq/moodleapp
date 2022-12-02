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
import { AddonModQuizAccessOfflineAttemptsComponent } from '../../component/offlineattempts';
import { AddonModQuizSync } from '@addons/mod/quiz/services/quiz-sync';
import { makeSingleton } from '@singletons';

/**
 * Handler to support offline attempts access rule.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizAccessOfflineAttemptsHandlerService implements AddonModQuizAccessRuleHandler {

    name = 'AddonModQuizAccessOfflineAttempts';
    ruleName = 'quizaccess_offlineattempts';

    /**
     * @inheritdoc
     */
    getFixedPreflightData(
        quiz: AddonModQuizQuizWSData,
        preflightData: Record<string, string>,
    ): void | Promise<void> {
        preflightData.confirmdatasaved = '1';
    }

    /**
     * @inheritdoc
     */
    getPreflightComponent(): Type<unknown> | Promise<Type<unknown>> {
        return AddonModQuizAccessOfflineAttemptsComponent;
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
    async isPreflightCheckRequired(
        quiz: AddonModQuizQuizWSData,
        attempt?: AddonModQuizAttemptWSData,
        prefetch?: boolean,
    ): Promise<boolean> {
        if (prefetch) {
            // Don't show the warning if the user is prefetching.
            return false;
        }

        if (!attempt) {
            // User is starting a new attempt, show the warning.
            return true;
        }

        const syncTime = await AddonModQuizSync.getSyncTime(quiz.id);

        // Show warning if last sync was a while ago.
        return Date.now() - AddonModQuizSync.syncInterval > syncTime;
    }

}

export const AddonModQuizAccessOfflineAttemptsHandler = makeSingleton(AddonModQuizAccessOfflineAttemptsHandlerService);
