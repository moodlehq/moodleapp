
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

import { Injectable, Injector } from '@angular/core';
import { AddonModQuizAccessRuleHandler } from '../../../providers/access-rules-delegate';
import { AddonModQuizAccessTimeLimitComponent } from '../component/timelimit';

/**
 * Handler to support time limit access rule.
 */
@Injectable()
export class AddonModQuizAccessTimeLimitHandler implements AddonModQuizAccessRuleHandler {
    name = 'AddonModQuizAccessTimeLimit';
    ruleName = 'quizaccess_timelimit';

    constructor() {
        // Nothing to do.
    }

    /**
     * Return the Component to use to display the access rule preflight.
     * Implement this if your access rule requires a preflight check with user interaction.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getPreflightComponent(injector: Injector): any | Promise<any> {
        return AddonModQuizAccessTimeLimitComponent;
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
        // Warning only required if the attempt is not already started.
        return !attempt;
    }

    /**
     * Whether or not the time left of an attempt should be displayed.
     *
     * @param attempt The attempt.
     * @param endTime The attempt end time (in seconds).
     * @param timeNow The current time in seconds.
     * @return Whether it should be displayed.
     */
    shouldShowTimeLeft(attempt: any, endTime: number, timeNow: number): boolean {
        // If this is a teacher preview after the time limit expires, don't show the time left.
        return !(attempt.preview && timeNow > endTime);
    }
}
