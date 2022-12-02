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
import { CoreSites } from '@services/sites';
import { CoreFormFields } from '@singletons/form';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import {
    AddonModLessonPageAttemptDBRecord,
    AddonModLessonRetakeDBRecord,
    PAGE_ATTEMPTS_TABLE_NAME,
    RETAKES_TABLE_NAME,
} from './database/lesson';

import { AddonModLessonPageWSData, AddonModLessonProvider } from './lesson';

/**
 * Service to handle offline lesson.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonOfflineProvider {

    /**
     * Delete an offline attempt.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param timemodified The timemodified of the attempt.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteAttempt(lessonId: number, retake: number, pageId: number, timemodified: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(PAGE_ATTEMPTS_TABLE_NAME, <Partial<AddonModLessonPageAttemptDBRecord>> {
            lessonid: lessonId,
            retake: retake,
            pageid: pageId,
            timemodified: timemodified,
        });
    }

    /**
     * Delete offline lesson retake.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteRetake(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(RETAKES_TABLE_NAME, <Partial<AddonModLessonRetakeDBRecord>> { lessonid: lessonId });
    }

    /**
     * Delete offline attempts for a retake and page.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteRetakeAttemptsForPage(lessonId: number, retake: number, pageId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(PAGE_ATTEMPTS_TABLE_NAME, <Partial<AddonModLessonPageAttemptDBRecord>> {
            lessonid: lessonId,
            retake: retake,
            pageid: pageId,
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
     * @returns Promise resolved in success, rejected otherwise.
     */
    async finishRetake(
        lessonId: number,
        courseId: number,
        retake: number,
        finished?: boolean,
        outOfTime?: boolean,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        // Get current stored retake (if any). If not found, it will create a new one.
        const entry = await this.getRetakeWithFallback(lessonId, courseId, retake, site.id);

        entry.finished = finished ? 1 : 0;
        entry.outoftime = outOfTime ? 1 : 0;
        entry.timemodified = CoreTimeUtils.timestamp();

        await site.getDb().insertRecord(RETAKES_TABLE_NAME, entry);
    }

    /**
     * Get all the offline page attempts in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @returns Promise resolved when the offline attempts are retrieved.
     */
    async getAllAttempts(siteId?: string): Promise<AddonModLessonPageAttemptRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        const attempts = await db.getAllRecords<AddonModLessonPageAttemptDBRecord>(PAGE_ATTEMPTS_TABLE_NAME);

        return this.parsePageAttempts(attempts);
    }

    /**
     * Get all the lessons that have offline data in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @returns Promise resolved with an object containing the lessons.
     */
    async getAllLessonsWithData(siteId?: string): Promise<AddonModLessonLessonStoredData[]> {
        const lessons: Record<number, AddonModLessonLessonStoredData> = {};

        const [pageAttempts, retakes] = await Promise.all([
            CoreUtils.ignoreErrors(this.getAllAttempts(siteId)),
            CoreUtils.ignoreErrors(this.getAllRetakes(siteId)),
        ]);

        this.getLessonsFromEntries(lessons, pageAttempts || []);
        this.getLessonsFromEntries(lessons, retakes || []);

        return CoreUtils.objectToArray(lessons);
    }

    /**
     * Get all the offline retakes in a certain site.
     *
     * @param siteId Site ID. If not set, use current site.
     * @returns Promise resolved when the offline retakes are retrieved.
     */
    async getAllRetakes(siteId?: string): Promise<AddonModLessonRetakeDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getAllRecords(RETAKES_TABLE_NAME);
    }

    /**
     * Retrieve the last offline attempt stored in a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the attempt (undefined if no attempts).
     */
    async getLastQuestionPageAttempt(
        lessonId: number,
        retake: number,
        siteId?: string,
    ): Promise<AddonModLessonPageAttemptRecord | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        try {
            const retakeData = await this.getRetakeWithFallback(lessonId, 0, retake, siteId);
            if (!retakeData.lastquestionpage) {
                // No question page attempted.
                return;
            }

            const attempts = await this.getRetakeAttemptsForPage(lessonId, retake, retakeData.lastquestionpage, siteId);

            // Return the attempt with highest timemodified.
            return attempts.reduce(
                (a, b) => a && a.timemodified > b.timemodified ? a : b,
                <AddonModLessonPageAttemptRecord | undefined> undefined,
            );
        } catch {
            // Error, return undefined.
        }
    }

    /**
     * Retrieve all offline attempts for a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the attempts.
     */
    async getLessonAttempts(lessonId: number, siteId?: string): Promise<AddonModLessonPageAttemptRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const attempts = await site.getDb().getRecords<AddonModLessonPageAttemptDBRecord>(
            PAGE_ATTEMPTS_TABLE_NAME,
            { lessonid: lessonId },
        );

        return this.parsePageAttempts(attempts);
    }

    /**
     * Given a list of DB entries (either retakes or page attempts), get the list of lessons.
     *
     * @param lessons Object where to store the lessons.
     * @param entries List of DB entries.
     */
    protected getLessonsFromEntries(
        lessons: Record<number, AddonModLessonLessonStoredData>,
        entries: (AddonModLessonPageAttemptRecord | AddonModLessonRetakeDBRecord)[],
    ): void {
        entries.forEach((entry) => {
            if (!lessons[entry.lessonid]) {
                lessons[entry.lessonid] = {
                    id: entry.lessonid,
                    courseId: entry.courseid,
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
     * @returns Promise resolved with the attempts.
     */
    async getQuestionsAttempts(
        lessonId: number,
        retake: number,
        correct?: boolean,
        pageId?: number,
        siteId?: string,
    ): Promise<AddonModLessonPageAttemptRecord[]> {
        const attempts = pageId ?
            await this.getRetakeAttemptsForPage(lessonId, retake, pageId, siteId) :
            await this.getRetakeAttemptsForType(lessonId, retake, AddonModLessonProvider.TYPE_QUESTION, siteId);

        if (correct) {
            return attempts.filter((attempt) => !!attempt.correct);
        }

        return attempts;
    }

    /**
     * Retrieve a retake from site DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the retake.
     */
    async getRetake(lessonId: number, siteId?: string): Promise<AddonModLessonRetakeDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(RETAKES_TABLE_NAME, { lessonid: lessonId });
    }

    /**
     * Retrieve all offline attempts for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the retake attempts.
     */
    async getRetakeAttempts(lessonId: number, retake: number, siteId?: string): Promise<AddonModLessonPageAttemptRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const attempts = await site.getDb().getRecords<AddonModLessonPageAttemptDBRecord>(
            PAGE_ATTEMPTS_TABLE_NAME,
            <Partial<AddonModLessonPageAttemptDBRecord>> {
                lessonid: lessonId,
                retake,
            },
        );

        return this.parsePageAttempts(attempts);
    }

    /**
     * Retrieve offline attempts for a retake and page.
     *
     * @param lessonId Lesson ID.
     * @param retake Lesson retake number.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the retake attempts.
     */
    async getRetakeAttemptsForPage(
        lessonId: number,
        retake: number,
        pageId: number,
        siteId?: string,
    ): Promise<AddonModLessonPageAttemptRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const attempts = await site.getDb().getRecords<AddonModLessonPageAttemptDBRecord>(
            PAGE_ATTEMPTS_TABLE_NAME,
            <Partial<AddonModLessonPageAttemptDBRecord>> {
                lessonid: lessonId,
                retake,
                pageid: pageId,
            },
        );

        return this.parsePageAttempts(attempts);
    }

    /**
     * Retrieve offline attempts for certain pages for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param type Type of the pages to get: TYPE_QUESTION or TYPE_STRUCTURE.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the retake attempts.
     */
    async getRetakeAttemptsForType(
        lessonId: number,
        retake: number,
        type: number,
        siteId?: string,
    ): Promise<AddonModLessonPageAttemptRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const attempts = await site.getDb().getRecords<AddonModLessonPageAttemptDBRecord>(
            PAGE_ATTEMPTS_TABLE_NAME,
            <Partial<AddonModLessonPageAttemptDBRecord>> {
                lessonid: lessonId,
                retake,
                type,
            },
        );

        return this.parsePageAttempts(attempts);
    }

    /**
     * Get stored retake. If not found or doesn't match the retake number, return a new one.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the retake.
     */
    protected async getRetakeWithFallback(
        lessonId: number,
        courseId: number,
        retake: number,
        siteId?: string,
    ): Promise<AddonModLessonRetakeDBRecord> {
        try {
            // Get current stored retake.
            const retakeData = await this.getRetake(lessonId, siteId);

            if (retakeData.retake == retake) {
                return retakeData;
            }
        } catch {
            // No retake, create a new one.
        }

        // Create a new retake.
        return {
            lessonid: lessonId,
            retake,
            courseid: courseId,
            finished: 0,
        };
    }

    /**
     * Check if there is a finished retake for a certain lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean.
     */
    async hasFinishedRetake(lessonId: number, siteId?: string): Promise<boolean> {
        try {
            const retake = await this.getRetake(lessonId, siteId);

            return !!retake.finished;
        } catch {
            return false;
        }
    }

    /**
     * Check if a lesson has offline data.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean.
     */
    async hasOfflineData(lessonId: number, siteId?: string): Promise<boolean> {
        const [retake, attempts] = await Promise.all([
            CoreUtils.ignoreErrors(this.getRetake(lessonId, siteId)),
            CoreUtils.ignoreErrors(this.getLessonAttempts(lessonId, siteId)),
        ]);

        return !!retake || !!attempts?.length;
    }

    /**
     * Check if there are offline attempts for a retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with a boolean.
     */
    async hasRetakeAttempts(lessonId: number, retake: number, siteId?: string): Promise<boolean> {
        try {
            const list = await this.getRetakeAttempts(lessonId, retake, siteId);

            return !!list.length;
        } catch {
            return false;
        }
    }

    /**
     * Parse some properties of a page attempt.
     *
     * @param attempt The attempt to treat.
     * @returns The treated attempt.
     */
    protected parsePageAttempt(attempt: AddonModLessonPageAttemptDBRecord): AddonModLessonPageAttemptRecord {
        return {
            ...attempt,
            data: attempt.data ? CoreTextUtils.parseJSON(attempt.data) : null,
            useranswer: attempt.useranswer ? CoreTextUtils.parseJSON(attempt.useranswer) : null,
        };
    }

    /**
     * Parse some properties of some page attempts.
     *
     * @param attempts The attempts to treat.
     * @returns The treated attempts.
     */
    protected parsePageAttempts(attempts: AddonModLessonPageAttemptDBRecord[]): AddonModLessonPageAttemptRecord[] {
        return attempts.map((attempt) => this.parsePageAttempt(attempt));
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
     * @returns Promise resolved in success, rejected otherwise.
     */
    async processPage(
        lessonId: number,
        courseId: number,
        retake: number,
        page: AddonModLessonPageWSData,
        data: CoreFormFields,
        newPageId: number,
        answerId?: number,
        correct?: boolean,
        userAnswer?: unknown,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const entry: AddonModLessonPageAttemptDBRecord = {
            lessonid: lessonId,
            retake: retake,
            pageid: page.id,
            timemodified: CoreTimeUtils.timestamp(),
            courseid: courseId,
            data: data ? JSON.stringify(data) : null,
            type: page.type,
            newpageid: newPageId,
            correct: correct ? 1 : 0,
            answerid: answerId || null,
            useranswer: userAnswer ? JSON.stringify(userAnswer) : null,
        };

        await site.getDb().insertRecord(PAGE_ATTEMPTS_TABLE_NAME, entry);

        if (page.type == AddonModLessonProvider.TYPE_QUESTION) {
            // It's a question page, set it as last question page attempted.
            await this.setLastQuestionPageAttempted(lessonId, courseId, retake, page.id, siteId);
        }
    }

    /**
     * Set the last question page attempted in a retake.
     *
     * @param lessonId Lesson ID.
     * @param courseId Course ID the lesson belongs to.
     * @param retake Retake number.
     * @param lastPage ID of the last question page attempted.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async setLastQuestionPageAttempted(
        lessonId: number,
        courseId: number,
        retake: number,
        lastPage: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        // Get current stored retake (if any). If not found, it will create a new one.
        const entry = await this.getRetakeWithFallback(lessonId, courseId, retake, site.id);

        entry.lastquestionpage = lastPage;
        entry.timemodified = CoreTimeUtils.timestamp();

        await site.getDb().insertRecord(RETAKES_TABLE_NAME, entry);
    }

}

export const AddonModLessonOffline = makeSingleton(AddonModLessonOfflineProvider);

/**
 * Attempt DB record with parsed data.
 */
export type AddonModLessonPageAttemptRecord = Omit<AddonModLessonPageAttemptDBRecord, 'data'|'useranswer'> & {
    data: CoreFormFields | null;
    useranswer: unknown | null;
};

/**
 * Lesson data stored in DB.
 */
export type AddonModLessonLessonStoredData = {
    id: number;
    courseId: number;
};
