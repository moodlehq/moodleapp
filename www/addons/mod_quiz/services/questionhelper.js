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

angular.module('mm.addons.mod_quiz')

/**
 * Helper to gather some common functions for question directives.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuestionHelper
 */
.factory('$mmaModQuestionHelper', function($mmaModQuizHelper, $mmUtil) {

    var self = {};

    /**
     * Convenience function to initialize a question directive.
     * Performs some common checks and extracts the question's text.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuestionHelper#directiveInit
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Object}       Angular DOM element of the question's HTML. Undefined if an error happens.
     */
    self.directiveInit = function(scope, log) {
        var question = scope.question,
            questionEl;

        if (!question) {
            log.warn('Aborting quiz because of no question received.');
            return self.showDirectiveError(scope);
        }

        questionEl = angular.element(question.html);

        // Extract question text.
        question.text = $mmaModQuizHelper.getContentsOfElement(questionEl, '.qtext');
        if (!question.text) {
            log.warn('Aborting quiz because of an error parsing question.', question.name);
            return self.showDirectiveError(scope);
        }

        return questionEl;
    };

    /**
     * Generic link function for question directives with an input of type "text".
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuestionHelper#inputTextDirective
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
                log.warn('Aborting quiz because couldn\'t find input.', question.name);
                return self.showDirectiveError(scope);
            }

            // Add current value to model if set.
            if (input.value) {
                scope.answers[input.name] = input.value;
            }

            scope.input = {
                id: input.id,
                name: input.name
            };
        }
    };

    /**
     * Generic link function for question directives with a multi choice input.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuestionHelper#multiChoiceDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Void}
     */
    self.multiChoiceDirective = function(scope, log) {
        var questionEl = self.directiveInit(scope, log),
            question = scope.question;

        if (questionEl) {
            questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

            // Get the prompt.
            question.prompt = $mmaModQuizHelper.getContentsOfElement(questionEl, '.prompt');

            // Search radio buttons first (single choice).
            var options = questionEl.querySelectorAll('input[type="radio"]');
            if (!options || !options.length) {
                // Radio buttons not found, it should be a multi answer. Search for checkbox.
                question.multi = true;
                options = questionEl.querySelectorAll('input[type="checkbox"]');

                if (!options || !options.length) {
                    // No checkbox found either. Abort the quiz.
                    log.warn('Aborting quiz because of no radio and checkbox found.', question.name);
                    return self.showDirectiveError(scope);
                }
            }

            question.options = [];

            angular.forEach(options, function(element) {

                var option = {
                        id: element.id,
                        name: element.name,
                        value: element.value,
                    },
                    label;

                // Get the label with the question text.
                label = questionEl.querySelector('label[for="' + option.id + '"]');
                if (label) {
                    option.text = label.innerHTML;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        // If the option is checked we store the data in the model.
                        if (element.checked) {
                            scope.answers[option.name] = question.multi ? true : option.value;
                        }
                        question.options.push(option);
                        return;
                    }
                }

                // Something went wrong when extracting the questions data. Abort.
                log.warn('Aborting quiz because of an error parsing options.', question.name, option.name);
                return self.showDirectiveError(scope);
            });
        }
    };

    /**
     * Convenience function to show a parsing error and abort a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuestionHelper#showDirectiveError
     * @param  {Object} scope Directive scope.
     * @return {Void}
     */
    self.showDirectiveError = function(scope) {
        $mmUtil.showErrorModal('Error parsing question. Please make sure you don\'t have a custom theme that can affect this.');
        scope.abortQuiz();
    };

    return self;
});
