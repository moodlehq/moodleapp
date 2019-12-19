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

import { Injector } from '@angular/core';
import { CoreSitePluginsQuizAccessRuleComponent } from '../../components/quiz-access-rule/quiz-access-rule';

/**
 * Handler to display a quiz access rule site plugin.
 */
export class CoreSitePluginsQuizAccessRuleHandler {

    constructor(public name: string, public ruleName: string, public hasTemplate: boolean) { }

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
        return this.hasTemplate;
    }

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
    getFixedPreflightData(quiz: any, preflightData: any, attempt?: any, prefetch?: boolean, siteId?: string): void | Promise<any> {
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
        if (this.hasTemplate) {
            return CoreSitePluginsQuizAccessRuleComponent;
        }
    }

    /**
     * Function called when the preflight check has passed. This is a chance to record that fact in some way.
     *
     * @param quiz The quiz the rule belongs to.
     * @param attempt The attempt started/continued.
     * @param preflightData Preflight data gathered.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done if async, void if it's synchronous.
     */
    notifyPreflightCheckPassed(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : void | Promise<any> {
        // Nothing to do.
    }

    /**
     * Function called when the preflight check fails. This is a chance to record that fact in some way.
     *
     * @param quiz The quiz the rule belongs to.
     * @param attempt The attempt started/continued.
     * @param preflightData Preflight data gathered.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done if async, void if it's synchronous.
     */
    notifyPreflightCheckFailed(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : void | Promise<any> {
        // Nothing to do.
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
        return false;
    }
}
