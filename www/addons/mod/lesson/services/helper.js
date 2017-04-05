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
.factory('$mmaModLessonHelper', function() {

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
                content: buttonEl.innerHTML,
                data: {}
            };

            angular.forEach(inputs, function(input) {
                button.data[input.name] = input.value;
            });

            buttons.push(button);
        });

        return buttons;
    };

    return self;
});