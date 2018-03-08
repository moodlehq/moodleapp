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

/**
 * Helper to gather some common lesson functions.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLessonHelper
 */
.factory('$mmaModLessonHelper', function($mmaModLesson, $mmText, $q, $mmUtil, $translate) {

    var self = {};

    /**
     * Given the HTML of next activity link, format it to add some styles.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#formatActivityLink
     * @param  {String} activityLink HTML of the activity link.
     * @return {String}              Formatted HTML.
     */
    self.formatActivityLink = function(activityLink) {
        var rootElement = document.createElement('div'),
            anchor;

        rootElement.innerHTML = activityLink;
        anchor = rootElement.querySelector('a');
        if (!anchor) {
            // Anchor not found, return the original HTML.
            return activityLink;
        }

        // Show the anchor as a button.
        angular.element(anchor).addClass('button button-block');

        return rootElement.innerHTML;
    };

    /**
     * Given the HTML of an answer from a content page, extract the data to render the answer.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getContentPageAnswerDataFromHtml
     * @param  {String} html Answer's HTML.
     * @return {Object}      Object with buttonText and content.
     */
    self.getContentPageAnswerDataFromHtml = function(html) {
        var data = {},
            button,
            rootElement = document.createElement('div');

        // Search the input button.
        rootElement.innerHTML = html;
        button = rootElement.querySelector('input[type="button"]');

        if (button) {
            // Extract the button content and remove it from the HTML.
            data.buttonText = button.value;
            angular.element(button).remove();
        }

        data.content = rootElement.innerHTML.trim();

        return data;
    };

    /**
     * Get the buttons to change pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getPageButtonsFromHtml
     * @param  {String} html Page's HTML.
     * @return {Object[]}    List of buttons.
     */
    self.getPageButtonsFromHtml = function(html) {
        var buttons = [],
            rootElement = document.createElement('div'),
            buttonsContainer,
            forms;

        // Get the container of the buttons if it exists.
        rootElement.innerHTML = html;
        buttonsContainer = rootElement.querySelector('.branchbuttoncontainer');

        if (!buttonsContainer) {
            // Button container not found, might be a legacy lesson (from 1.9).
            if (!rootElement.querySelector('form input[type="submit"]')) {
                // No buttons found.
                return buttons;
            }
            buttonsContainer = rootElement;
        }

        forms = buttonsContainer.querySelectorAll('form');
        angular.forEach(forms, function(form) {
            var buttonEl = form.querySelector('input[type="submit"], button[type="submit"]'),
                inputs = form.querySelectorAll('input'),
                button;

            if (!buttonEl || !inputs || !inputs.length) {
                // Button not found or no inputs, ignore it.
                return;
            }

            button = {
                id: buttonEl.id,
                title: buttonEl.title || buttonEl.value,
                content: buttonEl.tagName == 'INPUT' ? buttonEl.value : buttonEl.innerHTML.trim(),
                data: {}
            };

            angular.forEach(inputs, function(input) {
                if (input.type != 'submit') {
                    button.data[input.name] = input.value;
                }
            });

            buttons.push(button);
        });

        return buttons;
    };

    /**
     * Given a page data (result of getPageData), get the page contents.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getPageContentsFromPageData
     * @param  {Object} data Page data.
     * @return {String}      Page contents.
     */
    self.getPageContentsFromPageData = function(data) {
        var contents,
            rootElement = document.createElement('div');

        // Search the page contents inside the whole page HTML. Use data.pagecontent because it's filtered.
        rootElement.innerHTML = data.pagecontent;
        contents = rootElement.querySelector('.contents');

        if (contents) {
            return contents.innerHTML.trim();
        }

        // Cannot find contents element, return the page.contents (some elements like videos might not work).
        return data.page.contents;
    };

    /**
     * Given the HTML of an answer from a question page, extract the data to render the answer.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getQuestionPageAnswerDataFromHtml
     * @param  {String} html Answer's HTML.
     * @return {Mixed}       Object with the data to render the answer.
     *                       If the answer doesn't require any parsing, return a string with the HTML.
     */
    self.getQuestionPageAnswerDataFromHtml = function(html) {
        var data = {},
            input,
            select,
            rootElement = document.createElement('div');

        rootElement.innerHTML = html;

        // Check if it has a checkbox.
        input = rootElement.querySelector('input[type="checkbox"][name*="answer"]');

        if (input) {
            // Truefalse or multichoice.
            data.isCheckbox = true;
            data.checked = input.checked;
            data.name = input.name;
            data.value = input.value;
            data.highlight = !!rootElement.querySelector('.highlight');

            angular.element(input).remove();
            data.content = rootElement.innerHTML.trim();
            return data;
        }

        // Check if it has an input text or number.
        input = rootElement.querySelector('input[type="number"],input[type="text"]');
        if (input) {
            // Short answer or numeric.
            data.isText = true;
            data.value = input.value;
            return data;
        }

        // Check if it has a select.
        select = rootElement.querySelector('select');
        if (select && select.options) {
            // Matching.
            var selectedOption = select.options[select.selectedIndex];
            data.isSelect = true;
            data.id = select.id;
            if (selectedOption) {
                data.value = selectedOption.value;
            } else {
                data.value = '';
            }

            angular.element(select).remove();
            data.content = rootElement.innerHTML.trim();
            return data;
        }

        // The answer doesn't need any parsing, return the HTML as it is.
        return html;
    };

    /**
     * Get a question and all the data required to render it from the page data (result of $mmaModLesson#getPageData).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getQuestionFromPageData
     * @param  {Object} pageData Page data (result of $mmaModLesson#getPageData).
     * @return {Object}          Question data.
     */
    self.getQuestionFromPageData = function(pageData) {
        var rootElement = document.createElement('div'),
            fieldContainer,
            hiddenInputs,
            submitButton,
            type,
            question = {
                model: {}
            };

        // Get the container of the question answers if it exists.
        rootElement.innerHTML = pageData.pagecontent;
        fieldContainer = rootElement.querySelector('.fcontainer');

        // Get hidden inputs and add their data to the model.
        hiddenInputs = rootElement.querySelectorAll('input[type="hidden"]');
        angular.forEach(hiddenInputs, function(input) {
            question.model[input.name] = input.value;
        });

        // Get the submit button and extract its value.
        submitButton = rootElement.querySelector('input[type="submit"]');
        question.submitLabel = submitButton ? submitButton.value : $translate.instant('mma.mod_lesson.submit');

        if (!fieldContainer) {
            // Element not found, return.
            return question;
        }

        switch (pageData.page.qtype) {
            case $mmaModLesson.LESSON_PAGE_TRUEFALSE:
            case $mmaModLesson.LESSON_PAGE_MULTICHOICE:
                question.template = 'multichoice';
                question.options = [];

                // Get all the inputs. Search radio first.
                var inputs = fieldContainer.querySelectorAll('input[type="radio"]');
                if (!inputs || !inputs.length) {
                    // Radio buttons not found, it might be a multi answer. Search for checkbox.
                    question.multi = true;
                    inputs = fieldContainer.querySelectorAll('input[type="checkbox"]');

                    if (!inputs || !inputs.length) {
                        // No checkbox found either. Stop.
                        return question;
                    }
                }

                angular.forEach(inputs, function(input) {
                    var option = {
                            id: input.id,
                            name: input.name,
                            value: input.value,
                            checked: input.checked,
                            disabled: input.disabled
                        },
                        parent = input.parentNode;

                    if (option.checked) {
                        question.model[option.name] = question.multi ? true : option.value;
                    }

                    // Remove the input and use the rest of the parent contents as the label.
                    angular.element(input).remove();
                    option.text = parent.innerHTML.trim();

                    question.options.push(option);
                });
                break;

            case $mmaModLesson.LESSON_PAGE_NUMERICAL:
                type = 'number';
            case $mmaModLesson.LESSON_PAGE_SHORTANSWER:
                question.template = 'shortanswer';

                // Get the input.
                var input = fieldContainer.querySelector('input[type="text"], input[type="number"]');
                if (!input) {
                    return question;
                }

                question.input = {
                    id: input.id,
                    name: input.name,
                    maxlength: input.maxLength,
                    type: type || 'text',
                    readonly: input.readOnly
                };

                if (input.value) {
                    question.model[input.name] =  type == 'number' ? parseInt(input.value, 10) : input.value;
                }
                break;

            case $mmaModLesson.LESSON_PAGE_ESSAY:
                question.template = 'essay';

                // Get the textarea.
                var textarea = fieldContainer.querySelector('textarea'),
                    nameMatch;

                if (!textarea) {
                    // Textarea not found, probably review mode.
                    var answerEl = fieldContainer.querySelector('.reviewessay');
                    if (!answerEl) {
                        // Answer not found, stop.
                        return question;
                    }
                    question.useranswer = answerEl.innerHTML;
                } else {
                    // Extract the model name and the property from the textarea's name.
                    textarea.name = textarea.name || 'answer[text]';
                    nameMatch = textarea.name.match(/([^\[]*)\[([^\[]*)\]/);

                    question.textarea = {
                        id: textarea.id,
                        fullName: textarea.name,
                        name: nameMatch[1] || 'answer',
                        property: nameMatch[2] || 'text'
                    };

                    // Init the model.
                    question.model[question.textarea.name] = {};
                }

                break;

            case $mmaModLesson.LESSON_PAGE_MATCHING:
                question.template = 'matching';

                var rows = fieldContainer.querySelectorAll('.answeroption');
                question.rows = [];

                angular.forEach(rows, function(row) {
                    var label = row.querySelector('label'),
                        select = row.querySelector('select'),
                        options = row.querySelectorAll('option'),
                        rowModel = {};

                    if (!label || !select || !options || !options.length) {
                        return;
                    }

                    // Get the row's text (label).
                    rowModel.text = label.innerHTML.trim();
                    rowModel.id = select.id;
                    rowModel.name = select.name;
                    rowModel.disabled = select.disabled;
                    rowModel.options = [];

                    // Treat each option.
                    angular.forEach(options, function(option) {
                        if (typeof option.value == 'undefined') {
                            // Option not valid, ignore it.
                            return;
                        }

                        var opt = {
                            value: option.value,
                            label: option.innerHTML.trim(),
                            selected: option.selected
                        };

                        if (opt.selected) {
                            question.model[rowModel.name] = opt;
                        }

                        rowModel.options.push(opt);
                    });

                    question.rows.push(rowModel);
                });
                break;
        }

        return question;
    };

    /**
     * Get a label to identify a retake (lesson attempt).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#getRetakeLabel
     * @param  {Object} retake           Retake.
     * @param  {Boolean} includeDuration Whether to include the duration of the retake.
     * @return {String}                  Retake label.
     */
    self.getRetakeLabel = function(retake, includeDuration) {
        var data = {
                retake: retake.try + 1,
                grade: '',
                timestart: '',
                duration: ''
            },
            hasGrade = retake.grade != null;

        if (hasGrade || retake.end) {
            // Retake finished with or without grade (if the lesson only has content pages, it has no grade).
            if (hasGrade) {
                data.grade = $translate.instant('mm.core.percentagenumber', {$a: retake.grade});
            }
            data.timestart = moment(retake.timestart * 1000).format('LLL');
            if (includeDuration) {
                data.duration = $mmUtil.formatTimeInstant(retake.timeend - retake.timestart);
            }
        } else {
            // The user has not completed the retake.
            data.grade = $translate.instant('mma.mod_lesson.notcompleted');
            if (retake.timestart) {
                data.timestart = moment(retake.timestart * 1000).format('LLL');
            }
        }

        return $translate.instant('mma.mod_lesson.retakelabel' + (includeDuration ? 'full' : 'short'), data);
    };

    /**
     * Prepare the question model to be sent to server.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#prepareQuestionModel
     * @param  {Object} question Question to prepare.
     * @return {Promise}         Promise resolved with the model when done.
     */
    self.prepareQuestionModel = function(question) {
        // Create a copy of the model so changing it doesn't affect the template.
        var model = angular.copy(question.model);
        if (question.template == 'essay' && question.textarea) {
            // The answer might need formatting. Check if rich text editor is enabled or not.
            return $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
                if (!enabled) {
                    // Rich text editor not enabled, add some HTML to the answer if needed.
                    var answer = model[question.textarea.name],
                        propertyName = question.textarea.property;
                    answer[propertyName] = $mmText.formatHtmlLines(answer[propertyName]);
                }

                return model;
            });
        } else if (question.template == 'matching') {
            angular.forEach(question.rows, function(row) {
                if (typeof model[row.name] == 'object') {
                    model[row.name] = model[row.name].value;
                }
            });
        }

        return $q.when(model);
    };

    /**
     * Given the feedback of a process page in HTML, remove the question text.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHelper#removeQuestionFromFeedback
     * @param  {String} html Feedback's HTML.
     * @return {String}      Feedback without the question text.
     */
    self.removeQuestionFromFeedback = function(html) {
        var questionContainer,
            rootElement = document.createElement('div');

        // Search the container of the question.
        rootElement.innerHTML = html;
        questionContainer = rootElement.querySelector('.generalbox:not(.feedback):not(.correctanswer)');

        if (questionContainer) {
            // Remove it from the HTML.
            angular.element(questionContainer).remove();
        }

        return rootElement.innerHTML.trim();
    };

    return self;
});