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
 * Directive to handle activity completion. It can be adapted to handle course completion once it's implemented.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmCompletion
 * @description
 * This directive will show a checkbox to show completion status and to allow manually changing the completion if it's allowed.
 * Attributes:
 *
 * @param {Object} completion    Completion status of the activity. Required properties:
 *                                   - cmid: Module ID.
 *                                   - state: Current completion state: 0 incomplete, 1 complete, 2 complete pass, 3 complete fail.
 *                                   - tracking: 0 means none, 1 manual, 2 automatic.
 * @param {String} after-change  Name of a scope function to call when completion changes.
 * @param {String} module-name   Name of the module this completion refers to.
 */
.directive('mmCompletion', function($mmSite, $mmUtil, $mmText, $translate, $q) {

    // Set image and description to show as completion icon.
    function showStatus(scope) {
        var langKey,
            moduleName = scope.moduleName || '';

        if (scope.completion.tracking === 1 && scope.completion.state === 0) {
            scope.completionImage = 'img/completion/completion-manual-n.svg';
            langKey = 'mm.core.completion-alt-manual-n';
        } else if(scope.completion.tracking === 1 && scope.completion.state === 1) {
            scope.completionImage = 'img/completion/completion-manual-y.svg';
            langKey = 'mm.core.completion-alt-manual-y';
        } else if(scope.completion.tracking === 2 && scope.completion.state === 0) {
            scope.completionImage = 'img/completion/completion-auto-n.svg';
            langKey = 'mm.core.completion-alt-auto-n';
        } else if(scope.completion.tracking === 2 && scope.completion.state === 1) {
            scope.completionImage = 'img/completion/completion-auto-y.svg';
            langKey = 'mm.core.completion-alt-auto-y';
        } else if(scope.completion.tracking === 2 && scope.completion.state === 2) {
            scope.completionImage = 'img/completion/completion-auto-pass.svg';
            langKey = 'mm.core.completion-alt-auto-pass';
        } else if(scope.completion.tracking === 2 && scope.completion.state === 3) {
            scope.completionImage = 'img/completion/completion-auto-fail.svg';
            langKey = 'mm.core.completion-alt-auto-fail';
        }

        if (moduleName) {
            $mmText.formatText(moduleName, true, true, 50).then(function(formatted) {
                $translate(langKey, {$a: formatted}).then(function(translated) {
                    scope.completionDescription = translated;
                });
            });
        }
    }

    return {
        restrict: 'E',
        priority: 100,
        scope: {
            completion: '=',
            afterChange: '=',
            moduleName: '=?'
        },
        templateUrl: 'core/templates/completion.html',
        link: function(scope, element, attrs) {
            if (scope.completion) {
                showStatus(scope);

                element.on('click', function(e) {
                    if (typeof scope.completion.cmid == 'undefined' || scope.completion.tracking !== 1) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();

                    var modal = $mmUtil.showModalLoading(),
                        params = {
                            cmid: scope.completion.cmid,
                            completed: scope.completion.state === 1 ? 0 : 1
                        };

                    $mmSite.write('core_completion_update_activity_completion_status_manually', params).then(function(response) {
                        if (!response.status) {
                            return $q.reject();
                        }

                        if (angular.isFunction(scope.afterChange)) {
                            scope.afterChange();
                        }
                    }).catch(function(error) {
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errorchangecompletion', true);
                    }).finally(function() {
                        modal.dismiss();
                    });
                });
            }
        }
    };
});
