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
.factory('$mmQuestionHelper', function($mmUtil, $mmText, $ionicModal, mmQuestionComponent, $mmSitesManager, $mmFilepool, $q,
            $mmQuestion, $mmSite, $mmQuestionDelegate) {

    var self = {},
        lastErrorShown = 0;

    /**
     * Add a behaviour button to the question's "behaviourButtons" property.
     *
     * @param {Object} question Question.
     * @param {Object} button   Button (DOM element).
     */
    function addBehaviourButton(question, button) {
        if (!button || !question) {
            return;
        }

        if (!question.behaviourButtons) {
            question.behaviourButtons = [];
        }

        // Extract the data we want.
        question.behaviourButtons.push({
            id: button.id,
            name: button.name,
            value: button.value,
            disabled: button.disabled
        });
    }

    /**
     * Generic link function for question directives with an input of type "text" and, optionally, a select for the units.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#calculatedDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Void}
     */
    self.calculatedDirective = function(scope, log) {
        // Treat the input text first.
        var questionEl = self.inputTextDirective(scope, log);
        if (questionEl) {
            questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

            // Check if the question has a select for units.
            var selectModel = {},
                select = questionEl.querySelector('select[name*=unit]'),
                options = select && select.querySelectorAll('option'),
                input;

            if (select && options && options.length) {

                selectModel.id = select.id;
                selectModel.name = select.name;
                selectModel.disabled = select.disabled;
                selectModel.options = [];

                // Treat each option.
                angular.forEach(options, function(option) {
                    if (typeof option.value == 'undefined') {
                        log.warn('Aborting because couldn\'t find option value.', question.name);
                        return self.showDirectiveError(scope);
                    }
                    var opt = {
                        value: option.value,
                        label: option.innerHTML
                    };

                    if (option.selected) {
                        selectModel.selected = opt.value;
                        selectModel.selectedLabel = opt.label;
                    }

                    selectModel.options.push(opt);
                });

                if (!selectModel.selected) {
                    // No selected option, select the first one.
                    selectModel.selected = selectModel.options[0].value;
                    selectModel.selectedLabel = selectModel.options[0].label;
                }

                // Get the accessibility label.
                accessibilityLabel = questionEl.querySelector('label[for="' + select.id + '"]');
                selectModel.accessibilityLabel = accessibilityLabel.innerHTML;

                scope.select = selectModel;

                // Check which one should be displayed first: the select or the input.
                input = questionEl.querySelector('input[type="text"][name*=answer]');
                scope.selectFirst = questionEl.innerHTML.indexOf(input.outerHTML) > questionEl.innerHTML.indexOf(select.outerHTML);

                return;
            }

            // Check if the question has radio buttons for units.
            options = questionEl.querySelectorAll('input[type="radio"]');
            if (!options || !options.length) {
                return;
            }

            scope.options = [];

            angular.forEach(options, function(element) {

                var option = {
                        id: element.id,
                        name: element.name,
                        value: element.value,
                        checked: element.checked,
                        disabled: element.disabled
                    },
                    label;

                // Get the label with the question text.
                label = questionEl.querySelector('label[for="' + option.id + '"]');
                if (label) {
                    option.text = label.innerText;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        if (element.checked) {
                            // If the option is checked and it's a single choice we use the model to select the one.
                            scope.unit = option.value;
                        }

                        scope.options.push(option);
                        return;
                    }
                }

                // Something went wrong when extracting the questions data. Abort.
                log.warn('Aborting because of an error parsing options.', question.name, option.name);
                return self.showDirectiveError(scope);
            });

            // Check which one should be displayed first: the options or the input.
            input = questionEl.querySelector('input[type="text"][name*=answer]');
            scope.optionsFirst = questionEl.innerHTML.indexOf(input.outerHTML) > questionEl.innerHTML.indexOf(options[0].outerHTML);
        }
    };

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
        if (typeof question.text == 'undefined') {
            log.warn('Aborting because of an error parsing question.', question.name);
            return self.showDirectiveError(scope);
        }

        return questionEl;
    };

    /**
     * Extract question behaviour submit buttons from the question's HTML and add them to "behaviourButtons" property.
     * The buttons aren't deleted from the content because all the im-controls block will be removed afterwards.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQbehaviourButtons
     * @param  {Object} question   Question to treat.
     * @param  {String} [selector] Selector to search the buttons. By default, '.im-controls input[type="submit"]'.
     * @return {Void}
     */
    self.extractQbehaviourButtons = function(question, selector) {
        selector = selector || '.im-controls input[type="submit"]';

        // Create a fake div element so we can search using querySelector.
        var div = document.createElement('div'),
            buttons;

        div.innerHTML = question.html;

        // Search the buttons.
        buttons = div.querySelectorAll(selector);
        angular.forEach(buttons, function(button) {
            addBehaviourButton(question, button);
        });

        question.html = div.innerHTML;
    };

    /**
     * Check if the question has CBM and, if so, extract the certainty options and add them to a new
     * "behaviourCertaintyOptions" property.
     * The value of the selected option is stored in question.behaviourCertaintySelected.
     * We don't remove them from HTML because all the im-controls block will be removed afterwards.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQbehaviourCBM
     * @param  {Object} question Question to treat.
     * @return {Boolean}         True if the seen input is found, false otherwise.
     */
    self.extractQbehaviourCBM = function(question) {
        // Create a fake div element so we can search using querySelector.
        var div = document.createElement('div'),
            labels;

        div.innerHTML = question.html;

        labels = div.querySelectorAll('.im-controls .certaintychoices label[for*="certainty"]');
        question.behaviourCertaintyOptions = [];

        angular.forEach(labels, function(label) {
            var input = label.querySelector('input[type="radio"]');
            if (input) {
                question.behaviourCertaintyOptions.push({
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    text: $mmText.cleanTags(label.innerHTML),
                    disabled: input.disabled
                });

                if (input.checked) {
                    question.behaviourCertaintySelected = input.value;
                }
            }
        });

        // If we have a certainty value stored in local we'll use that one.
        if (question.localAnswers && typeof question.localAnswers['-certainty'] != 'undefined') {
            question.behaviourCertaintySelected = question.localAnswers['-certainty'];
        }

        return labels && labels.length;
    };

    /**
     * Check if the question has a redo button and, if so, add it to "behaviourButtons" property
     * and remove it from the HTML.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQbehaviourRedoButton
     * @param  {Object} question Question to treat.
     * @return {Void}
     */
    self.extractQbehaviourRedoButton = function(question) {
        // Create a fake div element so we can search using querySelector.
        var div = document.createElement('div'),
            redoSelector = 'input[type="submit"][name*=redoslot], input[type="submit"][name*=tryagain]';

        // Search redo button in feedback (Moodle 3.1+).
        if (!searchButton('html', '.outcome ' + redoSelector)) {
            // Not found in question HTML.
            if (question.feedbackHtml) {
                // We extracted the feedback already, search it in there.
                if (searchButton('feedbackHtml', redoSelector)) {
                    // Button found, stop.
                    return;
                }
            }

            // Button still not found. Now search in the info box if it exists.
            if (question.infoHtml) {
                searchButton('infoHtml', redoSelector);
            }
        }

        // Search the button in a certain question property containing HTML.
        function searchButton(htmlProperty, selector) {
            var button;

            div.innerHTML = question[htmlProperty];

            button = div.querySelector(selector);
            if (button) {
                addBehaviourButton(question, button);
                angular.element(button).remove();
                question[htmlProperty] = div.innerHTML;
                return true;
            }
            return false;
        }
    };

    /**
     * Check if the question contains a "seen" input.
     * If so, add the name and value to a "behaviourSeenInput" property and remove the input.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQbehaviourSeenInput
     * @param  {Object} question Question to treat.
     * @return {Boolean}         True if the seen input is found, false otherwise.
     */
    self.extractQbehaviourSeenInput = function(question) {
        // Create a fake div element so we can search using querySelector.
        var div = document.createElement('div'),
            seenInput;

        div.innerHTML = question.html;

        // Search the "seen" input.
        seenInput = div.querySelector('input[type="hidden"][name*=seen]');
        if (seenInput) {
            // Get the data and remove the input.
            question.behaviourSeenInput = {
                name: seenInput.name,
                value: seenInput.value
            };
            angular.element(seenInput).remove();
            question.html = div.innerHTML;

            // Return the directive to render this input.
            return true;
        }
        return false;
    };

    /**
     * Removes the comment from the question HTML code and adds it in a new "commentHtml" property.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQuestionComment
     * @param  {Object} question Question.
     * @return {Void}
     */
    self.extractQuestionComment = function(question) {
        extractQuestionLastElementNotInContent(question, '.comment', 'commentHtml');
    };

    /**
     * Removes the feedback from the question HTML code and adds it in a new "feedbackHtml" property.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQuestionFeedback
     * @param  {Object} question Question.
     * @return {Void}
     */
    self.extractQuestionFeedback = function(question) {
        extractQuestionLastElementNotInContent(question, '.outcome', 'feedbackHtml');
    };

    /**
     * Extracts the info box from a question and add it to an "infoHtml" property.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#extractQuestionInfoBox
     * @param  {Object} question Question.
     * @param  {String} selector Selector to search the element.
     * @return {Void}
     */
    self.extractQuestionInfoBox = function(question, selector) {
        extractQuestionLastElementNotInContent(question, selector, 'infoHtml');
    };

    /**
     * Searches the last occurrence of a certain element and check it's not in the question contents.
     * If found, removes it from the question HTML and adds it to a new property inside question.
     *
     *
     * @param  {Object} question Question.
     * @param  {String} selector Selector to search the element.
     * @param  {String} attrName Name of the attribute to store the HTML in.
     * @return {Void}
     */
    function extractQuestionLastElementNotInContent(question, selector, attrName) {
        // Create a fake div element so we can search using querySelector.
        var div = document.createElement('div'),
            matches,
            last,
            position;

        div.innerHTML = question.html;

        matches = div.querySelectorAll(selector);

        // Get the last element and check it's not in the question contents.
        // We don't use .pop() because the result of querySelectorAll doesn't support it.
        position = matches.length -1;
        last = matches[position];
        while (last) {
            if (!$mmUtil.closest(last, '.formulation')) {
                question[attrName] = last.innerHTML;
                angular.element(last).remove();
                question.html = div.innerHTML;
                return;
            }

            // It's inside the question content, treat next element.
            position--;
            last = matches[position];
        }
    }

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
                var initMatches = match.match(new RegExp('M\.qtype_' + question.type + '\.init_question\\(.*?}\\);', 'mg'));
                if (initMatches) {
                    var initMatch = initMatches.pop();

                    // Remove start and end of the match, we only want the object.
                    initMatch = initMatch.replace('M.qtype_' + question.type + '.init_question(', '');
                    initMatch = initMatch.substr(0, initMatch.length - 2);

                    // Try to convert it to an object and add it to the question.
                    try {
                        question.initObjects = JSON.parse(initMatch);
                    } catch(ex) {}
                }
            });
        }
    };

    /**
     * Get the names of all the inputs inside an HTML code.
     * This function will return an object where the keys are the input names. The values will always be true.
     * This is in order to make this function compatible with other functions like $mmQuestion#getBasicAnswers.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getAllInputNamesFromHtml
     * @param  {String} html HTML code.
     * @return {Object}      Object where the keys are the names.
     */
    self.getAllInputNamesFromHtml = function(html) {
        var form = document.createElement('form'),
            answers = {};

        form.innerHTML = html;

        // Search all input elements.
        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            answers[$mmQuestion.removeQuestionPrefix(name)] = true;
        });

        return answers;
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

        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
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
     * Given an HTML code with list of attachments, returns the list of attached files (filename and fileurl).
     * Please take into account that this function will treat all the anchors in the HTML, you should provide
     * an HTML containing only the attachments anchors.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getQuestionAttachmentsFromHtml
     * @param  {String} html HTML code to search in.
     * @return {Object[]}    Attachments.
     */
    self.getQuestionAttachmentsFromHtml = function(html) {
        var el = angular.element('<div></div>'),
            anchors,
            attachments = [];

        // Add the HTML and get the plain JS element.
        el.html(html);
        el = el[0];

        // Remove the filemanager (area to attach files to a question).
        $mmUtil.removeElement(el, 'div[id*=filemanager]');

        // Search the anchors.
        anchors = el.querySelectorAll('a');
        angular.forEach(anchors, function(anchor) {
            var content = anchor.innerHTML;
            // Check anchor is valid.
            if (anchor.href && content) {
                content = $mmText.cleanTags(content, true).trim();
                attachments.push({
                    filename: content,
                    fileurl: anchor.href
                });
            }
        });

        return attachments;
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
     * Get the CSS class for a question based on its state.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#getQuestionStateClass
     * @param  {String} name Question's state name.
     * @return {String}      State class.
     */
    self.getQuestionStateClass = function(name) {
        var state = $mmQuestion.getState(name);
        return state ? state.class : '';
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
     * Check if some HTML contains draft file URLs for the current site.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#hasDraftFileUrls
     * @param  {String} html Question's HTML.
     * @return {Boolean}     True if contains draft files URLs, false otherwise.
     */
    self.hasDraftFileUrls = function(html) {
        var url = $mmSite.getURL();
        if (url.slice(-1) != '/') {
            url = url += '/';
        }
        url += 'draftfile.php';

        return html.indexOf(url) != -1;
    };

    /**
     * Generic link function for question directives with an input of type "text".
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#inputTextDirective
     * @param  {Object} scope Directive's scope.
     * @param  {Object} log   $log instance to log messages.
     * @return {Oject} The question element.
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
                value: input.value,
                readOnly: input.readOnly
            };

            // Check if question is marked as correct.
            if (input.className.indexOf('incorrect') >= 0) {
                scope.input.isCorrect = 0;
            } else if (input.className.indexOf('correct') >= 0) {
                scope.input.isCorrect = 1;
            }
        }

        return questionEl;
    };

    /**
     * For each input element found in the HTML, search if there's a local answer stored and
     * override the HTML's value with the local one.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#loadLocalAnswersInHtml
     * @param  {Object} question  Question.
     * @return {Void}
     */
    self.loadLocalAnswersInHtml = function(question) {
        var form = document.createElement('form');
        form.innerHTML = question.html;

        // Search all input elements.
        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Search if there's a local answer.
            name = $mmQuestion.removeQuestionPrefix(name);
            if (question.localAnswers && typeof question.localAnswers[name] != 'undefined') {
                var selected;
                if (element.tagName == 'TEXTAREA') {
                    element.innerHTML = question.localAnswers[name];
                } else if (element.tagName == 'SELECT') {
                    // Search the selected option and select it.
                    selected = element.querySelector('option[value="' + question.localAnswers[name] + '"]');
                    if (selected) {
                        selected.setAttribute('selected', 'selected');
                    }
                } else if (element.type == 'radio' || element.type == 'checkbox') {
                    if (element.value == question.localAnswers[name]) {
                        element.setAttribute('checked', 'checked');
                    }
                } else {
                    element.setAttribute('value', question.localAnswers[name]);
                }
            }
        });

        question.html = form.innerHTML;
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
            rows = questionEl.querySelectorAll('table.answer tr');
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
                rowModel.disabled = select.disabled;
                rowModel.selected = false;
                rowModel.options = [];

                // Check if answer is correct.
                if (columns[1].className.indexOf('incorrect') >= 0) {
                    rowModel.isCorrect = 0;
                } else if (columns[1].className.indexOf('correct') >= 0) {
                    rowModel.isCorrect = 1;
                }

                // Treat each option.
                angular.forEach(options, function(option) {
                    if (typeof option.value == 'undefined') {
                        log.warn('Aborting because couldn\'t find option value.', question.name);
                        return self.showDirectiveError(scope);
                    }
                    var opt = {
                        value: option.value,
                        label: option.innerHTML,
                        selected: option.selected
                    };

                    if (opt.selected) {
                        rowModel.selected = opt;
                    }

                    rowModel.options.push(opt);
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
                        checked: element.checked,
                        disabled: element.disabled
                    },
                    label,
                    parent = element.parentNode,
                    feedback;

                // Get the label with the question text.
                label = questionEl.querySelector('label[for="' + option.id + '"]');
                if (label) {
                    option.text = label.innerHTML;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        if (element.checked) {
                            // If the option is checked and it's a single choice we use the model to select the one.
                            if (!question.multi) {
                                scope.mcAnswers[option.name] = option.value;
                            }

                            if (parent) {
                                // Check if answer is correct.
                                if (parent && parent.className.indexOf('incorrect') >= 0) {
                                    option.isCorrect = 0;
                                } else if (parent && parent.className.indexOf('correct') >= 0) {
                                    option.isCorrect = 1;
                                }

                                // Search the feedback.
                                feedback = parent.querySelector('.specificfeedback');
                                if (feedback) {
                                    option.feedback = feedback.innerHTML;
                                }
                            }
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
     * Prefetch the files in a question HTML.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#prefetchQuestionFiles
     * @param  {Object} question     Question.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @param  {String} component    The component to link the files to. If not defined, question component.
     * @param  {Mixed} [componentId] An ID to use in conjunction with the component. If not defined, question ID.
     * @return {Promise}             Promise resolved when all the files have been downloaded.
     */
    self.prefetchQuestionFiles = function(question, siteId, component, componentId) {
        var urls = $mmUtil.extractDownloadableFilesFromHtml(question.html);

        if (!component) {
            component = mmQuestionComponent;
            componentId = question.id;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var promises = [];

            angular.forEach(urls, function(url) {
                if (!site.canDownloadFiles() && $mmUtil.isPluginFileUrl(url)) {
                    return;
                }
                if (url.indexOf('theme/image.php') > -1 && url.indexOf('flagged') > -1) {
                    // Ignore flag images.
                    return;
                }

                promises.push($mmFilepool.addToQueueByUrl(siteId, url, component, componentId));
            });

            return $q.all(promises);
        });
    };

    /**
     * Prepare and return the answers.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#prepareAnswers
     * @param  {Object[]} questions The list of questions.
     * @param  {Object} answers     The input data.
     * @param  {Boolean} offline    True if data should be saved in offline.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with answers to send to server.
     */
    self.prepareAnswers = function(questions, answers, offline, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [],
            error;

        angular.forEach(questions, function(question) {
            promises.push($mmQuestionDelegate.prepareAnswersForQuestion(question, answers, offline, siteId).catch(function(e) {
                error = e;
                return $q.reject();
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return answers;
        }).catch(function() {
            return $q.reject(error);
        });
    };

    /**
     * Replace Moodle's correct/incorrect classes with the Mobile ones.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#replaceCorrectnessClasses
     * @param  {Object} element DOM element.
     * @return {Void}
     */
    self.replaceCorrectnessClasses = function(element) {
        $mmUtil.replaceClassesInElement(element, {
            correct: 'mm-question-answer-correct',
            incorrect: 'mm-question-answer-incorrect'
        });
    };

    /**
     * Replace Moodle's feedback classes with the Mobile ones.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#replaceFeedbackClasses
     * @param  {Object} element DOM element.
     * @return {Void}
     */
    self.replaceFeedbackClasses = function(element) {
        $mmUtil.replaceClassesInElement(element, {
            outcome: 'mm-question-feedback-container mm-question-feedback-padding',
            specificfeedback: 'mm-question-feedback-container mm-question-feedback-inline'
        });
    };

    /**
     * Convenience function to show a parsing error and abort.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#showDirectiveError
     * @param  {Object} scope   Directive scope.
     * @param  {String} [error] Error to show.
     * @return {Void}
     */
    self.showDirectiveError = function(scope, error) {
        error = error || 'Error processing the question. This could be caused by custom modifications in your site.';

        // Prevent consecutive errors.
        var now = new Date().getTime();
        if (now - lastErrorShown > 500) {
            lastErrorShown = now;
            $mmUtil.showErrorModal(error);
        }
        scope.abort();
    };

    /**
     * Treat correctness icons, replacing them with local icons and setting click events to show the feedback if needed.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionHelper#treatCorrectnessIcons
     * @param  {Object} scope   Directive scope.
     * @param  {Object} element DOM element.
     * @return {Void}
     */
    self.treatCorrectnessIcons = function(scope, element) {
        element = element[0] || element; // Convert from jqLite to plain JS if needed.

        var icons = element.querySelectorAll('img.icon, img.questioncorrectnessicon');
        angular.forEach(icons, function(icon) {
            // Replace the icon with the font version. This will avoid some errors when adding mm-adapt-img class.
            if (icon.src) {
                var newIcon = document.createElement('i');

                if (icon.src.indexOf('incorrect') > -1) {
                    newIcon.className = 'icon fa fa-remove text-danger fa-fw questioncorrectnessicon';
                } else if (icon.src.indexOf('correct') > -1) {
                    newIcon.className = 'icon fa fa-check text-success fa-fw questioncorrectnessicon';
                } else {
                    return;
                }

                newIcon.title = icon.title;
                newIcon.ariaLabel = icon.title;
                icon.parentNode.replaceChild(newIcon, icon);
                icon = newIcon;
            }
        });

        var spans = element.querySelectorAll('.feedbackspan.accesshide');
        angular.forEach(spans, function(span) {
            // Search if there's a hidden feedback for this element.
            var icon = span.previousSibling,
                iconAng;
            if (!icon) {
                return;
            }

            iconAng = angular.element(icon);
            if (!iconAng.hasClass('icon') && !iconAng.hasClass('questioncorrectnessicon')) {
                return;
            }

            iconAng.addClass('questioncorrectnessicon');

            // There's a hidden feedback, set up ngClick to show the feedback.
            icon.setAttribute('ng-click', 'questionCorrectnessIconClicked($event)');
        });

        // Set icon click function.
        scope.questionCorrectnessIconClicked = function(event) {
            var parent = event.target.parentNode,
                feedback;
            if (parent) {
                feedback = parent.querySelector('.feedbackspan.accesshide');
                if (feedback && feedback.innerHTML) {
                    scope.currentFeedback = feedback.innerHTML;
                    scope.feedbackModal.show();
                }
            }
        };

        // Feedback modal.
        $ionicModal.fromTemplateUrl('core/components/question/templates/feedbackmodal.html', {
            scope: scope
        }).then(function(modal) {
            scope.feedbackModal = modal;

            scope.closeModal = function() {
                modal.hide();
            };
        });
    };

    return self;
});
