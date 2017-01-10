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
 * Directive to navigate to previous/next page in a quiz.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc directive
 * @name mmaModQuizArrows
 * @description
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next quiz page when
 * clicked. If no previous/next page is defined, that arrow won't be shown.
 *
 * @param {Number}   previous Previous page number.
 * @param {Number}   next     Next page number.
 * @param {Function} action   Function to call when an arrow is clicked. Will receive as a param the page to load.
 */
.directive('mmaModQuizArrows', function() {
    return {
        restrict: 'E',
        scope: {
            previous: '=?',
            next: '=?',
            action: '=?'
        },
        templateUrl: 'addons/mod/quiz/templates/arrows.html'
    };
});
