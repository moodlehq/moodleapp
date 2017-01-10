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

angular.module('mm.addons.qtype_ddimageortext')

/**
 * Directive to render a drag and drop image or text question.
 *
 * @module mm.addons.qtype_ddimageortext
 * @ngdoc directive
 * @name mmaQtypeDdimageortext
 */
.directive('mmaQtypeDdimageortext', function($log, $mmQuestionHelper, $mmaQtypeDdimageortextRender, $timeout, $mmUtil) {
	$log = $log.getInstance('mmaQtypeDdimageortext');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/ddimageortext/template.html',
        link: function(scope) {
            var ddarea, questionEl,
                drops = [],
                question = scope.question;

            if (!question) {
                $log.warn('Aborting because of no question received.');
                return $mmQuestionHelper.showDirectiveError(scope);
            }

            questionEl = angular.element(question.html);
            questionEl = questionEl[0] || questionEl;

            ddarea = questionEl.querySelector('.ddarea');
            question.text = $mmUtil.getContentsOfElement(questionEl, '.qtext');
            if (!ddarea || typeof question.text == 'undefined') {
                log.warn('Aborting because of an error parsing question.', question.name);
                return self.showDirectiveError(scope);
            }

            question.ddarea = ddarea.outerHTML;
            question.readonly = false;

            if (question.initObjects) {
                if (typeof question.initObjects.drops != 'undefined') {
                    drops = question.initObjects.drops;
                }
                if (typeof question.initObjects.readonly != 'undefined') {
                    question.readonly = question.initObjects.readonly;
                }
            }

            question.loaded = false;

            $timeout(function() {
                var qi = $mmaQtypeDdimageortextRender.init_question(question, question.readonly, drops);

                scope.$on('$destroy', function() {
                    qi.destroy();
                });
            });
        }
    };
});
