
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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { AddonModQuizAccessRuleHandler } from '../../../providers/access-rules-delegate';
import { AddonModQuizAccessPasswordComponent } from '../component/password';

/**
 * Handler to support password access rule.
 */
@Injectable()
export class AddonModQuizAccessPasswordHandler implements AddonModQuizAccessRuleHandler {
    // Variables for database.
    static PASSWORD_TABLE = 'addon_mod_quiz_access_password';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModQuizAccessPasswordHandler',
        version: 1,
        tables: [
            {
                name: AddonModQuizAccessPasswordHandler.PASSWORD_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'password',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    name = 'AddonModQuizAccessPassword';
    ruleName = 'quizaccess_password';

    constructor(private sitesProvider: CoreSitesProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
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
        if (quiz && quiz.id && typeof preflightData.quizpassword == 'undefined') {
            // Try to get a password stored. If it's found, use it.
            return this.getPasswordEntry(quiz.id, siteId).then((entry) => {
                preflightData.quizpassword = entry.password;
            }).catch(() => {
                // Don't reject.
            });
        }
    }

    /**
     * Get a password stored in DB.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the DB entry on success.
     */
    protected getPasswordEntry(quizId: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModQuizAccessPasswordHandler.PASSWORD_TABLE, {id: quizId});
        });
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
        return AddonModQuizAccessPasswordComponent;
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
        // If there's a password stored don't require the preflight since we'll use the stored one.
        return this.getPasswordEntry(quiz.id, siteId).then(() => {
            return false;
        }).catch(() => {
            // Not stored.
            return true;
        });
    }

    /**
     * Function called when the preflight check has passed. This is a chance to record that fact in some way.
     *
     * @param {any} quiz The quiz the rule belongs to.
     * @param {any} attempt The attempt started/continued.
     * @param {any} preflightData Preflight data gathered.
     * @param {boolean} [prefetch] Whether the user is prefetching the quiz.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} Promise resolved when done if async, void if it's synchronous.
     */
    notifyPreflightCheckPassed(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : void | Promise<any> {

        // The password is right, store it to use it automatically in following executions.
        if (quiz && quiz.id && typeof preflightData.quizpassword != 'undefined') {
            return this.storePassword(quiz.id, preflightData.quizpassword, siteId);
        }
    }

    /**
     * Function called when the preflight check fails. This is a chance to record that fact in some way.
     *
     * @param {any} quiz The quiz the rule belongs to.
     * @param {any} attempt The attempt started/continued.
     * @param {any} preflightData Preflight data gathered.
     * @param {boolean} [prefetch] Whether the user is prefetching the quiz.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} Promise resolved when done if async, void if it's synchronous.
     */
    notifyPreflightCheckFailed?(quiz: any, attempt: any, preflightData: any, prefetch?: boolean, siteId?: string)
            : void | Promise<any> {

        // The password is wrong, remove it from DB if it's there.
        if (quiz && quiz.id) {
            return this.removePassword(quiz.id, siteId);
        }
    }

    /**
     * Remove a password from DB.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected removePassword(quizId: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModQuizAccessPasswordHandler.PASSWORD_TABLE, {id: quizId});
        });
    }

    /**
     * Store a password in DB.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} password Password.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected storePassword(quizId: number, password: string, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                id: quizId,
                password: password,
                timemodified: Date.now()
            };

            return site.getDb().insertRecord(AddonModQuizAccessPasswordHandler.PASSWORD_TABLE, entry);
        });
    }
}
