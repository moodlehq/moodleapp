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

angular.module('mm.addons.mod_lesson')

.constant('mmaModLessonPasswordStore', 'mma_mod_lesson_password')

.config(function($mmSitesFactoryProvider, mmaModLessonPasswordStore) {
    var stores = [
        {
            name: mmaModLessonPasswordStore,
            keyPath: 'id',
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Lesson service.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLesson
 * @description
 * Lesson terminology is a bit confusing and ambiguous in Moodle. For that reason, in the app it has been decided to use
 * the following terminology:
 *     - Retake: An attempt in a lesson. In Moodle it's sometimes called "attempt", "try" or "retry".
 *     - Attempt: An attempt in a page inside a retake. In the app, this includes content pages.
 *     - Content page: A page with only content (no question). In Moodle it's sometimes called "branch table".
 *     - Page answers: List of possible answers for a page (configured by the teacher). NOT the student answer for the page.
 *
 * This terminology sometimes won't match with WebServices names, params or responses.
 */
.factory('$mmaModLesson', function($log, $mmSitesManager, $q, $mmUtil, mmaModLessonPasswordStore, $mmLang, $mmaModLessonOffline,
            $translate, $mmSite, mmCoreGradeTypeNone, mmaModLessonTypeQuestion, mmaModLessonTypeStructure, $mmText) {

    $log = $log.getInstance('$mmaModLesson');

    var self = {};

    // This page.
    self.LESSON_THISPAGE = 0;
    // Next page -> any page not seen before.
    self.LESSON_UNSEENPAGE = 1;
    // Next page -> any page not answered correctly.
    self.LESSON_UNANSWEREDPAGE = 2;
    // Jump to Next Page.
    self.LESSON_NEXTPAGE = -1;
    // End of Lesson.
    self.LESSON_EOL = -9;
    // Jump to an unseen page within a branch and end of branch or end of lesson.
    self.LESSON_UNSEENBRANCHPAGE = -50;
    // Jump to a random page within a branch and end of branch or end of lesson.
    self.LESSON_RANDOMPAGE = -60;
    // Jump to a random Branch.
    self.LESSON_RANDOMBRANCH = -70;
    // Cluster Jump.
    self.LESSON_CLUSTERJUMP = -80;

    self.LESSON_PAGE_SHORTANSWER =  1;
    self.LESSON_PAGE_TRUEFALSE =    2;
    self.LESSON_PAGE_MULTICHOICE =  3;
    self.LESSON_PAGE_MATCHING =     5;
    self.LESSON_PAGE_NUMERICAL =    8;
    self.LESSON_PAGE_ESSAY =        10;
    self.LESSON_PAGE_BRANCHTABLE =  20; // Content page.
    self.LESSON_PAGE_ENDOFBRANCH =  21;
    self.LESSON_PAGE_CLUSTER =      30;
    self.LESSON_PAGE_ENDOFCLUSTER = 31;

    /**
     * Add a message to a list of messages, following the format of the messages returned by WS.
     *
     * @param {String[]} messages     List of messages where to add the message.
     * @param {String} stringName     The ID of the message to be translated. E.g. 'mma.mod_lesson.numberofpagesviewednotice'.
     * @param {Object} [stringParams] The params of the message (if any).
     */
    function addMessage(messages, stringName, stringParams) {
        messages.push({
            message: $translate.instant(stringName, stringParams)
        });
    }

    /**
     * Check if an answer page (from getUserRetake) is a content page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#answerPageIsContent
     * @param  {Object} page Answer page.
     * @return {Boolean}     True if content page.
     */
    self.answerPageIsContent = function(page) {
        // The page doesn't have any reliable field to use for checking this. Check qtype first (translated string).
        if (page.qtype == $translate.instant('mma.mod_lesson.branchtable')) {
            return true;
        }

        // qtype doesn't match, but that doesn't mean it's not a content page, maybe the language is different.
        // Check it's not a question page.
        if (page.answerdata && !self.answerPageIsQuestion(page)) {
            // It isn't a question page, but it can be an end of branch, etc. Check if the first answer has a button.
            // Check if the first answer has a button.
            if (page.answerdata.answers && page.answerdata.answers[0]) {
                var rootElement = document.createElement('div');
                rootElement.innerHTML = page.answerdata.answers[0][0];

                return !!rootElement.querySelector('input[type="button"]');
            }
        }

        return false;
    };

    /**
     * Check if an answer page (from getUserRetake) is a question page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#answerPageIsQuestion
     * @param  {Object} page Answer page.
     * @return {Boolean}     True if question page.
     */
    self.answerPageIsQuestion = function(page) {
        if (!page.answerdata) {
            return false;
        }

        if (page.answerdata.score) {
            // Only question pages have a score.
            return true;
        }

        if (page.answerdata.answers) {
            for (var i = 0; i < page.answerdata.answers.length; i++) {
                var answer = page.answerdata.answers[i];
                if (answer[1]) {
                    // Only question pages have a statistic.
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Calculate some offline data like progress and ongoingscore.
     *
     * @param  {Object} lesson      Lesson.
     * @param  {Object} accessInfo  Result of get access info.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} [pageIndex] Object containing all the pages indexed by ID. If not defined, it will be calculated.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the calculated data.
     */
    function calculateOfflineData(lesson, accessInfo, password, review, pageIndex, siteId) {
        accessInfo = accessInfo || {};

        var reviewMode = review || accessInfo.reviewmode,
            ongoingMessage = '',
            progress,
            promises = [];

        if (!accessInfo.canmanage) {
            if (lesson.ongoing && !reviewMode) {
                promises.push(self.getOngoingScoreMessage(lesson, accessInfo, password, review, pageIndex, siteId)
                        .then(function(message) {
                    ongoingMessage = message;
                }));
            }
            if (lesson.progressbar) {
                promises.push(self.calculateProgress(lesson.id, accessInfo, password, review, pageIndex, siteId).then(function(p) {
                    progress = p;
                }));
            }
        }

        return $q.all(promises).then(function() {
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
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#calculateProgress
     * @param  {Number} lessonId    Lesson ID.
     * @param  {Object} accessInfo  Result of get access info.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} [pageIndex] Object containing all the pages indexed by ID. If not defined, it will be calculated.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with a number: the progress (scale 0-100).
     */
    self.calculateProgress = function(lessonId, accessInfo, password, review, pageIndex, siteId) {
        siteId = siteId || $mmSite.getId();

        // Check if the user is reviewing the attempt.
        if (review) {
            return 100;
        }

        var promise,
            retake = accessInfo.attemptscount,
            viewedPagesIds = [];

        if (pageIndex) {
            promise = $q.when();
        } else {
            promise = self.getPages(lessonId, password, true, false, siteId).then(function(pages) {
                pageIndex = createPagesIndex(pages);
            });
        }

        return promise.then(function() {
            // Get the list of question pages attempted.
            return self.getPagesIdsWithQuestionAttempts(lessonId, retake, false, siteId);
        }).then(function(ids) {
            viewedPagesIds = ids;

            // Get the list of viewed content pages.
            return self.getContentPagesViewedIds(lessonId, retake, siteId);
        }).then(function(viewedContentPagesIds) {
            var pageId = accessInfo.firstpageid,
                validPages = {};

            viewedPagesIds = $mmUtil.mergeArraysWithoutDuplicates(viewedPagesIds, viewedContentPagesIds);

            // Filter out the following pages:
            // - End of Cluster
            // - End of Branch
            // - Pages found inside of Clusters
            // Do not filter out Cluster Page(s) because we count a cluster as one.
            // By keeping the cluster page, we get our 1.
            while (pageId) {
                pageId = self.validPageAndView(pageIndex, pageIndex[pageId], validPages, viewedPagesIds);
            }

            // Progress calculation as a percent.
            return $mmUtil.roundToDecimals(viewedPagesIds.length / Object.keys(validPages).length, 2) * 100;
        });
    };

    /**
     * Check if the answer provided by the user is correct or not and return the result object.
     * This method is based on the check_answer implementation of all page types (Moodle).
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} jumps     Result of get pages possible jumps.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @return {Object}           Result.
     */
    function checkAnswer(lesson, pageData, data, jumps, pageIndex) {
        // Default result.
        var result = {
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
            case self.LESSON_PAGE_BRANCHTABLE:
                // Load the new page immediately.
                result.inmediatejump = true;
                result.newpageid = getNewPageId(pageData.page.id, data.jumpto, jumps);
                break;

            case self.LESSON_PAGE_ESSAY:
                checkAnswerEssay(pageData, data, result);
                break;

            case self.LESSON_PAGE_MATCHING:
                checkAnswerMatching(pageData, data, result);
                break;

            case self.LESSON_PAGE_MULTICHOICE:
                checkAnswerMultichoice(lesson, pageData, data, pageIndex, result);
                break;

            case self.LESSON_PAGE_NUMERICAL:
                checkAnswerNumerical(lesson, pageData, data, pageIndex, result);
                break;

            case self.LESSON_PAGE_SHORTANSWER:
                checkAnswerShort(lesson, pageData, data, pageIndex, result);
                break;

            case self.LESSON_PAGE_TRUEFALSE:
                checkAnswerTruefalse(lesson, pageData, data, pageIndex, result);
                break;
        }


        return result;
    }

    /**
     * Check an essay answer.
     *
     * @param  {Object} pageData Result of getPageData for the page to process.
     * @param  {Object} data     Data containing the user answer.
     * @param  {Object} result   Object where to store the result.
     * @return {Void}
     */
    function checkAnswerEssay(pageData, data, result) {
        var studentAnswer;

        result.isessayquestion = true;

        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;
            return result;
        }

        if (angular.isObject(data.answer)) {
            studentAnswer = data.answer.text;
        } else {
            studentAnswer = data.answer;
        }

        if (!studentAnswer || studentAnswer.trim() === '') {
            result.noanswer = true;
            return;
        }

        // Essay pages should only have 1 possible answer.
        angular.forEach(pageData.answers, function(answer) {
            result.answerid = answer.id;
            result.newpageid = answer.jumpto;
        });

        var userResponse = {
            sent: 0,
            graded: 0,
            score: 0,
            answer: studentAnswer,
            answerformat: 1,
            response: '',
            responseformat: 1
        };
        result.userresponse = userResponse;
        result.studentanswerformat = 1;
        result.studentanswer = studentAnswer;
    }

    /**
     * Check a matching answer.
     *
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} result    Object where to store the result.
     * @return {Void}
     */
    function checkAnswerMatching(pageData, data, result) {
        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;
            return;
        }

        var response = getResponse(),
            getAnswers = angular.copy(pageData.answers),
            correct = getAnswers.shift(),
            wrong = getAnswers.shift(),
            answers = {};

        angular.forEach(getAnswers, function(answer) {
            if (answer.answer !== '' || answer.response !== '') {
                answers[answer.id] = answer;
            }
        });

        // Get the user's exact responses for record keeping.
        var hits = 0,
            userResponse = [];
        result.studentanswer = '';
        result.studentanswerformat = 1;

        for (var id in response) {
            var value = response[id];
            if (!value) {
                result.noanswer = true;
                return;
            }

            value = $mmText.decodeHTML(value);
            userResponse.push(value);
            if (typeof answers[id] != 'undefined') {
                var answer = answers[id];
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

        // Get the user's response.
        function getResponse() {
            if (data.response) {
                // The data is already stored as expected. Return it.
                return data.response;
            }

            // Data is stored in properties like 'response[379]'. Recreate the response object.
            var response = {};
            for (var key in data) {
                var match = key.match(/^response\[(\d+)\]/);
                if (match && match.length > 1) {
                    response[match[1]] = data[key];
                }
            }
            return response;
        }
    }

    /**
     * Check a multichoice answer.
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @param  {Object} result    Object where to store the result.
     * @return {Void}
     */
    function checkAnswerMultichoice(lesson, pageData, data, pageIndex, result) {
        if (!data) {
            result.inmediatejump = true;
            result.newpageid = pageData.page.id;
            return;
        }

        var answers = getUsedAnswers();

        if (pageData.page.qoption) {
            // Multianswer allowed, user's answer is an array.
            var studentAnswers = getUserAnswersMulti();

            if (!studentAnswers || !angular.isArray(studentAnswers)) {
                result.noanswer = true;
                return;
            }

            // Get what the user answered.
            result.userresponse = studentAnswers.join(',');

            // Get the answers in a set order, the id order.
            var nCorrect = 0,
                nHits = 0,
                responses = [],
                correctAnswerId = 0,
                wrongAnswerId = 0,
                correctPageId,
                wrongPageId;

            // Store student's answers for displaying on feedback page.
            result.studentanswer = '';
            result.studentanswerformat = 1;
            angular.forEach(answers, function(answer) {
                for (var i in studentAnswers) {
                    var answerId = studentAnswers[i];
                    if (answerId == answer.id) {
                        result.studentanswer += '<br />' + answer.answer;
                        if ($mmText.cleanTags(answer.response).trim()) {
                            responses.push(answer.response);
                        }
                        break;
                    }
                }
            });

            // Iterate over all the possible answers.
            angular.forEach(answers, function(answer) {
                var correctAnswer = isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);

                // Iterate over all the student answers to check if he selected the current possible answer.
                angular.forEach(studentAnswers, function(answerId) {
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
                result.response = responses.join('<br />');
                result.newpageid = correctPageId;
                result.answerid = correctAnswerId;
            } else {
                result.correctanswer = false;
                result.response = responses.join('<br />');
                result.newpageid = wrongPageId;
                result.answerid = wrongAnswerId;
            }
        } else {
            // Only one answer allowed.
            if (typeof data.answerid == 'undefined' || (!data.answerid && !angular.isNumber(data.answerid))) {
                result.noanswer = true;
                return;
            }

            result.answerid = data.answerid;

            // Search the answer.
            for (var i in pageData.answers) {
                var answer = pageData.answers[i];
                if (answer.id == data.answerid) {
                    result.correctanswer = isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                    result.newpageid = answer.jumpto;
                    result.response = answer.response;
                    result.userresponse = result.studentanswer = answer.answer;
                    break;
                }
            }
        }

        // Get the list of used answers (with valid answer).
        function getUsedAnswers() {
            var answers = angular.copy(pageData.answers);
            return answers.filter(function(entry) {
                return entry.answer !== '';
            });
        }

        // Get the user's answer if multiple answers are allowed.
        function getUserAnswersMulti() {
            if (data.answer) {
                // The data is already stored as expected. If it's valid, parse the values to int.
                if (angular.isArray(data.answer)) {
                    return data.answer.map(function(value) {
                        return parseInt(value, 10);
                    });
                }
                return data.answer;
            }

            // Data is stored in properties like 'answer[379]'. Recreate the answer array.
            var answer = [];
            for (var key in data) {
                var match = key.match(/^answer\[(\d+)\]/);
                if (match && match.length > 1) {
                    answer.push(parseInt(match[1], 10));
                }
            }
            return answer;
        }
    }

    /**
     * Check a numerical answer.
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @param  {Object} result    Object where to store the result.
     * @return {Void}
     */
    function checkAnswerNumerical(lesson, pageData, data, pageIndex, result) {
        var parsedAnswer = parseFloat(data.answer);

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
        for (var i in pageData.answers) {
            var answer = pageData.answers[i],
                max, min;

            if (answer.answer && answer.answer.indexOf(':') != -1) {
                // There's a pair of values.
                var split = answer.answer.split(':');
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
                result.correctanswer = isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                result.answerid = answer.id;
                break;
            }
        }
    }

    /**
     * Check a short answer.
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @param  {Object} result    Object where to store the result.
     * @return {Void}
     */
    function checkAnswerShort(lesson, pageData, data, pageIndex, result) {
        var studentAnswer = data.answer && data.answer.trim ? data.answer.trim() : false;
        if (!studentAnswer) {
            result.noanswer = true;
            return;
        }

        // Search the answer in the list of possible answers.
        for (var i in pageData.answers) {
            var answer = pageData.answers[i],
                expectedAnswer = answer.answer,
                isMatch = false,
                markIt = false,
                useRegExp = pageData.page.qoption,
                ignoreCase;

            if (useRegExp) {
                ignoreCase = '';
                if (expectedAnswer.substr(-2) == '/i') {
                    expectedAnswer = expectedAnswer.substr(0, expectedAnswer.length - 2);
                    ignoreCase = 'i';
                }
            } else {
                expectedAnswer = expectedAnswer.replace('*', '#####');
                expectedAnswer = $mmText.escapeForRegex(expectedAnswer);
                expectedAnswer = expectedAnswer.replace('#####', '.*');
            }

            // See if user typed in any of the correct answers.
            if (isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex)) {
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
                    var startCode = expectedAnswer.substr(0, 2);
                    switch (startCode){
                        // 1- Check for absence of required string in studentAnswer (coded by initial '--').
                        case "--":
                            expectedAnswer = expectedAnswer.substr(2);
                            if (!studentAnswer.match(new RegExp('^' + expectedAnswer + '$', ignoreCase))) {
                                isMatch = true;
                            }
                            break;

                        // 2- Check for code for marking wrong strings (coded by initial '++').
                        case "++":
                            expectedAnswer = expectedAnswer.substr(2);
                            markIt = true;
                            // Check for one or several matches.
                            var matches = studentAnswer.match(new RegExp(expectedAnswer, 'g' + ignoreCase));
                            if (matches) {
                                isMatch   = true;
                                var nb = matches[0].length,
                                    original = [],
                                    marked = [];

                                for (var j = 0; j < nb; j++) {
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

        result.userresponse = studentAnswer;
        result.studentanswer = $mmText.s(studentAnswer); // Clean student answer as it goes to output.
    }

    /**
     * Check a truefalse answer.
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Object} pageData  Result of getPageData for the page to process.
     * @param  {Object} data      Data containing the user answer.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @param  {Object} result    Object where to store the result.
     * @return {Void}
     */
    function checkAnswerTruefalse(lesson, pageData, data, pageIndex, result) {
        if (!data.answerid) {
            result.noanswer = true;
            return;
        }

        result.answerid = data.answerid;

        // Get the answer.
        for (var i in pageData.answers) {
            var answer = pageData.answers[i];
            if (answer.id == data.answerid) {
                // Answer found.
                result.correctanswer = isAnswerCorrect(lesson, pageData.page.id, answer, pageIndex);
                result.newpageid = answer.jumpto;
                result.response  = answer.response;
                result.studentanswer = result.userresponse = answer.answer;
                break;
            }
        }
    }

    /**
     * Create a list of pages indexed by page ID based on a list of pages.
     *
     * @param  {Object[]} pageList Result of get pages.
     * @return {Object}            Pages index.
     */
    function createPagesIndex(pageList) {
        // Index the pages by page ID.
        var pages = {};
        angular.forEach(pageList, function(pageData) {
            pages[pageData.page.id] = pageData.page;
        });
        return pages;
    }

    /**
     * Finishes a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#finishRetake
     * @param  {Object} lesson       Lesson.
     * @param  {Number} courseId     Course ID the lesson belongs to.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [outOfTime] If the user ran out of time.
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [offline]   Whether it's offline mode.
     * @param  {Object} [accessInfo] Result of get access info. Required if offline is true.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved in success, rejected otherwise.
     */
    self.finishRetake = function(lesson, courseId, password, outOfTime, review, offline, accessInfo, siteId) {
        if (offline) {
            var retake = accessInfo.attemptscount;
            return $mmaModLessonOffline.finishRetake(lesson.id, courseId, retake, true, outOfTime, siteId).then(function() {
                // Get the lesson grade.
                return self.lessonGrade(lesson, retake, password, review, undefined, siteId).catch(function() {
                    // Ignore errors.
                    return {};
                });
            }).then(function(gradeInfo) {
                // Retake marked, now return the response. We won't return all the possible data.
                // This code is based in Moodle's process_eol_page.
                var gradeLesson = true,
                    result = {
                        data: {},
                        messages: [],
                        warnings: []
                    },
                    messageParams,
                    entryData,
                    promises = [];

                addResultValue(result, 'offline', true); // Mark the result as offline.
                addResultValue(result, 'gradeinfo', gradeInfo);

                if (lesson.custom && !accessInfo.canmanage) {
                    // Before we calculate the custom score make sure they answered the minimum
                    // number of questions. We only need to do this for custom scoring as we can
                    // not get the miniumum score the user should achieve. If we are not using
                    // custom scoring (so all questions are valued as 1) then we simply check if
                    // they answered more than the minimum questions, if not, we mark it out of the
                    // number specified in the minimum questions setting - which is done in lesson_grade().
                    // Get the number of answers given.
                    if (gradeInfo.nquestions < lesson.minquestions) {
                        gradeLesson = false;
                        messageParams = {
                            nquestions: gradeInfo.nquestions,
                            minquestions: lesson.minquestions
                        };
                        addMessage(messages, 'mma.mod_lesson.numberofpagesviewednotice', {$a: data});
                    }
                }

                if (!accessInfo.canmanage) {
                    if (gradeLesson) {
                        promises.push(self.calculateProgress(lesson.id, accessInfo, password, review, false, siteId)
                                    .then(function(progress) {
                            addResultValue(result, 'progresscompleted', progress);
                        }));

                        if (gradeInfo.attempts) {
                            // User has answered questions.
                            if (!lesson.custom) {
                                addResultValue(result, 'numberofpagesviewed', gradeInfo.nquestions, true);
                                if (lesson.minquestions) {
                                    if (gradeInfo.nquestions < lesson.minquestions) {
                                        addResultValue(result, 'youshouldview', lesson.minquestions, true);
                                    }
                                }
                                addResultValue(result, 'numberofcorrectanswers', gradeInfo.earned, true);
                            }

                            entryData = {
                                score: gradeInfo.earned,
                                grade: gradeInfo.total
                            };
                            if (gradeInfo.nmanual) {
                                entryData.tempmaxgrade = gradeInfo.total - gradeInfo.manualpoints;
                                entryData.essayquestions = gradeInfo.nmanual;
                                addResultValue(result, 'displayscorewithessays', entryData, true);
                            } else {
                                addResultValue(result, 'displayscorewithoutessays', entryData, true);
                            }

                            if (lesson.grade != mmCoreGradeTypeNone) {
                                entryData = {
                                    grade: $mmUtil.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                    total: lesson.grade
                                };
                                addResultValue(result, 'yourcurrentgradeisoutof', entryData, true);
                            }

                        } else {
                            // User hasn't answered any question, only content pages.
                            if (lesson.timelimit) {
                                if (outOfTime) {
                                    addResultValue(result, 'eolstudentoutoftimenoanswers', true, true);
                                }
                            } else {
                                addResultValue(result, 'welldone', true, true);
                            }
                        }
                    }
                } else {
                    // Display for teacher.
                    if (lesson.grade != mmCoreGradeTypeNone) {
                        addResultValue(result, 'displayofgrade', true, true);
                    }
                }

                if (lesson.modattempts && accessInfo.canmanage) {
                    addResultValue(result, 'modattemptsnoteacher', true, true);
                }

                if (gradeLesson) {
                    addResultValue(result, 'gradelesson', 1);
                }

                return result;
            });
        }

        return self.finishRetakeOnline(lesson.id, password, outOfTime, review, siteId);

        // Add a property to the offline result.
        function addResultValue(result, name, value, addMessage) {
            var message = '';
            if (addMessage) {
                var params = typeof value != 'boolean' ? {$a: value} : undefined;
                message = $translate.instant('mma.mod_lesson.' + name, params);
            }

            result.data[name] = {
                name: name,
                value: value,
                message: message
            };
        }
    };

    /**
     * Finishes a retake. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#finishRetakeOnline
     * @param  {Number} lessonId     Lesson ID.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [outOfTime] If the user ran out of time.
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved in success, rejected otherwise.
     */
    self.finishRetakeOnline = function(lessonId, password, outOfTime, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                outoftime: outOfTime ? 1 : 0,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_finish_attempt', params).then(function(response) {
                // Convert the data array into an object and decode the values.
                var map = {};
                angular.forEach(response.data, function(entry) {
                    if (entry.value && typeof entry.value == 'string' && entry.value !== '1') {
                        // It's a JSON encoded object. Try to decode it.
                        try {
                            entry.value = JSON.parse(entry.value);
                        } catch(ex) {
                            // Error decoding it, leave the value as it is.
                        }
                    }
                    map[entry.name] = entry;
                });
                response.data = map;
                return response;
            });
        });
    };

    /**
     * Given a page ID, a jumpto and all the possible jumps, calcualate the new page ID.
     *
     * @param  {Number} pageId Current page ID.
     * @param  {Number} jumpTo The jumpto.
     * @param  {Object} jumps  Result of get pages possible jumps.
     * @return {Number}        New page ID.
     */
    function getNewPageId(pageId, jumpTo, jumps) {
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
     * Get cache key for access information WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getAccessInformationCacheKey(lessonId) {
        return 'mmaModLesson:accessInfo:' + lessonId;
    }

    /**
     * Get the access information of a certain lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getAccessInformation
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the access information.
     */
    self.getAccessInformation = function(lessonId, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId
                },
                preSets = {
                    cacheKey: getAccessInformationCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_lesson_access_information', params, preSets);
        });
    };

    /**
     * Get content pages viewed in online and offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with an object with the online and offline viewed pages.
     */
    self.getContentPagesViewed = function(lessonId, retake, siteId) {
        var promises = [],
            type = mmaModLessonTypeStructure,
            result = {
                online: [],
                offline: []
            };

        // Get the online pages.
        promises.push(self.getContentPagesViewedOnline(lessonId, retake, false, false, siteId).then(function(pages) {
            result.online = pages;
        }));

        // Get the offline pages.
        promises.push($mmaModLessonOffline.getRetakeAttemptsForType(lessonId, retake, type, siteId).catch(function() {
            return [];
        }).then(function(pages) {
            result.offline = pages;
        }));

        return $q.all(promises).then(function() {
            return result;
        });
    };

    /**
     * Get IDS of content pages viewed in online and offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewedIds
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with list of IDs.
     */
    self.getContentPagesViewedIds = function(lessonId, retake, siteId) {
        return self.getContentPagesViewed(lessonId, retake, siteId).then(function(result) {
            var ids = {},
                pages = result.online.concat(result.offline);

            angular.forEach(pages, function(page) {
                if (!ids[page.pageid]) {
                    ids[page.pageid] = true;
                }
            });

            return Object.keys(ids);
        });
    };

    /**
     * Get cache key for get content pages viewed WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @return {String}          Cache key.
     */
    function getContentPagesViewedCacheKey(lessonId, retake) {
        return getContentPagesViewedCommonCacheKey(lessonId) + ':' + retake;
    }

    /**
     * Get common cache key for get content pages viewed WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getContentPagesViewedCommonCacheKey(lessonId) {
        return 'mmaModLesson:contentPagesViewed:' + lessonId;
    }

    /**
     * Get the list of content pages viewed in the site for a certain retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewedOnline
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} retake         Retake number.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the access information.
     */
    self.getContentPagesViewedOnline = function(lessonId, retake, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                    lessonattempt: retake
                },
                preSets = {
                    cacheKey: getContentPagesViewedCacheKey(lessonId, retake)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_content_pages_viewed', params, preSets).then(function(result) {
                return result.pages;
            });
        });
    };

    /**
     * Get the last content page viewed.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLastContentPageViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the last content page viewed.
     */
    self.getLastContentPageViewed = function(lessonId, retake, siteId) {
        return self.getContentPagesViewed(lessonId, retake, siteId).then(function(data) {
            var lastPage,
                maxTime = 0;

            angular.forEach(data.online, function(page) {
                if (page.timeseen > maxTime) {
                    lastPage = page;
                    maxTime = page.timeseen;
                }
            });

            angular.forEach(data.offline, function(page) {
                if (page.timemodified > maxTime) {
                    lastPage = page;
                    maxTime = page.timemodified;
                }
            });

            return lastPage;
        }).catch(function() {
            // Error getting last page, don't return anything.
        });
    };

    /**
     * Get the last page seen.
     * Based on Moodle's get_last_page_seen.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLastPageSeen
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the last page seen.
     */
    self.getLastPageSeen = function(lessonId, retake, siteId) {
        siteId = siteId || $mmSite.getId();

        var lastPageSeen = false;

        // Get the last question answered.
        return $mmaModLessonOffline.getLastQuestionPageAttempt(lessonId, retake, siteId).then(function(answer) {
            if (answer) {
                lastPageSeen = answer.newpageid;
            }

            // Now get the last content page viewed.
            return self.getLastContentPageViewed(lessonId, retake, siteId).then(function(page) {
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
    };

    /**
     * Get cache key for Lesson data WS calls.
     *
     * @param  {Number} courseId Course ID.
     * @return {String}          Cache key.
     */
    function getLessonDataCacheKey(courseId) {
        return 'mmaModLesson:lesson:' + courseId;
    }

    /**
     * Get a Lesson with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId        Site ID.
     * @param  {Number} courseId      Course ID.
     * @param  {String} key           Name of the property to check.
     * @param  {Mixed} value          Value to search.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    function getLesson(siteId, courseId, key, value, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getLessonDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_lesson_get_lessons_by_courses', params, preSets).then(function(response) {
                if (response && response.lessons) {
                    for (var i = 0; i < response.lessons.length; i++) {
                        var lesson = response.lessons[i];
                        if (lesson[key] == value) {
                            return lesson;
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a Lesson by module ID.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLesson
     * @param  {Number} courseId      Course ID.
     * @param  {Number} cmid          Course module ID.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    self.getLesson = function(courseId, cmid, siteId, forceCache) {
        return getLesson(siteId, courseId, 'coursemodule', cmid, forceCache);
    };

    /**
     * Get a Lesson by Lesson ID.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLessonById
     * @param  {Number} courseId      Course ID.
     * @param  {Number} id            Lesson ID.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    self.getLessonById = function(courseId, id, siteId, forceCache) {
        return getLesson(siteId, courseId, 'id', id, forceCache);
    };

    /**
     * Get cache key for get lesson with password WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getLessonWithPasswordCacheKey(lessonId) {
        return 'mmaModLesson:lessonWithPswrd:' + lessonId;
    }

    /**
     * Get a lesson protected with password.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLessonWithPassword
     * @param  {Number} lessonId                 Lesson ID.
     * @param  {String} [password]               Password.
     * @param  {Boolean} [validatePassword=true] If true, the function will fail if the password is wrong.
     *                                           If false, it will return a lesson with the basic data if password is wrong.
     * @param  {Boolean} [forceCache]            True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache]           True to ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]                 Site ID. If not defined, current site.
     * @return {Promise}                         Promise resolved with the lesson.
     */
    self.getLessonWithPassword = function(lessonId, password, validatePassword, forceCache, ignoreCache, siteId) {
        if (typeof validatePassword == 'undefined') {
            validatePassword = true;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId
                },
                preSets = {
                    cacheKey: getLessonWithPasswordCacheKey(lessonId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_lesson', params, preSets).then(function(response) {
                if (typeof response.lesson.ongoing == 'undefined') {
                    // Basic data not received, password is wrong. Remove stored password.
                    self.removeStoredPassword(lessonId);

                    if (validatePassword) {
                        // Invalidate the data and reject.
                        return self.invalidateLessonWithPassword(lessonId).catch(function() {
                            // Shouldn't happen.
                        }).then(function() {
                            return $mmLang.translateAndReject('mma.mod_lesson.loginfail');
                        });
                    }
                }

                return response.lesson;
            });
        });
    };

    /**
     * Get the ongoing score message for the user (depending on the user permission and lesson settings).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getOngoingScoreMessage
     * @param  {Object} lesson      Lesson.
     * @param  {Object} accessInfo  Result of get access info.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} [pageIndex] Object containing all the pages indexed by ID. If not provided, it will be calculated.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the ongoing score message.
     */
    self.getOngoingScoreMessage = function(lesson, accessInfo, password, review, pageIndex, siteId) {
        if (accessInfo.canmanage) {
            return $q.when($translate.instant('mma.mod_lesson.teacherongoingwarning'));
        } else {
            var retake = accessInfo.attemptscount;
            if (review) {
                retake--;
            }

            return self.lessonGrade(lesson, retake, password, review, pageIndex, siteId).then(function(gradeInfo) {
                var data = {};

                if (lesson.custom) {
                    data.score = gradeInfo.earned;
                    data.currenthigh = gradeInfo.total;
                    return $translate.instant('mma.mod_lesson.ongoingcustom', {$a: data});
                } else {
                    data.correct = gradeInfo.earned;
                    data.viewed = gradeInfo.attempts;
                    return $translate.instant('mma.mod_lesson.ongoingnormal', {$a: data});
                }
            });
        }
    };

    /**
     * Get the possible answers from a page.
     *
     * @param  {Object} lesson      Lesson.
     * @param  {Number} pageId      Page ID.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the list of possible answers.
     */
    function getPageAnswers(lesson, pageId, password, review, siteId) {
        return self.getPageData(lesson, pageId, password, review, true, true, false, undefined, undefined, siteId)
                .then(function(data) {
            return data.answers;
        });
    }

    /**
     * Get all the possible answers from a list of pages, indexed by answerId.
     *
     * @param  {Object} lesson      Lesson.
     * @param  {Number[]} pageIds   List of page IDs.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the list of possible answers.
     */
    function getPagesAnswers(lesson, pageIds, password, review, siteId) {
        var answers = {},
            promises = [];

        angular.forEach(pageIds, function(pageId) {
            promises.push(getPageAnswers(lesson, pageId, password, review, siteId).then(function(pageAnswers) {
                angular.forEach(pageAnswers, function(answer) {
                    // Include the pageid in each answer and add them to the final list.
                    answer.pageid = pageId;
                    answers[answer.id] = answer;
                });
            }));
        });

        return $q.all(promises).then(function() {
            return answers;
        });
    }

    /**
     * Get cache key for get page data WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @param {Number} pageId   Page ID.
     * @return {String}         Cache key.
     */
    function getPageDataCacheKey(lessonId, pageId) {
        return getPageDataCommonCacheKey(lessonId) + ':' + pageId;
    }

    /**
     * Get common cache key for get page data WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getPageDataCommonCacheKey(lessonId) {
        return 'mmaModLesson:pageData:' + lessonId;
    }

    /**
     * Get page data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageData
     * @param  {Object} lesson             Lesson.
     * @param  {Number} pageId             Page ID.
     * @param  {String} [password]         Lesson password (if any).
     * @param  {Boolean} [review]          If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [includeContents] Include the page rendered contents.
     * @param  {Boolean} [forceCache]      True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache]     True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {Object} [accessInfo]       Result of get access info. Required if offline is true.
     * @param  {Object} [jumps]            Result of get pages possible jumps. Required if offline is true.
     * @param  {String} [siteId]           Site ID. If not defined, current site.
     * @return {Promise}                   Promise resolved with the page data.
     */
    self.getPageData = function(lesson, pageId, password, review, includeContents, forceCache, ignoreCache, accessInfo, jumps,
                siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lesson.id,
                    pageid: parseInt(pageId, 10),
                    review: review ? 1 : 0,
                    returncontents: includeContents ? 1 : 0
                },
                preSets = {
                    cacheKey: getPageDataCacheKey(lesson.id, pageId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            if (review) {
                // Force online mode in review.
                preSets.getFromCache = 0;
                preSets.saveToCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_page_data', params, preSets).then(function(data) {
                if (forceCache && accessInfo && data.page) {
                    // Offline mode and valid page. Calculate the data that might be affected.
                    return calculateOfflineData(lesson, accessInfo, password, review, false, siteId).then(function(calculatedData) {
                        angular.extend(data, calculatedData);
                        return self.getPageViewMessages(lesson, accessInfo, data.page, review, jumps, password, siteId);
                    }).then(function(messages) {
                        data.messages = messages;
                        return data;
                    });
                }

                return data;
            });
        });
    };

    /**
     * Get cache key for get pages WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getPagesCacheKey(lessonId) {
        return 'mmaModLesson:pages:' + lessonId;
    }

    /**
     * Get lesson pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPages
     * @param  {Number} lessonId       Lesson ID.
     * @param  {String} [password]     Lesson password (if any).
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the pages.
     */
    self.getPages = function(lessonId, password, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                },
                preSets = {
                    cacheKey: getPagesCacheKey(lessonId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_pages', params, preSets).then(function(response) {
                return response.pages;
            });
        });
    };

    /**
     * Get cache key for get pages possible jumps WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getPagesPossibleJumpsCacheKey(lessonId) {
        return 'mmaModLesson:pagesJumps:' + lessonId;
    }

    /**
     * Get possible jumps for a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPagesPossibleJumps
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the jumps.
     */
    self.getPagesPossibleJumps = function(lessonId, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                },
                preSets = {
                    cacheKey: getPagesPossibleJumpsCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_pages_possible_jumps', params, preSets).then(function(response) {
                // Index the jumps by page and jumpto.
                if (response.jumps) {
                    var jumps = {};

                    angular.forEach(response.jumps, function(jump) {
                        if (typeof jumps[jump.pageid] == 'undefined') {
                            jumps[jump.pageid] = {};
                        }
                        jumps[jump.pageid][jump.jumpto] = jump;
                    });

                    return jumps;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get different informative messages when processing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_process.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageProcessMessages
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info. Required if offline is true.
     * @param  {Object} result     Result of process page.
     * @param  {Boolean} review    If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} jumps      Result of get pages possible jumps.
     * @return {String[]}          Messages.
     */
    self.getPageProcessMessages = function(lesson, accessInfo, result, review, jumps) {
        var messages = [];

        if (accessInfo.canmanage) {
            // This is the warning msg for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
            if (self.lessonDisplayTeacherWarning(jumps)) {
                var data = {
                    cluster: $translate.instant('mma.mod_lesson.clusterjump'),
                    unseen: $translate.instant('mma.mod_lesson.unseenpageinbranch')
                };
                addMessage(messages, 'mma.mod_lesson.teacherjumpwarning', {$a: data});
            }

            // Inform teacher that s/he will not see the timer.
            if (lesson.timelimit) {
                addMessage(messages, 'mma.mod_lesson.teachertimerwarning');
            }
        }
        // Report attempts remaining.
        if (result.attemptsremaining > 0 && lesson.review && !review) {
            addMessage(messages, 'mma.mod_lesson.attemptsremaining', {$a: result.attemptsremaining});
        }

        return messages;
    };

    /**
     * Get the IDs of all the pages that have at least 1 question attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPagesIdsWithQuestionAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Boolean} correct True to only fetch correct attempts, false to get them all.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User ID. If not defined, site's user.
     * @return {Promise}         Promise resolved with the IDs.
     */
    self.getPagesIdsWithQuestionAttempts = function(lessonId, retake, correct, siteId, userId) {
        return self.getQuestionsAttempts(lessonId, retake, correct, undefined, siteId, userId).then(function(result) {
            var ids = {},
                attempts = result.online.concat(result.offline);

            angular.forEach(attempts, function(attempt) {
                if (!ids[attempt.pageid]) {
                    ids[attempt.pageid] = true;
                }
            });

            return Object.keys(ids);
        });
    };

    /**
     * Get different informative messages when viewing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_view.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageViewMessages
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info. Required if offline is true.
     * @param  {Object} page       Page loaded.
     * @param  {Boolean} review    If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} jumps      Result of get pages possible jumps.
     * @param  {String} [password] Lesson password (if any).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the list of messages.
     */
    self.getPageViewMessages = function(lesson, accessInfo, page, review, jumps, password, siteId) {
        var messages = [],
            data,
            promise = $q.when();

        if (!accessInfo.canmanage) {
            if (page.qtype == self.LESSON_PAGE_BRANCHTABLE && lesson.minquestions) {
                // Tell student how many questions they have seen, how many are required and their grade.
                var retake = accessInfo.attemptscount;

                promise = self.lessonGrade(lesson, retake, password, review, undefined, siteId).then(function(gradeInfo) {
                    if (gradeInfo.attempts) {
                        if (gradeInfo.nquestions < lesson.minquestions) {
                            data = {
                                nquestions: gradeInfo.nquestions,
                                minquestions: lesson.minquestions
                            };
                            addMessage(messages, 'mma.mod_lesson.numberofpagesviewednotice', {$a: data});
                        }

                        if (!review && !lesson.retake) {
                            addMessage(messages, 'mma.mod_lesson.numberofcorrectanswers', {$a: gradeInfo.earned});
                            if (lesson.grade != mmCoreGradeTypeNone) {
                                data = {
                                    grade: $mmUtil.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                    total: lesson.grade
                                };
                                addMessage(messages, 'mma.mod_lesson.yourcurrentgradeisoutof', {$a: data});
                            }
                        }
                    }
                }).catch(function() {
                    // Ignore errors.
                });
            }
        } else {
            if (lesson.timelimit) {
                addMessage(messages, 'mma.mod_lesson.teachertimerwarning');
            }

            if (self.lessonDisplayTeacherWarning(jumps)) {
                // This is the warning msg for teachers to inform them that cluster
                // and unseen does not work while logged in as a teacher.
                data = {
                    cluster: $translate.instant('mma.mod_lesson.clusterjump'),
                    unseen: $translate.instant('mma.mod_lesson.unseenpageinbranch')
                };
                addMessage(messages, 'mma.mod_lesson.teacherjumpwarning', {$a: data});
            }
        }

        return promise.then(function() {
            return messages;
        });
    };

    /**
     * Get questions attempts, including offline attempts.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getQuestionsAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Boolean} correct True to only fetch correct attempts, false to get them all.
     * @param  {Number} [pageId] If defined, only get attempts on this page.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User ID. If not defined, site's user.
     * @return {Promise}         Promise resolved with the questions attempts.
     */
    self.getQuestionsAttempts = function(lessonId, retake, correct, pageId, siteId, userId) {
        var promises = [],
            result = {
                online: [],
                offline: []
            };

        promises.push(self.getQuestionsAttemptsOnline(lessonId, retake, correct, pageId, false, false, siteId, userId)
                .then(function(attempts) {
            result.online = attempts;
        }));

        promises.push($mmaModLessonOffline.getQuestionsAttempts(lessonId, retake, correct, pageId, siteId).catch(function() {
            // Error, assume no attempts.
            return [];
        }).then(function(attempts) {
            result.offline = attempts;
        }));

        return $q.all(promises).then(function() {
            return result;
        });
    };

    /**
     * Get cache key for get questions attempts WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Number} userId   User ID.
     * @return {String}          Cache key.
     */
    function getQuestionsAttemptsCacheKey(lessonId, retake, userId) {
        return getQuestionsAttemptsCommonCacheKey(lessonId) + ':' + userId + ':' + retake;
    }

    /**
     * Get common cache key for get questions attempts WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getQuestionsAttemptsCommonCacheKey(lessonId) {
        return 'mmaModLesson:questionsAttempts:' + lessonId;
    }

    /**
     * Get questions attempts from the site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getQuestionsAttemptsOnline
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} retake         Retake number.
     * @param  {Boolean} correct       True to only fetch correct attempts, false to get them all.
     * @param  {Number} [pageId]       If defined, only get attempts on this page.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {Number} [userId]       User ID. If not defined, site's user.
     * @return {Promise}               Promise resolved with the questions attempts.
     */
    self.getQuestionsAttemptsOnline = function(lessonId, retake, correct, pageId, forceCache, ignoreCache, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            // Don't pass "pageId" and "correct" params, they will be filtered locally.
            var params = {
                    lessonid: lessonId,
                    attempt: retake,
                    userid: userId
                },
                preSets = {
                    cacheKey: getQuestionsAttemptsCacheKey(lessonId, retake, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_questions_attempts', params, preSets).then(function(response) {
                if (pageId || correct) {
                    // Filter the attempts.
                    return response.attempts.filter(function(attempt) {
                        var include = true;
                        if (correct) {
                            include = !!attempt.correct;
                        }
                        if (pageId && include) {
                            include = attempt.pageid == pageId;
                        }
                        return include;
                    });
                }

                return response.attempts;
            });
        });
    };

    /**
     * Get cache key for get retakes overview WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} groupId  Group ID.
     * @return {String}          Cache key.
     */
    function getRetakesOverviewCacheKey(lessonId, groupId) {
        return getRetakesOverviewCommonCacheKey(lessonId) + ':' + groupId;
    }

    /**
     * Get common cache key for get retakes overview WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getRetakesOverviewCommonCacheKey(lessonId) {
        return 'mmaModLesson:retakesOverview:' + lessonId;
    }

    /**
     * Get the overview of retakes in a lesson (named "attempts overview" in Moodle).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getRetakesOverview
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} [groupId]      The group to get. If not defined, all participants.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the retakes overview.
     */
    self.getRetakesOverview = function(lessonId, groupId, forceCache, ignoreCache, siteId) {
        groupId = groupId || 0;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                    groupid: groupId
                },
                preSets = {
                    cacheKey: getRetakesOverviewCacheKey(lessonId, groupId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_attempts_overview', params, preSets).then(function(response) {
                return response.data;
            });
        });
    };

    /**
     * Finds all pages that appear to be a subtype of the provided pageid until
     * an end point specified within "ends" is encountered or no more pages exist.
     * Based on Moodle's get_sub_pages_of.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getSubpagesOf
     * @param  {Object} pages  Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param  {Number} pageId Page ID to get subpages of.
     * @param  {Number[]} end  An array of LESSON_PAGE_* types that signify an end of the subtype.
     * @return {Object[]}      List of subpages.
     */
    self.getSubpagesOf = function(pages, pageId, ends) {
        var subPages = [];

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
    };

    /**
     * Get a password stored in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getStoredPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with password on success, rejected otherwise.
     */
    self.getStoredPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModLessonPasswordStore, lessonId).then(function(entry) {
                return entry.password;
            });
        });
    };

    /**
     * Get cache key for get timers WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} userId   User ID.
     * @return {String}          Cache key.
     */
    function getTimersCacheKey(lessonId, userId) {
        return getTimersCommonCacheKey(lessonId) + ':' + userId;
    }

    /**
     * Get common cache key for get timers WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getTimersCommonCacheKey(lessonId) {
        return 'mmaModLesson:timers:' + lessonId;
    }

    /**
     * Get lesson timers.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getTimers
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {Number} [userId]       User ID. If not defined, site's current user.
     * @return {Promise}               Promise resolved with the pages.
     */
    self.getTimers = function(lessonId, forceCache, ignoreCache, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    lessonid: lessonId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getTimersCacheKey(lessonId, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_user_timers', params, preSets).then(function(response) {
                return response.timers;
            });
        });
    };

    /**
     * Get cache key for get user retake WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} userId   User ID.
     * @param  {Number} retake   Retake number
     * @return {String}          Cache key.
     */
    function getUserRetakeCacheKey(lessonId, userId, retake) {
        return getUserRetakeUserCacheKey(lessonId, userId) + ':' + retake;
    }

    /**
     * Get user cache key for get user retake WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} userId   User ID.
     * @return {String}          Cache key.
     */
    function getUserRetakeUserCacheKey(lessonId, userId) {
        return getUserRetakeLessonCacheKey(lessonId) + ':' + userId;
    }

    /**
     * Get lesson cache key for get user retake WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getUserRetakeLessonCacheKey(lessonId) {
        return 'mmaModLesson:userRetake:' + lessonId;
    }

    /**
     * Get a user's retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getUserRetake
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} retake         Retake number
     * @param  {Number} [userId]       User ID. Undefined for current user.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the pages.
     */
    self.getUserRetake = function(lessonId, retake, userId, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    lessonid: lessonId,
                    userid: userId,
                    lessonattempt: retake
                },
                preSets = {
                    cacheKey: getUserRetakeCacheKey(lessonId, userId, retake)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_user_attempt', params, preSets);
        });
    };

    /**
     * Check if a jump is correct.
     * Based in Moodle's jumpto_is_correct.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#jumptoIsCorrect
     * @param  {Number} pageId    ID of the page from which you are jumping from.
     * @param  {Number} jumpTo    The jumpto number.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID. See createPagesIndex.
     * @return {Boolean}          Whether jump is correct.
     */
    self.jumptoIsCorrect = function(pageId, jumpTo, pageIndex) {
        // First test the special values.
        if (!jumpTo) {
            // Same page
            return false;
        } else if (jumpTo == self.LESSON_NEXTPAGE) {
            return true;
        } else if (jumpTo == self.LESSON_UNSEENBRANCHPAGE) {
            return true;
        } else if (jumpTo == self.LESSON_RANDOMPAGE) {
            return true;
        } else if (jumpTo == self.LESSON_CLUSTERJUMP) {
            return true;
        } else if (jumpTo == self.LESSON_EOL) {
            return true;
        }

        var aPageId = pageIndex[pageId].nextpageid;
        while (aPageId) {
            if (jumpTo == aPageId) {
                return true;
            }
            aPageId = pageIndex[aPageId].nextpageid;
        }
        return false;
    };

    /**
     * Invalidates Lesson data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateAccessInformation
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAccessInformation = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAccessInformationCacheKey(lessonId));
        });
    };

    /**
     * Invalidates content pages viewed for all retakes.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateContentPagesViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateContentPagesViewed = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getContentPagesViewedCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates content pages viewed for a certain retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateContentPagesViewedForRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateContentPagesViewedForRetake = function(lessonId, retake, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getContentPagesViewedCacheKey(lessonId, retake));
        });
    };

    /**
     * Invalidates Lesson data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateLessonData
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateLessonData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getLessonDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates lesson with password.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateLessonWithPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateLessonWithPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getLessonWithPasswordCacheKey(lessonId));
        });
    };

    /**
     * Invalidates page data for all pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePageData
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePageData = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getPageDataCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates page data for a certain page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePageDataForPage
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePageDataForPage = function(lessonId, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPageDataCacheKey(lessonId, pageId));
        });
    };

    /**
     * Invalidates pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePages
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePages = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPagesCacheKey(lessonId));
        });
    };

    /**
     * Invalidates pages possible jumps.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePagesPossibleJumps
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePagesPossibleJumps = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPagesPossibleJumpsCacheKey(lessonId));
        });
    };

    /**
     * Invalidates questions attempts for all retakes.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateQuestionsAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateQuestionsAttempts = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getQuestionsAttemptsCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates question attempts for a certain retake and user.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateQuestionsAttemptsForRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site..
     * @param  {Number} [userId] User ID. If not defined, site's user.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateQuestionsAttemptsForRetake = function(lessonId, retake, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getQuestionsAttemptsCacheKey(lessonId, retake, userId));
        });
    };

    /**
     * Invalidates retakes overview for all groups in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateRetakesOverview
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateRetakesOverview = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getRetakesOverviewCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates retakes overview for a certain group in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateRetakesOverviewForGroup
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} groupId  Group ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateRetakesOverviewForGroup = function(lessonId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getRetakesOverviewCacheKey(lessonId, groupId));
        });
    };

    /**
     * Invalidates timers for all users in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateTimers
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateTimers = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getTimersCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates timers for a certain user.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateTimersForUser
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateTimersForUser = function(lessonId, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getTimersCacheKey(lessonId, userId));
        });
    };

    /**
     * Invalidates all retakes for all users in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateUserRetakesForLesson
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateUserRetakesForLesson = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getUserRetakeLessonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates all retakes for a certain user in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateUserRetakesForUser
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} [userId] User ID. Undefined for current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateUserRetakesForUser = function(lessonId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKeyStartingWith(getUserRetakeUserCacheKey(lessonId, userId));
        });
    };

    /**
     * Invalidates a certain retake for a certain user.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateUserRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Number} [userId] User ID. Undefined for current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateUserRetake = function(lessonId, retake, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getUserRetakeCacheKey(lessonId, userId, retake));
        });
    };

    /**
     * Check if a page answer is correct.
     *
     * @param  {Object} lesson    Lesson.
     * @param  {Number} pageId    The page ID.
     * @param  {Object} answer    The answer to check.
     * @param  {Object} pageIndex Object containing all the pages indexed by ID.
     * @return {Boolean}          Whether the answer is correct.
     */
    function isAnswerCorrect(lesson, pageId, answer, pageIndex) {
        if (lesson.custom) {
            // Custom scores. If score on answer is positive, it is correct.
            return answer.score > 0;
        } else {
            return self.jumptoIsCorrect(pageId, answer.jumpto, pageIndex);
        }
    }

    /**
     * Check if a lesson is enabled to be used in offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isLessonOffline
     * @param  {Object} lesson Lesson.
     * @return {Boolean}       True offline is enabled, false otherwise.
     */
    self.isLessonOffline = function(lesson) {
        return !!lesson.allowofflineattempts;
    };

    /**
     * Check if a lesson is password protected based in the access info.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isPasswordProtected
     * @param  {Object}  info Lesson access info.
     * @return {Boolean}      True if password protected, false otherwise.
     */
    self.isPasswordProtected = function(info) {
        if (info && info.preventaccessreasons) {
            for (var i = 0; i < info.preventaccessreasons.length; i++) {
                var entry = info.preventaccessreasons[i];
                if (entry.reason == 'passwordprotectedlesson') {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the lesson WS are available.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // All WS were introduced at the same time so checking one is enough.
            return site.wsAvailable('mod_lesson_get_lesson_access_information');
        });
    };

    /**
     * Check if a page is a question page or a content page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isQuestionPage
     * @param  {Number} type Type of the page.
     * @return {Boolean}     True if question page, false if content page.
     */
    self.isQuestionPage = function(type) {
        return type == mmaModLessonTypeQuestion;
    };

    /**
     * Start or continue a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#launchRetake
     * @param  {String} id         Lesson ID.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Number} [pageId]   Page id to continue from (only when continuing a retake).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the WS call is successful.
     */
    self.launchRetake = function(id, password, pageId, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: id,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }
            if (typeof pageId == 'number') {
                params.pageid = pageId;
            }

            return site.write('mod_lesson_launch_attempt', params);
        });
    };

    /**
     * Check if the user left during a timed session.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#leftDuringTimed
     * @param  {Object} info Lesson access info.
     * @return {Boolean}     True if left during timed, false otherwise.
     */
    self.leftDuringTimed = function(info) {
        return info && info.lastpageseen && info.lastpageseen != self.LESSON_EOL && info.leftduringtimedsession;
    };

    /**
     * Checks to see if a LESSON_CLUSTERJUMP or a LESSON_UNSEENBRANCHPAGE is used in a lesson.
     * Based on Moodle's lesson_display_teacher_warning.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#lessonDisplayTeacherWarning
     * @param  {Object} jumps Result of get pages possible jumps.
     * @return {Boolean}      Whether the lesson uses one of those jumps.
     */
    self.lessonDisplayTeacherWarning = function(jumps) {
        if (!jumps) {
            return false;
        }

        // Check if any jump is to cluster or unseen content page.
        for (var pageId in jumps) {
            for (var jumpto in jumps[pageId]) {
                if (jumpto == self.LESSON_CLUSTERJUMP || jumpto == self.LESSON_UNSEENBRANCHPAGE) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Calculates a user's grade for a lesson.
     * Based on Moodle's lesson_grade.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#lessonGrade
     * @param  {Object} lesson      Lesson.
     * @param  {Number} retake      Retake number.
     * @param  {String} [password]  Lesson password (if any).
     * @param  {Boolean} [review]   If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} [pageIndex] Object containing all the pages indexed by ID. If not provided, it will be calculated.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User ID. If not defined, site's user.
     * @return {Promise}            Promise resolved with an object with the grade data.
     */
    self.lessonGrade = function(lesson, retake, password, review, pageIndex, siteId, userId) {
        // Initialize all variables.
        var nViewed      = 0,
            nManual      = 0,
            manualPoints = 0,
            theGrade     = 0,
            nQuestions   = 0,
            total        = 0,
            earned       = 0;

        // Get the questions attempts for the user.
        return self.getQuestionsAttempts(lesson.id, retake, false, undefined, siteId, userId).then(function(attempts) {
            attempts = attempts.online.concat(attempts.offline);

            if (!attempts.length) {
                // No attempts.
                return;
            }

            var promise,
                attemptSet = {};

            // Create the pageIndex if it isn't provided.
            if (!pageIndex) {
                promise = self.getPages(lesson.id, password, true, false, siteId).then(function(pages) {
                    pageIndex = createPagesIndex(pages);
                });
            } else {
                promise = $q.when();
            }

            return promise.then(function() {

                // Group each try with its page
                angular.forEach(attempts, function(attempt) {
                    if (!attemptSet[attempt.pageid]) {
                        attemptSet[attempt.pageid] = [];
                    }
                    attemptSet[attempt.pageid].push(attempt);
                });

                // Drop all attempts that go beyond max attempts for the lesson
                angular.forEach(attemptSet, function(set, pageId) {
                    // Sort the list by time in ascending order.
                    set = set.sort(function(a, b) {
                        return (a.timeseen || a.timemodified) - (b.timeseen || b.timemodified);
                    });
                    attemptSet[pageId] = set.slice(0, lesson.maxattempts);
                });

                // Get all the answers from the pages the user answered.
                return getPagesAnswers(lesson, Object.keys(attemptSet), password, review, siteId);
            }).then(function(answers) {
                // Number of pages answered.
                nQuestions = Object.keys(attemptSet).length;

                angular.forEach(attemptSet, function(attempts) {
                    var lastAttempt = attempts[attempts.length - 1];
                    if (lesson.custom) {
                        // If essay question, handle it, otherwise add to score.
                        if (pageIndex[lastAttempt.pageid].qtype == self.LESSON_PAGE_ESSAY) {
                            if (lastAttempt.useranswer && typeof lastAttempt.useranswer.score != 'undefined') {
                                earned += lastAttempt.useranswer.score;
                            }
                            nManual++;
                            manualPoints += answers[lastAttempt.answerid].score;
                        } else if (lastAttempt.answerid) {
                            earned += answers[lastAttempt.answerid].score;
                        }
                    } else {
                        angular.forEach(attempts, function(attempt) {
                            earned += attempt.correct ? 1 : 0;
                        });
                        // If essay question, increase numbers.
                        if (pageIndex[lastAttempt.pageid].qtype == self.LESSON_PAGE_ESSAY) {
                            nManual++;
                            manualPoints++;
                        }
                    }

                    // Number of times answered.
                    nViewed += attempts.length;
                });

                if (lesson.custom) {
                    var bestScores = {};
                    // Find the highest possible score per page to get our total.
                    angular.forEach(answers, function(answer) {
                        if (typeof bestScores[answer.pageid] == 'undefined') {
                            bestScores[answer.pageid] = answer.score;
                        } else if (bestScores[answer.pageid] < answer.score) {
                            bestScores[answer.pageid] = answer.score;
                        }
                    });

                    // Sum all the scores.
                    angular.forEach(bestScores, function(score) {
                        total += score;
                    });
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
        }).then(function() {
            if (total) { // Not zero.
                theGrade = $mmUtil.roundToDecimals(100 * earned / total, 5);
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
    };

    /**
     * Report a lesson as being viewed.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#logViewLesson
     * @param  {String} id         Module ID.
     * @param  {String} [password] Lesson password (if any).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the WS call is successful.
     */
    self.logViewLesson = function(id, password, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: id
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_view_lesson', params).then(function(result) {
                if (!result.status) {
                    return $q.reject();
                }
                return result;
            });
        });
    };

    /**
     * Process a lesson page, saving its data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#processPage
     * @param  {Object} lesson       Lesson.
     * @param  {Number} courseId     Course ID the lesson belongs to.
     * @param  {Object} pageData     Result of getPageData for the page to process.
     * @param  {Object} data         Data to save.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [offline]   Whether it's offline mode.
     * @param  {Object} [accessInfo] Result of get access info. Required if offline is true.
     * @param  {Object} [jumps]      Result of get pages possible jumps. Required if offline is true.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when done.
     */
    self.processPage = function(lesson, courseId, pageData, data, password, review, offline, accessInfo, jumps, siteId) {
        siteId = siteId || $mmSite.getId();

        var page = pageData.page,
            pageId = page.id,
            result,
            pageIndex;

        if (offline) {
            // Get the list of pages of the lesson.
            return self.getPages(lesson.id, password, true, false, siteId).then(function(pages) {
                pageIndex = createPagesIndex(pages);

                if (pageData.answers.length) {
                    return recordAttempt(lesson, courseId, pageData, data, review, accessInfo, jumps, pageIndex, siteId);
                } else {
                    // The page has no answers so we will just progress to the next page (as set by newpageid).
                   return {
                        nodefaultresponse: true,
                        newpageid: data.newpageid
                    };
                }
            }).then(function(res) {
                result = res;
                result.newpageid = getNewPageId(pageData.page.id, result.newpageid, jumps);

                // Calculate some needed offline data.
                return calculateOfflineData(lesson, accessInfo, password, review, pageIndex, siteId);
            }).then(function(calculatedData) {
                // Add some default data to match the WS response.
                result.warnings = [];
                result.displaymenu = pageData.displaymenu; // Keep the same value since we can't calculate it in offline.
                result.messages = self.getPageProcessMessages(lesson, accessInfo, result, review, jumps);
                angular.extend(result, calculatedData);

                return result;
            });
        }

        return self.processPageOnline(lesson.id, pageId, data, password, review, siteId);
    };

    /**
     * Process a lesson page, saving its data. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#processPageOnline
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} pageId     Page ID.
     * @param  {Object} data       Data to save.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.processPageOnline = function(lessonId, pageId, data, password, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                pageid: pageId,
                data: $mmUtil.objectToArrayOfObjects(data, 'name', 'value', true),
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_process_page', params);
        });
    };

    /**
     * Records an attempt on a certain page.
     * Based on Moodle's record_attempt.
     *
     * @param  {Object} lesson     Lesson.
     * @param  {Number} courseId   Course ID the lesson belongs to.
     * @param  {Object} pageData   Result of getPageData for the page to process.
     * @param  {Object} data       Data to save.
     * @param  {Boolean} review    If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} accessInfo Result of get access info.
     * @param  {Object} jumps      Result of get pages possible jumps.
     * @param  {Object} pageIndex  Object containing all the pages indexed by ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the result.
     */
    function recordAttempt(lesson, courseId, pageData, data, review, accessInfo, jumps, pageIndex, siteId) {
        // Check the user answer. Each page type has its own implementation.
        var result = checkAnswer(lesson, pageData, data, jumps, pageIndex),
            retake = accessInfo.attemptscount;

        // Processes inmediate jumps.
        if (result.inmediatejump) {
            if (pageData.page.qtype == self.LESSON_PAGE_BRANCHTABLE) {
                // Store the content page data. In Moodle this is stored in a separate table, during checkAnswer.
                return $mmaModLessonOffline.processPage(lesson.id, courseId, retake, pageData.page, data,
                            result.newpageid, result.answerid, false, result.userresponse, siteId).then(function() {
                    return result;
                });
            }
            return $q.when(result);
        }

        var promise = $q.when(),
            stop = false,
            nAttempts;

        result.attemptsremaining  = 0;
        result.maxattemptsreached = false;

        if (result.noanswer) {
            result.newpageid = pageData.page.id; // Display same page again.
            result.feedback = $translate.instant('mma.mod_lesson.noanswer');
        } else {
            if (!accessInfo.canmanage) {
                // Get the number of attempts that have been made on this question for this student and retake.
                promise = self.getQuestionsAttempts(lesson.id, retake, false, pageData.page.id, siteId).then(function(attempts) {
                    var subPromise;

                    nAttempts = attempts.online.length + attempts.offline.length;

                    // Check if they have reached (or exceeded) the maximum number of attempts allowed.
                    if (nAttempts >= lesson.maxattempts) {
                        result.maxattemptsreached = true;
                        result.feedback = $translate.instant('mma.mod_lesson.maximumnumberofattemptsreached');
                        result.newpageid = self.LESSON_NEXTPAGE;
                        stop = true; // Set stop to true to prevent further calculations.
                        return;
                    }

                    // Only insert a record if we are not reviewing the lesson.
                    if (!review) {
                        if (lesson.retake || (!lesson.retake && !retake)) {
                            // Store the student's attempt and increase the number of attempts made.
                            // Calculate and store the new page ID to prevent having to recalculate it later.
                            var newPageId = getNewPageId(pageData.page.id, result.newpageid, jumps);
                            subPromise = $mmaModLessonOffline.processPage(lesson.id, courseId, retake, pageData.page, data,
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
                            result.newpageid =  self.LESSON_NEXTPAGE;
                        } else if (lesson.maxattempts > 1) { // Don't bother with message if only one attempt
                            result.attemptsremaining = lesson.maxattempts - nAttempts;
                        }
                    }

                    return subPromise;
                });
            }

            promise = promise.then(function() {
                if (stop) {
                    return;
                }

                var subPromise;

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
                        result.response = $translate.instant('mma.mod_lesson.defaultessayresponse');
                    } else if (result.correctanswer) {
                        result.response = $translate.instant('mma.mod_lesson.thatsthecorrectanswer');
                    } else {
                        result.response = $translate.instant('mma.mod_lesson.thatsthewronganswer');
                    }
                }

                if (result.response) {
                    if (lesson.review && !result.correctanswer && !result.isessayquestion) {
                        // Calculate the number of question attempt in the page if it isn't calculated already.
                        if (typeof nAttempts == 'undefined') {
                            subPromise = self.getQuestionsAttempts(lesson.id, retake, false, pageData.page.id, siteId)
                                    .then(function(result) {
                                nAttempts = result.online.length + result.offline.length;
                            });
                        } else {
                            subPromise = $q.when();
                        }

                        subPromise.then(function() {
                            var messageId = nAttempts == 1 ? 'firstwrong' : 'secondpluswrong';
                            result.feedback = '<div class="box feedback">' +
                                    $translate.instant('mma.mod_lesson.' + messageId) + '</div>';
                        });
                    } else {
                        result.feedback = '';
                        subPromise = $q.when();
                    }

                    var className = 'response';
                    if (result.correctanswer) {
                        className += ' correct';
                    } else if (!result.isessayquestion) {
                        className += ' incorrect';
                    }

                    return subPromise.then(function() {
                        result.feedback += '<div class="box generalbox boxaligncenter">' + pageData.page.contents + '</div>';
                        result.feedback += '<div class="correctanswer generalbox"><em>' +
                                $translate.instant('mma.mod_lesson.youranswer') + '</em> : ' +
                                (result.studentanswerformat ? result.studentanswer : $mmText.cleanTags(result.studentanswer)) +
                                '<div class="box ' + className + '">' + result.response + '</div></div>';
                    });
                }
            });
        }

        return promise.then(function() {
            return result;
        });
    }

    /**
     * Remove a password stored in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#removeStoredPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when removed.
     */
    self.removeStoredPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonPasswordStore, lessonId);
        });
    };

    /**
     * Store a password in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#storePassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} password Password to store.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when stored.
     */
    self.storePassword = function(lessonId, password, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                id: lessonId,
                password: password,
                timemodified: new Date().getTime()
            };

            return site.getDb().insert(mmaModLessonPasswordStore, entry);
        });
    };

    /**
     * Function to determine if a page is a valid page. It will add the page to validPages if valid. It can also
     * modify the list of viewedPagesIds for cluster pages.
     * Based on Moodle's valid_page_and_view.
     *
     * @param  {Object} pages            Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param  {Object} page             Page to check.
     * @param  {Object} validPages       Valid pages, indexed by page ID.
     * @param  {Number[]} viewedPagesIds List of viewed pages IDs.
     * @return {Number}                  Next page ID.
     */
    self.validPageAndView = function(pages, page, validPages, viewedPagesIds) {
        if (page.qtype != self.LESSON_PAGE_ENDOFCLUSTER && page.qtype != self.LESSON_PAGE_ENDOFBRANCH) {
            // Add this page as a valid page.
            validPages[page.id] = 1;
        }

        if (page.qtype == self.LESSON_PAGE_CLUSTER) {
            // Get list of pages in the cluster.
            var subPages = self.getSubpagesOf(pages, page.id, [self.LESSON_PAGE_ENDOFCLUSTER]);
            angular.forEach(subPages, function(subPage) {
                var position = viewedPagesIds.indexOf(subPage.id);
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
    };

    return self;
});
