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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModChoiceOfflineProvider } from './offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

/**
 * Service that provides some features for choices.
 */
@Injectable()
export class AddonModChoiceProvider {
    static COMPONENT = 'mmaModChoice';

    static RESULTS_NOT = 0;
    static RESULTS_AFTER_ANSWER = 1;
    static RESULTS_AFTER_CLOSE = 2;
    static RESULTS_ALWAYS = 3;

    static PUBLISH_ANONYMOUS = false;
    static PUBLISH_NAMES = true;

    protected ROOT_CACHE_KEY = 'mmaModChoice:';

    constructor(private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private filepoolProvider: CoreFilepoolProvider, private utils: CoreUtilsProvider,
            private choiceOffline: AddonModChoiceOfflineProvider, private logHelper: CoreCourseLogHelperProvider) {}

    /**
     * Check if results can be seen by a student. The student can see the results if:
     *     - they're always published, OR
     *     - they're published after the choice is closed and it's closed, OR
     *     - they're published after answering and the user has answered.
     *
     * @param choice Choice to check.
     * @param hasAnswered True if user has answered the choice, false otherwise.
     * @return True if the students can see the results.
     */
    canStudentSeeResults(choice: any, hasAnswered: boolean): boolean {
        const now = new Date().getTime();

        return choice.showresults === AddonModChoiceProvider.RESULTS_ALWAYS ||
            choice.showresults === AddonModChoiceProvider.RESULTS_AFTER_CLOSE &&
                choice.timeclose !== 0 && choice.timeclose <= now ||
            choice.showresults === AddonModChoiceProvider.RESULTS_AFTER_ANSWER && hasAnswered;
    }

    /**
     * Delete responses from a choice.
     *
     * @param choiceId Choice ID.
     * @param name Choice name.
     * @param courseId Course ID the choice belongs to.
     * @param responses IDs of the answers. If not defined, delete all the answers of the current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    deleteResponses(choiceId: number, name: string, courseId: number, responses?: number[], siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        responses = responses || [];

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.choiceOffline.saveResponse(choiceId, name, courseId, responses, true, siteId).then(() => {
                return false;
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return this.choiceOffline.deleteResponse(choiceId, siteId).then(() => {
            return this.deleteResponsesOnline(choiceId, responses, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return storeOffline();
            });
        });
    }

    /**
     * Delete responses from a choice. It will fail if offline or cannot connect.
     *
     * @param choiceId Choice ID.
     * @param responses IDs of the answers. If not defined, delete all the answers of the current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when responses are successfully deleted.
     */
    deleteResponsesOnline(choiceId: number, responses?: number[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                choiceid: choiceId,
                responses: responses
            };

            return site.write('mod_choice_delete_choice_responses', params)
                    .then((response: AddonModChoiceDeleteChoiceResponsesResult) => {

                // Other errors ocurring.
                if (!response || response.status === false) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Invalidate related data.
                const promises = [
                    this.invalidateOptions(choiceId, site.id),
                    this.invalidateResults(choiceId, site.id)
                ];

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            });
        });
    }

    /**
     * Get cache key for choice data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getChoiceDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'choice:' + courseId;
    }

    /**
     * Get cache key for choice options WS calls.
     *
     * @param choiceId Choice ID.
     * @return Cache key.
     */
    protected getChoiceOptionsCacheKey(choiceId: number): string {
        return this.ROOT_CACHE_KEY + 'options:' + choiceId;
    }

    /**
     * Get cache key for choice results WS calls.
     *
     * @param choiceId Choice ID.
     * @return Cache key.
     */
    protected getChoiceResultsCacheKey(choiceId: number): string {
        return this.ROOT_CACHE_KEY + 'results:' + choiceId;
    }

    /**
     * Get a choice with key=value. If more than one is found, only the first will be returned.
     *
     * @param siteId Site ID.
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param forceCache True to always get the value from cache, false otherwise. Default false.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise resolved when the choice is retrieved.
     */
    protected getChoiceByDataKey(siteId: string, courseId: number, key: string, value: any, forceCache?: boolean,
            ignoreCache?: boolean): Promise<AddonModChoiceChoice> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseids: [courseId]
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getChoiceDataCacheKey(courseId),
                omitExpires: forceCache,
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_choice_get_choices_by_courses', params, preSets)
                    .then((response: AddonModChoiceGetChoicesByCoursesResult): any => {

                if (response && response.choices) {
                    const currentChoice = response.choices.find((choice) => choice[key] == value);
                    if (currentChoice) {
                        return currentChoice;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a choice by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @param forceCache True to always get the value from cache, false otherwise. Default false.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise resolved when the choice is retrieved.
     */
    getChoice(courseId: number, cmId: number, siteId?: string, forceCache?: boolean, ignoreCache?: boolean)
            : Promise<AddonModChoiceChoice> {
        return this.getChoiceByDataKey(siteId, courseId, 'coursemodule', cmId, forceCache, ignoreCache);
    }

    /**
     * Get a choice by ID.
     *
     * @param courseId Course ID.
     * @param choiceId Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @param forceCache True to always get the value from cache, false otherwise. Default false.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise resolved when the choice is retrieved.
     */
    getChoiceById(courseId: number, choiceId: number, siteId?: string, forceCache?: boolean, ignoreCache?: boolean)
            : Promise<AddonModChoiceChoice> {
        return this.getChoiceByDataKey(siteId, courseId, 'id', choiceId, forceCache, ignoreCache);
    }

    /**
     * Get choice options.
     *
     * @param choiceId Choice ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with choice options.
     */
    getOptions(choiceId: number, ignoreCache?: boolean, siteId?: string): Promise<AddonModChoiceOption[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                choiceid: choiceId
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getChoiceOptionsCacheKey(choiceId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_choice_get_choice_options', params, preSets)
                    .then((response: AddonModChoiceGetChoiceOptionsResult): any => {

                if (response.options) {
                    return response.options;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get choice results.
     *
     * @param choiceId Choice ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with choice results.
     */
    getResults(choiceId: number, ignoreCache?: boolean, siteId?: string): Promise<AddonModChoiceResult[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                choiceid: choiceId
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getChoiceResultsCacheKey(choiceId)
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_choice_get_choice_results', params, preSets)
                    .then((response: AddonModChoiceGetChoiceResults): any => {

                if (response.options) {
                    return response.options;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidate choice data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateChoiceData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(null).then((site) => {
            return site.invalidateWsCacheForKey(this.getChoiceDataCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.getChoice(courseId, moduleId).then((choice) => {
            return Promise.all([
                this.invalidateChoiceData(courseId),
                this.invalidateOptions(choice.id),
                this.invalidateResults(choice.id),
            ]);
        }));

        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModChoiceProvider.COMPONENT, moduleId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidate choice options.
     *
     * @param choiceId Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateOptions(choiceId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
           return site.invalidateWsCacheForKey(this.getChoiceOptionsCacheKey(choiceId));
       });
   }

   /**
    * Invalidate choice results.
    *
    * @param choiceId Choice ID.
    * @param siteId Site ID. If not defined, current site.
    * @return Promise resolved when the data is invalidated.
    */
   invalidateResults(choiceId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getChoiceResultsCacheKey(choiceId));
        });
    }

    /**
     * Report the choice as being viewed.
     *
     * @param id Choice ID.
     * @param name Name of the choice.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            choiceid: id
        };

        return this.logHelper.logSingle('mod_choice_view_choice', params, AddonModChoiceProvider.COMPONENT, id, name, 'choice',
                {}, siteId);
    }

    /**
     * Send a response to a choice to Moodle.
     *
     * @param choiceId Choice ID.
     * @param name Choice name.
     * @param courseId Course ID the choice belongs to.
     * @param responses IDs of selected options.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    submitResponse(choiceId: number, name: string, courseId: number, responses: number[], siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.choiceOffline.saveResponse(choiceId, name, courseId, responses, false, siteId).then(() => {
                return false;
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return this.choiceOffline.deleteResponse(choiceId, siteId).then(() => {
            return this.submitResponseOnline(choiceId, responses, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                } else {
                    // Couldn't connect to server, store it offline.
                    return storeOffline();
                }
            });
        });
    }

    /**
     * Send a response to a choice to Moodle. It will fail if offline or cannot connect.
     *
     * @param choiceId Choice ID.
     * @param responses IDs of selected options.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when responses are successfully submitted.
     */
    submitResponseOnline(choiceId: number, responses: number[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                choiceid: choiceId,
                responses: responses
            };

            return site.write('mod_choice_submit_choice_response', params).then(() => {
                // Invalidate related data.
                const promises = [
                    this.invalidateOptions(choiceId, siteId),
                    this.invalidateResults(choiceId, siteId)
                ];

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            });
        });
    }
}

/**
 * Choice returned by mod_choice_get_choices_by_courses.
 */
export type AddonModChoiceChoice = {
    id: number; // Choice instance id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Choice name.
    intro: string; // The choice intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    publish?: boolean; // If choice is published.
    showresults?: number; // 0 never, 1 after answer, 2 after close, 3 always.
    display?: number; // Display mode (vertical, horizontal).
    allowupdate?: boolean; // Allow update.
    allowmultiple?: boolean; // Allow multiple choices.
    showunanswered?: boolean; // Show users who not answered yet.
    includeinactive?: boolean; // Include inactive users.
    limitanswers?: boolean; // Limit unswers.
    timeopen?: number; // Date of opening validity.
    timeclose?: number; // Date of closing validity.
    showpreview?: boolean; // Show preview before timeopen.
    timemodified?: number; // Time of last modification.
    completionsubmit?: boolean; // Completion on user submission.
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Option returned by mod_choice_get_choice_options.
 */
export type AddonModChoiceOption = {
    id: number; // Option id.
    text: string; // Text of the choice.
    maxanswers: number; // Maximum number of answers.
    displaylayout: boolean; // True for orizontal, otherwise vertical.
    countanswers: number; // Number of answers.
    checked: boolean; // We already answered.
    disabled: boolean; // Option disabled.
};

/**
 * Result returned by mod_choice_get_choice_results.
 */
export type AddonModChoiceResult = {
    id: number; // Choice instance id.
    text: string; // Text of the choice.
    maxanswer: number; // Maximum number of answers.
    userresponses: {
        userid: number; // User id.
        fullname: string; // User full name.
        profileimageurl: string; // Profile user image url.
        answerid?: number; // Answer id.
        timemodified?: number; // Time of modification.
    }[];
    numberofuser: number; // Number of users answers.
    percentageamount: number; // Percentage of users answers.
};

/**
 * Result of WS mod_choice_get_choices_by_courses.
 */
export type AddonModChoiceGetChoicesByCoursesResult = {
    choices: AddonModChoiceChoice[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_choice_get_choice_options.
 */
export type AddonModChoiceGetChoiceOptionsResult = {
    options: AddonModChoiceOption[]; // Options.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_choice_get_choice_results.
 */
export type AddonModChoiceGetChoiceResults = {
    options: AddonModChoiceResult[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_choice_delete_choice_responses.
 */
export type AddonModChoiceDeleteChoiceResponsesResult = {
    status: boolean; // Status, true if everything went right.
    warnings?: CoreWSExternalWarning[];
};
