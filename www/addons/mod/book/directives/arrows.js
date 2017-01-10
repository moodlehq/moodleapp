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

angular.module('mm.addons.mod_book')

/**
 * Directive to navigate to previous/next chapter in a book.
 *
 * @module mm.addons.mod_book
 * @ngdoc directive
 * @name mmaModBookArrows
 * @description
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next book chapter when
 * clicked. If no previous/next chapter is defined, that arrow won't be shown.
 *
 * @param {Number}   previous ID of the previous chapter.
 * @param {Number}   next     ID of the next chapter.
 * @param {Function} action   Function to call when an arrow is clicked. Will receive as a param the chapterId to load.
 */
.directive('mmaModBookArrows', function() {
    return {
        restrict: 'E',
        scope: {
            previous: '=?',
            next: '=?',
            action: '=?'
        },
        templateUrl: 'addons/mod/book/templates/arrows.html'
    };
});
