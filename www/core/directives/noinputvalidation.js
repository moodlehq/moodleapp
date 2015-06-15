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
 * Directive to prevent input validation on input fields.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmNoInputValidation
 * @description
 * Sometimes we might want to disable automatic validation on some input fields (like URLs).
 * This directive allows us to do so.
 */
.directive('mmNoInputValidation', function() {
    return {
        restrict: 'A',
        priority: 500,
        compile: function(el, attrs) {
            attrs.$set('type',
                null,                //to delete type from attributes object
                false                //to preserve type attribute in DOM
            );
        }
    }
});
