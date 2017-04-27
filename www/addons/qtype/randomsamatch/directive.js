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

angular.module('mm.addons.qtype_randomsamatch')

/**
 * Directive to render a random short-answer matching question.
 *
 * @module mm.addons.qtype_randomsamatch
 * @ngdoc directive
 * @name mmaQtypeRandomSaMatch
 */
.directive('mmaQtypeRandomSaMatch', function($log, $mmQuestionHelper) {
	$log = $log.getInstance('mmaQtypeRandomSaMatch');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/match/template.html',
        link: function(scope) {
            $mmQuestionHelper.matchingDirective(scope, $log);
        }
    };
});
