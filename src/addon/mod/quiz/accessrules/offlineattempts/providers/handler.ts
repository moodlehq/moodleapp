
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

import { Injectable, Injector } from '@angular/core';
import { AddonModQuizAccessRuleHandler } from '../../../providers/access-rules-delegate';
import { AddonModQuizSyncProvider } from '../../../providers/quiz-sync';
import { AddonModQuizAccessOfflineAttemptsComponent } from '../component/offlineattempts';

/**
 * Handler to support offline attempts access rule.
 */
@Injectable()
export class AddonModQuizAccessOfflineAttemptsHandler implements AddonModQuizAccessRuleHandler {
    name = 'AddonModQuizAccessOfflineAttempts';
    ruleName = 'quizaccess_offlineattempts';

    constructor(protected quizSync: AddonModQuizSyncProvider) {
        // Nothing to do.
    }

    /**
     * Add preflight data that doesn't require user interaction. The data should be added to the preflightData param.
     *
     * @param {any} quiz The quiz the rule belongs to.
     * @param {any} preflightData Object where to add the preflight data.
     * @param {any} [attempt] The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param {boolean} [prefetch] Whether the user is prefetching the quiz.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} Promise resolved when done if async, void if it's synchronous.
     */
    getFixedPreflightData(quiz: any, preflightData: any, attempt?: any, prefetch?: boolean, siteId?: string): void | Promise<any> {
        preflightData.confirmdatasaved = 1;
    }

    /**
     * Return the Component to use to display the access rule preflight.
     * Implement this if your access rule requires a preflight check with user interaction.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getPreflightComponent(injector: Injector): any | Promise<any> {
        return AddonModQuizAccessOfflineAttemptsComponent;
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
        if (prefetch) {
            // Don't show the warning if the user is prefetching.
            return false;
        }

        if (!attempt) {
            // User is starting a new attempt, show the warning.
            return true;
        }

        // Show warning if last sync was a while ago.
        return Date.now() - this.quizSync.syncInterval > quiz.syncTime;
    }
}
