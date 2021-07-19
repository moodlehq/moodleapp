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
     * Add preflight data that doesn't require user interaction. The data should be added to the preflightData param.
     *
     * @param quiz The quiz the rule belongs to.
     * @param preflightData Object where to add the preflight data.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done if async, void if it's synchronous.
     */
    getFixedPreflightData(
        quiz: AddonModQuizQuizWSData,
        preflightData: Record<string, string>,
    ): void | Promise<void> {
        preflightData.confirmdatasaved = '1';
    }

    /**
     * Return the Component to use to display the access rule preflight.
     * Implement this if your access rule requires a preflight check with user interaction.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getPreflightComponent(): Type<unknown> | Promise<Type<unknown>> {
        return AddonModQuizAccessOfflineAttemptsComponent;
    }

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
    async isPreflightCheckRequired(
        quiz: AddonModQuizQuizWSData,
        attempt?: AddonModQuizAttemptWSData,
        prefetch?: boolean,
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
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
