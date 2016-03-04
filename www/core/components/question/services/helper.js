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

angular.module('mm.core.question')

/**
 * Helper to gather some common functions for question directives.
 *
 * @module mm.core.question
 * @ngdoc service
 * @name $mmQuestionHelper
 */
.factory('$mmQuestionHelper', function($mmUtil) {

    var self = {},
        lastErrorShown = 0;

    /**
     * Convenience function to initialize a question directive.
     * Performs some common checks and extracts the question's text.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#directiveInit
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Object}       Angular DOM element of the question's HTML. Undefined if an error happens.
     */
    self.directiveInit = function(scope, log) {
        var question = scope.question,
            questionEl;

        if (!question) {
            log.warn('Aborting because of no question received.');
            return self.showDirectiveError(scope);
        }

        questionEl = angular.element(question.html);

        // Extract question text.
        question.text = $mmUtil.getContentsOfElement(questionEl, '.qtext');
        if (!question.text) {
            log.warn('Aborting because of an error parsing question.', question.name);
            return self.showDirectiveError(scope);
        }

        return questionEl;
    };

    /**
     * Removes the scripts from a question's HTML and adds it in a new 'scriptsCode' property.
     * It will also search for init_question functions of the question type and add the object to an 'initObjects' property.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQuestionScripts
     * @param  {Object} question Question.
     * @return {Void}
     */
    self.extractQuestionScripts = function(question) {
        var matches;

        question.scriptsCode = '';
        question.initObjects = [];

        if (question.html) {
            // Search the scripts.
            matches = question.html.match(/<script[^>]*>[\s\S]*?<\/script>/mg);
            angular.forEach(matches, function(match) {
                // Add the script to scriptsCode and remove it from html.
                question.scriptsCode += match;
                question.html = question.html.replace(match, '');

                // Search init_question functions for this type.
                var initMatches = match.match(new RegExp('M\.' + question.type + '\.init_question\\(.*?}\\);', 'mg'));
                angular.forEach(initMatches, function(initMatch) {
                    // Remove start and end of the match, we only want the object.
                    initMatch = initMatch.replace('M.' + question.type + '.init_question(', '');
                    initMatch = initMatch.substr(0, initMatch.length - 2);

                    // Try to convert it to an object and add it to the question.
                    try {
                        initMatch = JSON.parse(initMatch);
                        question.initObjects.push(initMatch);
                    } catch(ex) {}
                });
            });
        }
    };

    /**
     * Retrieve the answers entered in a form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript and some questions might do that.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getAnswersFromForm
     * @param  {Object} form Form (DOM element).
     * @return {Object}      Object with the answers.
     */
    self.getAnswersFromForm = function(form) {
        if (!form || !form.elements) {
            return {};
        }

        var answers = {};

        angular.forEach(form.elements, function(element, name) {
            name = element.name || name;
            // Ignore flag and submit inputs.
            if (name.match(/_:flagged$/) || element.type == 'submit') {
                return;
            }
            // Ignore selects without value.
            if (element.tagName == 'SELECT' && (element.value === '' || typeof element.value == 'undefined')) {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                answers[name] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    answers[name] = element.value;
                }
            } else {
                answers[name] = element.value;
            }
        });

        return answers;
    };

    /**
     * Get the sequence check from a question HTML.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getQuestionSequenceCheckFromHtml
     * @param  {String} html Question's HTML.
     * @return {Object}      Object with the sequencecheck name and value.
     */
    self.getQuestionSequenceCheckFromHtml = function(html) {
        var el,
            input;

        if (html) {
            el = angular.element(html)[0];

            // Search the input holding the sequencecheck.
            input = el.querySelector('input[name*=sequencecheck]');
            if (input && typeof input.name != 'undefined' && typeof input.value != 'undefined') {
                return {
                    name: input.name,
                    value: input.value
                };
            }
        }
    };

    /**
     * Get the validation error message from a question HTML if it's there.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getValidationErrorFromHtml
     * @param  {String} html Question's HTML.
     * @return {Object}      Validation error message if present.
     */
    self.getValidationErrorFromHtml = function(html) {
        return $mmUtil.getContentsOfElement(angular.element(html), '.validationerror');
    };

    /**
     * Generic link function for question directives with an input of type "text".
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#inputTextDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Void}
     */
    self.inputTextDirective = function(scope, log) {
        var questionEl = self.directiveInit(scope, log);
        if (questionEl) {
            questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

            // Get the input element.
            input = questionEl.querySelector('input[type="text"][name*=answer]');
            if (!input) {
                log.warn('Aborting because couldn\'t find input.', question.name);
                return self.showDirectiveError(scope);
            }

            scope.input = {
                id: input.id,
                name: input.name,
                value: input.value
            };
        }
    };

    /**
     * Generic link function for question directives with a "matching" (selects).
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#matchingDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Void}
     */
    self.matchingDirective = function(scope, log) {
        var questionEl = self.directiveInit(scope, log),
            question = scope.question,
            rows;

        if (questionEl) {
            questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

            // Find rows.
            rows = questionEl.querySelectorAll('tr');
            if (!rows || !rows.length) {
                log.warn('Aborting because couldn\'t find any row.', question.name);
                return self.showDirectiveError(scope);
            }

            question.rows = [];

            angular.forEach(rows, function(row) {
                var rowModel = {},
                    select,
                    options,
                    accessibilityLabel,
                    columns = row.querySelectorAll('td');

                if (!columns || columns.length < 2) {
                    log.warn('Aborting because couldn\'t find the right columns.', question.name);
                    return self.showDirectiveError(scope);
                }

                // Get the row's text. It should be in the first column.
                rowModel.text = columns[0].innerHTML;

                // Get the select and the options.
                select = columns[1].querySelector('select');
                options = columns[1].querySelectorAll('option');

                if (!select || !options || !options.length) {
                    log.warn('Aborting because couldn\'t find select or options.', question.name);
                    return self.showDirectiveError(scope);
                }

                rowModel.id = select.id;
                rowModel.name = select.name;
                rowModel.options = [];

                // Treat each option.
                angular.forEach(options, function(option) {
                    if (typeof option.value == 'undefined') {
                        log.warn('Aborting because couldn\'t find option value.', question.name);
                        return self.showDirectiveError(scope);
                    }

                    rowModel.options.push({
                        value: option.value,
                        label: option.innerHTML,
                        selected: option.selected
                    });
                });

                // Get the accessibility label.
                accessibilityLabel = columns[1].querySelector('label.accesshide');
                rowModel.accessibilityLabel = accessibilityLabel.innerHTML;

                question.rows.push(rowModel);
            });

            question.loaded = true;
        }
    };

    /**
     * Generic link function for question directives with a multi choice input.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#multiChoiceDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Void}
     */
    self.multiChoiceDirective = function(scope, log) {
        var questionEl = self.directiveInit(scope, log),
            question = scope.question;

        // We need a model to store the answers for radio buttons since ng-checked isn't available for ion-radio.
        scope.mcAnswers = {};

        if (questionEl) {
            questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

            // Get the prompt.
            question.prompt = $mmUtil.getContentsOfElement(questionEl, '.prompt');

            // Search radio buttons first (single choice).
            var options = questionEl.querySelectorAll('input[type="radio"]');
            if (!options || !options.length) {
                // Radio buttons not found, it should be a multi answer. Search for checkbox.
                question.multi = true;
                options = questionEl.querySelectorAll('input[type="checkbox"]');

                if (!options || !options.length) {
                    // No checkbox found either. Abort.
                    log.warn('Aborting because of no radio and checkbox found.', question.name);
                    return self.showDirectiveError(scope);
                }
            }

            question.options = [];

            angular.forEach(options, function(element) {

                var option = {
                        id: element.id,
                        name: element.name,
                        value: element.value,
                        checked: element.checked
                    },
                    label;

                // Get the label with the question text.
                label = questionEl.querySelector('label[for="' + option.id + '"]');
                if (label) {
                    option.text = label.innerHTML;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        // If the option is checked and it's a single choice we use the model to select the one.
                        if (element.checked && !question.multi) {
                            scope.mcAnswers[option.name] = option.value;
                        }
                        question.options.push(option);
                        return;
                    }
                }

                // Something went wrong when extracting the questions data. Abort.
                log.warn('Aborting because of an error parsing options.', question.name, option.name);
                return self.showDirectiveError(scope);
            });
        }
    };

    /**
     * Convenience function to show a parsing error and abort.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#showDirectiveError
     * @param  {Object} scope Directive scope.
     * @return {Void}
     */
    self.showDirectiveError = function(scope) {
        // Prevent consecutive errors.
        var now = new Date().getTime();
        if (now - lastErrorShown > 500) {
            lastErrorShown = now;
            $mmUtil.showErrorModal('Error processing the question. This could be caused by custom modifications in your site.');
        }
        scope.abort();
    };

    return self;
});
