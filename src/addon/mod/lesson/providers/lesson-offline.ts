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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModLessonProvider } from './lesson';

/**
 * Service to handle offline lesson.
 */
@Injectable()
export class AddonModLessonOfflineProvider {

    protected logger;

    // Variables for database. We use lowercase in the names to match the WS responses.
    static RETAKES_TABLE = 'addon_mod_lesson_retakes';
    static PAGE_ATTEMPTS_TABLE = 'addon_mod_lesson_page_attempts';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModLessonOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModLessonOfflineProvider.RETAKES_TABLE,
                columns: [
                    {
                        name: 'lessonid',
                        type: 'INTEGER',
                        primaryKey: true // Only 1 offline retake per lesson.
                    },
                    {
                        name: 'retake', // Retake number.
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'finished',
                        type: 'INTEGER'
                    },
                    {
                        name: 'outoftime',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'lastquestionpage',
                        type: 'INTEGER'
                    },
                ]
            },
            {
                name: AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE,
                columns: [
                    {
                        name: 'lessonid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'retake', // Retake number.
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'pageid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'data',
                        type: 'TEXT'
                    },
                    {
                        name: 'type',
                        type: 'INTEGER'
                    },
                    {
                        name: 'newpageid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'correct',
                        type: 'INTEGER'
                    },
                    {
                        name: 'answerid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'useranswer',
                        type: 'TEXT'
                    },
                ],
                // A user can attempt several times per page and retake.
                primaryKeys: ['lessonid', 'retake', 'pageid', 'timemodified']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('AddonModLessonOfflineProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete an offline attempt.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param timemodified The timemodified of the attempt.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteAttempt(lessonId: number, retake: number, pageId: number, timemodified: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {
                lessonid: lessonId,
                retake: retake,
                pageid: pageId,
                timemodified: timemodified
            });
        });
    }

    /**
     * Delete offline lesson retake.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteRetake(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModLessonOfflineProvider.RETAKES_TABLE, {lessonid: lessonId});
        });
    }

    /**
     * Delete offline attempts for a retake and page.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteRetakeAttemptsForPage(lessonId: number, retake: number, pageId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {lessonid: lessonId,
                    retake: retake, pageid: pageId});
        });
    }

    /**
     * Mark a retake as finished.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param finished Whether retake is finished.
     * @param outOfTime If the user ran out of time.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    finishRetake(lessonId: number, courseId: number, retake: number, finished?: boolean, outOfTime?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get current stored retake (if any). If not found, it will create a new one.
            return this.getRetakeWithFallback(lessonId, courseId, retake, site.id).then((entry) => {
                entry.finished = finished ? 1 : 0;
                entry.outoftime = outOfTime ? 1 : 0;
                entry.timemodified = this.timeUtils.timestamp();

                return site.getDb().insertRecord(AddonModLessonOfflineProvider.RETAKES_TABLE, entry);
            });
        });
    }

    /**
     * Get all the offline page attempts in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @return Promise resolved when the offline attempts are retrieved.
     */
    getAllAttempts(siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE);
        }).then((attempts) => {
            return this.parsePageAttempts(attempts);
        });
    }

    /**
     * Get all the lessons that have offline data in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @return Promise resolved with an object containing the lessons.
     */
    getAllLessonsWithData(siteId?: string): Promise<any> {
        const promises = [],
            lessons = {};

        // Get the lessons from page attempts.
        promises.push(this.getAllAttempts(siteId).then((entries) => {
            this.getLessonsFromEntries(lessons, entries);
        }).catch(() => {
            // Ignore errors.
        }));

        // Get the lessons from retakes.
        promises.push(this.getAllRetakes(siteId).then((entries) => {
            this.getLessonsFromEntries(lessons, entries);
        }).catch(() => {
            // Ignore errors.
        }));

        return Promise.all(promises).then(() => {
            return this.utils.objectToArray(lessons);
        });
    }

    /**
     * Get all the offline retakes in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @return Promise resolved when the offline retakes are retrieved.
     */
    getAllRetakes(siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModLessonOfflineProvider.RETAKES_TABLE);
        });
    }

    /**
     * Retrieve the last offline attempt stored in a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the attempt (undefined if no attempts).
     */
    getLastQuestionPageAttempt(lessonId: number, retake: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getRetakeWithFallback(lessonId, 0, retake, siteId).then((retakeData) => {
            if (!retakeData.lastquestionpage) {
                // No question page attempted.
                return;
            }

            return this.getRetakeAttemptsForPage(lessonId, retake, retakeData.lastquestionpage, siteId).then((attempts) => {
                // Return the attempt with highest timemodified.
                return attempts.reduce((a, b) => {
                    return a.timemodified > b.timemodified ? a : b;
                });
            });
        }).catch(() => {
            // Error, return undefined.
        });
    }

    /**
     * Retrieve all offline attempts for a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the attempts.
     */
    getLessonAttempts(lessonId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {lessonid: lessonId});
        }).then((attempts) => {
            return this.parsePageAttempts(attempts);
        });
    }

    /**
     * Given a list of DB entries (either retakes or page attempts), get the list of lessons.
     *
     * @param lessons Object where to store the lessons.
     * @param entries List of DB entries.
     */
    protected getLessonsFromEntries(lessons: any, entries: any[]): void {
        entries.forEach((entry) => {
            if (!lessons[entry.lessonid]) {
                lessons[entry.lessonid] = {
                    id: entry.lessonid,
                    courseId: entry.courseid
                };
            }
        });
    }

    /**
     * Get attempts for question pages and retake in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param correct True to only fetch correct attempts, false to get them all.
     * @param pageId If defined, only get attempts on this page.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the attempts.
     */
    getQuestionsAttempts(lessonId: number, retake: number, correct?: boolean, pageId?: number, siteId?: string): Promise<any[]> {
        let promise;

        if (pageId) {
            // Page ID is set, only get the attempts for that page.
            promise = this.getRetakeAttemptsForPage(lessonId, retake, pageId, siteId);
        } else {
            // Page ID not specified, get all the attempts.
            promise = this.getRetakeAttemptsForType(lessonId, retake, AddonModLessonProvider.TYPE_QUESTION, siteId);
        }

        return promise.then((attempts) => {
            if (correct) {
                return attempts.filter((attempt) => {
                    return !!attempt.correct;
                });
            }

            return attempts;
        });
    }

    /**
     * Retrieve a retake from site DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake.
     */
    getRetake(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModLessonOfflineProvider.RETAKES_TABLE, {lessonid: lessonId});
        });
    }

    /**
     * Retrieve all offline attempts for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake attempts.
     */
    getRetakeAttempts(lessonId: number, retake: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {lessonid: lessonId, retake: retake});
        }).then((attempts) => {
            return this.parsePageAttempts(attempts);
        });
    }

    /**
     * Retrieve offline attempts for a retake and page.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake attempts.
     */
    getRetakeAttemptsForPage(lessonId: number, retake: number, pageId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {lessonid: lessonId, retake: retake,
                    pageid: pageId});
        }).then((attempts) => {
            return this.parsePageAttempts(attempts);
        });
    }

    /**
     * Retrieve offline attempts for certain pages for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param type Type of the pages to get: TYPE_QUESTION or TYPE_STRUCTURE.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake attempts.
     */
    getRetakeAttemptsForType(lessonId: number, retake: number, type: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, {lessonid: lessonId, retake: retake,
                    type: type});
        }).then((attempts) => {
            return this.parsePageAttempts(attempts);
        });
    }

    /**
     * Get stored retake. If not found or doesn't match the retake number, return a new one.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake.
     */
    protected getRetakeWithFallback(lessonId: number, courseId: number, retake: number, siteId?: string): Promise<any> {
        // Get current stored retake.
        return this.getRetake(lessonId, siteId).then((retakeData) => {
            if (retakeData.retake != retake) {
                // The stored retake doesn't match the retake number, create a new one.
                return Promise.reject(null);
            }

            return retakeData;
        }).catch(() => {
            // No retake, create a new one.
            return {
                lessonid: lessonId,
                retake: retake,
                courseid: courseId,
                finished: 0
            };
        });
    }

    /**
     * Check if there is a finished retake for a certain lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean.
     */
    hasFinishedRetake(lessonId: number, siteId?: string): Promise<boolean> {
        return this.getRetake(lessonId, siteId).then((retake) => {
            return !!retake.finished;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if a lesson has offline data.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean.
     */
    hasOfflineData(lessonId: number, siteId?: string): Promise<boolean> {
        const promises = [];
        let hasData = false;

        promises.push(this.getRetake(lessonId, siteId).then(() => {
            hasData = true;
        }).catch(() => {
            // Ignore errors.
        }));

        promises.push(this.getLessonAttempts(lessonId, siteId).then((attempts) => {
            hasData = hasData || !!attempts.length;
        }).catch(() => {
            // Ignore errors.
        }));

        return Promise.all(promises).then(() => {
            return hasData;
        });
    }

    /**
     * Check if there are offline attempts for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a boolean.
     */
    hasRetakeAttempts(lessonId: number, retake: number, siteId?: string): Promise<boolean> {
        return this.getRetakeAttempts(lessonId, retake, siteId).then((list) => {
            return !!list.length;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Parse some properties of a page attempt.
     *
     * @param attempt The attempt to treat.
     * @return The treated attempt.
     */
    protected parsePageAttempt(attempt: any): any {
        attempt.data = this.textUtils.parseJSON(attempt.data);
        attempt.useranswer = this.textUtils.parseJSON(attempt.useranswer);

        return attempt;
    }

    /**
     * Parse some properties of some page attempts.
     *
     * @param attempts The attempts to treat.
     * @return The treated attempts.
     */
    protected parsePageAttempts(attempts: any[]): any[] {
        attempts.forEach((attempt) => {
            this.parsePageAttempt(attempt);
        });

        return attempts;
    }

    /**
     * Process a lesson page, saving its data.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param page Page.
     * @param data Data to save.
     * @param newPageId New page ID (calculated).
     * @param answerId The answer ID that the user answered.
     * @param correct If answer is correct. Only for question pages.
     * @param userAnswer The user's answer (userresponse from checkAnswer).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    processPage(lessonId: number, courseId: number, retake: number, page: any, data: any, newPageId: number, answerId?: number,
            correct?: boolean, userAnswer?: any, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                lessonid: lessonId,
                retake: retake,
                pageid: page.id,
                timemodified: this.timeUtils.timestamp(),
                courseid: courseId,
                data: data ? JSON.stringify(data) : null,
                type: page.type,
                newpageid: newPageId,
                correct: correct ? 1 : 0,
                answerid: Number(answerId),
                useranswer: userAnswer ? JSON.stringify(userAnswer) : null,
            };

            return site.getDb().insertRecord(AddonModLessonOfflineProvider.PAGE_ATTEMPTS_TABLE, entry);
        }).then(() => {
            if (page.type == AddonModLessonProvider.TYPE_QUESTION) {
                // It's a question page, set it as last question page attempted.
                return this.setLastQuestionPageAttempted(lessonId, courseId, retake, page.id, siteId);
            }
        });
    }

    /**
     * Set the last question page attempted in a retake.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param lastPage ID of the last question page attempted.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    setLastQuestionPageAttempted(lessonId: number, courseId: number, retake: number, lastPage: number, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get current stored retake (if any). If not found, it will create a new one.
            return this.getRetakeWithFallback(lessonId, courseId, retake, site.id).then((entry) => {
                entry.lastquestionpage = lastPage;
                entry.timemodified = this.timeUtils.timestamp();

                return site.getDb().insertRecord(AddonModLessonOfflineProvider.RETAKES_TABLE, entry);
            });
        });
    }
}
