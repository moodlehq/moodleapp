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

angular.module('mm.core')

/**
 * Directive to adapt a textarea rows depending on the input text. It's based on Moodle's data-auto-rows.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmAutoRows
 * @description
 * Usage:
 * <textarea class="mm-textarea" ng-model="newMessage" rows="1" mm-auto-rows mm-max-rows="5"></textarea>
 *
 * Attributes:
 *
 * @param {Number} [mmMaxRows] Maximum number of rows to be shown. Defaults to 5.
 */
.directive('mmAutoRows', function() {

    /**
     * Determine how many rows should be set for the given textarea.
     *
     * @param {Object} element The textarea element.
     * @param {Object} attrs   The directive attributes.
     * @return {Number}        The number of rows for the textarea.
     */
    function calculateRows(element, attrs) {
        var currentRows = parseInt(element.attr('rows'), 10) || 1,
            maxRows = parseInt(attrs.mmMaxRows, 10) || 5,
            computedStyle = getComputedStyle(element[0]),
            padding = (parseInt(computedStyle.paddingBottom, 10) || 0) + (parseInt(computedStyle.paddingTop, 10) || 0),
            height = (element[0].offsetHeight || element[0].height || element[0].clientHeight || 0) - padding,
            scrollHeight,
            rows;

        if (height <= 0) {
            // Cannot calculate height, assume 1 row.
            return 1;
        }

        // Set height to 1px to force scroll height to calculate correctly.
        element.css('height', '1px');

        scrollHeight = element[0].scrollHeight;
        rows = Math.ceil((scrollHeight - padding) / (height / currentRows));

        // Remove the height styling to let the height be calculated automatically based on the row attribute.
        element.css('height', '');

        if (maxRows && rows >= maxRows) {
            return maxRows;
        } else {
            return rows;
        }
    }

    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var lastModelChange;

            if (attrs.ngModel) {
                // The textarea has a ngModel, watch for changes in the model.
                scope.$watch(attrs.ngModel, function(newValue) {
                    if (typeof newValue != 'undefined') {
                        lastModelChange = Date.now();
                        valueChanged();
                    }
                });
            }

            // Listen for changes. This is always needed since scope.$watch doesn't detect new lines.
            element.on('input propertychange', function() {
                if (lastModelChange && Date.now() - lastModelChange <= 20) {
                    // Change already treated in scope $watch, no need to treat it in here.
                    lastModelChange = 0;
                } else {
                    valueChanged();
                }
            });

            function valueChanged() {
                var currentRows = element.attr('rows'),
                    rows = calculateRows(element, attrs);

                if (rows != currentRows) {
                    element.attr('rows', rows);
                }
            }
        }
    };
});
