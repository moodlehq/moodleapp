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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

/**
 * Interface that all access rules handlers must implement.
 */
export interface AddonModQuizAccessRuleHandler extends CoreDelegateHandler {

    /**
     * Name of the rule the handler supports. E.g. 'password'.
     */
    ruleName: string;

    /**
     * Whether the rule requires a preflight check when prefetch/start/continue an attempt.
     *
     * @param quiz The quiz the rule belongs to.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Whether the rule requires a preflight check.
     */
    isPreflightCheckRequired(quiz: any, attempt?: any, prefetch?: boolean, siteId?: string): boolean | Promise<boolean>;

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
    getFixedPreflightData?(quiz: any, preflightData: any, attempt?: any, prefetch?: boolean, siteId?: string): void | Promise<any>;

    /**
     * Return the Component to use to display the access rule preflight.
     * Implement this if your access rule requires a preflight check with user interaction.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getPreflightComponent?(injector: Injector): any | Promise<any>;

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
    notifyPreflightCheckPassed?(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
        : void | Promise<any>;

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
    notifyPreflightCheckFailed?(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
        : void | Promise<any>;

    /**
     * Whether or not the time left of an attempt should be displayed.
     *
     * @param attempt The attempt.
     * @param endTime The attempt end time (in seconds).
     * @param timeNow The current time in seconds.
     * @return Whether it should be displayed.
     */
    shouldShowTimeLeft?(attempt: any, endTime: number, timeNow: number): boolean;
}

/**
 * Delegate to register access rules for quiz module.
 */
@Injectable()
export class AddonModQuizAccessRuleDelegate extends CoreDelegate {

    protected handlerNameProperty = 'ruleName';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected utils: CoreUtilsProvider) {
        super('AddonModQuizAccessRulesDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Get the handler for a certain rule.
     *
     * @param ruleName Name of the access rule.
     * @return Handler. Undefined if no handler found for the rule.
     */
    getAccessRuleHandler(ruleName: string): AddonModQuizAccessRuleHandler {
        return <AddonModQuizAccessRuleHandler> this.getHandler(ruleName, true);
    }

    /**
     * Given a list of rules, get some fixed preflight data (data that doesn't require user interaction).
     *
     * @param rules List of active rules names.
     * @param quiz Quiz.
     * @param preflightData Object where to store the preflight data.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when all the data has been gathered.
     */
    getFixedPreflightData(rules: string[], quiz: any, preflightData: any, attempt?: any, prefetch?: boolean, siteId?: string)
            : Promise<any> {
        rules = rules || [];

        const promises = [];
        rules.forEach((rule) => {
            promises.push(Promise.resolve(
                this.executeFunctionOnEnabled(rule, 'getFixedPreflightData', [quiz, preflightData, attempt, prefetch, siteId])
            ));
        });

        return this.utils.allPromises(promises).catch(() => {
            // Never reject.
        });
    }

    /**
     * Get the Component to use to display the access rule preflight.
     *
     * @param injector Injector.
     * @return Promise resolved with the component to use, undefined if not found.
     */
    getPreflightComponent(rule: string, injector: Injector): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(rule, 'getPreflightComponent', [injector]));
    }

    /**
     * Check if an access rule is supported.
     *
     * @param ruleName Name of the rule.
     * @return Whether it's supported.
     */
    isAccessRuleSupported(ruleName: string): boolean {
        return this.hasHandler(ruleName, true);
    }

    /**
     * Given a list of rules, check if preflight check is required.
     *
     * @param rules List of active rules names.
     * @param quiz Quiz.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it's required.
     */
    isPreflightCheckRequired(rules: string[], quiz: any, attempt: any, prefetch?: boolean, siteId?: string): Promise<boolean> {
        rules = rules || [];

        const promises = [];
        let isRequired = false;

        rules.forEach((rule) => {
            promises.push(this.isPreflightCheckRequiredForRule(rule, quiz, attempt, prefetch, siteId).then((required) => {
                if (required) {
                    isRequired = true;
                }
            }));
        });

        return this.utils.allPromises(promises).then(() => {
            return isRequired;
        }).catch(() => {
            // Never reject.
            return isRequired;
        });
    }

    /**
     * Check if preflight check is required for a certain rule.
     *
     * @param rule Rule name.
     * @param quiz Quiz.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it's required.
     */
    isPreflightCheckRequiredForRule(rule: string, quiz: any, attempt: any, prefetch?: boolean, siteId?: string): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(rule, 'isPreflightCheckRequired', [quiz, attempt, prefetch, siteId]));
    }

    /**
     * Notify all rules that the preflight check has passed.
     *
     * @param rules List of active rules names.
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight data gathered.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    notifyPreflightCheckPassed(rules: string[], quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : Promise<any> {
        rules = rules || [];

        const promises = [];
        rules.forEach((rule) => {
            promises.push(Promise.resolve(
                this.executeFunctionOnEnabled(rule, 'notifyPreflightCheckPassed', [quiz, attempt, preflightData, prefetch, siteId])
            ));
        });

        return this.utils.allPromises(promises).catch(() => {
            // Never reject.
        });
    }

    /**
     * Notify all rules that the preflight check has failed.
     *
     * @param rules List of active rules names.
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight data gathered.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    notifyPreflightCheckFailed(rules: string[], quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : Promise<any> {
        rules = rules || [];

        const promises = [];
        rules.forEach((rule) => {
            promises.push(Promise.resolve(
                this.executeFunctionOnEnabled(rule, 'notifyPreflightCheckFailed', [quiz, attempt, preflightData, prefetch, siteId])
            ));
        });

        return this.utils.allPromises(promises).catch(() => {
            // Never reject.
        });
    }

    /**
     * Whether or not the time left of an attempt should be displayed.
     *
     * @param rules List of active rules names.
     * @param attempt The attempt.
     * @param endTime The attempt end time (in seconds).
     * @param timeNow The current time in seconds.
     * @return Whether it should be displayed.
     */
    shouldShowTimeLeft(rules: string[], attempt: any, endTime: number, timeNow: number): boolean {
        rules = rules || [];

        for (const i in rules) {
            const rule = rules[i];

            if (this.executeFunctionOnEnabled(rule, 'shouldShowTimeLeft', [attempt, endTime, timeNow])) {
                return true;
            }
        }

        return false;
    }
}
