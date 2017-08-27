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

angular.module('mm.addons.qtype_ddmarker')

/**
 * Directive to render a drag and drop markers.
 *
 * @module mm.addons.qtype_ddmarker
 * @ngdoc directive
 * @name mmaQtypeDdmarker
 */
.directive('mmaQtypeDdmarker', function($log, $mmQuestionHelper, $mmaQtypeDdmarkerRender, $timeout, $mmUtil) {
    $log = $log.getInstance('mmaQtypeDdmarker');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/ddmarker/template.html',
        link: function(scope) {
            var ddarea, ddform, wrongparts, questionEl,
                dropzones = [],
                question = scope.question;

            if (!question) {
                $log.warn('Aborting because of no question received.');
                return $mmQuestionHelper.showDirectiveError(scope);
            }

            questionEl = angular.element(question.html);
            questionEl = questionEl[0] || questionEl;

            ddarea = questionEl.querySelector('.ddarea');
            ddform = questionEl.querySelector('.ddform');
            question.text = $mmUtil.getContentsOfElement(questionEl, '.qtext');
            if (!ddarea || !ddform || typeof question.text == 'undefined') {
                log.warn('Aborting because of an error parsing question.', question.name);
                return self.showDirectiveError(scope);
            }

            question.ddarea = ddarea.outerHTML;

            wrongparts = questionEl.querySelector('.wrongparts');
            if (wrongparts) {
                question.ddarea += wrongparts.outerHTML;
            }
            question.ddarea += ddform.outerHTML;
            question.readonly = false;

            if (question.initObjects) {
                if (typeof question.initObjects.dropzones != 'undefined') {
                    dropzones = question.initObjects.dropzones;
                }
                if (typeof question.initObjects.readonly != 'undefined') {
                    question.readonly = question.initObjects.readonly;
                }
            }

            question.loaded = false;

            $timeout(function() {
                var qi = $mmaQtypeDdmarkerRender.init_question(question, question.readonly, dropzones);

                scope.$on('$destroy', function() {
                    qi.destroy();
                });
            });
        }
    };
});
