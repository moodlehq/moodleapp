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
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreGradesProvider } from '@core/grades/providers/grades';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { AddonModLessonOfflineProvider } from './lesson-offline';

/**
 * Result of check answer.
 */
export interface AddonModLessonCheckAnswerResult {
    answerid?: number;
    noanswer?: boolean;
    correctanswer?: boolean;
    isessayquestion?: boolean;
    response?: string;
    newpageid?: number;
    studentanswer?: any;
    userresponse?: any;
    feedback?: string;
    nodefaultresponse?: boolean;
    inmediatejump?: boolean;
    studentanswerformat?: number;
    useranswer?: any;
}

/**
 * Result of record attempt.
 */
export interface AddonModLessonRecordAttemptResult extends AddonModLessonCheckAnswerResult {
    attemptsremaining?: number;
    maxattemptsreached?: boolean;
}

/**
 * Result of lesson grade.
 */
export interface AddonModLessonGrade {
    /**
     * Number of questions answered.
     */
    nquestions: number;

    /**
     * Number of question attempts.
     */
    attempts: number;

    /**
     * Max points possible.
     */
    total: number;

    /**
     * Points earned by the student.
     */
    earned: number;

    /**
     * Calculated percentage grade.
     */
    grade: number;

    /**
     * Numer of manually graded questions.
     */
    nmanual: number;

    /**
     * Point value for manually graded questions.
     */
    manualpoints: number;
}

/**
 * Service that provides some features for lesson.
 *
 * Lesson terminology is a bit confusing and ambiguous in Moodle. For that reason, in the app it has been decided to use
 * the following terminology:
 *     - Retake: An attempt in a lesson. In Moodle it's sometimes called "attempt", "try" or "retry".
 *     - Attempt: An attempt in a page inside a retake. In the app, this includes content pages.
 *     - Content page: A page with only content (no question). In Moodle it's sometimes called "branch table".
 *     - Page answers: List of possible answers for a page (configured by the teacher). NOT the student answer for the page.
 *
 * This terminology sometimes won't match with WebServices names, params or responses.
 */
@Injectable()
export class AddonModLessonProvider {
    static COMPONENT = 'mmaModLesson';
    static DATA_SENT_EVENT = 'addon_mod_lesson_data_sent';

    // This page.
    static LESSON_THISPAGE = 0;
    // Next page -> any page not seen before.
    static LESSON_UNSEENPAGE = 1;
    // Next page -> any page not answered correctly.
    static LESSON_UNANSWEREDPAGE = 2;
    // Jump to Next Page.
    static LESSON_NEXTPAGE = -1;
    // End of Lesson.
    static LESSON_EOL = -9;
    // Jump to an unseen page within a branch and end of branch or end of lesson.
    static LESSON_UNSEENBRANCHPAGE = -50;
    // Jump to a random page within a branch and end of branch or end of lesson.
    static LESSON_RANDOMPAGE = -60;
    // Jump to a random Branch.
    static LESSON_RANDOMBRANCH = -70;
    // Cluster Jump.
    static LESSON_CLUSTERJUMP = -80;

    // Type of page: question or structure (content).
    static TYPE_QUESTION = 0;
    static TYPE_STRUCTURE = 1;

    // Type of question pages.
    static LESSON_PAGE_SHORTANSWER =  1;
    static LESSON_PAGE_TRUEFALSE =    2;
    static LESSON_PAGE_MULTICHOICE =  3;
    static LESSON_PAGE_MATCHING =     5;
    static LESSON_PAGE_NUMERICAL =    8;
    static LESSON_PAGE_ESSAY =        10;
    static LESSON_PAGE_BRANCHTABLE =  20; // Content page.
    static LESSON_PAGE_ENDOFBRANCH =  21;
    static LESSON_PAGE_CLUSTER =      30;
    static LESSON_PAGE_ENDOFCLUSTER = 31;

    /**
     * Constant used as a delimiter when parsing multianswer questions
     */
    static MULTIANSWER_DELIMITER = '@^#|';

    static LESSON_OTHER_ANSWERS = '@#wronganswer#@';

    // Variables for database.
    static PASSWORD_TABLE = 'addon_mod_lesson_password';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModLessonProvider',
        version: 1,
        tables: [
            {
                name: AddonModLessonProvider.PASSWORD_TABLE,
                columns: [
                    {
                        name: 'lessonid',
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

    protected ROOT_CACHE_KEY = 'mmaModLesson:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private translate: TranslateService, private textUtils: CoreTextUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private lessonOfflineProvider: AddonModLessonOfflineProvider, private logHelper: CoreCourseLogHelperProvider,
            private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('AddonModLessonProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Add an answer and its response to a feedback string (HTML).
     *
     * @param feedback The current feedback.
     * @param answer Student answer.
     * @param answerFormat Answer format.
     * @param response Response.
     * @param className Class to add to the response.
     * @return New feedback.
     */
    protected addAnswerAndResponseToFeedback(feedback: string, answer: string, answerFormat: number, response: string,
            className: string): string {

        // Add a table row containing the answer.
        feedback += '<tr><td class="cell c0 lastcol">' + (answerFormat ? answer : this.textUtils.cleanTags(answer)) +
                '</td></tr>';

        // If the response exists, add a table row containing the response. If not, add en empty row.
        if (response && response.trim()) {
            feedback += '<tr><td class="cell c0 lastcol ' + className + '"><em>' +
                this.translate.instant('addon.mod_lesson.response') + '</em>: <br/>' +
                response + '</td></tr>';
        } else {
            feedback += '<tr><td class="cell c0 lastcol"></td></tr>';
        }

        return feedback;
    }

    /**
     * Add a message to a list of messages, following the format of the messages returned by WS.
     *
     * @param messages List of messages where to add the message.
     * @param stringName The ID of the message to be translated. E.g. 'addon.mod_lesson.numberofpagesviewednotice'.
     * @param stringParams The params of the message (if any).
     */
    protected addMessage(messages: any[], stringName: string, stringParams?: any): void {
        messages.push({
            message: this.translate.instant(stringName, stringParams)
        });
    }

    /**
     * Add a property to the result of the "process EOL page" simulation in offline.
     *
     * @param result Result where to add the value.
     * @param name Name of the property.
     * @param value Value to add.
     * @param addMessage Whether to add a message related to the value.
     */
    protected addResultValueEolPage(result: any, name: string, value: any, addMessage?: boolean): void {
        let message = '';

        if (addMessage) {
            const params = typeof value != 'boolean' ? {$a: value} : undefined;
            message = this.translate.instant('addon.mod_lesson.' + name, params);
        }

        result.data[name] = {
            name: name,
            value: value,
            message: message
        };
    }

    /**
     * Check if an answer page (from getUserRetake) is a content page.
     *
     * @param page Answer page.
     * @return Whether it's a content page.
     */
    answerPageIsContent(page: any): boolean {
        // The page doesn't have any reliable field to use for checking this. Check qtype first (translated string).
        if (page.qtype == this.translate.instant('addon.mod_lesson.branchtable')) {
            return true;
        }

        // The qtype doesn't match, but that doesn't mean it's not a content page, maybe the language is different.
        // Check it's not a question page.
        if (page.answerdata && !this.answerPageIsQuestion(page)) {
            // It isn't a question page, but it can be an end of branch, etc. Check if the first answer has a button.
            if (page.answerdata.answers && page.answerdata.answers[0]) {
                const element = this.domUtils.convertToElement(page.answerdata.answers[0][0]);

                return !!element.querySelector('input[type="button"]');
            }
        }

        return false;
    }

    /**
     * Check if an answer page (from getUserRetake) is a question page.
     *
     * @param page Answer page.
     * @return Whether it's a question page.
     */
    answerPageIsQuestion(page: any): boolean {
        if (!page.answerdata) {
            return false;
        }

        if (page.answerdata.score) {
            // Only question pages have a score.
            return true;
        }

        if (page.answerdata.answers) {
            for (let i = 0; i < page.answerdata.answers.length; i++) {
                const answer = page.answerdata.answers[i];
                if (answer[1]) {
                    // Only question pages have a statistic.
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Calculate some offline data like progress and ongoingscore.
     *
     * @param lesson Lesson.
     * @param accessInfo Result of get access info.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param pageIndex Object containing all the pages indexed by ID. If not defined, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the data.
     */
    protected calculateOfflineData(lesson: any, accessInfo?: any, password?: string, review?: boolean, pageIndex?: any,
            siteId?: string): Promise<{reviewmode: boolean, progress: number, ongoingscore: string}> {

        accessInfo = accessInfo || {};

        const reviewMode = review || accessInfo.reviewmode,
            promises = [];
        let ongoingMessage = '',
            progress: number;

        if (!accessInfo.canmanage) {
            if (lesson.ongoing && !reviewMode) {
                promises.push(this.getOngoingScoreMessage(lesson, accessInfo, password, review, pageIndex, siteId)
                        .then((message) => {
                    ongoingMessage = message;
                }));
            }
            if (lesson.progressbar) {
                promises.push(this.calculateProgress(lesson.id, accessInfo, password, review, pageIndex, siteId).then((p) => {
                    progress = p;
                }));
            }
        }

        return Promise.all(promises).then(() => {
            return {
                reviewmode: reviewMode,
                progress: progress,
                ongoingscore: ongoingMessage
            };
        });
    }

    /**
     * Calculate the progress of the current user in the lesson.
     * Based on Moodle's calculate_progress.
     *
     * @param lessonId Lesson ID.
     * @param accessInfo Result of get access info.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param pageIndex Object containing all the pages indexed by ID. If not defined, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a number: the progress (scale 0-100).
     */
    calculateProgress(lessonId: number, accessInfo: any, password?: string, review?: boolean, pageIndex?: any, siteId?: string)
            : Promise<number> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Check if the user is reviewing the attempt.
        if (review) {
            return Promise.resolve(100);
        }

        const retake = accessInfo.attemptscount;
        let viewedPagesIds,
            promise;

        if (pageIndex) {
            promise = Promise.resolve();
        } else {
            // Retrieve the index.
            promise = this.getPages(lessonId, password, true, false, siteId).then((pages) => {
                pageIndex = this.createPagesIndex(pages);
            });
        }

        return promise.then(() => {
            // Get the list of question pages attempted.
            return this.getPagesIdsWithQuestionAttempts(lessonId, retake, false, siteId);
        }).then((ids) => {
            viewedPagesIds = ids;

            // Get the list of viewed content pages.
            return this.getContentPagesViewedIds(lessonId, retake, siteId);
        }).then((viewedContentPagesIds) => {
            const validPages = {};
            let pageId = accessInfo.firstpageid;

            viewedPagesIds = this.utils.mergeArraysWithoutDuplicates(viewedPagesIds, viewedContentPagesIds);

            // Filter out the following pages:
            // - End of Cluster
            // - End of Branch
            // - Pages found inside of Clusters
            // Do not filter out Cluster Page(s) because we count a cluster as one.
            // By keeping the cluster page, we get our 1.
            while (pageId) {
                pageId = this.validPageAndView(pageIndex, pageIndex[pageId], validPages, viewedPagesIds);
            }

            // Progress calculation as a percent.
            return this.textUtils.roundToDecimals(viewedPagesIds.length / Object.keys(validPages).length, 2) * 100;
        });
    }

    /**
     * Check if the answer provided by the user is correct or not and return the result object.
     * This method is based on the check_answer implementation of all page types (Moodle).
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param jumps Result of get pages possible jumps.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @return Result.
     */
    protected checkAnswer(lesson: any, pageData: any, data: any, jumps: any, pageIndex: any): AddonModLessonCheckAnswerResult {
        // Default result.
        const result: AddonModLessonCheckAnswerResult = {
            answerid: 0,
            noanswer: false,
            correctanswer: false,
            isessayquestion: false,
            response: '',
            newpageid: 0,
            studentanswer: '',
            userresponse: null,
            feedback: '',
            nodefaultresponse: false,
            inmediatejump: false
        };

        switch (pageData.page.qtype) {
            case AddonModLessonProvider.LESSON_PAGE_BRANCHTABLE:
                // Load the new page immediately.
                result.inmediatejump = true;
                result.newpageid = this.getNewPageId(pageData.page.id, data.jumpto, jumps);
                break;

            case AddonModLessonProvider.LESSON_PAGE_ESSAY:
                this.checkAnswerEssay(pageData, data, result);
                break;

            case AddonModLessonProvider.LESSON_PAGE_MATCHING:
                this.checkAnswerMatching(pageData, data, result);
                break;

            case AddonModLessonProvider.LESSON_PAGE_MULTICHOICE:
                this.checkAnswerMultichoice(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonProvider.LESSON_PAGE_NUMERICAL:
                this.checkAnswerNumerical(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonProvider.LESSON_PAGE_SHORTANSWER:
                this.checkAnswerShort(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonProvider.LESSON_PAGE_TRUEFALSE:
                this.checkAnswerTruefalse(lesson, pageData, data, pageIndex, result);
                break;
            default:
                // Nothing to do.
        }

        return result;
    }

    /**
     * Check an essay answer.
     *
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param result Object where to store the result.
     */
    protected checkAnswerEssay(pageData: any, data: any, result: AddonModLessonCheckAnswerResult): void {
        let studentAnswer;

        result.isessayquestion = true;

        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;

            return;
        }

        // The name was changed to "answer_editor" in 3.7. Before it was just "answer". Support both cases.
        if (typeof data['answer_editor[text]'] != 'undefined') {
            studentAnswer = data['answer_editor[text]'];
        } else if (typeof data.answer_editor == 'object') {
            studentAnswer = data.answer_editor.text;
        } else if (typeof data['answer[text]'] != 'undefined') {
            studentAnswer = data['answer[text]'];
        } else if (typeof data.answer == 'object') {
            studentAnswer = data.answer.text;
        } else {
            studentAnswer = data.answer;
        }

        if (!studentAnswer || studentAnswer.trim() === '') {
            result.noanswer = true;

            return;
        }

        // Essay pages should only have 1 possible answer.
        pageData.answers.forEach((answer) => {
            result.answerid = answer.id;
            result.newpageid = answer.jumpto;
        });

        result.userresponse = {
            sent: 0,
            graded: 0,
            score: 0,
            answer: studentAnswer,
            answerformat: 1,
            response: '',
            responseformat: 1
        };
        result.studentanswerformat = 1;
        result.studentanswer = studentAnswer;
    }

    /**
     * Check a matching answer.
     *
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param result Object where to store the result.
     */
    protected checkAnswerMatching(pageData: any, data: any, result: AddonModLessonCheckAnswerResult): void {
        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;

            return;
        }

        const response = this.getUserResponseMatching(data),
            getAnswers = this.utils.clone(pageData.answers),
            correct = getAnswers.shift(),
            wrong = getAnswers.shift(),
            answers = {};

        getAnswers.forEach((answer) => {
            if (answer.answer !== '' || answer.response !== '') {
                answers[answer.id] = answer;
            }
        });

        // Get the user's exact responses for record keeping.
        const userResponse = [];
        let hits = 0;

        result.studentanswer = '';
        result.studentanswerformat = 1;

        for (const id in response) {
            let value = response[id];

            if (!value) {
                result.noanswer = true;

                return;
            }

            value = this.textUtils.decodeHTML(value);
            userResponse.push(value);

            if (typeof answers[id] != 'undefined') {
                const answer = answers[id];

                result.studentanswer += '<br />' + answer.answer + ' = ' + value;
                if (answer.response && answer.response.trim() == value.trim()) {
                    hits++;
                }
            }
        }

        result.userresponse = userResponse.join(',');

        if (hits == Object.keys(answers).length) {
            result.correctanswer = true;
            result.response = correct.answer;
            result.answerid = correct.id;
            result.newpageid = correct.jumpto;
        } else {
            result.correctanswer = false;
            result.response = wrong.answer;
            result.answerid = wrong.id;
            result.newpageid = wrong.jumpto;
        }
    }

    /**
     * Check a multichoice answer.
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerMultichoice(lesson: any, pageData: any, data: any, pageIndex: any,
            result: AddonModLessonCheckAnswerResult): void {

        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;

            return;
        }

        const answers = this.getUsedAnswersMultichoice(pageData);

        if (pageData.page.qoption) {
            // Multianswer allowed, user's answer is an array.
            const studentAnswers = this.getUserResponseMultichoice(data);

            if (!studentAnswers || !Array.isArray(studentAnswers)) {
                result.noanswer = true;

                return;
            }

            // Get what the user answered.
            result.userresponse = studentAnswers.join(',');

            // Get the answers in a set order, the id order.
            const studentAswersArray = [],
                responses = [];
            let nHits = 0,
                nCorrect = 0,
                correctAnswerId = 0,
                wrongAnswerId = 0,
                correctPageId,
                wrongPageId;

            // Store student's answers for displaying on feedback page.
            result.studentanswer = '';
            result.studentanswerformat = 1;
            answers.forEach((answer) => {
                for (const i in studentAnswers) {
                    const answerId = studentAnswers[i];

                    if (answerId == answer.id) {
                        studentAswersArray.push(answer.answer);
                        responses.push(answer.response);
                        break;
                    }
                }
            });
            result.studentanswer = studentAswersArray.join(AddonModLessonProvider.MULTIANSWER_DELIMITER);

            // Iterate over all the possible answers.
            answers.forEach((answer) => {
                const correctAnswer = this.isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);

                // Iterate over all the student answers to check if he selected the current possible answer.
                studentAnswers.forEach((answerId) => {
                    if (answerId == answer.id) {
                        if (correctAnswer) {
                            nHits++;
                        } else {
                            // Always use the first student wrong answer.
                            if (typeof wrongPageId == 'undefined') {
                                wrongPageId = answer.jumpto;
                            }
                            // Save the answer id for scoring.
                            if (!wrongAnswerId) {
                                wrongAnswerId = answer.id;
                            }
                        }
                    }
                });

                if (correctAnswer) {
                    nCorrect++;

                    // Save the first jumpto.
                    if (typeof correctPageId == 'undefined') {
                        correctPageId = answer.jumpto;
                    }
                    // Save the answer id for scoring.
                    if (!correctAnswerId) {
                        correctAnswerId = answer.id;
                    }
                }
            });

            if (studentAnswers.length == nCorrect && nHits == nCorrect) {
                result.correctanswer = true;
                result.response = responses.join(AddonModLessonProvider.MULTIANSWER_DELIMITER);
                result.newpageid = correctPageId;
                result.answerid = correctAnswerId;
            } else {
                result.correctanswer = false;
                result.response = responses.join(AddonModLessonProvider.MULTIANSWER_DELIMITER);
                result.newpageid = wrongPageId;
                result.answerid = wrongAnswerId;
            }
        } else {
            // Only one answer allowed.
            if (typeof data.answerid == 'undefined' || (!data.answerid && Number(data.answerid) !== 0)) {
                result.noanswer = true;

                return;
            }

            result.answerid = data.answerid;

            // Search the answer.
            for (const i in pageData.answers) {
                const answer = pageData.answers[i];
                if (answer.id == data.answerid) {
                    result.correctanswer = this.isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                    result.newpageid = answer.jumpto;
                    result.response = answer.response;
                    result.userresponse = result.studentanswer = answer.answer;
                    break;
                }
            }
        }
    }

    /**
     * Check a numerical answer.
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerNumerical(lesson: any, pageData: any, data: any, pageIndex: any, result: AddonModLessonCheckAnswerResult)
            : void {

        const parsedAnswer = parseFloat(data.answer);

        // Set defaults.
        result.response = '';
        result.newpageid = 0;

        if (!data.answer || isNaN(parsedAnswer)) {
            result.noanswer = true;

            return;
        } else {
            result.useranswer = parsedAnswer;
        }

        result.studentanswer = result.userresponse = result.useranswer;

        // Find the answer.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i];
            let max, min;

            if (answer.answer && answer.answer.indexOf(':') != -1) {
                // There's a pair of values.
                const split = answer.answer.split(':');
                min = parseFloat(split[0]);
                max = parseFloat(split[1]);
            } else {
                // Only one value.
                min = parseFloat(answer.answer);
                max = min;
            }

            if (result.useranswer >= min && result.useranswer <= max) {
                result.newpageid = answer.jumpto;
                result.response = answer.response;
                result.correctanswer = this.isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                result.answerid = answer.id;
                break;
            }
        }

        this.checkOtherAnswers(lesson, pageData, result);
    }

    /**
     * Check a short answer.
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerShort(lesson: any, pageData: any, data: any, pageIndex: any, result: AddonModLessonCheckAnswerResult)
            : void {

        let studentAnswer = data.answer && data.answer.trim ? data.answer.trim() : false;
        if (!studentAnswer) {
            result.noanswer = true;

            return;
        }

        // Search the answer in the list of possible answers.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i],
                useRegExp = pageData.page.qoption;
            let expectedAnswer = answer.answer,
                isMatch = false,
                ignoreCase;

            if (useRegExp) {
                ignoreCase = '';
                if (expectedAnswer.substr(-2) == '/i') {
                    expectedAnswer = expectedAnswer.substr(0, expectedAnswer.length - 2);
                    ignoreCase = 'i';
                }
            } else {
                expectedAnswer = expectedAnswer.replace('*', '#####');
                expectedAnswer = this.textUtils.escapeForRegex(expectedAnswer);
                expectedAnswer = expectedAnswer.replace('#####', '.*');
            }

            // See if user typed in any of the correct answers.
            if (this.isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex)) {
                if (!useRegExp) { // We are using 'normal analysis', which ignores case.
                    if (studentAnswer.match(new RegExp('^' + expectedAnswer + '$', 'i'))) {
                        isMatch = true;
                    }
                } else {
                    if (studentAnswer.match(new RegExp('^' + expectedAnswer + '$', ignoreCase))) {
                        isMatch = true;
                    }
                }
                if (isMatch) {
                    result.correctanswer = true;
                }
            } else {
               if (!useRegExp) { // We are using 'normal analysis'.
                    // See if user typed in any of the wrong answers; don't worry about case.
                    if (studentAnswer.match(new RegExp('^' + expectedAnswer + '$', 'i'))) {
                        isMatch = true;
                    }
                } else { // We are using regular expressions analysis.
                    const startCode = expectedAnswer.substr(0, 2);

                    switch (startCode){
                        // 1- Check for absence of required string in studentAnswer (coded by initial '--').
                        case '--':
                            expectedAnswer = expectedAnswer.substr(2);
                            if (!studentAnswer.match(new RegExp('^' + expectedAnswer + '$', ignoreCase))) {
                                isMatch = true;
                            }
                            break;

                        // 2- Check for code for marking wrong strings (coded by initial '++').
                        case '++':
                            expectedAnswer = expectedAnswer.substr(2);

                            // Check for one or several matches.
                            const matches = studentAnswer.match(new RegExp(expectedAnswer, 'g' + ignoreCase));
                            if (matches) {
                                isMatch   = true;
                                const nb = matches[0].length,
                                    original = [],
                                    marked = [];

                                for (let j = 0; j < nb; j++) {
                                    original.push(matches[0][j]);
                                    marked.push('<span class="incorrect matches">' + matches[0][j] + '</span>');
                                }

                                studentAnswer = studentAnswer.replace(original, marked);
                            }
                            break;

                        // 3- Check for wrong answers belonging neither to -- nor to ++ categories.
                        default:
                            if (studentAnswer.match(new RegExp('^' + expectedAnswer + '$', ignoreCase))) {
                                isMatch = true;
                            }
                            break;
                    }

                    result.correctanswer = false;
                }
            }

            if (isMatch) {
                result.newpageid = answer.jumpto;
                result.response = answer.response;
                result.answerid = answer.id;
                break; // Quit answer analysis immediately after a match has been found.
            }
        }

        this.checkOtherAnswers(lesson, pageData, result);

        result.userresponse = studentAnswer;
        result.studentanswer = this.textUtils.s(studentAnswer); // Clean student answer as it goes to output.
    }

    /**
     * Check a truefalse answer.
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerTruefalse(lesson: any, pageData: any, data: any, pageIndex: any, result: AddonModLessonCheckAnswerResult)
            : void {

        if (!data.answerid) {
            result.noanswer = true;

            return;
        }

        result.answerid = data.answerid;

        // Get the answer.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i];
            if (answer.id == data.answerid) {
                // Answer found.
                result.correctanswer = this.isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                result.newpageid = answer.jumpto;
                result.response  = answer.response;
                result.studentanswer = result.userresponse = answer.answer;
                break;
            }
        }
    }

    /**
     * Check the "other answers" value.
     *
     * @param lesson Lesson.
     * @param pageData Result of getPageData for the page to process.
     * @param result Object where to store the result.
     */
    protected checkOtherAnswers(lesson: any, pageData: any, result: AddonModLessonCheckAnswerResult): void {
        // We could check here to see if we have a wrong answer jump to use.
        if (result.answerid == 0) {
            // Use the all other answers jump details if it is set up.
            const lastAnswer = pageData.answers[pageData.answers.length - 1] || {};

            // Double check that this is the OTHER_ANSWERS answer.
            if (typeof lastAnswer.answer == 'string' &&
                    lastAnswer.answer.indexOf(AddonModLessonProvider.LESSON_OTHER_ANSWERS) != -1) {
                result.newpageid = lastAnswer.jumpto;
                result.response = lastAnswer.response;

                if (lesson.custom) {
                    result.correctanswer = lastAnswer.score > 0;
                }
                result.answerid = lastAnswer.id;
            }
        }
    }

    /**
     * Create a list of pages indexed by page ID based on a list of pages.
     *
     * @param pageList Result of get pages.
     * @return Pages index.
     */
    protected createPagesIndex(pageList: any[]): any {
        // Index the pages by page ID.
        const pages = {};

        pageList.forEach((pageData) => {
            pages[pageData.page.id] = pageData.page;
        });

        return pages;
    }

    /**
     * Finishes a retake.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param password Lesson password (if any).
     * @param outOfTime If the user ran out of time.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param offline Whether it's offline mode.
     * @param accessInfo Result of get access info. Required if offline is true.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    finishRetake(lesson: any, courseId: number, password?: string, outOfTime?: boolean, review?: boolean, offline?: boolean,
            accessInfo?: any, siteId?: string): Promise<any> {

        if (offline) {
            const retake = accessInfo.attemptscount;

            return this.lessonOfflineProvider.finishRetake(lesson.id, courseId, retake, true, outOfTime, siteId).then(() => {
                // Get the lesson grade.
                return this.lessonGrade(lesson, retake, password, review, undefined, siteId).catch(() => {
                    // Ignore errors.
                    return {};
                });
            }).then((gradeInfo: AddonModLessonGrade) => {
                // Retake marked, now return the response. We won't return all the possible data.
                // This code is based in Moodle's process_eol_page.
                const result = {
                        data: {},
                        messages: [],
                        warnings: []
                    },
                    promises = [];
                let gradeLesson = true,
                    messageParams,
                    entryData;

                this.addResultValueEolPage(result, 'offline', true); // Mark the result as offline.
                this.addResultValueEolPage(result, 'gradeinfo', gradeInfo);

                if (lesson.custom && !accessInfo.canmanage) {
                    /* Before we calculate the custom score make sure they answered the minimum number of questions.
                       We only need to do this for custom scoring as we can not get the miniumum score the user should achieve.
                       If we are not using custom scoring (so all questions are valued as 1) then we simply check if they
                       answered more than the minimum questions, if not, we mark it out of the number specified in the minimum
                       questions setting - which is done in lesson_grade(). */

                    // Get the number of answers given.
                    if (gradeInfo.nquestions < lesson.minquestions) {
                        gradeLesson = false;
                        messageParams = {
                            nquestions: gradeInfo.nquestions,
                            minquestions: lesson.minquestions
                        };
                        this.addMessage(result.messages, 'addon.mod_lesson.numberofpagesviewednotice', {$a: messageParams});
                    }
                }

                if (!accessInfo.canmanage) {
                    if (gradeLesson) {
                        promises.push(this.calculateProgress(lesson.id, accessInfo, password, review, undefined, siteId)
                                .then((progress) => {
                            this.addResultValueEolPage(result, 'progresscompleted', progress);
                        }));

                        if (gradeInfo.attempts) {
                            // User has answered questions.
                            if (!lesson.custom) {
                                this.addResultValueEolPage(result, 'numberofpagesviewed', gradeInfo.nquestions, true);
                                if (lesson.minquestions) {
                                    if (gradeInfo.nquestions < lesson.minquestions) {
                                        this.addResultValueEolPage(result, 'youshouldview', lesson.minquestions, true);
                                    }
                                }
                                this.addResultValueEolPage(result, 'numberofcorrectanswers', gradeInfo.earned, true);
                            }

                            entryData = {
                                score: gradeInfo.earned,
                                grade: gradeInfo.total
                            };
                            if (gradeInfo.nmanual) {
                                entryData.tempmaxgrade = gradeInfo.total - gradeInfo.manualpoints;
                                entryData.essayquestions = gradeInfo.nmanual;
                                this.addResultValueEolPage(result, 'displayscorewithessays', entryData, true);
                            } else {
                                this.addResultValueEolPage(result, 'displayscorewithoutessays', entryData, true);
                            }

                            if (lesson.grade != CoreGradesProvider.TYPE_NONE) {
                                entryData = {
                                    grade: this.textUtils.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                    total: lesson.grade
                                };
                                this.addResultValueEolPage(result, 'yourcurrentgradeisoutof', entryData, true);
                            }

                        } else {
                            // User hasn't answered any question, only content pages.
                            if (lesson.timelimit) {
                                if (outOfTime) {
                                    this.addResultValueEolPage(result, 'eolstudentoutoftimenoanswers', true, true);
                                }
                            } else {
                                this.addResultValueEolPage(result, 'welldone', true, true);
                            }
                        }
                    }
                } else {
                    // Display for teacher.
                    if (lesson.grade != CoreGradesProvider.TYPE_NONE) {
                        this.addResultValueEolPage(result, 'displayofgrade', true, true);
                    }
                }

                if (lesson.modattempts && accessInfo.canmanage) {
                    this.addResultValueEolPage(result, 'modattemptsnoteacher', true, true);
                }

                if (gradeLesson) {
                    this.addResultValueEolPage(result, 'gradelesson', 1);
                }

                return result;
            });
        }

        return this.finishRetakeOnline(lesson.id, password, outOfTime, review, siteId).then((response) => {
            this.eventsProvider.trigger(AddonModLessonProvider.DATA_SENT_EVENT, {
                lessonId: lesson.id,
                type: 'finish',
                courseId: courseId,
                outOfTime: outOfTime,
                review: review
            }, this.sitesProvider.getCurrentSiteId());

            return response;
        });
    }

    /**
     * Finishes a retake. It will fail if offline or cannot connect.
     *
     * @param lessonId Lesson ID.
     * @param password Lesson password (if any).
     * @param outOfTime If the user ran out of time.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    finishRetakeOnline(lessonId: number, password?: string, outOfTime?: boolean, review?: boolean, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                lessonid: lessonId,
                outoftime: outOfTime ? 1 : 0,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_finish_attempt', params).then((response) => {
                // Convert the data array into an object and decode the values.
                const map = {};

                response.data.forEach((entry) => {
                    if (entry.value && typeof entry.value == 'string' && entry.value !== '1') {
                        // It's a JSON encoded object. Try to decode it.
                        entry.value = this.textUtils.parseJSON(entry.value);
                    }

                    map[entry.name] = entry;
                });
                response.data = map;

                return response;
            });
        });
    }

    /**
     * Get the access information of a certain lesson.
     *
     * @param lessonId Lesson ID.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the access information.
     */
    getAccessInformation(lessonId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    lessonid: lessonId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAccessInformationCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_lesson_access_information', params, preSets);
        });
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getAccessInformationCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'accessInfo:' + lessonId;
    }

    /**
     * Get content pages viewed in online and offline.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object with the online and offline viewed pages.
     */
    getContentPagesViewed(lessonId: number, retake: number, siteId?: string): Promise<{online: any[], offline: any[]}> {
        const promises = [],
            type = AddonModLessonProvider.TYPE_STRUCTURE,
            result = {
                online: [],
                offline: []
            };

        // Get the online pages.
        promises.push(this.getContentPagesViewedOnline(lessonId, retake, false, false, siteId).then((pages) => {
            result.online = pages;
        }));

        // Get the offline pages.
        promises.push(this.lessonOfflineProvider.getRetakeAttemptsForType(lessonId, retake, type, siteId).catch(() => {
            return [];
        }).then((pages) => {
            result.offline = pages;
        }));

        return Promise.all(promises).then(() => {
            return result;
        });
    }

    /**
     * Get cache key for get content pages viewed WS calls.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @return Cache key.
     */
    protected getContentPagesViewedCacheKey(lessonId: number, retake: number): string {
        return this.getContentPagesViewedCommonCacheKey(lessonId) + ':' + retake;
    }

    /**
     * Get common cache key for get content pages viewed WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getContentPagesViewedCommonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'contentPagesViewed:' + lessonId;
    }

    /**
     * Get IDS of content pages viewed in online and offline.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with list of IDs.
     */
    getContentPagesViewedIds(lessonId: number, retake: number, siteId?: string): Promise<number[]> {
        return this.getContentPagesViewed(lessonId, retake, siteId).then((result) => {
            const ids = {},
                pages = result.online.concat(result.offline);

            pages.forEach((page) => {
                if (!ids[page.pageid]) {
                    ids[page.pageid] = true;
                }
            });

            return Object.keys(ids).map((id) => {
                return Number(id);
            });
        });
    }

    /**
     * Get the list of content pages viewed in the site for a certain retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the viewed pages.
     */
    getContentPagesViewedOnline(lessonId: number, retake: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    lessonid: lessonId,
                    lessonattempt: retake
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getContentPagesViewedCacheKey(lessonId, retake)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_content_pages_viewed', params, preSets).then((result) => {
                return result.pages;
            });
        });
    }

    /**
     * Get the last content page viewed.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the last content page viewed.
     */
    getLastContentPageViewed(lessonId: number, retake: number, siteId?: string): Promise<any> {
        return this.getContentPagesViewed(lessonId, retake, siteId).then((data) => {
            let lastPage,
                maxTime = 0;

            data.online.forEach((page) => {
                if (page.timeseen > maxTime) {
                    lastPage = page;
                    maxTime = page.timeseen;
                }
            });

            data.offline.forEach((page) => {
                if (page.timemodified > maxTime) {
                    lastPage = page;
                    maxTime = page.timemodified;
                }
            });

            return lastPage;
        }).catch(() => {
            // Error getting last page, don't return anything.
        });
    }

    /**
     * Get the last page seen.
     * Based on Moodle's get_last_page_seen.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the last page seen.
     */
    getLastPageSeen(lessonId: number, retake: number, siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let lastPageSeen: number;

        // Get the last question answered.
        return this.lessonOfflineProvider.getLastQuestionPageAttempt(lessonId, retake, siteId).then((answer) => {
            if (answer) {
                lastPageSeen = answer.newpageid;
            }

            // Now get the last content page viewed.
            return this.getLastContentPageViewed(lessonId, retake, siteId).then((page) => {
                if (page) {
                    if (answer) {
                        if (page.timemodified > answer.timemodified) {
                            // This content page was viewed more recently than the question page.
                            lastPageSeen = page.newpageid || page.pageid;
                        }
                    } else {
                        // Has not answered any questions but has viewed a content page.
                        lastPageSeen = page.newpageid || page.pageid;
                    }
                }

                return lastPageSeen;
            });
        });
    }

    /**
     * Get a Lesson by module ID.
     *
     * @param courseId Course ID.
     * @param cmid Course module ID.
     * @param forceCache Whether it should always return cached data.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the lesson is retrieved.
     */
    getLesson(courseId: number, cmId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getLessonByField(courseId, 'coursemodule', cmId, forceCache, ignoreCache, siteId);
    }

    /**
     * Get a Lesson with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param forceCache Whether it should always return cached data.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the lesson is retrieved.
     */
    protected getLessonByField(courseId: number, key: string, value: any, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getLessonDataCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_lessons_by_courses', params, preSets).then((response) => {
                if (response && response.lessons) {
                    const currentLesson = response.lessons.find((lesson) => {
                        return lesson[key] == value;
                    });

                    if (currentLesson) {
                        return currentLesson;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a Lesson by lesson ID.
     *
     * @param courseId Course ID.
     * @param id Lesson ID.
     * @param forceCache Whether it should always return cached data.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the lesson is retrieved.
     */
    getLessonById(courseId: number, id: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getLessonByField(courseId, 'id', id, forceCache, ignoreCache, siteId);
    }

    /**
     * Get cache key for Lesson data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getLessonDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'lesson:' + courseId;
    }

    /**
     * Get a lesson protected with password.
     *
     * @param lessonId Lesson ID.
     * @param password Password.
     * @param validatePassword If true, the function will fail if the password is wrong.
     *                         If false, it will return a lesson with the basic data if password is wrong.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the lesson.
     */
    getLessonWithPassword(lessonId: number, password?: string, validatePassword: boolean = true, forceCache?: boolean,
            ignoreCache?: boolean, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                    lessonid: lessonId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getLessonWithPasswordCacheKey(lessonId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_lesson', params, preSets).then((response) => {
                if (typeof response.lesson.ongoing == 'undefined') {
                    // Basic data not received, password is wrong. Remove stored password.
                    this.removeStoredPassword(lessonId, site.id);

                    if (validatePassword) {
                        // Invalidate the data and reject.
                        return this.invalidateLessonWithPassword(lessonId, site.id).catch(() => {
                            // Shouldn't happen.
                        }).then(() => {
                            return Promise.reject(this.translate.instant('addon.mod_lesson.loginfail'));
                        });
                    }
                }

                return response.lesson;
            });
        });
    }

    /**
     * Get cache key for get lesson with password WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getLessonWithPasswordCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'lessonWithPswrd:' + lessonId;
    }

    /**
     * Given a page ID, a jumpto and all the possible jumps, calcualate the new page ID.
     *
     * @param pageId Current page ID.
     * @param jumpTo The jumpto.
     * @param jumps Result of get pages possible jumps.
     * @return New page ID.
     */
    protected getNewPageId(pageId: number, jumpTo: number, jumps: any): number {
        // If jump not found, return current jumpTo.
        if (jumps && jumps[pageId] && jumps[pageId][jumpTo]) {
            return jumps[pageId][jumpTo].calculatedjump;
        } else if (!jumpTo) {
            // Return current page.
            return pageId;
        }

        return jumpTo;
    }

    /**
     * Get the ongoing score message for the user (depending on the user permission and lesson settings).
     *
     * @param lesson Lesson.
     * @param accessInfo Result of get access info.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param pageIndex Object containing all the pages indexed by ID. If not provided, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the ongoing score message.
     */
    getOngoingScoreMessage(lesson: any, accessInfo: any, password?: string, review?: boolean, pageIndex?: any, siteId?: string)
            : Promise<string> {

        if (accessInfo.canmanage) {
            return Promise.resolve(this.translate.instant('addon.mod_lesson.teacherongoingwarning'));
        } else {
            let retake = accessInfo.attemptscount;
            if (review) {
                retake--;
            }

            return this.lessonGrade(lesson, retake, password, review, pageIndex, siteId).then((gradeInfo) => {
                const data: any = {};

                if (lesson.custom) {
                    data.score = gradeInfo.earned;
                    data.currenthigh = gradeInfo.total;

                    return this.translate.instant('addon.mod_lesson.ongoingcustom', {$a: data});
                } else {
                    data.correct = gradeInfo.earned;
                    data.viewed = gradeInfo.attempts;

                    return this.translate.instant('addon.mod_lesson.ongoingnormal', {$a: data});
                }
            });
        }
    }

    /**
     * Get the possible answers from a page.
     *
     * @param lesson Lesson.
     * @param pageId Page ID.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of possible answers.
     */
    protected getPageAnswers(lesson: any, pageId: number, password?: string, review?: boolean, siteId?: string): Promise<any[]> {
        return this.getPageData(lesson, pageId, password, review, true, true, false, undefined, undefined, siteId).then((data) => {
            return data.answers;
        });
    }

    /**
     * Get all the possible answers from a list of pages, indexed by answerId.
     *
     * @param lesson Lesson.
     * @param pageIds List of page IDs.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object containing the answers.
     */
    protected getPagesAnswers(lesson: any, pageIds: number[], password?: string, review?: boolean, siteId?: string)
            : Promise<any> {

        const answers = {},
            promises = [];

        pageIds.forEach((pageId) => {
            promises.push(this.getPageAnswers(lesson, pageId, password, review, siteId).then((pageAnswers) => {
                pageAnswers.forEach((answer) => {
                    // Include the pageid in each answer and add them to the final list.
                    answer.pageid = pageId;
                    answers[answer.id] = answer;
                });
            }));
        });

        return Promise.all(promises).then(() => {
            return answers;
        });
    }

    /**
     * Get page data.
     *
     * @param lesson Lesson.
     * @param pageId Page ID.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param includeContents Include the page rendered contents.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param accessInfo Result of get access info. Required if offline is true.
     * @param jumps Result of get pages possible jumps. Required if offline is true.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the page data.
     */
    getPageData(lesson: any, pageId: number, password?: string, review?: boolean, includeContents?: boolean, forceCache?: boolean,
            ignoreCache?: boolean, accessInfo?: any, jumps?: any, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                    lessonid: lesson.id,
                    pageid: Number(pageId),
                    review: review ? 1 : 0,
                    returncontents: includeContents ? 1 : 0
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getPageDataCacheKey(lesson.id, pageId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            if (review) {
                // Force online mode in review.
                preSets.getFromCache = false;
                preSets.saveToCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_page_data', params, preSets).then((data) => {
                if (forceCache && accessInfo && data.page) {
                    // Offline mode and valid page. Calculate the data that might be affected.
                    return this.calculateOfflineData(lesson, accessInfo, password, review, undefined, siteId).then((calcData) => {
                        Object.assign(data, calcData);

                        return this.getPageViewMessages(lesson, accessInfo, data.page, review, jumps, password, siteId);
                    }).then((messages) => {
                        data.messages = messages;

                        return data;
                    });
                }

                return data;
            });
        });
    }

    /**
     * Get cache key for get page data WS calls.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @return Cache key.
     */
    protected getPageDataCacheKey(lessonId: number, pageId: number): string {
        return this.getPageDataCommonCacheKey(lessonId) + ':' + pageId;
    }

    /**
     * Get common cache key for get page data WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getPageDataCommonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'pageData:' + lessonId;
    }

    /**
     * Get lesson pages.
     *
     * @param lessonId Lesson ID.
     * @param password Lesson password (if any).
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the pages.
     */
    getPages(lessonId: number, password?: string, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                    lessonid: lessonId,
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getPagesCacheKey(lessonId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_pages', params, preSets).then((response) => {
                return response.pages;
            });
        });
    }

    /**
     * Get cache key for get pages WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getPagesCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'pages:' + lessonId;
    }

    /**
     * Get possible jumps for a lesson.
     *
     * @param lessonId Lesson ID.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the jumps.
     */
    getPagesPossibleJumps(lessonId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    lessonid: lessonId,
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getPagesPossibleJumpsCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_pages_possible_jumps', params, preSets).then((response) => {
                // Index the jumps by page and jumpto.
                if (response.jumps) {
                    const jumps = {};

                    response.jumps.forEach((jump) => {
                        if (typeof jumps[jump.pageid] == 'undefined') {
                            jumps[jump.pageid] = {};
                        }
                        jumps[jump.pageid][jump.jumpto] = jump;
                    });

                    return jumps;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get pages possible jumps WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getPagesPossibleJumpsCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'pagesJumps:' + lessonId;
    }

    /**
     * Get different informative messages when processing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_process.
     *
     * @param lesson Lesson.
     * @param accessInfo Result of get access info.
     * @param result Result of process page.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param jumps Result of get pages possible jumps.
     * @return Array with the messages.
     */
    getPageProcessMessages(lesson: any, accessInfo: any, result: any, review: boolean, jumps: any): any[] {
        const messages = [];

        if (accessInfo.canmanage) {
            // Warning for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
            if (this.lessonDisplayTeacherWarning(jumps)) {
                this.addMessage(messages, 'addon.mod_lesson.teacherjumpwarning', {$a: {
                    cluster: this.translate.instant('addon.mod_lesson.clusterjump'),
                    unseen: this.translate.instant('addon.mod_lesson.unseenpageinbranch')
                }});
            }

            // Inform teacher that s/he will not see the timer.
            if (lesson.timelimit) {
                this.addMessage(messages, 'addon.mod_lesson.teachertimerwarning');
            }
        }
        // Report attempts remaining.
        if (result.attemptsremaining > 0 && lesson.review && !review) {
            this.addMessage(messages, 'addon.mod_lesson.attemptsremaining', {$a: result.attemptsremaining});
        }

        return messages;
    }

    /**
     * Get the IDs of all the pages that have at least 1 question attempt.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param correct True to only fetch correct attempts, false to get them all.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's user.
     * @return Promise resolved with the IDs.
     */
    getPagesIdsWithQuestionAttempts(lessonId: number, retake: number, correct?: boolean, siteId?: string, userId?: number)
            : Promise<number[]> {

        return this.getQuestionsAttempts(lessonId, retake, correct, undefined, siteId, userId).then((result) => {
            const ids = {},
                attempts = result.online.concat(result.offline);

            attempts.forEach((attempt) => {
                if (!ids[attempt.pageid]) {
                    ids[attempt.pageid] = true;
                }
            });

            return Object.keys(ids).map((id) => {
                return Number(id);
            });
        });
    }

    /**
     * Get different informative messages when viewing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_view.
     *
     * @param lesson Lesson.
     * @param accessInfo Result of get access info. Required if offline is true.
     * @param page Page loaded.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param jumps Result of get pages possible jumps.
     * @param password Lesson password (if any).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of messages.
     */
    getPageViewMessages(lesson: any, accessInfo: any, page: any, review: boolean, jumps: any, password?: string, siteId?: string)
            : Promise<any[]> {

        const messages = [];
        let promise = Promise.resolve();

        if (!accessInfo.canmanage) {
            if (page.qtype == AddonModLessonProvider.LESSON_PAGE_BRANCHTABLE && lesson.minquestions) {
                // Tell student how many questions they have seen, how many are required and their grade.
                const retake = accessInfo.attemptscount;

                promise = this.lessonGrade(lesson, retake, password, review, undefined, siteId).then((gradeInfo) => {
                    if (gradeInfo.attempts) {
                        if (gradeInfo.nquestions < lesson.minquestions) {
                            this.addMessage(messages, 'addon.mod_lesson.numberofpagesviewednotice', {$a: {
                                nquestions: gradeInfo.nquestions,
                                minquestions: lesson.minquestions
                            }});
                        }

                        if (!review && !lesson.retake) {
                            this.addMessage(messages, 'addon.mod_lesson.numberofcorrectanswers', {$a: gradeInfo.earned});

                            if (lesson.grade != CoreGradesProvider.TYPE_NONE) {
                                this.addMessage(messages, 'addon.mod_lesson.yourcurrentgradeisoutof', {$a: {
                                    grade: this.textUtils.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                    total: lesson.grade
                                }});
                            }
                        }
                    }
                }).catch(() => {
                    // Ignore errors.
                });
            }
        } else {
            if (lesson.timelimit) {
                this.addMessage(messages, 'addon.mod_lesson.teachertimerwarning');
            }

            if (this.lessonDisplayTeacherWarning(jumps)) {
                // Warning for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
                this.addMessage(messages, 'addon.mod_lesson.teacherjumpwarning', {$a: {
                    cluster: this.translate.instant('addon.mod_lesson.clusterjump'),
                    unseen: this.translate.instant('addon.mod_lesson.unseenpageinbranch')
                }});
            }
        }

        return promise.then(() => {
            return messages;
        });
    }

    /**
     * Get questions attempts, including offline attempts.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param correct True to only fetch correct attempts, false to get them all.
     * @param pageId If defined, only get attempts on this page.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's user.
     * @return Promise resolved with the questions attempts.
     */
    getQuestionsAttempts(lessonId: number, retake: number, correct?: boolean, pageId?: number, siteId?: string, userId?: number)
            : Promise<{online: any[], offline: any[]}> {

        const promises = [],
            result = {
                online: [],
                offline: []
            };

        promises.push(this.getQuestionsAttemptsOnline(lessonId, retake, correct, pageId, false, false, siteId, userId)
                .then((attempts) => {
            result.online = attempts;
        }));

        promises.push(this.lessonOfflineProvider.getQuestionsAttempts(lessonId, retake, correct, pageId, siteId).catch(() => {
            // Error, assume no attempts.
            return [];
        }).then((attempts) => {
            result.offline = attempts;
        }));

        return Promise.all(promises).then(() => {
            return result;
        });
    }

    /**
     * Get cache key for get questions attempts WS calls.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getQuestionsAttemptsCacheKey(lessonId: number, retake: number, userId: number): string {
        return this.getQuestionsAttemptsCommonCacheKey(lessonId) + ':' + userId + ':' + retake;
    }

    /**
     * Get common cache key for get questions attempts WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getQuestionsAttemptsCommonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'questionsAttempts:' + lessonId;
    }

    /**
     * Get questions attempts from the site.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param correct True to only fetch correct attempts, false to get them all.
     * @param pageId If defined, only get attempts on this page.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's user.
     * @return Promise resolved with the questions attempts.
     */
    getQuestionsAttemptsOnline(lessonId: number, retake: number, correct?: boolean, pageId?: number, forceCache?: boolean,
            ignoreCache?: boolean, siteId?: string, userId?: number): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            // Don't pass "pageId" and "correct" params, they will be filtered locally.
            const params = {
                    lessonid: lessonId,
                    attempt: retake,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getQuestionsAttemptsCacheKey(lessonId, retake, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_questions_attempts', params, preSets).then((response) => {
                if (pageId || correct) {
                    // Filter the attempts.
                    return response.attempts.filter((attempt) => {
                        if (correct && !attempt.correct) {
                            return false;
                        }

                        if (pageId && attempt.pageid != pageId) {
                            return false;
                        }

                        return true;
                    });
                }

                return response.attempts;
            });
        });
    }

    /**
     * Get the overview of retakes in a lesson (named "attempts overview" in Moodle).
     *
     * @param lessonId Lesson ID.
     * @param groupId The group to get. If not defined, all participants.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retakes overview.
     */
    getRetakesOverview(lessonId: number, groupId?: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        groupId = groupId || 0;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    lessonid: lessonId,
                    groupid: groupId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getRetakesOverviewCacheKey(lessonId, groupId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_attempts_overview', params, preSets).then((response) => {
                return response.data;
            });
        });
    }

    /**
     * Get cache key for get retakes overview WS calls.
     *
     * @param lessonId Lesson ID.
     * @param groupId Group ID.
     * @return Cache key.
     */
    protected getRetakesOverviewCacheKey(lessonId: number, groupId: number): string {
        return this.getRetakesOverviewCommonCacheKey(lessonId) + ':' + groupId;
    }

    /**
     * Get common cache key for get retakes overview WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getRetakesOverviewCommonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'retakesOverview:' + lessonId;
    }

    /**
     * Get a password stored in DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with password on success, rejected otherwise.
     */
    getStoredPassword(lessonId: number, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModLessonProvider.PASSWORD_TABLE, {lessonid: lessonId}).then((entry) => {
                return entry.password;
            });
        });
    }

    /**
     * Finds all pages that appear to be a subtype of the provided pageId until an end point specified within "ends" is
     * encountered or no more pages exist.
     * Based on Moodle's get_sub_pages_of.
     *
     * @param pages Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param pageId Page ID to get subpages of.
     * @param end An array of LESSON_PAGE_* types that signify an end of the subtype.
     * @return List of subpages.
     */
    getSubpagesOf(pages: any, pageId: number, ends: number[]): any[] {
        const subPages = [];

        pageId = pages[pageId].nextpageid; // Move to the first page after the given page.
        ends = ends || [];

        while (true) {
            if (!pageId || ends.indexOf(pages[pageId].qtype) != -1) {
                // No more pages or it reached a page of the searched types. Stop.
                break;
            }

            subPages.push(pages[pageId]);
            pageId = pages[pageId].nextpageid;
        }

        return subPages;
    }

    /**
     * Get lesson timers.
     *
     * @param lessonId Lesson ID.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's current user.
     * @return Promise resolved with the pages.
     */
    getTimers(lessonId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    lessonid: lessonId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getTimersCacheKey(lessonId, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_user_timers', params, preSets).then((response) => {
                return response.timers;
            });
        });
    }

    /**
     * Get cache key for get timers WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getTimersCacheKey(lessonId: number, userId: number): string {
        return this.getTimersCommonCacheKey(lessonId) + ':' + userId;
    }

    /**
     * Get common cache key for get timers WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getTimersCommonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'timers:' + lessonId;
    }

    /**
     * Get the list of used answers (with valid answer) in a multichoice question page.
     *
     * @param pageData Result of getPageData for the page to process.
     * @return List of used answers.
     */
    protected getUsedAnswersMultichoice(pageData: any): any[] {
        const answers = this.utils.clone(pageData.answers);

        return answers.filter((entry) => {
            return entry.answer !== '';
        });
    }

    /**
     * Get the user's response in a matching question page.
     *
     * @param data Data containing the user answer.
     * @return User response.
     */
    protected getUserResponseMatching(data: any): any {
        if (data.response) {
            // The data is already stored as expected. Return it.
            return data.response;
        }

        // Data is stored in properties like 'response[379]'. Recreate the response object.
        const response = {};

        for (const key in data) {
            const match = key.match(/^response\[(\d+)\]/);

            if (match && match.length > 1) {
                response[match[1]] = data[key];
            }
        }

        return response;
    }

    /**
     * Get the user's response in a multichoice page if multiple answers are allowed.
     *
     * @param data Data containing the user answer.
     * @return User response.
     */
    protected getUserResponseMultichoice(data: any): any[] {
        if (data.answer) {
            // The data is already stored as expected. If it's valid, parse the values to int.
            if (Array.isArray(data.answer)) {
                return data.answer.map((value) => {
                    return parseInt(value, 10);
                });
            }

            return data.answer;
        }

        // Data is stored in properties like 'answer[379]'. Recreate the answer array.
        const answer = [];
        for (const key in data) {
            const match = key.match(/^answer\[(\d+)\]/);
            if (match && match.length > 1) {
                answer.push(parseInt(match[1], 10));
            }
        }

        return answer;
    }

    /**
     * Get a user's retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number
     * @param userId User ID. Undefined for current user.
     * @param forceCache Whether it should always return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake data.
     */
    getUserRetake(lessonId: number, retake: number, userId?: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    lessonid: lessonId,
                    userid: userId,
                    lessonattempt: retake
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getUserRetakeCacheKey(lessonId, userId, retake),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_lesson_get_user_attempt', params, preSets);
        });
    }

    /**
     * Get cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @param retake Retake number
     * @return Cache key.
     */
    protected getUserRetakeCacheKey(lessonId: number, userId: number, retake: number): string {
        return this.getUserRetakeUserCacheKey(lessonId, userId) + ':' + retake;
    }

    /**
     * Get user cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getUserRetakeUserCacheKey(lessonId: number, userId: number): string {
        return this.getUserRetakeLessonCacheKey(lessonId) + ':' + userId;
    }

    /**
     * Get lesson cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @return Cache key.
     */
    protected getUserRetakeLessonCacheKey(lessonId: number): string {
        return this.ROOT_CACHE_KEY + 'userRetake:' + lessonId;
    }

    /**
     * Get the prevent access reason to display for a certain lesson.
     *
     * @param info Lesson access info.
     * @param ignorePassword Whether password protected reason should be ignored (user already entered the password).
     * @param isReview Whether user is reviewing a retake.
     * @return Prevent access reason.
     */
    getPreventAccessReason(info: any, ignorePassword?: boolean, isReview?: boolean): any {
        let result;

        if (info && info.preventaccessreasons) {
            for (let i = 0; i < info.preventaccessreasons.length; i++) {
                const entry = info.preventaccessreasons[i];

                if (entry.reason == 'lessonopen' || entry.reason == 'lessonclosed') {
                    // Time restrictions are the most prioritary, return it.
                    return entry;
                } else if (entry.reason == 'passwordprotectedlesson') {
                    if (!ignorePassword) {
                        // Treat password before all other reasons.
                        result = entry;
                    }
                } else if (entry.reason == 'noretake' && isReview) {
                    // Ignore noretake error when reviewing.
                } else if (!result) {
                    // Rest of cases, just return any of them.
                    result = entry;
                }
            }
        }

        return result;
    }

    /**
     * Check if a jump is correct.
     * Based in Moodle's jumpto_is_correct.
     *
     * @param pageId ID of the page from which you are jumping from.
     * @param jumpTo The jumpto number.
     * @param pageIndex Object containing all the pages indexed by ID. See createPagesIndex.
     * @return Whether jump is correct.
     */
    jumptoIsCorrect(pageId: number, jumpTo: number, pageIndex: any): boolean {
        // First test the special values.
        if (!jumpTo) {
            // Same page
            return false;
        } else if (jumpTo == AddonModLessonProvider.LESSON_NEXTPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonProvider.LESSON_UNSEENBRANCHPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonProvider.LESSON_RANDOMPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonProvider.LESSON_CLUSTERJUMP) {
            return true;
        } else if (jumpTo == AddonModLessonProvider.LESSON_EOL) {
            return true;
        }

        let aPageId = pageIndex[pageId].nextpageid;
        while (aPageId) {
            if (jumpTo == aPageId) {
                return true;
            }

            aPageId = pageIndex[aPageId].nextpageid;
        }

        return false;
    }

    /**
     * Invalidates Lesson data.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAccessInformation(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(lessonId));
        });
    }

    /**
     * Invalidates content pages viewed for all retakes.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContentPagesViewed(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getContentPagesViewedCommonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates content pages viewed for a certain retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContentPagesViewedForRetake(lessonId: number, retake: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getContentPagesViewedCacheKey(lessonId, retake));
        });
    }

    /**
     * Invalidates Lesson data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLessonData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getLessonDataCacheKey(courseId));
        });
    }

    /**
     * Invalidates lesson with password.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLessonWithPassword(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getLessonWithPasswordCacheKey(lessonId));
        });
    }

    /**
     * Invalidates page data for all pages.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePageData(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getPageDataCommonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates page data for a certain page.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePageDataForPage(lessonId: number, pageId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getPageDataCacheKey(lessonId, pageId));
        });
    }

    /**
     * Invalidates pages.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePages(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getPagesCacheKey(lessonId));
        });
    }

    /**
     * Invalidates pages possible jumps.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePagesPossibleJumps(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getPagesPossibleJumpsCacheKey(lessonId));
        });
    }

    /**
     * Invalidates questions attempts for all retakes.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateQuestionsAttempts(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getQuestionsAttemptsCommonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates question attempts for a certain retake and user.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site..
     * @param userId User ID. If not defined, site's user.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateQuestionsAttemptsForRetake(lessonId: number, retake: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getQuestionsAttemptsCacheKey(lessonId, retake, userId));
        });
    }

    /**
     * Invalidates retakes overview for all groups in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateRetakesOverview(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getRetakesOverviewCommonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates retakes overview for a certain group in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param groupId Group ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateRetakesOverviewForGroup(lessonId: number, groupId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getRetakesOverviewCacheKey(lessonId, groupId));
        });
    }

    /**
     * Invalidates timers for all users in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTimers(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getTimersCommonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates timers for a certain user.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's current user.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTimersForUser(lessonId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getTimersCacheKey(lessonId, userId));
        });
    }

    /**
     * Invalidates a certain retake for a certain user.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param userId User ID. Undefined for current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserRetake(lessonId: number, retake: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getUserRetakeCacheKey(lessonId, userId, retake));
        });
    }

    /**
     * Invalidates all retakes for all users in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserRetakesForLesson(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUserRetakeLessonCacheKey(lessonId));
        });
    }

    /**
     * Invalidates all retakes for a certain user in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID. Undefined for current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserRetakesForUser(lessonId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKeyStartingWith(this.getUserRetakeUserCacheKey(lessonId, userId));
        });
    }

    /**
     * Check if a page answer is correct.
     *
     * @param lesson Lesson.
     * @param pageId The page ID.
     * @param answer The answer to check.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @return Whether the answer is correct.
     */
    protected isAnswerCorrect(lesson: any, pageId: number, answer: any, pageIndex: any): boolean {
        if (lesson.custom) {
            // Custom scores. If score on answer is positive, it is correct.
            return answer.score > 0;
        } else {
            return this.jumptoIsCorrect(pageId, answer.jumpto, pageIndex);
        }
    }

    /**
     * Check if a lesson is enabled to be used in offline.
     *
     * @param lesson Lesson.
     * @return Whether offline is enabled.
     */
    isLessonOffline(lesson: any): boolean {
        return !!lesson.allowofflineattempts;
    }

    /**
     * Check if a lesson is password protected based in the access info.
     *
     * @param info Lesson access info.
     * @return Whether the lesson is password protected.
     */
    isPasswordProtected(info: any): boolean {
        if (info && info.preventaccessreasons) {
            for (let i = 0; i < info.preventaccessreasons.length; i++) {
                const entry = info.preventaccessreasons[i];

                if (entry.reason == 'passwordprotectedlesson') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the lesson WS are available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // All WS were introduced at the same time so checking one is enough.
            return site.wsAvailable('mod_lesson_get_lesson_access_information');
        });
    }

    /**
     * Check if a page is a question page or a content page.
     *
     * @param type Type of the page.
     * @return True if question page, false if content page.
     */
    isQuestionPage(type: number): boolean {
        return type == AddonModLessonProvider.TYPE_QUESTION;
    }

    /**
     * Start or continue a retake.
     *
     * @param id Lesson ID.
     * @param password Lesson password (if any).
     * @param pageId Page id to continue from (only when continuing a retake).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    launchRetake(id: number, password?: string, pageId?: number, review?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                lessonid: id,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }
            if (typeof pageId == 'number') {
                params.pageid = pageId;
            }

            return site.write('mod_lesson_launch_attempt', params).then((response) => {
                this.eventsProvider.trigger(AddonModLessonProvider.DATA_SENT_EVENT, {
                    lessonId: id,
                    type: 'launch'
                }, this.sitesProvider.getCurrentSiteId());

                return response;
            });
        });
    }

    /**
     * Check if the user left during a timed session.
     *
     * @param info Lesson access info.
     * @return True if left during timed, false otherwise.
     */
    leftDuringTimed(info: any): boolean {
        return info && info.lastpageseen && info.lastpageseen != AddonModLessonProvider.LESSON_EOL && info.leftduringtimedsession;
    }

    /**
     * Checks to see if a LESSON_CLUSTERJUMP or a LESSON_UNSEENBRANCHPAGE is used in a lesson.
     * Based on Moodle's lesson_display_teacher_warning.
     *
     * @param jumps Result of get pages possible jumps.
     * @return Whether the lesson uses one of those jumps.
     */
    lessonDisplayTeacherWarning(jumps: any): boolean {
        if (!jumps) {
            return false;
        }

        // Check if any jump is to cluster or unseen content page.
        for (const pageId in jumps) {
            for (const jumpto in jumps[pageId]) {
                const jumptoNum = Number(jumpto);

                if (jumptoNum == AddonModLessonProvider.LESSON_CLUSTERJUMP ||
                        jumptoNum == AddonModLessonProvider.LESSON_UNSEENBRANCHPAGE) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Calculates a user's grade for a lesson.
     * Based on Moodle's lesson_grade.
     *
     * @param lesson Lesson.
     * @param retake Retake number.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param pageIndex Object containing all the pages indexed by ID. If not provided, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's user.
     * @return Promise resolved with the grade data.
     */
    lessonGrade(lesson: any, retake: number, password?: string, review?: boolean, pageIndex?: any, siteId?: string,
            userId?: number): Promise<AddonModLessonGrade> {

        // Initialize all variables.
        let nViewed      = 0,
            nManual      = 0,
            manualPoints = 0,
            theGrade     = 0,
            nQuestions   = 0,
            total        = 0,
            earned       = 0;

        // Get the questions attempts for the user.
        return this.getQuestionsAttempts(lesson.id, retake, false, undefined, siteId, userId).then((attemptsData) => {
            const attempts = attemptsData.online.concat(attemptsData.offline);

            if (!attempts.length) {
                // No attempts.
                return;
            }

            const attemptSet = {};
            let promise;

            // Create the pageIndex if it isn't provided.
            if (!pageIndex) {
                promise = this.getPages(lesson.id, password, true, false, siteId).then((pages) => {
                    pageIndex = this.createPagesIndex(pages);
                });
            } else {
                promise = Promise.resolve();
            }

            return promise.then(() => {
                const pageIds = [];

                // Group each try with its page.
                attempts.forEach((attempt) => {
                    if (!attemptSet[attempt.pageid]) {
                        attemptSet[attempt.pageid] = [];
                        pageIds.push(attempt.pageid);
                    }
                    attemptSet[attempt.pageid].push(attempt);
                });

                // Drop all attempts that go beyond max attempts for the lesson.
                for (const pageId in attemptSet) {
                    // Sort the list by time in ascending order.
                    const attempts = attemptSet[pageId].sort((a, b) => {
                        return (a.timeseen || a.timemodified) - (b.timeseen || b.timemodified);
                    });

                    attemptSet[pageId] = attempts.slice(0, lesson.maxattempts);
                }

                // Get all the answers from the pages the user answered.
                return this.getPagesAnswers(lesson, pageIds, password, review, siteId);
            }).then((answers) => {
                // Number of pages answered.
                nQuestions = Object.keys(attemptSet).length;

                for (const pageId in attemptSet) {
                    const attempts = attemptSet[pageId],
                        lastAttempt = attempts[attempts.length - 1];

                    if (lesson.custom) {
                        // If essay question, handle it, otherwise add to score.
                        if (pageIndex[lastAttempt.pageid].qtype == AddonModLessonProvider.LESSON_PAGE_ESSAY) {
                            if (lastAttempt.useranswer && typeof lastAttempt.useranswer.score != 'undefined') {
                                earned += lastAttempt.useranswer.score;
                            }
                            nManual++;
                            manualPoints += answers[lastAttempt.answerid].score;
                        } else if (lastAttempt.answerid) {
                            earned += answers[lastAttempt.answerid].score;
                        }
                    } else {
                        attempts.forEach((attempt) => {
                            earned += attempt.correct ? 1 : 0;
                        });

                        // If essay question, increase numbers.
                        if (pageIndex[lastAttempt.pageid].qtype == AddonModLessonProvider.LESSON_PAGE_ESSAY) {
                            nManual++;
                            manualPoints++;
                        }
                    }

                    // Number of times answered.
                    nViewed += attempts.length;
                }

                if (lesson.custom) {
                    const bestScores = {};

                    // Find the highest possible score per page to get our total.
                    for (const answerId in answers) {
                        const answer = answers[answerId];

                        if (typeof bestScores[answer.pageid] == 'undefined') {
                            bestScores[answer.pageid] = answer.score;
                        } else if (bestScores[answer.pageid] < answer.score) {
                            bestScores[answer.pageid] = answer.score;
                        }
                    }

                    // Sum all the scores.
                    for (const pageId in bestScores) {
                        total += bestScores[pageId];
                    }
                } else {
                    // Check to make sure the student has answered the minimum questions.
                    if (lesson.minquestions && nQuestions < lesson.minquestions) {
                        // Nope, increase number viewed by the amount of unanswered questions.
                        total = nViewed + (lesson.minquestions - nQuestions);
                    } else {
                        total = nViewed;
                    }
                }
            });
        }).then(() => {
            if (total) { // Not zero.
                theGrade = this.textUtils.roundToDecimals(earned * 100 / total, 5);
            }

            return {
                nquestions: nQuestions,
                attempts: nViewed,
                total: total,
                earned: earned,
                grade: theGrade,
                nmanual: nManual,
                manualpoints: manualPoints
            };
        });
    }

    /**
     * Report a lesson as being viewed.
     *
     * @param id Module ID.
     * @param password Lesson password (if any).
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logViewLesson(id: number, password?: string, name?: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                lessonid: id
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return this.logHelper.logSingle('mod_lesson_view_lesson', params, AddonModLessonProvider.COMPONENT, id, name,
                    'lesson', {}, siteId);
        });

    }

    /**
     * Process a lesson page, saving its data.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data to save.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param offline Whether it's offline mode.
     * @param accessInfo Result of get access info. Required if offline is true.
     * @param jumps Result of get pages possible jumps. Required if offline is true.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    processPage(lesson: any, courseId: number, pageData: any, data: any, password?: string, review?: boolean, offline?: boolean,
            accessInfo?: boolean, jumps?: any, siteId?: string): Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const page = pageData.page,
            pageId = page.id;
        let result,
            pageIndex;

        if (offline) {
            // Get the list of pages of the lesson.
            return this.getPages(lesson.id, password, true, false, siteId).then((pages) => {
                pageIndex = this.createPagesIndex(pages);

                if (pageData.answers.length) {
                    return this.recordAttempt(lesson, courseId, pageData, data, review, accessInfo, jumps, pageIndex, siteId);
                } else {
                    // The page has no answers so we will just progress to the next page (as set by newpageid).
                   return {
                        nodefaultresponse: true,
                        newpageid: data.newpageid
                    };
                }
            }).then((res) => {
                result = res;
                result.newpageid = this.getNewPageId(pageData.page.id, result.newpageid, jumps);

                // Calculate some needed offline data.
                return this.calculateOfflineData(lesson, accessInfo, password, review, pageIndex, siteId);
            }).then((calculatedData) => {
                // Add some default data to match the WS response.
                result.warnings = [];
                result.displaymenu = pageData.displaymenu; // Keep the same value since we can't calculate it in offline.
                result.messages = this.getPageProcessMessages(lesson, accessInfo, result, review, jumps);
                result.sent = false;
                Object.assign(result, calculatedData);

                return result;
            });
        }

        return this.processPageOnline(lesson.id, pageId, data, password, review, siteId).then((response) => {
            this.eventsProvider.trigger(AddonModLessonProvider.DATA_SENT_EVENT, {
                lessonId: lesson.id,
                type: 'process',
                courseId: courseId,
                pageId: pageId,
                review: review
            }, this.sitesProvider.getCurrentSiteId());

            response.sent = true;

            return response;
        });
    }

    /**
     * Process a lesson page, saving its data. It will fail if offline or cannot connect.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @param data Data to save.
     * @param password Lesson password (if any).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    processPageOnline(lessonId: number, pageId: number, data: any, password?: string, review?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                lessonid: lessonId,
                pageid: pageId,
                data: this.utils.objectToArrayOfObjects(data, 'name', 'value', true),
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_process_page', params);
        });
    }

    /**
     * Records an attempt on a certain page.
     * Based on Moodle's record_attempt.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param pageData Result of getPageData for the page to process.
     * @param data Data to save.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param accessInfo Result of get access info.
     * @param jumps Result of get pages possible jumps.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the result.
     */
    protected recordAttempt(lesson: any, courseId: number, pageData: any, data: any, review: boolean, accessInfo: any, jumps: any,
            pageIndex: any, siteId?: string): Promise<AddonModLessonRecordAttemptResult> {

        // Check the user answer. Each page type has its own implementation.
        const result: AddonModLessonRecordAttemptResult = this.checkAnswer(lesson, pageData, data, jumps, pageIndex),
            retake = accessInfo.attemptscount;

        // Processes inmediate jumps.
        if (result.inmediatejump) {
            if (pageData.page.qtype == AddonModLessonProvider.LESSON_PAGE_BRANCHTABLE) {
                // Store the content page data. In Moodle this is stored in a separate table, during checkAnswer.
                return this.lessonOfflineProvider.processPage(lesson.id, courseId, retake, pageData.page, data,
                            result.newpageid, result.answerid, false, result.userresponse, siteId).then(() => {
                    return result;
                });
            }

            return Promise.resolve(result);
        }

        let promise = Promise.resolve(),
            stop = false,
            nAttempts;

        result.attemptsremaining  = 0;
        result.maxattemptsreached = false;

        if (result.noanswer) {
            result.newpageid = pageData.page.id; // Display same page again.
            result.feedback = this.translate.instant('addon.mod_lesson.noanswer');
        } else {
            if (!accessInfo.canmanage) {
                // Get the number of attempts that have been made on this question for this student and retake.
                promise = this.getQuestionsAttempts(lesson.id, retake, false, pageData.page.id, siteId).then((attempts) => {
                    nAttempts = attempts.online.length + attempts.offline.length;

                    // Check if they have reached (or exceeded) the maximum number of attempts allowed.
                    if (nAttempts >= lesson.maxattempts) {
                        result.maxattemptsreached = true;
                        result.feedback = this.translate.instant('addon.mod_lesson.maximumnumberofattemptsreached');
                        result.newpageid = AddonModLessonProvider.LESSON_NEXTPAGE;
                        stop = true; // Set stop to true to prevent further calculations.

                        return;
                    }

                    let subPromise;

                    // Only insert a record if we are not reviewing the lesson.
                    if (!review) {
                        if (lesson.retake || (!lesson.retake && !retake)) {
                            // Store the student's attempt and increase the number of attempts made.
                            // Calculate and store the new page ID to prevent having to recalculate it later.
                            const newPageId = this.getNewPageId(pageData.page.id, result.newpageid, jumps);
                            subPromise = this.lessonOfflineProvider.processPage(lesson.id, courseId, retake, pageData.page, data,
                                        newPageId, result.answerid, result.correctanswer, result.userresponse, siteId);
                            nAttempts++;
                        }
                    }

                    // Check if "number of attempts remaining" message is needed.
                    if (!result.correctanswer && !result.newpageid) {
                        // Retreive the number of attempts left counter.
                        if (nAttempts >= lesson.maxattempts) {
                            if (lesson.maxattempts > 1) { // Don't bother with message if only one attempt.
                                result.maxattemptsreached = true;
                            }
                            result.newpageid =  AddonModLessonProvider.LESSON_NEXTPAGE;
                        } else if (lesson.maxattempts > 1) { // Don't bother with message if only one attempt
                            result.attemptsremaining = lesson.maxattempts - nAttempts;
                        }
                    }

                    return subPromise;
                });
            }

            promise = promise.then(() => {
                if (stop) {
                    return;
                }

                // Determine default feedback if necessary.
                if (!result.response) {
                    if (!lesson.feedback && !result.noanswer &&
                            !(lesson.review && !result.correctanswer && !result.isessayquestion)) {
                        // These conditions have been met:
                        //  1. The lesson manager has not supplied feedback to the student.
                        //  2. Not displaying default feedback.
                        //  3. The user did provide an answer.
                        //  4. We are not reviewing with an incorrect answer (and not reviewing an essay question).

                        result.nodefaultresponse = true;
                    } else if (result.isessayquestion) {
                        result.response = this.translate.instant('addon.mod_lesson.defaultessayresponse');
                    } else if (result.correctanswer) {
                        result.response = this.translate.instant('addon.mod_lesson.thatsthecorrectanswer');
                    } else {
                        result.response = this.translate.instant('addon.mod_lesson.thatsthewronganswer');
                    }
                }

                if (result.response) {
                    let subPromise;

                    if (lesson.review && !result.correctanswer && !result.isessayquestion) {
                        // Calculate the number of question attempt in the page if it isn't calculated already.
                        if (typeof nAttempts == 'undefined') {
                            subPromise = this.getQuestionsAttempts(lesson.id, retake, false, pageData.page.id, siteId)
                                    .then((result) => {
                                nAttempts = result.online.length + result.offline.length;
                            });
                        } else {
                            subPromise = Promise.resolve();
                        }

                        subPromise.then(() => {
                            const messageId = nAttempts == 1 ? 'firstwrong' : 'secondpluswrong';

                            result.feedback = '<div class="box feedback">' +
                                    this.translate.instant('addon.mod_lesson.' + messageId) + '</div>';
                        });
                    } else {
                        result.feedback = '';
                        subPromise = Promise.resolve();
                    }

                    let className = 'response';
                    if (result.correctanswer) {
                        className += ' correct';
                    } else if (!result.isessayquestion) {
                        className += ' incorrect';
                    }

                    return subPromise.then(() => {
                        result.feedback += '<div class="box generalbox boxaligncenter p-y-1">' + pageData.page.contents + '</div>';
                        result.feedback += '<div class="correctanswer generalbox"><em>' +
                            this.translate.instant('addon.mod_lesson.youranswer') + '</em> : ' +
                            '<div class="studentanswer m-t-2 m-b-2"><table class="generaltable"><tbody>';

                        // Create a table containing the answers and responses.
                        if (pageData.page.qoption) {
                            // Multianswer allowed.
                            const studentAnswerArray = result.studentanswer ?
                                        result.studentanswer.split(AddonModLessonProvider.MULTIANSWER_DELIMITER) : [],
                                responseArray = result.response ?
                                        result.response.split(AddonModLessonProvider.MULTIANSWER_DELIMITER) : [];

                            // Add answers and responses to the table.
                            for (let i = 0; i < studentAnswerArray.length; i++) {
                                result.feedback = this.addAnswerAndResponseToFeedback(result.feedback, studentAnswerArray[i],
                                        result.studentanswerformat, responseArray[i], className);
                            }
                        } else {
                            // Only 1 answer, add it to the table.
                            result.feedback = this.addAnswerAndResponseToFeedback(result.feedback, result.studentanswer,
                                    result.studentanswerformat, result.response, className);
                        }

                        result.feedback += '</tbody></table></div></div>';
                    });
                }
            });
        }

        return promise.then(() => {
            return result;
        });
    }

    /**
     * Remove a password stored in DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when removed.
     */
    removeStoredPassword(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModLessonProvider.PASSWORD_TABLE, {lessonid: lessonId});
        });
    }

    /**
     * Store a password in DB.
     *
     * @param lessonId Lesson ID.
     * @param password Password to store.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when stored.
     */
    storePassword(lessonId: number, password: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                lessonid: lessonId,
                password: password,
                timemodified: Date.now()
            };

            return site.getDb().insertRecord(AddonModLessonProvider.PASSWORD_TABLE, entry);
        });
    }

    /**
     * Function to determine if a page is a valid page. It will add the page to validPages if valid. It can also
     * modify the list of viewedPagesIds for cluster pages.
     * Based on Moodle's valid_page_and_view.
     *
     * @param pages Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param page Page to check.
     * @param validPages Valid pages, indexed by page ID.
     * @param viewedPagesIds List of viewed pages IDs.
     * @return Next page ID.
     */
    validPageAndView(pages: any, page: any, validPages: any, viewedPagesIds: number[]): number {

        if (page.qtype != AddonModLessonProvider.LESSON_PAGE_ENDOFCLUSTER &&
                page.qtype != AddonModLessonProvider.LESSON_PAGE_ENDOFBRANCH) {
            // Add this page as a valid page.
            validPages[page.id] = 1;
        }

        if (page.qtype == AddonModLessonProvider.LESSON_PAGE_CLUSTER) {
            // Get list of pages in the cluster.
            const subPages = this.getSubpagesOf(pages, page.id, [AddonModLessonProvider.LESSON_PAGE_ENDOFCLUSTER]);

            subPages.forEach((subPage) => {
                const position = viewedPagesIds.indexOf(subPage.id);

                if (position != -1) {
                    delete viewedPagesIds[position]; // Remove it.

                    // Since the user did see one page in the cluster, add the cluster pageid to the viewedPagesIds.
                    if (viewedPagesIds.indexOf(page.id) == -1) {
                        viewedPagesIds.push(page.id);
                    }
                }
            });
        }

        return page.nextpageid;
    }
}
