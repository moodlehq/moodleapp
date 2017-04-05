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
.factory('$mmaModLessonHelper', function($mmaModLesson, $mmText, $q, $mmUtil) {

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
            // Button container not found, no buttons.
            return buttons;
        }

        forms = buttonsContainer.querySelectorAll('form');
        angular.forEach(forms, function(form) {
            var buttonEl = form.querySelector('button[type="submit"]'),
                inputs = form.querySelectorAll('input'),
                button;

            if (!buttonEl || !inputs || !inputs.length) {
                // Button not found or no inputs, ignore it.
                return;
            }

            button = {
                id: buttonEl.id,
                title: buttonEl.title,
                content: buttonEl.innerHTML.trim(),
                data: {}
            };

            angular.forEach(inputs, function(input) {
                button.data[input.name] = input.value;
            });

            buttons.push(button);
        });

        return buttons;
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
                        return false;
                    }
                }

                angular.forEach(inputs, function(input) {
                    var option = {
                            id: input.id,
                            name: input.name,
                            value: input.value
                        },
                        parent = input.parentNode;

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
                    return false;
                }

                question.input = {
                    id: input.id,
                    name: input.name,
                    maxlength: input.maxLength,
                    value: input.value,
                    type: type || 'text'
                };
                break;

            case $mmaModLesson.LESSON_PAGE_ESSAY:
                question.template = 'essay';

                // Get the textarea.
                var textarea = fieldContainer.querySelector('textarea'),
                    nameMatch;
                if (!textarea) {
                    return false;
                }

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
        if (question.template == 'essay') {
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

    return self;
});