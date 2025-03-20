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
import { CoreError } from '@classes/errors/error';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreText, CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@singletons/text';
import { CoreUtils } from '@singletons/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModLessonPasswordDBRecord, PASSWORD_TABLE_NAME } from './database/lesson';
import { AddonModLessonOffline, AddonModLessonPageAttemptRecord } from './lesson-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_LESSON_COMPONENT_LEGACY,
    ADDON_MOD_LESSON_DATA_SENT_EVENT,
    ADDON_MOD_LESSON_OTHER_ANSWERS,
    AddonModLessonJumpTo,
    AddonModLessonPageType,
    AddonModLessonPageSubtype,
} from '../constants';
import { CoreGradeType } from '@features/grades/constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreObject } from '@singletons/object';
import { CoreArray } from '@singletons/array';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_LESSON_DATA_SENT_EVENT]: AddonModLessonDataSentData;
    }

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
@Injectable({ providedIn: 'root' })
export class AddonModLessonProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModLesson:';

    protected static readonly MULTIANSWER_DELIMITER = '@^#|'; // Constant used as a delimiter when parsing multianswer questions.

    /**
     * Add an answer and its response to a feedback string (HTML).
     *
     * @param feedback The current feedback.
     * @param answer Student answer.
     * @param answerFormat Answer format.
     * @param response Response.
     * @param className Class to add to the response.
     * @returns New feedback.
     */
    protected addAnswerAndResponseToFeedback(
        feedback: string,
        answer: string,
        answerFormat: CoreTextFormat,
        response: string,
        className: string,
    ): string {
        // Add a table row containing the answer.
        feedback += '<tr><td class="cell c0 lastcol">' + (answerFormat ? answer : CoreText.cleanTags(answer)) +
                '</td></tr>';

        // If the response exists, add a table row containing the response. If not, add en empty row.
        if (response?.trim()) {
            feedback += '<tr><td class="cell c0 lastcol ' + className + '"><em>' +
                Translate.instant('addon.mod_lesson.response') + '</em>: <br/>' +
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
     * @param stringId The ID of the message to be translated. E.g. 'addon.mod_lesson.numberofpagesviewednotice'.
     * @param stringParams The params of the message (if any).
     */
    protected addMessage(messages: AddonModLessonMessageWSData[], stringId: string, stringParams?: Record<string, unknown>): void {
        messages.push({
            message: Translate.instant(stringId, stringParams),
            type: '',
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
    protected addResultValueEolPage(
        result: AddonModLessonFinishRetakeResponse,
        name: string,
        value: unknown,
        addMessage?: boolean,
    ): void {
        let message = '';

        if (addMessage) {
            const params = typeof value != 'boolean' ? { $a: value } : undefined;
            message = Translate.instant(`addon.mod_lesson.${name}`, params);
        }

        result.data[name] = {
            name: name,
            value: value,
            message: message,
        };
    }

    /**
     * Check if an answer page (from getUserRetake) is a content page.
     *
     * @param page Answer page.
     * @returns Whether it's a content page.
     */
    answerPageIsContent(page: AddonModLessonUserAttemptAnswerPageWSData): boolean {
        // The page doesn't have any reliable field to use for checking this. Check qtype first (translated string).
        if (page.qtype == Translate.instant('addon.mod_lesson.branchtable')) {
            return true;
        }

        // The qtype doesn't match, but that doesn't mean it's not a content page, maybe the language is different.
        // Check it's not a question page.
        if (page.answerdata && !this.answerPageIsQuestion(page)) {
            // It isn't a question page, but it can be an end of branch, etc. Check if the first answer has a button.
            if (page.answerdata.answers && page.answerdata.answers[0]) {
                const element = convertTextToHTMLElement(page.answerdata.answers[0][0]);

                return !!element.querySelector('input[type="button"]');
            }
        }

        return false;
    }

    /**
     * Check if an answer page (from getUserRetake) is a question page.
     *
     * @param page Answer page.
     * @returns Whether it's a question page.
     */
    answerPageIsQuestion(page: AddonModLessonUserAttemptAnswerPageWSData): boolean {
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
     * @param options Other options.
     * @returns Promise resolved with the data.
     */
    protected async calculateOfflineData(
        lesson: AddonModLessonLessonWSData,
        options: AddonModLessonCalculateOfflineDataOptions = {},
    ): Promise<{reviewmode: boolean; progress?: number; ongoingscore: string}> {

        const reviewMode = !!(options.review || options.accessInfo?.reviewmode);
        let ongoingMessage = '';
        let progress: number | undefined;

        if (options.accessInfo && !options.accessInfo.canmanage) {
            if (lesson.ongoing && !reviewMode) {
                ongoingMessage = await this.getOngoingScoreMessage(lesson, options.accessInfo, options);
            }

            if (lesson.progressbar) {
                const modOptions = {
                    cmId: lesson.coursemodule,
                    ...options, // Include all options.
                };

                progress = await this.calculateProgress(lesson.id, options.accessInfo, modOptions);
            }
        }

        return {
            reviewmode: reviewMode,
            progress,
            ongoingscore: ongoingMessage,
        };
    }

    /**
     * Calculate the progress of the current user in the lesson.
     * Based on Moodle's calculate_progress.
     *
     * @param lessonId Lesson ID.
     * @param accessInfo Access info.
     * @param options Other options.
     * @returns Promise resolved with a number: the progress (scale 0-100).
     */
    async calculateProgress(
        lessonId: number,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        options: AddonModLessonCalculateProgressOptions = {},
    ): Promise<number> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Check if the user is reviewing the attempt.
        if (options.review) {
            return 100;
        }

        const retake = accessInfo.attemptscount;
        const commonOptions = {
            cmId: options.cmId,
            siteId: options.siteId,
        };

        if (!options.pageIndex) {
            // Retrieve the index.
            const pages = await this.getPages(lessonId, {
                cmId: options.cmId,
                password: options.password,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId: options.siteId,
            });

            options.pageIndex = this.createPagesIndex(pages);
        }

        // Get the list of question pages attempted.
        let viewedPagesIds = await this.getPagesIdsWithQuestionAttempts(lessonId, retake, commonOptions);

        // Get the list of viewed content pages.
        const viewedContentPagesIds = await this.getContentPagesViewedIds(lessonId, retake, commonOptions);

        const validPages = {};
        let pageId = accessInfo.firstpageid;

        viewedPagesIds = CoreArray.mergeWithoutDuplicates(viewedPagesIds, viewedContentPagesIds);

        // Filter out the following pages:
        // - End of Cluster
        // - End of Branch
        // - Pages found inside of Clusters
        // Do not filter out Cluster Page(s) because we count a cluster as one.
        // By keeping the cluster page, we get our 1.
        while (pageId) {
            pageId = this.validPageAndView(options.pageIndex, options.pageIndex[pageId], validPages, viewedPagesIds);
        }

        // Progress calculation as a percent.
        return CoreText.roundToDecimals(viewedPagesIds.length / Object.keys(validPages).length, 2) * 100;
    }

    /**
     * Check if the answer provided by the user is correct or not and return the result object.
     * This method is based on the check_answer implementation of all page types (Moodle).
     *
     * @param lesson Lesson.
     * @param pageData Page data.
     * @param data Data containing the user answer.
     * @param jumps Possible jumps.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @returns Result.
     */
    protected checkAnswer(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        jumps: AddonModLessonPossibleJumps,
        pageIndex: Record<number, AddonModLessonPageWSData>,
    ): AddonModLessonCheckAnswerResult {
        // Default result.
        const result: AddonModLessonCheckAnswerResult = {
            answerid: 0,
            noanswer: false,
            correctanswer: false,
            isessayquestion: false,
            response: '',
            newpageid: 0,
            studentanswer: '',
            userresponse: '',
            feedback: '',
            nodefaultresponse: false,
            inmediatejump: false,
        };

        switch (pageData.page!.qtype) {
            case AddonModLessonPageSubtype.BRANCHTABLE:
                // Load the new page immediately.
                result.inmediatejump = true;
                result.newpageid = this.getNewPageId(pageData.page!.id, <number> data.jumpto, jumps);
                break;

            case AddonModLessonPageSubtype.ESSAY:
                this.checkAnswerEssay(pageData, data, result);
                break;

            case AddonModLessonPageSubtype.MATCHING:
                this.checkAnswerMatching(pageData, data, result);
                break;

            case AddonModLessonPageSubtype.MULTICHOICE:
                this.checkAnswerMultichoice(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonPageSubtype.NUMERICAL:
                this.checkAnswerNumerical(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonPageSubtype.SHORTANSWER:
                this.checkAnswerShort(lesson, pageData, data, pageIndex, result);
                break;

            case AddonModLessonPageSubtype.TRUEFALSE:
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
     * @param pageData Page data.
     * @param data Data containing the user answer.
     * @param result Object where to store the result.
     */
    protected checkAnswerEssay(
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        result: AddonModLessonCheckAnswerResult,
    ): void {
        let studentAnswer;

        result.isessayquestion = true;

        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page!.id;

            return;
        }

        // The name was changed to "answer_editor" in 3.7. Before it was just "answer". Support both cases.
        if (data['answer_editor[text]'] !== undefined) {
            studentAnswer = data['answer_editor[text]'];
        } else if (typeof data.answer_editor === 'object') {
            studentAnswer = (<{text: string}> data.answer_editor).text;
        } else if (data['answer[text]'] !== undefined) {
            studentAnswer = data['answer[text]'];
        } else if (typeof data.answer === 'object') {
            studentAnswer = (<{text: string}> data.answer).text;
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
            result.newpageid = answer.jumpto || 0;
        });

        result.userresponse = {
            sent: 0,
            graded: 0,
            score: 0,
            answer: studentAnswer,
            answerformat: DEFAULT_TEXT_FORMAT,
            response: '',
            responseformat: DEFAULT_TEXT_FORMAT,
        };
        result.studentanswerformat = DEFAULT_TEXT_FORMAT;
        result.studentanswer = studentAnswer;
    }

    /**
     * Check a matching answer.
     *
     * @param pageData Page data for the page to process.
     * @param data Data containing the user answer.
     * @param result Object where to store the result.
     */
    protected checkAnswerMatching(
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        result: AddonModLessonCheckAnswerResult,
    ): void {
        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page!.id;

            return;
        }

        const response = this.getUserResponseMatching(data);
        const getAnswers = CoreUtils.clone(pageData.answers);
        const correct = getAnswers.shift();
        const wrong = getAnswers.shift();
        const answers: Record<number, AddonModLessonPageAnswerWSData> = {};

        getAnswers.forEach((answer) => {
            if (answer.answer !== '' || answer.response !== '') {
                answers[answer.id] = answer;
            }
        });

        // Get the user's exact responses for record keeping.
        const userResponse: string[] = [];
        let hits = 0;

        result.studentanswer = '';
        result.studentanswerformat = DEFAULT_TEXT_FORMAT;

        for (const id in response) {
            let value = response[id];

            if (!value) {
                result.noanswer = true;

                return;
            }

            value = CoreText.decodeHTML(value);
            userResponse.push(value);

            if (answers[id] !== undefined) {
                const answer = answers[id];

                result.studentanswer += `<br />${answer.answer} = ${value}`;
                if (answer.response && answer.response.trim() == value.trim()) {
                    hits++;
                }
            }
        }

        result.userresponse = userResponse.join(',');

        if (hits == Object.keys(answers).length) {
            result.correctanswer = true;
            result.response = correct!.answer || '';
            result.answerid = correct!.id;
            result.newpageid = correct!.jumpto || 0;
        } else {
            result.correctanswer = false;
            result.response = wrong!.answer || '';
            result.answerid = wrong!.id;
            result.newpageid = wrong!.jumpto || 0;
        }
    }

    /**
     * Check a multichoice answer.
     *
     * @param lesson Lesson.
     * @param pageData Page data for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerMultichoice(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        pageIndex: Record<number, AddonModLessonPageWSData>,
        result: AddonModLessonCheckAnswerResult,
    ): void {

        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page!.id;

            return;
        }

        const answers = this.getUsedAnswersMultichoice(pageData);

        if (pageData.page!.qoption) {
            // Multianswer allowed, user's answer is an array.
            const studentAnswers = this.getUserResponseMultichoice(data);

            if (!studentAnswers || !Array.isArray(studentAnswers)) {
                result.noanswer = true;

                return;
            }

            // Get what the user answered.
            result.userresponse = studentAnswers.join(',');

            // Get the answers in a set order, the id order.
            const studentAswersArray: string[] = [];
            const responses: string[] = [];
            let nHits = 0;
            let nCorrect = 0;
            let correctAnswerId = 0;
            let wrongAnswerId = 0;
            let correctPageId: number | undefined;
            let wrongPageId: number | undefined;

            // Store student's answers for displaying on feedback page.
            result.studentanswer = '';
            result.studentanswerformat = DEFAULT_TEXT_FORMAT;
            answers.forEach((answer) => {
                for (const i in studentAnswers) {
                    const answerId = studentAnswers[i];

                    if (answerId == answer.id) {
                        studentAswersArray.push(answer.answer!);
                        responses.push(answer.response || '');
                        break;
                    }
                }
            });
            result.studentanswer = studentAswersArray.join(AddonModLessonProvider.MULTIANSWER_DELIMITER);

            // Iterate over all the possible answers.
            answers.forEach((answer) => {
                const correctAnswer = this.isAnswerCorrect(lesson, pageData.page!.id, answer, pageIndex);

                // Iterate over all the student answers to check if he selected the current possible answer.
                studentAnswers.forEach((answerId) => {
                    if (answerId == answer.id) {
                        if (correctAnswer) {
                            nHits++;
                        } else {
                            // Always use the first student wrong answer.
                            if (wrongPageId === undefined) {
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
                    if (correctPageId === undefined) {
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
                result.newpageid = correctPageId || 0;
                result.answerid = correctAnswerId;
            } else {
                result.correctanswer = false;
                result.response = responses.join(AddonModLessonProvider.MULTIANSWER_DELIMITER);
                result.newpageid = wrongPageId || 0;
                result.answerid = wrongAnswerId;
            }
        } else {
            // Only one answer allowed.
            if (data.answerid === undefined || (!data.answerid && Number(data.answerid) !== 0)) {
                result.noanswer = true;

                return;
            }

            result.answerid = <number> data.answerid;

            // Search the answer.
            for (const i in pageData.answers) {
                const answer = pageData.answers[i];
                if (answer.id == data.answerid) {
                    result.correctanswer = this.isAnswerCorrect(lesson, pageData.page!.id, answer, pageIndex);
                    result.newpageid = answer.jumpto || 0;
                    result.response = answer.response || '';
                    result.userresponse = result.studentanswer = answer.answer || '';
                    break;
                }
            }
        }
    }

    /**
     * Check a numerical answer.
     *
     * @param lesson Lesson.
     * @param pageData Page data for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerNumerical(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        pageIndex: Record<number, AddonModLessonPageWSData>,
        result: AddonModLessonCheckAnswerResult,
    ): void {
        // In LMS, this unformat float is done by the 'float' form field.
        const parsedAnswer = CoreUtils.unformatFloat(<string> data.answer, true);

        // Set defaults.
        result.response = '';
        result.newpageid = 0;

        if (!data.answer || parsedAnswer === false || parsedAnswer === '') {
            result.noanswer = true;

            return;
        }

        data.answer = String(parsedAnswer); // Store the parsed answer in the supplied data so it uses the standard separator.
        result.useranswer = parsedAnswer;
        result.studentanswer = result.userresponse = String(result.useranswer);

        // Find the answer.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i];
            let max: number;
            let min: number;

            if (answer.answer && answer.answer.indexOf(':') != -1) {
                // There's a pair of values.
                const split = answer.answer.split(':');
                min = parseFloat(split[0]);
                max = parseFloat(split[1]);
            } else {
                // Only one value.
                min = parseFloat(answer.answer || '');
                max = min;
            }

            if (parsedAnswer >= min && parsedAnswer <= max) {
                result.newpageid = answer.jumpto || 0;
                result.response = answer.response || '';
                result.correctanswer = this.isAnswerCorrect(lesson, pageData.page!.id, answer, pageIndex);
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
     * @param pageData Page data for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerShort(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        pageIndex: Record<number, AddonModLessonPageWSData>,
        result: AddonModLessonCheckAnswerResult,
    ): void {

        let studentAnswer = typeof data.answer == 'string' ? data.answer.trim() : false;
        if (!studentAnswer) {
            result.noanswer = true;

            return;
        }

        // Search the answer in the list of possible answers.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i];
            const useRegExp = pageData.page!.qoption;
            let expectedAnswer = answer.answer || '';
            let isMatch = false;
            let ignoreCase = '';

            if (useRegExp) {
                if (expectedAnswer.slice(-2) == '/i') {
                    expectedAnswer = expectedAnswer.substring(0, expectedAnswer.length - 2);
                    ignoreCase = 'i';
                }
            } else {
                expectedAnswer = expectedAnswer.replace('*', '#####');
                expectedAnswer = CoreText.escapeForRegex(expectedAnswer);
                expectedAnswer = expectedAnswer.replace('#####', '.*');
            }

            // See if user typed in any of the correct answers.
            if (this.isAnswerCorrect(lesson, pageData.page!.id, answer, pageIndex)) {
                if (!useRegExp) { // We are using 'normal analysis', which ignores case.
                    if (studentAnswer.match(new RegExp(`^${expectedAnswer}$`, 'i'))) {
                        isMatch = true;
                    }
                } else {
                    if (studentAnswer.match(new RegExp(`^${expectedAnswer}$`, ignoreCase))) {
                        isMatch = true;
                    }
                }
                if (isMatch) {
                    result.correctanswer = true;
                }
            } else {
                if (!useRegExp) {
                    // We are using 'normal analysis'.
                    // See if user typed in any of the wrong answers; don't worry about case.
                    if (studentAnswer.match(new RegExp(`^${expectedAnswer}$`, 'i'))) {
                        isMatch = true;
                    }
                } else { // We are using regular expressions analysis.
                    const startCode = expectedAnswer.substring(0, 2);

                    switch (startCode){
                        // 1- Check for absence of required string in studentAnswer (coded by initial '--').
                        case '--':
                            expectedAnswer = expectedAnswer.substring(2);
                            if (!studentAnswer.match(new RegExp(`^${expectedAnswer}$`, ignoreCase))) {
                                isMatch = true;
                            }
                            break;

                        // 2- Check for code for marking wrong strings (coded by initial '++').
                        case '++': {
                            expectedAnswer = expectedAnswer.substring(2);

                            // Check for one or several matches.
                            const matches = studentAnswer.match(new RegExp(expectedAnswer, `g${ignoreCase}`));
                            if (matches) {
                                isMatch = true;
                                const nb = matches.length;
                                const original: string[] = [];
                                const marked: string[] = [];

                                for (let j = 0; j < nb; j++) {
                                    original.push(matches[j]);
                                    marked.push(`<span class="incorrect matches">${matches[j]}</span>`);
                                }

                                for (let j = 0; j < original.length; j++) {
                                    studentAnswer = studentAnswer.replace(original[j], marked[j]);
                                }
                            }
                            break;
                        }
                        // 3- Check for wrong answers belonging neither to -- nor to ++ categories.
                        default:
                            if (studentAnswer.match(new RegExp(`^${expectedAnswer}$`, ignoreCase))) {
                                isMatch = true;
                            }
                            break;
                    }

                    result.correctanswer = false;
                }
            }

            if (isMatch) {
                result.newpageid = answer.jumpto || 0;
                result.response = answer.response || '';
                result.answerid = answer.id;
                break; // Quit answer analysis immediately after a match has been found.
            }
        }

        this.checkOtherAnswers(lesson, pageData, result);

        result.userresponse = studentAnswer;
        result.studentanswer = CoreText.s(studentAnswer); // Clean student answer as it goes to output.
    }

    /**
     * Check a truefalse answer.
     *
     * @param lesson Lesson.
     * @param pageData Page data for the page to process.
     * @param data Data containing the user answer.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param result Object where to store the result.
     */
    protected checkAnswerTruefalse(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        pageIndex: Record<number, AddonModLessonPageWSData>,
        result: AddonModLessonCheckAnswerResult,
    ): void {

        if (!data.answerid) {
            result.noanswer = true;

            return;
        }

        result.answerid = <number> data.answerid;

        // Get the answer.
        for (const i in pageData.answers) {
            const answer = pageData.answers[i];
            if (answer.id == data.answerid) {
                // Answer found.
                result.correctanswer = this.isAnswerCorrect(lesson, pageData.page!.id, answer, pageIndex);
                result.newpageid = answer.jumpto || 0;
                result.response = answer.response || '';
                result.studentanswer = result.userresponse = answer.answer || '';
                break;
            }
        }
    }

    /**
     * Check the "other answers" value.
     *
     * @param lesson Lesson.
     * @param pageData Page data for the page to process.
     * @param result Object where to store the result.
     */
    protected checkOtherAnswers(
        lesson: AddonModLessonLessonWSData,
        pageData: AddonModLessonGetPageDataWSResponse,
        result: AddonModLessonCheckAnswerResult,
    ): void {
        // We could check here to see if we have a wrong answer jump to use.
        if (result.answerid == 0) {
            // Use the all other answers jump details if it is set up.
            const lastAnswer = pageData.answers[pageData.answers.length - 1] || {};

            // Double check that this is the OTHER_ANSWERS answer.
            if (typeof lastAnswer.answer == 'string' &&
                    lastAnswer.answer.indexOf(ADDON_MOD_LESSON_OTHER_ANSWERS) !== -1) {
                result.newpageid = lastAnswer.jumpto || 0;
                result.response = lastAnswer.response || '';

                if (lesson.custom) {
                    result.correctanswer = !!(lastAnswer.score && lastAnswer.score > 0);
                }
                result.answerid = lastAnswer.id;
            }
        }
    }

    /**
     * Create a list of pages indexed by page ID based on a list of pages.
     *
     * @param pageList List of pages.
     * @returns Pages index.
     */
    protected createPagesIndex(pageList: AddonModLessonGetPagesPageWSData[]): Record<number, AddonModLessonPageWSData> {
        // Index the pages by page ID.
        const pages: Record<number, AddonModLessonPageWSData> = {};

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
     * @param options Other options.
     * @returns Promise resolved with the result.
     */
    async finishRetake(
        lesson: AddonModLessonLessonWSData,
        courseId: number,
        options: AddonModLessonFinishRetakeOptions = {},
    ): Promise<AddonModLessonFinishRetakeResponse> {

        if (options.offline) {
            return this.finishRetakeOffline(lesson, courseId, options);
        }

        const response = await this.finishRetakeOnline(lesson.id, options);

        CoreEvents.trigger(ADDON_MOD_LESSON_DATA_SENT_EVENT, {
            lessonId: lesson.id,
            type: 'finish',
            courseId: courseId,
            outOfTime: options.outOfTime,
            review: options.review,
        }, CoreSites.getCurrentSiteId());

        return response;
    }

    /**
     * Finishes a retake. It will fail if offline or cannot connect.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the result.
     */
    async finishRetakeOnline(
        lessonId: number,
        options: AddonModLessonFinishRetakeOnlineOptions = {},
    ): Promise<AddonModLessonFinishRetakeResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonFinishAttemptWSParams = {
            lessonid: lessonId,
            outoftime: !!options.outOfTime,
            review: !!options.review,
        };
        if (typeof options.password == 'string') {
            params.password = options.password;
        }

        const response = await site.write<AddonModLessonFinishAttemptWSResponse>('mod_lesson_finish_attempt', params);

        // Convert the data array into an object and decode the values.
        const map: Record<string, AddonModLessonEOLPageDataEntry> = {};

        response.data.forEach((entry) => {
            if (entry.value && typeof entry.value == 'string' && entry.value !== '1') {
                // It's a JSON encoded object. Try to decode it.
                entry.value = CoreText.parseJSON(entry.value);
            }

            map[entry.name] = entry;
        });

        return Object.assign(response, { data: map });
    }

    /**
     * Finishes a retake in offline.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param options Other options.
     * @returns Promise resolved with the result.
     */
    protected async finishRetakeOffline(
        lesson: AddonModLessonLessonWSData,
        courseId: number,
        options: AddonModLessonFinishRetakeOptions = {},
    ): Promise<AddonModLessonFinishRetakeResponse> {
        // First finish the retake offline.
        const retake = options.accessInfo!.attemptscount;

        await AddonModLessonOffline.finishRetake(lesson.id, courseId, retake, true, options.outOfTime, options.siteId);

        // Get the lesson grade.
        const newOptions = {
            cmId: lesson.coursemodule,
            password: options.password,
            review: options.review,
            siteId: options.siteId,
        };

        const gradeInfo = await CorePromiseUtils.ignoreErrors(this.lessonGrade(lesson, retake, newOptions));

        // Retake marked, now return the response.
        return this.processEolPage(lesson, courseId, options, gradeInfo);
    }

    /**
     * Create the data returned by finishRetakeOffline, to display the EOL page. It won't return all the possible data.
     * This code is based in Moodle's process_eol_page.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param options Other options.
     * @param gradeInfo Lesson grade info.
     * @returns Promise resolved with the data.
     */
    protected async processEolPage(
        lesson: AddonModLessonLessonWSData,
        courseId: number,
        options: AddonModLessonFinishRetakeOptions = {},
        gradeInfo: AddonModLessonGrade | undefined,
    ): Promise<AddonModLessonFinishRetakeResponse> {
        if (!options.accessInfo) {
            throw new CoreError('Access info not supplied to finishRetake.');
        }

        // This code is based in Moodle's process_eol_page.
        const result: AddonModLessonFinishRetakeResponse = {
            data: {},
            messages: [],
            warnings: [],
        };
        let gradeLesson = true;

        this.addResultValueEolPage(result, 'offline', true); // Mark the result as offline.
        this.addResultValueEolPage(result, 'gradeinfo', gradeInfo);

        if (lesson.custom && !options.accessInfo.canmanage) {
            /* Before we calculate the custom score make sure they answered the minimum number of questions.
                We only need to do this for custom scoring as we can not get the miniumum score the user should achieve.
                If we are not using custom scoring (so all questions are valued as 1) then we simply check if they
                answered more than the minimum questions, if not, we mark it out of the number specified in the minimum
                questions setting - which is done in lesson_grade(). */

            // Get the number of answers given.
            if (gradeInfo && lesson.minquestions && gradeInfo.nquestions < lesson.minquestions) {
                gradeLesson = false;
                this.addMessage(result.messages, 'addon.mod_lesson.numberofpagesviewednotice', {
                    $a: {
                        nquestions: gradeInfo.nquestions,
                        minquestions: lesson.minquestions,
                    },
                });
            }
        }

        if (!options.accessInfo.canmanage) {
            if (gradeLesson) {
                const progress = await this.calculateProgress(lesson.id, options.accessInfo, {
                    cmId: lesson.coursemodule,
                    password: options.password,
                    review: options.review,
                    siteId: options.siteId,
                });

                this.addResultValueEolPage(result, 'progresscompleted', progress);

                if (gradeInfo?.attempts) {
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

                    const entryData: Record<string, number> = {
                        score: gradeInfo.earned,
                        grade: gradeInfo.total,
                    };
                    if (gradeInfo.nmanual) {
                        entryData.tempmaxgrade = gradeInfo.total - gradeInfo.manualpoints;
                        entryData.essayquestions = gradeInfo.nmanual;
                        this.addResultValueEolPage(result, 'displayscorewithessays', entryData, true);
                    } else {
                        this.addResultValueEolPage(result, 'displayscorewithoutessays', entryData, true);
                    }

                    if (lesson.grade !== undefined && lesson.grade !== CoreGradeType.NONE) {
                        entryData.grade = CoreText.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1);
                        entryData.total = lesson.grade;
                        this.addResultValueEolPage(result, 'yourcurrentgradeisoutof', entryData, true);
                    }

                } else {
                    // User hasn't answered any question, only content pages.
                    if (lesson.timelimit) {
                        if (options.outOfTime) {
                            this.addResultValueEolPage(result, 'eolstudentoutoftimenoanswers', true, true);
                        }
                    } else {
                        this.addResultValueEolPage(result, 'welldone', true, true);
                    }
                }
            }
        } else {
            // Display for teacher.
            if (lesson.grade !== CoreGradeType.NONE) {
                this.addResultValueEolPage(result, 'displayofgrade', true, true);
            }
        }

        if (lesson.modattempts && options.accessInfo.canmanage) {
            this.addResultValueEolPage(result, 'modattemptsnoteacher', true, true);
        }

        if (gradeLesson) {
            this.addResultValueEolPage(result, 'gradelesson', 1);
        }

        return result;
    }

    /**
     * Get the access information of a certain lesson.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the access information.
     */
    async getAccessInformation(
        lessonId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonGetAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetAccessInformationWSParams = {
            lessonid: lessonId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAccessInformationCacheKey(lessonId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_lesson_get_lesson_access_information', params, preSets);
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getAccessInformationCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}accessInfo:${lessonId}`;
    }

    /**
     * Get content pages viewed in online and offline.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with an object with the online and offline viewed pages.
     */
    async getContentPagesViewed(
        lessonId: number,
        retake: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<{online: AddonModLessonWSContentPageViewed[]; offline: AddonModLessonPageAttemptRecord[]}> {
        const type = AddonModLessonPageType.STRUCTURE;

        const [online, offline] = await Promise.all([
            this.getContentPagesViewedOnline(lessonId, retake, options),
            CorePromiseUtils.ignoreErrors(
                AddonModLessonOffline.getRetakeAttemptsForType(lessonId, retake, type, options.siteId),
            ),
        ]);

        return {
            online,
            offline: offline || [],
        };
    }

    /**
     * Get cache key for get content pages viewed WS calls.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @returns Cache key.
     */
    protected getContentPagesViewedCacheKey(lessonId: number, retake: number): string {
        return `${this.getContentPagesViewedCommonCacheKey(lessonId)}:${retake}`;
    }

    /**
     * Get common cache key for get content pages viewed WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getContentPagesViewedCommonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}contentPagesViewed:${lessonId}`;
    }

    /**
     * Get IDS of content pages viewed in online and offline.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with list of IDs.
     */
    async getContentPagesViewedIds(
        lessonId: number,
        retake: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<number[]> {
        const result = await this.getContentPagesViewed(lessonId, retake, options);

        const ids: Record<number, boolean> = {};
        const pages = (<(AddonModLessonContentPageOrRecord)[]> result.online).concat(result.offline);

        pages.forEach((page) => {
            if (!ids[page.pageid]) {
                ids[page.pageid] = true;
            }
        });

        return Object.keys(ids).map((id) => Number(id));
    }

    /**
     * Get the list of content pages viewed in the site for a certain retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the viewed pages.
     */
    async getContentPagesViewedOnline(
        lessonId: number,
        retake: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonWSContentPageViewed[]> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetContentPagesViewedWSParams = {
            lessonid: lessonId,
            lessonattempt: retake,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getContentPagesViewedCacheKey(lessonId, retake),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModLessonGetContentPagesViewedWSResponse>(
            'mod_lesson_get_content_pages_viewed',
            params,
            preSets,
        );

        return result.pages;
    }

    /**
     * Get the last content page viewed.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the last content page viewed.
     */
    async getLastContentPageViewed(
        lessonId: number,
        retake: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonContentPageOrRecord | undefined> {
        try {
            const data = await this.getContentPagesViewed(lessonId, retake, options);

            let lastPage: AddonModLessonContentPageOrRecord | undefined;
            let maxTime = 0;

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
        } catch {
            // Error getting last page, don't return anything.
        }
    }

    /**
     * Get the last page seen.
     * Based on Moodle's get_last_page_seen.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the last page seen.
     */
    async getLastPageSeen(
        lessonId: number,
        retake: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<number | undefined> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        let lastPageSeen: number | undefined;

        // Get the last question answered.
        const answer = await AddonModLessonOffline.getLastQuestionPageAttempt(lessonId, retake, options.siteId);

        if (answer) {
            lastPageSeen = answer.newpageid;
        }

        // Now get the last content page viewed.
        const page = await this.getLastContentPageViewed(lessonId, retake, options);

        if (page) {
            if (answer) {
                const pageTime = 'timeseen' in page ? page.timeseen : page.timemodified;
                if (pageTime > answer.timemodified) {
                    // This content page was viewed more recently than the question page.
                    lastPageSeen = (<AddonModLessonPageAttemptRecord> page).newpageid || page.pageid;
                }
            } else {
                // Has not answered any questions but has viewed a content page.
                lastPageSeen = (<AddonModLessonPageAttemptRecord> page).newpageid || page.pageid;
            }
        }

        return lastPageSeen;
    }

    /**
     * Get a Lesson by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the lesson is retrieved.
     */
    getLesson(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLessonLessonWSData> {
        return this.getLessonByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a Lesson with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the lesson is retrieved.
     */
    protected async getLessonByField(
        courseId: number,
        key: 'id' | 'coursemodule',
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModLessonLessonWSData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetLessonsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLessonDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModLessonGetLessonsByCoursesWSResponse>(
            'mod_lesson_get_lessons_by_courses',
            params,
            preSets,
        );

        return CoreCourseModuleHelper.getActivityByField(response.lessons, key, value);
    }

    /**
     * Get a Lesson by lesson ID.
     *
     * @param courseId Course ID.
     * @param id Lesson ID.
     * @param options Other options.
     * @returns Promise resolved when the lesson is retrieved.
     */
    getLessonById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLessonLessonWSData> {
        return this.getLessonByField(courseId, 'id', id, options);
    }

    /**
     * Get cache key for Lesson data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getLessonDataCacheKey(courseId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}lesson:${courseId}`;
    }

    /**
     * Get a lesson protected with password.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the lesson.
     */
    async getLessonWithPassword(
        lessonId: number,
        options: AddonModLessonGetWithPasswordOptions = {},
    ): Promise<AddonModLessonLessonWSData> {
        const validatePassword = options.validatePassword ?? true;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetLessonWSParams = {
            lessonid: lessonId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLessonWithPasswordCacheKey(lessonId),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        if (typeof options.password == 'string') {
            params.password = options.password;
        }

        const response = await site.read<AddonModLessonGetLessonWSResponse>('mod_lesson_get_lesson', params, preSets);

        if (response.lesson.ongoing === undefined) {
            // Basic data not received, password is wrong. Remove stored password.
            this.removeStoredPassword(lessonId, site.id);

            if (validatePassword) {
                // Invalidate the data and reject.
                await CorePromiseUtils.ignoreErrors(this.invalidateLessonWithPassword(lessonId, site.id));

                throw new CoreError(Translate.instant('addon.mod_lesson.loginfail'));
            }
        }

        return response.lesson;
    }

    /**
     * Get cache key for get lesson with password WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getLessonWithPasswordCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}lessonWithPswrd:${lessonId}`;
    }

    /**
     * Given a page ID, a jumpto and all the possible jumps, calcualate the new page ID.
     *
     * @param pageId Current page ID.
     * @param jumpTo The jumpto.
     * @param jumps Possible jumps.
     * @returns New page ID.
     */
    protected getNewPageId(pageId: number, jumpTo: number, jumps: AddonModLessonPossibleJumps): number {
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
     * @param accessInfo Access info.
     * @param options Other options.
     * @returns Promise resolved with the ongoing score message.
     */
    getOngoingScoreMessage(
        lesson: AddonModLessonLessonWSData,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        options: AddonModLessonGradeOptions = {},
    ): Promise<string> {

        if (accessInfo.canmanage) {
            return Promise.resolve(Translate.instant('addon.mod_lesson.teacherongoingwarning'));
        } else {
            let retake = accessInfo.attemptscount;
            if (options.review) {
                retake--;
            }

            return this.lessonGrade(lesson, retake, options).then((gradeInfo) => {
                if (lesson.custom) {
                    return Translate.instant(
                        'addon.mod_lesson.ongoingcustom',
                        { $a: { score: gradeInfo.earned, currenthigh: gradeInfo.total } },
                    );
                } else {
                    return Translate.instant(
                        'addon.mod_lesson.ongoingnormal',
                        { $a: { correct: gradeInfo.earned, viewed: gradeInfo.attempts } },
                    );
                }
            });
        }
    }

    /**
     * Get the possible answers from a page.
     *
     * @param lesson Lesson.
     * @param pageId Page ID.
     * @param options Other options.
     * @returns Promise resolved with the list of possible answers.
     */
    protected async getPageAnswers(
        lesson: AddonModLessonLessonWSData,
        pageId: number,
        options: AddonModLessonPwdReviewOptions = {},
    ): Promise<AddonModLessonPageAnswerWSData[]> {
        const data = await this.getPageData(lesson, pageId, {
            includeContents: true,
            ...options, // Include all options.
            readingStrategy: options.readingStrategy || CoreSitesReadingStrategy.PREFER_CACHE,
            includeOfflineData: false,
        });

        return data.answers;
    }

    /**
     * Get all the possible answers from a list of pages, indexed by answerId.
     *
     * @param lesson Lesson.
     * @param pageIds List of page IDs.
     * @param options Other options.
     * @returns Promise resolved with an object containing the answers.
     */
    protected async getPagesAnswers(
        lesson: AddonModLessonLessonWSData,
        pageIds: number[],
        options: AddonModLessonPwdReviewOptions = {},
    ): Promise<Record<number, AddonModLessonPageAnswerData>> {

        const answers: Record<number, AddonModLessonPageAnswerData> = {};

        await Promise.all(pageIds.map(async (pageId) => {
            const pageAnswers = await this.getPageAnswers(lesson, pageId, options);

            pageAnswers.forEach((answer) => {
                // Include the pageid in each answer and add them to the final list.
                answers[answer.id] = Object.assign(answer, { pageid: pageId });
            });
        }));

        return answers;
    }

    /**
     * Get page data.
     *
     * @param lesson Lesson.
     * @param pageId Page ID.
     * @param options Other options.
     * @returns Promise resolved with the page data.
     */
    async getPageData(
        lesson: AddonModLessonLessonWSData,
        pageId: number,
        options: AddonModLessonGetPageDataOptions = {},
    ): Promise<AddonModLessonGetPageDataWSResponse> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetPageDataWSParams = {
            lessonid: lesson.id,
            pageid: Number(pageId),
            review: !!options.review,
            returncontents: !!options.includeContents,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPageDataCacheKey(lesson.id, pageId),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        if (typeof options.password == 'string') {
            params.password = options.password;
        }

        if (options.review) {
            // Force online mode in review.
            preSets.getFromCache = false;
            preSets.saveToCache = false;
            preSets.emergencyCache = false;
        }

        const response = await site.read<AddonModLessonGetPageDataWSResponse>('mod_lesson_get_page_data', params, preSets);

        if (preSets.omitExpires && options.includeOfflineData && response.page && options.accessInfo && options.jumps) {
            // Offline mode and valid page. Calculate the data that might be affected.
            const calcData = await this.calculateOfflineData(lesson, options);

            Object.assign(response, calcData);

            response.messages = await this.getPageViewMessages(lesson, options.accessInfo, response.page, options.jumps, {
                password: options.password,
                siteId: options.siteId,
            });
        }

        return response;
    }

    /**
     * Get cache key for get page data WS calls.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @returns Cache key.
     */
    protected getPageDataCacheKey(lessonId: number, pageId: number): string {
        return `${this.getPageDataCommonCacheKey(lessonId)}:${pageId}`;
    }

    /**
     * Get common cache key for get page data WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getPageDataCommonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}pageData:${lessonId}`;
    }

    /**
     * Get lesson pages.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the pages.
     */
    async getPages(lessonId: number, options: AddonModLessonPwdReviewOptions = {}): Promise<AddonModLessonGetPagesPageWSData[]> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetPagesWSParams = {
            lessonid: lessonId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPagesCacheKey(lessonId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        if (typeof options.password == 'string') {
            params.password = options.password;
        }

        const response = await site.read<AddonModLessonGetPagesWSResponse>('mod_lesson_get_pages', params, preSets);

        return response.pages;
    }

    /**
     * Get cache key for get pages WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getPagesCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}pages:${lessonId}`;
    }

    /**
     * Get possible jumps for a lesson.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the jumps.
     */
    async getPagesPossibleJumps(
        lessonId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonPossibleJumps> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetPagesPossibleJumpsWSParams = {
            lessonid: lessonId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPagesPossibleJumpsCacheKey(lessonId),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModLessonGetPagesPossibleJumpsWSResponse>(
            'mod_lesson_get_pages_possible_jumps',
            params,
            preSets,
        );

        // Index the jumps by page and jumpto.
        const jumps: AddonModLessonPossibleJumps = {};

        response.jumps.forEach((jump) => {
            if (jumps[jump.pageid] === undefined) {
                jumps[jump.pageid] = {};
            }
            jumps[jump.pageid][jump.jumpto] = jump;
        });

        return jumps;
    }

    /**
     * Get cache key for get pages possible jumps WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getPagesPossibleJumpsCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}pagesJumps:${lessonId}`;
    }

    /**
     * Get different informative messages when processing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_process.
     *
     * @param lesson Lesson.
     * @param accessInfo Access info.
     * @param result Result of process page.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param jumps Possible jumps.
     * @returns Array with the messages.
     */
    getPageProcessMessages(
        lesson: AddonModLessonLessonWSData,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        result: AddonModLessonProcessPageResponse,
        review: boolean,
        jumps: AddonModLessonPossibleJumps,
    ): AddonModLessonMessageWSData[] {
        const messages = [];

        if (accessInfo.canmanage) {
            // Warning for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
            if (this.lessonDisplayTeacherWarning(jumps)) {
                this.addMessage(messages, 'addon.mod_lesson.teacherjumpwarning', {
                    $a: {
                        cluster: Translate.instant('addon.mod_lesson.clusterjump'),
                        unseen: Translate.instant('addon.mod_lesson.unseenpageinbranch'),
                    },
                });
            }

            // Inform teacher that s/he will not see the timer.
            if (lesson.timelimit) {
                this.addMessage(messages, 'addon.mod_lesson.teachertimerwarning');
            }
        }
        // Report attempts remaining.
        if (result.attemptsremaining && result.attemptsremaining > 0 && lesson.review && !review) {
            this.addMessage(messages, 'addon.mod_lesson.attemptsremaining', { $a: result.attemptsremaining });
        }

        return messages;
    }

    /**
     * Get the IDs of all the pages that have at least 1 question attempt.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the IDs.
     */
    async getPagesIdsWithQuestionAttempts(
        lessonId: number,
        retake: number,
        options: AddonModLessonGetPagesIdsWithAttemptsOptions = {},
    ): Promise<number[]> {

        const result = await this.getQuestionsAttempts(lessonId, retake, options);

        const ids: Record<number, boolean> = {};
        const attempts = (<AddonModLessonAnyAttemptData[]> result.online).concat(result.offline);

        attempts.forEach((attempt) => {
            if (!ids[attempt.pageid]) {
                ids[attempt.pageid] = true;
            }
        });

        return Object.keys(ids).map((id) => Number(id));
    }

    /**
     * Get different informative messages when viewing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_view.
     *
     * @param lesson Lesson.
     * @param accessInfo Access info. Required if offline is true.
     * @param page Page loaded.
     * @param jumps Possible jumps.
     * @param options Other options.
     * @returns Promise resolved with the list of messages.
     */
    async getPageViewMessages(
        lesson: AddonModLessonLessonWSData,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        page: AddonModLessonPageWSData,
        jumps: AddonModLessonPossibleJumps,
        options: AddonModLessonGetPageViewMessagesOptions = {},
    ): Promise<AddonModLessonMessageWSData[]> {

        const messages: AddonModLessonMessageWSData[] = [];

        if (!accessInfo.canmanage) {
            if (page.qtype === AddonModLessonPageSubtype.BRANCHTABLE && lesson.minquestions) {
                // Tell student how many questions they have seen, how many are required and their grade.
                const retake = accessInfo.attemptscount;

                const gradeInfo = await CorePromiseUtils.ignoreErrors(this.lessonGrade(lesson, retake, options));
                if (gradeInfo?.attempts) {
                    if (gradeInfo.nquestions < lesson.minquestions) {
                        this.addMessage(messages, 'addon.mod_lesson.numberofpagesviewednotice', {
                            $a: {
                                nquestions: gradeInfo.nquestions,
                                minquestions: lesson.minquestions,
                            },
                        });
                    }

                    if (!options.review && !lesson.retake) {
                        this.addMessage(messages, 'addon.mod_lesson.numberofcorrectanswers', { $a: gradeInfo.earned });

                        if (lesson.grade !== undefined && lesson.grade !== CoreGradeType.NONE) {
                            this.addMessage(messages, 'addon.mod_lesson.yourcurrentgradeisoutof', { $a: {
                                grade: CoreText.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                total: lesson.grade,
                            } });
                        }
                    }
                }
            }
        } else {
            if (lesson.timelimit) {
                this.addMessage(messages, 'addon.mod_lesson.teachertimerwarning');
            }

            if (this.lessonDisplayTeacherWarning(jumps)) {
                // Warning for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
                this.addMessage(messages, 'addon.mod_lesson.teacherjumpwarning', {
                    $a: {
                        cluster: Translate.instant('addon.mod_lesson.clusterjump'),
                        unseen: Translate.instant('addon.mod_lesson.unseenpageinbranch'),
                    },
                });
            }
        }

        return messages;
    }

    /**
     * Get questions attempts, including offline attempts.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the questions attempts.
     */
    async getQuestionsAttempts(
        lessonId: number,
        retake: number,
        options: AddonModLessonGetQuestionsAttemptsOptions = {},
    ): Promise<{online: AddonModLessonQuestionAttemptWSData[]; offline: AddonModLessonPageAttemptRecord[]}> {

        const [online, offline] = await Promise.all([
            this.getQuestionsAttemptsOnline(lessonId, retake, options),
            CorePromiseUtils.ignoreErrors(AddonModLessonOffline.getQuestionsAttempts(
                lessonId,
                retake,
                options.correct,
                options.pageId,
                options.siteId,
            )),
        ]);

        return {
            online,
            offline: offline || [],
        };
    }

    /**
     * Get cache key for get questions attempts WS calls.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getQuestionsAttemptsCacheKey(lessonId: number, retake: number, userId: number): string {
        return `${this.getQuestionsAttemptsCommonCacheKey(lessonId)}:${userId}:${retake}`;
    }

    /**
     * Get common cache key for get questions attempts WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getQuestionsAttemptsCommonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}questionsAttempts:${lessonId}`;
    }

    /**
     * Get questions attempts from the site.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param options Other options.
     * @returns Promise resolved with the questions attempts.
     */
    async getQuestionsAttemptsOnline(
        lessonId: number,
        retake: number,
        options: AddonModLessonGetQuestionsAttemptsOptions = {},
    ): Promise<AddonModLessonQuestionAttemptWSData[]> {

        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();

        // Don't pass "pageId" and "correct" params, they will be filtered locally.
        const params: AddonModLessonGetQuestionsAttemptsWSParams = {
            lessonid: lessonId,
            attempt: retake,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getQuestionsAttemptsCacheKey(lessonId, retake, userId),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModLessonGetQuestionsAttemptsWSResponse>(
            'mod_lesson_get_questions_attempts',
            params,
            preSets,
        );

        if (!options.pageId && !options.correct) {
            return response.attempts;
        }

        // Filter the attempts.
        return response.attempts.filter((attempt) => {
            if (options.correct && !attempt.correct) {
                return false;
            }

            if (options.pageId && attempt.pageid != options.pageId) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get the overview of retakes in a lesson (named "attempts overview" in Moodle).
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the retakes overview, undefined if no attempts.
     */
    async getRetakesOverview(
        lessonId: number,
        options: AddonModLessonGroupOptions = {},
    ): Promise<AddonModLessonAttemptsOverviewWSData | undefined> {
        const groupId = options.groupId || 0;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonGetAttemptsOverviewWSParams = {
            lessonid: lessonId,
            groupid: groupId,
        };
        const preSets = {
            cacheKey: this.getRetakesOverviewCacheKey(lessonId, groupId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModLessonGetAttemptsOverviewWSResponse>(
            'mod_lesson_get_attempts_overview',
            params,
            preSets,
        );

        return response.data;
    }

    /**
     * Get cache key for get retakes overview WS calls.
     *
     * @param lessonId Lesson ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getRetakesOverviewCacheKey(lessonId: number, groupId: number): string {
        return `${this.getRetakesOverviewCommonCacheKey(lessonId)}:${groupId}`;
    }

    /**
     * Get common cache key for get retakes overview WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getRetakesOverviewCommonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}retakesOverview:${lessonId}`;
    }

    /**
     * Get a password stored in DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with password on success, rejected otherwise.
     */
    async getStoredPassword(lessonId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const entry = await site.getDb().getRecord<AddonModLessonPasswordDBRecord>(PASSWORD_TABLE_NAME, { lessonid: lessonId });

        return entry.password;
    }

    /**
     * Finds all pages that appear to be a subtype of the provided pageId until an end point specified within "ends" is
     * encountered or no more pages exist.
     * Based on Moodle's get_sub_pages_of.
     *
     * @param pages Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param pageId Page ID to get subpages of.
     * @param ends An array of LESSON_PAGE_* types that signify an end of the subtype.
     * @returns List of subpages.
     */
    getSubpagesOf(pages: Record<number, AddonModLessonPageWSData>, pageId: number, ends: number[]): AddonModLessonPageWSData[] {
        const subPages: AddonModLessonPageWSData[] = [];

        pageId = pages[pageId].nextpageid; // Move to the first page after the given page.
        ends = ends || [];

        // Search until there are no more pages or it reaches a page of the searched types.
        while (pageId && ends.indexOf(pages[pageId].qtype) == -1) {
            subPages.push(pages[pageId]);
            pageId = pages[pageId].nextpageid;
        }

        return subPages;
    }

    /**
     * Get lesson timers.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved with the pages.
     */
    async getTimers(lessonId: number, options: AddonModLessonUserOptions = {}): Promise<AddonModLessonUserTimerWSData[]> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModLessonGetUserTimersWSParams = {
            lessonid: lessonId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getTimersCacheKey(lessonId, userId),
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModLessonGetUserTimersWSResponse>('mod_lesson_get_user_timers', params, preSets);

        return response.timers;
    }

    /**
     * Get cache key for get timers WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getTimersCacheKey(lessonId: number, userId: number): string {
        return `${this.getTimersCommonCacheKey(lessonId)}:${userId}`;
    }

    /**
     * Get common cache key for get timers WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getTimersCommonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}timers:${lessonId}`;
    }

    /**
     * Get the list of used answers (with valid answer) in a multichoice question page.
     *
     * @param pageData Page data for the page to process.
     * @returns List of used answers.
     */
    protected getUsedAnswersMultichoice(pageData: AddonModLessonGetPageDataWSResponse): AddonModLessonPageAnswerWSData[] {
        const answers = CoreUtils.clone(pageData.answers);

        return answers.filter((entry) => entry.answer !== undefined && entry.answer !== '');
    }

    /**
     * Get the user's response in a matching question page.
     *
     * @param data Data containing the user answer.
     * @returns User response.
     */
    protected getUserResponseMatching(data: Record<string, unknown>): Record<string, string> {
        if (data.response) {
            // The data is already stored as expected. Return it.
            return <Record<string, string>> data.response;
        }

        // Data is stored in properties like 'response[379]'. Recreate the response object.
        const response: Record<string, string> = {};

        for (const key in data) {
            const match = key.match(/^response\[(\d+)\]/);

            if (match && match.length > 1) {
                response[match[1]] = <string> data[key];
            }
        }

        return response;
    }

    /**
     * Get the user's response in a multichoice page if multiple answers are allowed.
     *
     * @param data Data containing the user answer.
     * @returns User response.
     */
    protected getUserResponseMultichoice(data: Record<string, unknown>): number[] | undefined {
        if (data.answer) {
            // The data is already stored as expected. If it's valid, parse the values to int.
            if (Array.isArray(data.answer)) {
                return data.answer.map((value) => parseInt(value, 10));
            }

            return undefined;
        }

        // Data is stored in properties like 'answer[379]'. Recreate the answer array.
        const answer: number[] = [];
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
     * @param options Other options.
     * @returns Promise resolved with the retake data.
     */
    async getUserRetake(
        lessonId: number,
        retake: number,
        options: AddonModLessonUserOptions = {},
    ): Promise<AddonModLessonGetUserAttemptWSResponse> {

        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModLessonGetUserAttemptWSParams = {
            lessonid: lessonId,
            userid: userId,
            lessonattempt: retake,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserRetakeCacheKey(lessonId, userId, retake),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_LESSON_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_lesson_get_user_attempt', params, preSets);
    }

    /**
     * Get cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @param retake Retake number
     * @returns Cache key.
     */
    protected getUserRetakeCacheKey(lessonId: number, userId: number, retake: number): string {
        return `${this.getUserRetakeUserCacheKey(lessonId, userId)}:${retake}`;
    }

    /**
     * Get user cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserRetakeUserCacheKey(lessonId: number, userId: number): string {
        return `${this.getUserRetakeLessonCacheKey(lessonId)}:${userId}`;
    }

    /**
     * Get lesson cache key for get user retake WS calls.
     *
     * @param lessonId Lesson ID.
     * @returns Cache key.
     */
    protected getUserRetakeLessonCacheKey(lessonId: number): string {
        return `${AddonModLessonProvider.ROOT_CACHE_KEY}userRetake:${lessonId}`;
    }

    /**
     * Get the prevent access reason to display for a certain lesson.
     *
     * @param info Lesson access info.
     * @param ignorePassword Whether password protected reason should be ignored (user already entered the password).
     * @param isReview Whether user is reviewing a retake.
     * @returns Prevent access reason.
     */
    getPreventAccessReason(
        info: AddonModLessonGetAccessInformationWSResponse,
        ignorePassword?: boolean,
        isReview?: boolean,
    ): AddonModLessonPreventAccessReason | undefined {
        if (!info?.preventaccessreasons) {
            return;
        }

        let reason: AddonModLessonPreventAccessReason | undefined;
        for (let i = 0; i < info.preventaccessreasons.length; i++) {
            const entry = info.preventaccessreasons[i];

            if (entry.reason == 'lessonopen' || entry.reason == 'lessonclosed') {
                // Time restrictions are the most prioritary, return it.
                return entry;
            } else if (entry.reason == 'passwordprotectedlesson') {
                if (!ignorePassword) {
                    // Treat password before all other reasons.
                    reason = entry;
                }
            } else if (entry.reason == 'noretake' && isReview) {
                // Ignore noretake error when reviewing.
            } else if (!reason) {
                // Rest of cases, just return any of them.
                reason = entry;
            }
        }

        return reason;
    }

    /**
     * Check if a jump is correct.
     * Based in Moodle's jumpto_is_correct.
     *
     * @param pageId ID of the page from which you are jumping from.
     * @param jumpTo The jumpto number.
     * @param pageIndex Object containing all the pages indexed by ID. See createPagesIndex.
     * @returns Whether jump is correct.
     */
    jumptoIsCorrect(pageId: number, jumpTo: number, pageIndex: Record<number, AddonModLessonPageWSData>): boolean {
        // First test the special values.
        if (!jumpTo) {
            // Same page
            return false;
        } else if (jumpTo == AddonModLessonJumpTo.NEXTPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonJumpTo.UNSEENBRANCHPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonJumpTo.RANDOMPAGE) {
            return true;
        } else if (jumpTo == AddonModLessonJumpTo.CLUSTERJUMP) {
            return true;
        } else if (jumpTo == AddonModLessonJumpTo.EOL) {
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
     */
    async invalidateAccessInformation(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(lessonId));
    }

    /**
     * Invalidates content pages viewed for all retakes.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContentPagesViewed(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getContentPagesViewedCommonCacheKey(lessonId));
    }

    /**
     * Invalidates content pages viewed for a certain retake.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContentPagesViewedForRetake(lessonId: number, retake: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getContentPagesViewedCacheKey(lessonId, retake));
    }

    /**
     * Invalidates Lesson data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateLessonData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLessonDataCacheKey(courseId));
    }

    /**
     * Invalidates lesson with password.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateLessonWithPassword(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLessonWithPasswordCacheKey(lessonId));
    }

    /**
     * Invalidates page data for all pages.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidatePageData(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getPageDataCommonCacheKey(lessonId));
    }

    /**
     * Invalidates page data for a certain page.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidatePageDataForPage(lessonId: number, pageId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPageDataCacheKey(lessonId, pageId));
    }

    /**
     * Invalidates pages.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidatePages(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPagesCacheKey(lessonId));
    }

    /**
     * Invalidates pages possible jumps.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidatePagesPossibleJumps(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPagesPossibleJumpsCacheKey(lessonId));
    }

    /**
     * Invalidates questions attempts for all retakes.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateQuestionsAttempts(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getQuestionsAttemptsCommonCacheKey(lessonId));
    }

    /**
     * Invalidates question attempts for a certain retake and user.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site..
     * @param userId User ID. If not defined, site's user.
     */
    async invalidateQuestionsAttemptsForRetake(lessonId: number, retake: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getQuestionsAttemptsCacheKey(lessonId, retake, userId || site.getUserId()));
    }

    /**
     * Invalidates retakes overview for all groups in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateRetakesOverview(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getRetakesOverviewCommonCacheKey(lessonId));
    }

    /**
     * Invalidates retakes overview for a certain group in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param groupId Group ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateRetakesOverviewForGroup(lessonId: number, groupId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getRetakesOverviewCacheKey(lessonId, groupId));
    }

    /**
     * Invalidates timers for all users in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateTimers(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getTimersCommonCacheKey(lessonId));
    }

    /**
     * Invalidates timers for a certain user.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, site's current user.
     */
    async invalidateTimersForUser(lessonId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getTimersCacheKey(lessonId, userId || site.getUserId()));
    }

    /**
     * Invalidates a certain retake for a certain user.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param userId User ID. Undefined for current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateUserRetake(lessonId: number, retake: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserRetakeCacheKey(lessonId, userId || site.getUserId(), retake));
    }

    /**
     * Invalidates all retakes for all users in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateUserRetakesForLesson(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserRetakeLessonCacheKey(lessonId));
    }

    /**
     * Invalidates all retakes for a certain user in a lesson.
     *
     * @param lessonId Lesson ID.
     * @param userId User ID. Undefined for current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateUserRetakesForUser(lessonId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserRetakeUserCacheKey(lessonId, userId || site.getUserId()));
    }

    /**
     * Check if a page answer is correct.
     *
     * @param lesson Lesson.
     * @param pageId The page ID.
     * @param answer The answer to check.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @returns Whether the answer is correct.
     */
    protected isAnswerCorrect(
        lesson: AddonModLessonLessonWSData,
        pageId: number,
        answer: AddonModLessonPageAnswerWSData,
        pageIndex: Record<number, AddonModLessonPageWSData>,
    ): boolean {
        if (lesson.custom) {
            // Custom scores. If score on answer is positive, it is correct.
            return !!(answer.score && answer.score > 0);
        } else {
            return this.jumptoIsCorrect(pageId, answer.jumpto || 0, pageIndex);
        }
    }

    /**
     * Check if a lesson is enabled to be used in offline.
     *
     * @param lesson Lesson.
     * @returns Whether offline is enabled.
     */
    isLessonOffline(lesson: AddonModLessonLessonWSData): boolean {
        return !!lesson.allowofflineattempts;
    }

    /**
     * Check if a lesson is password protected based in the access info.
     *
     * @param info Lesson access info.
     * @returns Whether the lesson is password protected.
     */
    isPasswordProtected(info: AddonModLessonGetAccessInformationWSResponse): boolean {
        if (!info || !info.preventaccessreasons) {
            return false;
        }

        for (let i = 0; i < info.preventaccessreasons.length; i++) {
            const entry = info.preventaccessreasons[i];

            if (entry.reason == 'passwordprotectedlesson') {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a page is a question page or a content page.
     *
     * @param type Type of the page.
     * @returns True if question page, false if content page.
     */
    isQuestionPage(type: number): boolean {
        return type === AddonModLessonPageType.QUESTION;
    }

    /**
     * Start or continue a retake.
     *
     * @param id Lesson ID.
     * @param password Lesson password (if any).
     * @param pageId Page id to continue from (only when continuing a retake).
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async launchRetake(
        id: number,
        password?: string,
        pageId?: number,
        review?: boolean,
        siteId?: string,
    ): Promise<AddonModLessonLaunchAttemptWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModLessonLaunchAttemptWSParams = {
            lessonid: id,
            review: !!review,
        };
        if (typeof password == 'string') {
            params.password = password;
        }
        if (typeof pageId == 'number') {
            params.pageid = pageId;
        }

        const response = await site.write<AddonModLessonLaunchAttemptWSResponse>('mod_lesson_launch_attempt', params);

        CoreEvents.trigger(ADDON_MOD_LESSON_DATA_SENT_EVENT, {
            lessonId: id,
            type: 'launch',
        }, CoreSites.getCurrentSiteId());

        return response;
    }

    /**
     * Check if the user left during a timed session.
     *
     * @param info Lesson access info.
     * @returns True if left during timed, false otherwise.
     */
    leftDuringTimed(info?: AddonModLessonGetAccessInformationWSResponse): boolean {
        return !!(info?.lastpageseen && info.lastpageseen != AddonModLessonJumpTo.EOL && info.leftduringtimedsession);
    }

    /**
     * Checks to see if a LESSON_CLUSTERJUMP or a LESSON_UNSEENBRANCHPAGE is used in a lesson.
     * Based on Moodle's lesson_display_teacher_warning.
     *
     * @param jumps Possible jumps.
     * @returns Whether the lesson uses one of those jumps.
     */
    lessonDisplayTeacherWarning(jumps: AddonModLessonPossibleJumps): boolean {
        if (!jumps) {
            return false;
        }

        // Check if any jump is to cluster or unseen content page.
        for (const pageId in jumps) {
            for (const jumpto in jumps[pageId]) {
                const jumptoNum = Number(jumpto);

                if (jumptoNum == AddonModLessonJumpTo.CLUSTERJUMP ||
                        jumptoNum == AddonModLessonJumpTo.UNSEENBRANCHPAGE) {
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
     * @param options Other options.
     * @returns Promise resolved with the grade data.
     */
    async lessonGrade(
        lesson: AddonModLessonLessonWSData,
        retake: number,
        options: AddonModLessonGradeOptions = {},
    ): Promise<AddonModLessonGrade> {

        const result: AddonModLessonGrade = {
            nquestions: 0,
            attempts: 0,
            total: 0,
            earned: 0,
            grade: 0,
            nmanual: 0,
            manualpoints: 0,
        };

        // Get the questions attempts for the user.
        const attemptsData = await this.getQuestionsAttempts(lesson.id, retake, {
            cmId: lesson.coursemodule,
            siteId: options.siteId,
            userId: options.userId,
        });

        const attempts = (<AddonModLessonAnyAttemptData[]> attemptsData.online).concat(attemptsData.offline);

        if (!attempts.length) {
            // No attempts.
            return result;
        }

        // Create the pageIndex if it isn't provided.
        if (!options.pageIndex) {
            const pages = await this.getPages(lesson.id, {
                password: options.password,
                cmId: lesson.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId: options.siteId,
            });

            options.pageIndex = this.createPagesIndex(pages);
        }

        const attemptSet: Record<number, AddonModLessonAnyAttemptData[]> = {};
        const pageIds: number[] = [];

        // Group each try with its page.
        attempts.forEach((attempt) => {
            if (!attemptSet[attempt.pageid]) {
                attemptSet[attempt.pageid] = [];
                pageIds.push(attempt.pageid);
            }
            attemptSet[attempt.pageid].push(attempt);
        });

        if (lesson.maxattempts && lesson.maxattempts > 0) {
            // Drop all attempts that go beyond max attempts for the lesson.
            for (const pageId in attemptSet) {
                // Sort the list by time in ascending order.
                const attempts = attemptSet[pageId].sort((a, b) =>
                    ('timeseen' in a ? a.timeseen : a.timemodified) - ('timeseen' in b ? b.timeseen : b.timemodified));

                attemptSet[pageId] = attempts.slice(0, lesson.maxattempts);
            }
        }

        // Get all the answers from the pages the user answered.
        const answers = await this.getPagesAnswers(lesson, pageIds, options);

        // Number of pages answered.
        result.nquestions = Object.keys(attemptSet).length;

        for (const pageId in attemptSet) {
            const attempts = attemptSet[pageId];
            const lastAttempt = attempts[attempts.length - 1];

            if (lesson.custom) {
                // If essay question, handle it, otherwise add to score.
                if (options.pageIndex[lastAttempt.pageid].qtype === AddonModLessonPageSubtype.ESSAY) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const score: number | undefined = (<any> lastAttempt.useranswer)?.score;
                    if (score !== undefined) {
                        result.earned += score;
                    }
                    result.nmanual++;
                    result.manualpoints += answers[lastAttempt.answerid!].score || 0;
                } else if (lastAttempt.answerid) {
                    result.earned += answers[lastAttempt.answerid!].score || 0;
                }
            } else {
                attempts.forEach((attempt) => {
                    result.earned += attempt.correct ? 1 : 0;
                });

                // If essay question, increase numbers.
                if (options.pageIndex[lastAttempt.pageid].qtype === AddonModLessonPageSubtype.ESSAY) {
                    result.nmanual++;
                    result.manualpoints++;
                }
            }

            // Number of times answered.
            result.attempts += attempts.length;
        }

        if (lesson.custom) {
            const bestScores: Record<number, number> = {};

            // Find the highest possible score per page to get our total.
            for (const answerId in answers) {
                const answer = answers[answerId];

                if (bestScores[answer.pageid] === undefined) {
                    bestScores[answer.pageid] = answer.score || 0;
                } else if (bestScores[answer.pageid] < (answer.score || 0)) {
                    bestScores[answer.pageid] = answer.score || 0;
                }
            }

            // Sum all the scores.
            for (const pageId in bestScores) {
                result.total += bestScores[pageId];
            }
        } else {
            // Check to make sure the student has answered the minimum questions.
            if (lesson.minquestions && result.nquestions < lesson.minquestions) {
                // Nope, increase number viewed by the amount of unanswered questions.
                result.total = result.attempts + (lesson.minquestions - result.nquestions);
            } else {
                result.total = result.attempts;
            }
        }

        if (result.total) { // Not zero.
            result.grade = CoreText.roundToDecimals(result.earned * 100 / result.total, 5);
        }

        return result;
    }

    /**
     * Report a lesson as being viewed.
     *
     * @param id Module ID.
     * @param password Lesson password (if any).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logViewLesson(id: number, password?: string, siteId?: string): Promise<void> {
        const params: AddonModLessonViewLessonWSParams = {
            lessonid: id,
        };

        if (typeof password == 'string') {
            params.password = password;
        }

        await CoreCourseLogHelper.log(
            'mod_lesson_view_lesson',
            params,
            ADDON_MOD_LESSON_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

    /**
     * Process a lesson page, saving its data.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param pageData Page data for the page to process.
     * @param data Data to save.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async processPage(
        lesson: AddonModLessonLessonWSData,
        courseId: number,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        options: AddonModLessonProcessPageOptions = {},
    ): Promise<AddonModLessonProcessPageResponse> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();
        if (!pageData.page) {
            throw new CoreError('Page data not supplied.');
        }

        const page = pageData.page;
        const pageId = page.id;

        if (!options.offline) {
            const response = <AddonModLessonProcessPageResponse> await this.processPageOnline(lesson.id, pageId, data, options);

            CoreEvents.trigger(ADDON_MOD_LESSON_DATA_SENT_EVENT, {
                lessonId: lesson.id,
                type: 'process',
                courseId: courseId,
                pageId: pageId,
                review: options.review,
            }, CoreSites.getCurrentSiteId());

            response.sent = true;

            return response;
        }

        if (!options.accessInfo || !options.jumps) {
            throw new CoreError('Access info or jumps not supplied to processPage.');
        }

        // Get the list of pages of the lesson.
        const pages = await this.getPages(lesson.id, {
            cmId: lesson.coursemodule,
            password: options.password,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId: options.siteId,
        });

        const pageIndex = this.createPagesIndex(pages);
        const result: AddonModLessonProcessPageResponse = {
            newpageid: <number> data.newpageid,
            inmediatejump: false,
            nodefaultresponse: false,
            feedback: '',
            attemptsremaining: null,
            correctanswer: false,
            noanswer: false,
            isessayquestion: false,
            maxattemptsreached: false,
            response: '',
            studentanswer: '',
            userresponse: '',
            reviewmode: false,
            ongoingscore: '',
            progress: null,
            displaymenu: false,
            messages: [],
        };

        if (pageData.answers.length) {
            const recordAttemptResult = await this.recordAttempt(
                lesson,
                courseId,
                pageData,
                data,
                !!options.review,
                options.accessInfo,
                options.jumps,
                pageIndex,
                options.siteId,
            );

            Object.assign(result, recordAttemptResult);
        } else {
            // If no answers, progress to the next page (as set by newpageid).
            result.nodefaultresponse = true;
        }

        result.newpageid = this.getNewPageId(pageData.page.id, result.newpageid, options.jumps);

        // Calculate some needed offline data.
        const calculatedData = await this.calculateOfflineData(lesson, {
            accessInfo: options.accessInfo,
            password: options.password,
            review: options.review,
            pageIndex,
            siteId: options.siteId,
        });

        // Add some default data to match the WS response.
        return {
            ...result,
            ...calculatedData,
            displaymenu: pageData.displaymenu, // Keep the same value since we can't calculate it in offline.
            messages: this.getPageProcessMessages(lesson, options.accessInfo, result, !!options.review, options.jumps),
            warnings: [],
            sent: false,
        };
    }

    /**
     * Process a lesson page, saving its data. It will fail if offline or cannot connect.
     *
     * @param lessonId Lesson ID.
     * @param pageId Page ID.
     * @param data Data to save.
     * @param options Other options.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async processPageOnline(
        lessonId: number,
        pageId: number,
        data: Record<string, unknown>,
        options: AddonModLessonProcessPageOnlineOptions = {},
    ): Promise<AddonModLessonProcessPageWSResponse> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLessonProcessPageWSParams = {
            lessonid: lessonId,
            pageid: pageId,
            data: CoreObject.toArrayOfObjects<ProcessPageData>(data, 'name', 'value', true),
            review: !!options.review,
        };

        if (typeof options.password == 'string') {
            params.password = options.password;
        }

        return site.write('mod_lesson_process_page', params);
    }

    /**
     * Records an attempt on a certain page.
     * Based on Moodle's record_attempt.
     *
     * @param lesson Lesson.
     * @param courseId Course ID the lesson belongs to.
     * @param pageData Page data for the page to process.
     * @param data Data to save.
     * @param review If the user wants to review just after finishing (1 hour margin).
     * @param accessInfo Access info.
     * @param jumps Possible jumps.
     * @param pageIndex Object containing all the pages indexed by ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the result.
     */
    protected async recordAttempt(
        lesson: AddonModLessonLessonWSData,
        courseId: number,
        pageData: AddonModLessonGetPageDataWSResponse,
        data: Record<string, unknown>,
        review: boolean,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        jumps: AddonModLessonPossibleJumps,
        pageIndex: Record<number, AddonModLessonPageWSData>,
        siteId?: string,
    ): Promise<AddonModLessonRecordAttemptResult> {

        if (!pageData.page) {
            throw new CoreError('Page data not supplied.');
        }

        // Check the user answer. Each page type has its own implementation.
        const result: AddonModLessonRecordAttemptResult = this.checkAnswer(lesson, pageData, data, jumps, pageIndex);
        const retake = accessInfo.attemptscount;

        // Processes inmediate jumps.
        if (result.inmediatejump) {
            if (pageData.page?.qtype === AddonModLessonPageSubtype.BRANCHTABLE) {
                // Store the content page data. In Moodle this is stored in a separate table, during checkAnswer.
                await AddonModLessonOffline.processPage(
                    lesson.id,
                    courseId,
                    retake,
                    pageData.page,
                    data,
                    result.newpageid,
                    result.answerid,
                    false,
                    result.userresponse,
                    siteId,
                );

                return result;
            }

            return result;
        }

        let nAttempts: number | undefined;
        result.attemptsremaining = 0;
        result.maxattemptsreached = false;

        if (result.noanswer) {
            result.newpageid = pageData.page.id; // Display same page again.
            result.feedback = Translate.instant('addon.mod_lesson.noanswer');

            return result;
        }

        if (!accessInfo.canmanage) {
            // Get the number of attempts that have been made on this question for this student and retake.
            const attempts = await this.getQuestionsAttempts(lesson.id, retake, {
                cmId: lesson.coursemodule,
                pageId: pageData.page.id,
                siteId,
            });

            nAttempts = attempts.online.length + attempts.offline.length;

            // Check if they have reached (or exceeded) the maximum number of attempts allowed.
            if (lesson.maxattempts && lesson.maxattempts > 0 && nAttempts >= lesson.maxattempts) {
                result.maxattemptsreached = true;
                result.feedback = Translate.instant('addon.mod_lesson.maximumnumberofattemptsreached');
                result.newpageid = AddonModLessonJumpTo.NEXTPAGE;

                return result;
            }

            // Only insert a record if we are not reviewing the lesson.
            if (!review && (lesson.retake || (!lesson.retake && !retake))) {
                // Store the student's attempt and increase the number of attempts made.
                // Calculate and store the new page ID to prevent having to recalculate it later.
                const newPageId = this.getNewPageId(pageData.page.id, result.newpageid, jumps);

                await AddonModLessonOffline.processPage(
                    lesson.id,
                    courseId,
                    retake,
                    pageData.page,
                    data,
                    newPageId,
                    result.answerid,
                    result.correctanswer,
                    result.userresponse,
                    siteId,
                );

                nAttempts++;
            }

            // Check if "number of attempts remaining" message is needed.
            if (!result.correctanswer && !result.newpageid) {
                // Retreive the number of attempts left counter.
                if (lesson.maxattempts && lesson.maxattempts > 0 && nAttempts >= lesson.maxattempts) {
                    if (lesson.maxattempts > 1) { // Don't bother with message if only one attempt.
                        result.maxattemptsreached = true;
                    }
                    result.newpageid =  AddonModLessonJumpTo.NEXTPAGE;
                } else if (lesson.maxattempts && lesson.maxattempts > 1) { // Don't show message if only one attempt or unlimited.
                    result.attemptsremaining = lesson.maxattempts - nAttempts;
                }
            }
        }

        // Determine default feedback if necessary.
        if (!result.response) {
            if (!lesson.feedback && !result.noanswer && !(lesson.review && !result.correctanswer && !result.isessayquestion)) {
                // These conditions have been met:
                //  1. The lesson manager has not supplied feedback to the student.
                //  2. Not displaying default feedback.
                //  3. The user did provide an answer.
                //  4. We are not reviewing with an incorrect answer (and not reviewing an essay question).
                result.nodefaultresponse = true;
            } else if (result.isessayquestion) {
                result.response = Translate.instant('addon.mod_lesson.defaultessayresponse');
            } else if (result.correctanswer) {
                result.response = Translate.instant('addon.mod_lesson.thatsthecorrectanswer');
            } else {
                result.response = Translate.instant('addon.mod_lesson.thatsthewronganswer');
            }
        }

        if (!result.response) {
            return result;
        }

        if (lesson.review && !result.correctanswer && !result.isessayquestion) {
            // Calculate the number of question attempt in the page if it isn't calculated already.
            if (nAttempts === undefined) {
                const result = await this.getQuestionsAttempts(lesson.id, retake, {
                    cmId: lesson.coursemodule,
                    pageId: pageData.page.id,
                    siteId,
                });

                nAttempts = result.online.length + result.offline.length;
            }

            const messageId = nAttempts == 1 ? 'firstwrong' : 'secondpluswrong';

            result.feedback = '<div class="box feedback">' + Translate.instant('addon.mod_lesson.' + messageId) + '</div>';
        } else {
            result.feedback = '';
        }

        let className = 'response';
        if (result.correctanswer) {
            className += ' correct';
        } else if (!result.isessayquestion) {
            className += ' incorrect';
        }

        result.feedback += '<div class="box generalbox boxaligncenter p-y-1">' + pageData.page.contents + '</div>';
        result.feedback += '<div class="correctanswer generalbox"><em>' +
            Translate.instant('addon.mod_lesson.youranswer') + '</em> : ' +
            '<div class="studentanswer m-t-2 m-b-2"><table class="generaltable"><tbody>';

        // Create a table containing the answers and responses.
        if (pageData.page.qoption) {
            // Multianswer allowed.
            const studentAnswerArray = result.studentanswer ?
                result.studentanswer.split(AddonModLessonProvider.MULTIANSWER_DELIMITER) : [];
            const responseArray = result.response ? result.response.split(AddonModLessonProvider.MULTIANSWER_DELIMITER) : [];

            // Add answers and responses to the table.
            for (let i = 0; i < studentAnswerArray.length; i++) {
                result.feedback = this.addAnswerAndResponseToFeedback(
                    result.feedback,
                    studentAnswerArray[i],
                    result.studentanswerformat || 1,
                    responseArray[i],
                    className,
                );
            }
        } else {
            // Only 1 answer, add it to the table.
            result.feedback = this.addAnswerAndResponseToFeedback(
                result.feedback,
                CoreUtils.formatFloat(result.studentanswer),
                result.studentanswerformat || 1,
                result.response,
                className,
            );
        }

        result.feedback += '</tbody></table></div></div>';

        return result;
    }

    /**
     * Remove a password stored in DB.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when removed.
     */
    async removeStoredPassword(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(PASSWORD_TABLE_NAME, { lessonid: lessonId });
    }

    /**
     * Store a password in DB.
     *
     * @param lessonId Lesson ID.
     * @param password Password to store.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when stored.
     */
    async storePassword(lessonId: number, password: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonModLessonPasswordDBRecord = {
            lessonid: lessonId,
            password: password,
            timemodified: Date.now(),
        };

        await site.getDb().insertRecord(PASSWORD_TABLE_NAME, entry);
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
     * @returns Next page ID.
     */
    validPageAndView(
        pages: Record<number, AddonModLessonPageWSData>,
        page: AddonModLessonPageWSData,
        validPages: Record<number, number>,
        viewedPagesIds: number[],
    ): number {

        if (page.qtype !== AddonModLessonPageSubtype.ENDOFCLUSTER &&
                page.qtype !== AddonModLessonPageSubtype.ENDOFBRANCH) {
            // Add this page as a valid page.
            validPages[page.id] = 1;
        }

        if (page.qtype === AddonModLessonPageSubtype.CLUSTER) {
            // Get list of pages in the cluster.
            const subPages = this.getSubpagesOf(pages, page.id, [AddonModLessonPageSubtype.ENDOFCLUSTER]);

            subPages.forEach((subPage) => {
                const position = viewedPagesIds.indexOf(subPage.id);
                if (position == -1) {
                    return;
                }

                delete viewedPagesIds[position]; // Remove it.

                // Since the user did see one page in the cluster, add the cluster pageid to the viewedPagesIds.
                if (viewedPagesIds.indexOf(page.id) == -1) {
                    viewedPagesIds.push(page.id);
                }
            });
        }

        return page.nextpageid;
    }

}

export const AddonModLesson = makeSingleton(AddonModLessonProvider);

/**
 * Result of check answer.
 */
export type AddonModLessonCheckAnswerResult = {
    answerid: number;
    noanswer: boolean;
    correctanswer: boolean;
    isessayquestion: boolean;
    response: string;
    newpageid: number;
    studentanswer: string;
    userresponse: unknown;
    feedback?: string;
    nodefaultresponse?: boolean;
    inmediatejump?: boolean;
    studentanswerformat?: CoreTextFormat;
    useranswer?: unknown;
};

/**
 * Result of record attempt.
 */
export type AddonModLessonRecordAttemptResult = AddonModLessonCheckAnswerResult & {
    attemptsremaining?: number;
    maxattemptsreached?: boolean;
};

/**
 * Result of lesson grade.
 */
export type AddonModLessonGrade = {
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
};

/**
 * Common options including a group ID.
 */
export type AddonModLessonGroupOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // The group to get. If not defined, all participants.
};

/**
 * Common options including a group ID.
 */
export type AddonModLessonUserOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User ID. If not defined, site's current user.
};

/**
 * Common options including a password.
 */
export type AddonModLessonPasswordOptions = CoreCourseCommonModWSOptions & {
    password?: string; // Lesson password (if any).
};

/**
 * Common options including password and review.
 */
export type AddonModLessonPwdReviewOptions = AddonModLessonPasswordOptions & {
    review?: boolean; // If the user wants to review just after finishing (1 hour margin).
};

/**
 * Options to pass to get lesson with password.
 */
export type AddonModLessonGetWithPasswordOptions = AddonModLessonPasswordOptions & {
    validatePassword?: boolean; // Defauls to true. If true, the function will fail if the password is wrong.
};

/**
 * Options to pass to calculateProgress.
 */
export type AddonModLessonCalculateProgressBasicOptions = {
    password?: string; // Lesson password (if any).
    review?: boolean; // If the user wants to review just after finishing (1 hour margin).
    pageIndex?: Record<number, AddonModLessonPageWSData>; // Page index. If not provided, it will be calculated.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to calculateProgress.
 */
export type AddonModLessonCalculateProgressOptions = AddonModLessonCalculateProgressBasicOptions & {
    cmId?: number; // Module ID.
};

/**
 * Options to pass to lessonGrade.
 */
export type AddonModLessonGradeOptions = AddonModLessonCalculateProgressBasicOptions & {
    userId?: number; // User ID. If not defined, site's user.
};

/**
 * Options to pass to calculateOfflineData.
 */
export type AddonModLessonCalculateOfflineDataOptions = AddonModLessonCalculateProgressBasicOptions & {
    accessInfo?: AddonModLessonGetAccessInformationWSResponse; // Access info.
};

/**
 * Options to pass to get page data.
 */
export type AddonModLessonGetPageDataOptions = AddonModLessonPwdReviewOptions & {
    includeContents?: boolean; // Include the page rendered contents.
    includeOfflineData?: boolean; // Whether to include calculated offline data. Only when ignoring cache.
    accessInfo?: AddonModLessonGetAccessInformationWSResponse; // Access info. Required if includeOfflineData is true.
    jumps?: AddonModLessonPossibleJumps; // Possible jumps. Required if includeOfflineData is true.
};

/**
 * Options to pass to get page data.
 */
export type AddonModLessonGetPageViewMessagesOptions = {
    password?: string; // Lesson password (if any).
    review?: boolean; // If the user wants to review just after finishing (1 hour margin).
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to get questions attempts.
 */
export type AddonModLessonGetQuestionsAttemptsOptions = CoreCourseCommonModWSOptions & {
    correct?: boolean; // True to only fetch correct attempts, false to get them all.
    pageId?: number; // If defined, only get attempts on this page.
    userId?: number; // User ID. If not defined, site's user.
};

/**
 * Options to pass to getPagesIdsWithQuestionAttempts.
 */
export type AddonModLessonGetPagesIdsWithAttemptsOptions = CoreCourseCommonModWSOptions & {
    correct?: boolean; // True to only fetch correct attempts, false to get them all.
    userId?: number; // User ID. If not defined, site's user.
};

/**
 * Options to pass to processPageOnline.
 */
export type AddonModLessonProcessPageOnlineOptions = {
    password?: string; // Lesson password (if any).
    review?: boolean; // If the user wants to review just after finishing (1 hour margin).
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to processPage.
 */
export type AddonModLessonProcessPageOptions = AddonModLessonProcessPageOnlineOptions & {
    offline?: boolean; // Whether it's offline mode.
    accessInfo?: AddonModLessonGetAccessInformationWSResponse; // Access info. Required if offline is true.
    jumps?: AddonModLessonPossibleJumps; // Possible jumps. Required if offline is true.
};

/**
 * Options to pass to finishRetakeOnline.
 */
export type AddonModLessonFinishRetakeOnlineOptions = {
    password?: string; // Lesson password (if any).
    outOfTime?: boolean; // Whether the user ran out of time.
    review?: boolean; // If the user wants to review just after finishing (1 hour margin).
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to finishRetake.
 */
export type AddonModLessonFinishRetakeOptions = AddonModLessonFinishRetakeOnlineOptions & {
    offline?: boolean; // Whether it's offline mode.
    accessInfo?: AddonModLessonGetAccessInformationWSResponse; // Access info. Required if offline is true.
};

/**
 * Params of mod_lesson_get_lesson_access_information WS.
 */
export type AddonModLessonGetAccessInformationWSParams = {
    lessonid: number; // Lesson instance id.
};

/**
 * Data returned by mod_lesson_get_lesson_access_information WS.
 */
export type AddonModLessonGetAccessInformationWSResponse = {
    canmanage: boolean; // Whether the user can manage the lesson or not.
    cangrade: boolean; // Whether the user can grade the lesson or not.
    canviewreports: boolean; // Whether the user can view the lesson reports or not.
    reviewmode: boolean; // Whether the lesson is in review mode for the current user.
    attemptscount: number; // The number of attempts done by the user.
    lastpageseen: number; // The last page seen id.
    leftduringtimedsession: boolean; // Whether the user left during a timed session.
    firstpageid: number; // The lesson first page id.
    preventaccessreasons: AddonModLessonPreventAccessReason[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Prevent access reason returned by mod_lesson_get_lesson_access_information.
 */
export type AddonModLessonPreventAccessReason = {
    reason: string; // Reason lang string code.
    data: string; // Additional data.
    message: string; // Complete html message.
};

/**
 * Params of mod_lesson_get_content_pages_viewed WS.
 */
export type AddonModLessonGetContentPagesViewedWSParams = {
    lessonid: number; // Lesson instance id.
    lessonattempt: number; // Lesson attempt number.
    userid?: number; // The user id (empty for current user).
};

/**
 * Data returned by mod_lesson_get_content_pages_viewed WS.
 */
export type AddonModLessonGetContentPagesViewedWSResponse = {
    pages: AddonModLessonWSContentPageViewed[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Page data returned in mod_lesson_get_content_pages_viewed WS.
 */
export type AddonModLessonWSContentPageViewed = {
    id: number; // The attempt id.
    lessonid: number; // The lesson id.
    pageid: number; // The page id.
    userid: number; // The user who viewed the page.
    retry: number; // The lesson attempt number.
    flag: number; // 1 if the next page was calculated randomly.
    timeseen: number; // The time the page was seen.
    nextpageid: number; // The next page chosen id.
};

/**
 * Params of mod_lesson_get_lessons_by_courses WS.
 */
export type AddonModLessonGetLessonsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_lesson_get_lessons_by_courses WS.
 */
export type AddonModLessonGetLessonsByCoursesWSResponse = {
    lessons: AddonModLessonLessonWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Lesson data returned by WS.
 */
export type AddonModLessonLessonWSData = {
    id: number; // Standard Moodle primary key.
    course: number; // Foreign key reference to the course this lesson is part of.
    coursemodule: number; // Course module id.
    name: string; // Lesson name.
    intro?: string; // Lesson introduction text.
    introformat?: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    lang: string; // Forced activity language.
    practice?: boolean; // Practice lesson?.
    modattempts?: boolean; // Allow student review?.
    usepassword?: boolean; // Password protected lesson?.
    password?: string; // Password.
    dependency?: number; // Dependent on (another lesson id).
    conditions?: string; // Conditions to enable the lesson.
    grade?: number; // The total that the grade is scaled to be out of.
    custom?: boolean; // Custom scoring?.
    ongoing?: boolean; // Display ongoing score?.
    usemaxgrade?: number; // How to calculate the final grade.
    maxanswers?: number; // Maximum answers per page.
    maxattempts?: number; // Maximum attempts.
    review?: boolean; // Provide option to try a question again.
    nextpagedefault?: number; // Action for a correct answer.
    feedback?: boolean; // Display default feedback.
    minquestions?: number; // Minimum number of questions.
    maxpages?: number; // Number of pages to show.
    timelimit?: number; // Time limit.
    retake?: boolean; // Re-takes allowed.
    activitylink?: number; // Id of the next activity to be linked once the lesson is completed.
    mediafile?: string; // Local file path or full external URL.
    mediaheight?: number; // Popup for media file height.
    mediawidth?: number; // Popup for media with.
    mediaclose?: number; // Display a close button in the popup?.
    slideshow?: boolean; // Display lesson as slideshow.
    width?: number; // Slideshow width.
    height?: number; // Slideshow height.
    bgcolor?: string; // Slideshow bgcolor.
    displayleft?: boolean; // Display left pages menu?.
    displayleftif?: number; // Minimum grade to display menu.
    progressbar?: boolean; // Display progress bar?.
    available?: number; // Available from.
    deadline?: number; // Available until.
    timemodified?: number; // Last time settings were updated.
    completionendreached?: number; // Require end reached for completion?.
    completiontimespent?: number; // Student must do this activity at least for.
    allowofflineattempts: boolean; // Whether to allow the lesson to be attempted offline in the mobile app.
    introfiles?: CoreWSExternalFile[]; // Introfiles.
    mediafiles?: CoreWSExternalFile[]; // Mediafiles.
};

/**
 * Params of mod_lesson_get_lesson WS.
 */
export type AddonModLessonGetLessonWSParams = {
    lessonid: number; // Lesson instance id.
    password?: string; // Lesson password.
};

/**
 * Data returned by mod_lesson_get_lesson WS.
 */
export type AddonModLessonGetLessonWSResponse = {
    lesson: AddonModLessonLessonWSData;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_lesson_get_page_data WS.
 */
export type AddonModLessonGetPageDataWSParams = {
    lessonid: number; // Lesson instance id.
    pageid: number; // The page id.
    password?: string; // Optional password (the lesson may be protected).
    review?: boolean; // If we want to review just after finishing (1 hour margin).
    returncontents?: boolean; // If we must return the complete page contents once rendered.
};

/**
 * Data returned by mod_lesson_get_page_data WS.
 */
export type AddonModLessonGetPageDataWSResponse = {
    page?: AddonModLessonPageWSData; // Page fields.
    newpageid: number; // New page id (if a jump was made).
    pagecontent?: string; // Page html content.
    ongoingscore: string; // The ongoing score message.
    progress: number; // Progress percentage in the lesson.
    contentfiles: CoreWSExternalFile[];
    answers: AddonModLessonPageAnswerWSData[];
    messages: AddonModLessonMessageWSData[];
    displaymenu: boolean; // Whether we should display the menu or not in this page.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Page data returned by several WS.
 */
export type AddonModLessonPageWSData = {
    id: number; // The id of this lesson page.
    lessonid: number; // The id of the lesson this page belongs to.
    prevpageid: number; // The id of the page before this one.
    nextpageid: number; // The id of the next page in the page sequence.
    qtype: AddonModLessonPageSubtype; // Identifies the page type of this page.
    qoption: number; // Used to record page type specific options.
    layout: number; // Used to record page specific layout selections.
    display: number; // Used to record page specific display selections.
    timecreated: number; // Timestamp for when the page was created.
    timemodified: number; // Timestamp for when the page was last modified.
    title?: string; // The title of this page.
    contents?: string; // The contents of this page.
    contentsformat?: CoreTextFormat; // Contents format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    displayinmenublock: boolean; // Toggles display in the left menu block.
    type: AddonModLessonPageType; // The type of the page [question | structure].
    typeid: number; // The unique identifier for the page type.
    typestring: string; // The string that describes this page type.
};

/**
 * Page answer data returned by mod_lesson_get_page_data.
 */
export type AddonModLessonPageAnswerWSData = {
    id: number; // The ID of this answer in the database.
    answerfiles: CoreWSExternalFile[];
    responsefiles: CoreWSExternalFile[];
    jumpto?: number; // Identifies where the user goes upon completing a page with this answer.
    grade?: number; // The grade this answer is worth.
    score?: number; // The score this answer will give.
    flags?: number; // Used to store options for the answer.
    timecreated?: number; // A timestamp of when the answer was created.
    timemodified?: number; // A timestamp of when the answer was modified.
    answer?: string; // Possible answer text.
    answerformat?: CoreTextFormat; // Answer format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    response?: string; // Response text for the answer.
    responseformat?: CoreTextFormat; // Response format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
};

/**
 * Page answer data with some calculated data.
 */
export type AddonModLessonPageAnswerData = AddonModLessonPageAnswerWSData & {
    pageid: number;
};

/**
 * Message data returned by several WS.
 */
export type AddonModLessonMessageWSData = {
    message: string; // Message.
    type: string; // Message type: usually a CSS identifier like: success, info, warning, error, ...
};

/**
 * Params of mod_lesson_get_pages WS.
 */
export type AddonModLessonGetPagesWSParams = {
    lessonid: number; // Lesson instance id.
    password?: string; // Optional password (the lesson may be protected).
};

/**
 * Data returned by mod_lesson_get_pages WS.
 */
export type AddonModLessonGetPagesWSResponse = {
    pages: AddonModLessonGetPagesPageWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data for each page returned by mod_lesson_get_pages WS.
 */
export type AddonModLessonGetPagesPageWSData = {
    page: AddonModLessonPageWSData; // Page fields.
    answerids: number[]; // List of answers ids (empty for content pages in Moodle 1.9).
    jumps: number[]; // List of possible page jumps.
    filescount: number; // The total number of files attached to the page.
    filessizetotal: number; // The total size of the files.
};

/**
 * Params of mod_lesson_get_pages_possible_jumps WS.
 */
export type AddonModLessonGetPagesPossibleJumpsWSParams = {
    lessonid: number; // Lesson instance id.
};

/**
 * Data returned by mod_lesson_get_pages_possible_jumps WS.
 */
export type AddonModLessonGetPagesPossibleJumpsWSResponse = {
    jumps: AddonModLessonPossibleJumpWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data for each jump returned by mod_lesson_get_pages_possible_jumps WS.
 */
export type AddonModLessonPossibleJumpWSData = {
    pageid: number; // The page id.
    answerid: number; // The answer id.
    jumpto: number; // The jump (page id or type of jump).
    calculatedjump: number; // The real page id (or EOL) to jump.
};

/**
 * Lesson possible jumps, indexed by page and jumpto.
 */
export type AddonModLessonPossibleJumps = Record<number, Record<number, AddonModLessonPossibleJumpWSData>>;

/**
 * Params of mod_lesson_get_questions_attempts WS.
 */
export type AddonModLessonGetQuestionsAttemptsWSParams = {
    lessonid: number; // Lesson instance id.
    attempt: number; // Lesson attempt number.
    correct?: boolean; // Only fetch correct attempts.
    pageid?: number; // Only fetch attempts at the given page.
    userid?: number; // Only fetch attempts of the given user.
};

/**
 * Data returned by mod_lesson_get_questions_attempts WS.
 */
export type AddonModLessonGetQuestionsAttemptsWSResponse = {
    attempts: AddonModLessonQuestionAttemptWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data for each attempt returned by mod_lesson_get_questions_attempts WS.
 */
export type AddonModLessonQuestionAttemptWSData = {
    id: number; // The attempt id.
    lessonid: number; // The attempt lessonid.
    pageid: number; // The attempt pageid.
    userid: number; // The user who did the attempt.
    answerid: number; // The attempt answerid.
    retry: number; // The lesson attempt number.
    correct: number; // If it was the correct answer.
    useranswer: string; // The complete user answer.
    timeseen: number; // The time the question was seen.
};

/**
 * Params of mod_lesson_get_attempts_overview WS.
 */
export type AddonModLessonGetAttemptsOverviewWSParams = {
    lessonid: number; // Lesson instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
};

/**
 * Data returned by mod_lesson_get_attempts_overview WS.
 */
export type AddonModLessonGetAttemptsOverviewWSResponse = {
    data?: AddonModLessonAttemptsOverviewWSData; // Attempts overview data (empty for no attemps).
    warnings?: CoreWSExternalWarning[];
};

/**
 * Overview data returned by mod_lesson_get_attempts_overview WS.
 */
export type AddonModLessonAttemptsOverviewWSData = {
    lessonscored: boolean; // True if the lesson was scored.
    numofattempts: number; // Number of attempts.
    avescore: number | null; // Average score.
    highscore: number | null; // High score.
    lowscore: number | null; // Low score.
    avetime: number | null; // Average time (spent in taking the lesson).
    hightime: number | null; // High time.
    lowtime: number | null; // Low time.
    students?: AddonModLessonAttemptsOverviewsStudentWSData[]; // Students data, including attempts.
};

/**
 * Student data returned by mod_lesson_get_attempts_overview WS.
 */
export type AddonModLessonAttemptsOverviewsStudentWSData = {
    id: number; // User id.
    fullname: string; // User full name.
    bestgrade: number; // Best grade.
    attempts: AddonModLessonAttemptsOverviewsAttemptWSData[];
};

/**
 * Attempt data returned by mod_lesson_get_attempts_overview WS.
 */
export type AddonModLessonAttemptsOverviewsAttemptWSData = {
    try: number; // Attempt number.
    grade: number | null; // Attempt grade.
    timestart: number; // Attempt time started.
    timeend: number; // Attempt last time continued.
    end: number; // Attempt time ended.
};

/**
 * Params of mod_lesson_get_user_timers WS.
 */
export type AddonModLessonGetUserTimersWSParams = {
    lessonid: number; // Lesson instance id.
    userid?: number; // The user id (empty for current user).
};

/**
 * Data returned by mod_lesson_get_user_timers WS.
 */
export type AddonModLessonGetUserTimersWSResponse = {
    timers: AddonModLessonUserTimerWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data for each timer returned by mod_lesson_get_user_timers WS.
 */
export type AddonModLessonUserTimerWSData = {
    id: number; // The attempt id.
    lessonid: number; // The lesson id.
    userid: number; // The user id.
    starttime: number; // First access time for a new timer session.
    lessontime: number; // Last access time to the lesson during the timer session.
    completed: number; // If the lesson for this timer was completed.
    timemodifiedoffline: number; // Last modified time via webservices.
};

/**
 * Params of mod_lesson_get_user_attempt WS.
 */
export type AddonModLessonGetUserAttemptWSParams = {
    lessonid: number; // Lesson instance id.
    userid: number; // The user id. 0 for current user.
    lessonattempt: number; // The attempt number.
};

/**
 * Data returned by mod_lesson_get_user_attempt WS.
 */
export type AddonModLessonGetUserAttemptWSResponse = {
    answerpages: AddonModLessonUserAttemptAnswerPageWSData[];
    userstats: {
        grade: number; // Attempt final grade.
        completed: number; // Time completed.
        timetotake: number; // Time taken.
        gradeinfo?: AddonModLessonAttemptGradeWSData; // Attempt grade.
    };
    warnings?: CoreWSExternalWarning[];
};

/**
 * Answer page data returned by mod_lesson_get_user_attempt.
 */
export type AddonModLessonUserAttemptAnswerPageWSData = {
    page?: AddonModLessonPageWSData; // Page fields.
    title: string; // Page title.
    contents: string; // Page contents.
    qtype: string; // Identifies the page type of this page.
    grayout: number; // If is required to apply a grayout.
    answerdata?: AddonModLessonUserAttemptAnswerData; // Answer data (empty in content pages created in Moodle 1.x).
};

/**
 * Answer data of a user attempt answer page.
 */
export type AddonModLessonUserAttemptAnswerData = {
    score: string; // The score (text version).
    response: string; // The response text.
    responseformat: CoreTextFormat; // Response. format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    answers?: string[][]; // User answers.
};

/**
 * Attempt grade returned by several WS.
 */
export type AddonModLessonAttemptGradeWSData = {
    nquestions: number; // Number of questions answered.
    attempts: number; // Number of question attempts.
    total: number; // Max points possible.
    earned: number; // Points earned by student.
    grade: number; // Calculated percentage grade.
    nmanual: number; // Number of manually graded questions.
    manualpoints: number; // Point value for manually graded questions.
};

/**
 * Params of mod_lesson_finish_attempt WS.
 */
export type AddonModLessonFinishAttemptWSParams = {
    lessonid: number; // Lesson instance id.
    password?: string; // Optional password (the lesson may be protected).
    outoftime?: boolean; // If the user run out of time.
    review?: boolean; // If we want to review just after finishing (1 hour margin).
};

/**
 * Data returned by mod_lesson_finish_attempt WS.
 */
export type AddonModLessonFinishAttemptWSResponse = {
    data: AddonModLessonEOLPageWSDataEntry[]; // The EOL page information data.
    messages: AddonModLessonMessageWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * EOL page data entry returned by mod_lesson_finish_attempt WS.
 */
export type AddonModLessonEOLPageWSDataEntry = {
    name: string; // Data name.
    value: string; // Data value.
    message: string; // Data message (translated string).
};

/**
 * Finish retake response.
 */
export type AddonModLessonFinishRetakeResponse = Omit<AddonModLessonFinishAttemptWSResponse, 'data'> & {
    data: Record<string, AddonModLessonEOLPageDataEntry>;
};

/**
 * Parsed EOL page data.
 */
export type AddonModLessonEOLPageDataEntry = {
    name: string; // Data name.
    value: unknown; // Data value.
    message: string; // Data message (translated string).
};

/**
 * Params of mod_lesson_view_lesson WS.
 */
export type AddonModLessonViewLessonWSParams = {
    lessonid: number; // Lesson instance id.
    password?: string; // Lesson password.
};

/**
 * Params of mod_lesson_process_page WS.
 */
export type AddonModLessonProcessPageWSParams = {
    lessonid: number; // Lesson instance id.
    pageid: number; // The page id.
    data: ProcessPageData[]; // The data to be saved.
    password?: string; // Optional password (the lesson may be protected).
    review?: boolean; // If we want to review just after finishing (1 hour margin).
};

type ProcessPageData = {
    name: string; // Data name.
    value: string; // Data value.
};

/**
 * Data returned by mod_lesson_process_page WS.
 */
export type AddonModLessonProcessPageWSResponse = {
    newpageid: number; // New page id (if a jump was made).
    inmediatejump: boolean; // Whether the page processing redirect directly to anoter page.
    nodefaultresponse: boolean; // Whether there is not a default response.
    feedback: string; // The response feedback.
    attemptsremaining: number | null; // Number of attempts remaining.
    correctanswer: boolean; // Whether the answer is correct.
    noanswer: boolean; // Whether there aren't answers.
    isessayquestion: boolean; // Whether is a essay question.
    maxattemptsreached: boolean; // Whether we reachered the max number of attempts.
    response: string; // The response.
    studentanswer: string; // The student answer.
    userresponse: string; // The user response.
    reviewmode: boolean; // Whether the user is reviewing.
    ongoingscore: string; // The ongoing message.
    progress: number | null; // Progress percentage in the lesson.
    displaymenu: boolean; // Whether we should display the menu or not in this page.
    messages: AddonModLessonMessageWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of process page.
 */
export type AddonModLessonProcessPageResponse = AddonModLessonProcessPageWSResponse & {
    sent?: boolean; // Whether the data was sent to server.
};

/**
 * Params of mod_lesson_launch_attempt WS.
 */
export type AddonModLessonLaunchAttemptWSParams = {
    lessonid: number; // Lesson instance id.
    password?: string; // Optional password (the lesson may be protected).
    pageid?: number; // Page id to continue from (only when continuing an attempt).
    review?: boolean; // If we want to review just after finishing.
};

/**
 * Data returned by mod_lesson_launch_attempt WS.
 */
export type AddonModLessonLaunchAttemptWSResponse = {
    messages: AddonModLessonMessageWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempt data, either online or offline attempt.
 */
export type AddonModLessonAnyAttemptData = AddonModLessonQuestionAttemptWSData | AddonModLessonPageAttemptRecord;

/**
 * Either content page data or page attempt offline record.
 */
export type AddonModLessonContentPageOrRecord = AddonModLessonWSContentPageViewed | AddonModLessonPageAttemptRecord;

/**
 * Data passed to DATA_SENT_EVENT event.
 */
export type AddonModLessonDataSentData = {
    lessonId: number;
    type: string;
    courseId?: number;
    outOfTime?: boolean;
    review?: boolean;
    pageId?: number;
};
