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

angular.module('mm.addons.qtype_description')

/**
 * Directive to render a description question.
 *
 * @module mm.addons.qtype_description
 * @ngdoc directive
 * @name mmaQtypeDescription
 */
.directive('mmaQtypeDescription', function($log, $mmQuestionHelper) {
	$log = $log.getInstance('mmaQtypeDescription');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/description/template.html',
        link: function(scope) {
            var questionEl = $mmQuestionHelper.directiveInit(scope, $log),
                input;
            if (questionEl) {
                // Get the "seen" hidden input.
                input = questionEl[0].querySelector('input[type="hidden"][name*=seen]');
                if (input) {
                    scope.seenInput = {
                        name: input.name,
                        value: input.value
                    };
                }
            }
        }
    };
});
