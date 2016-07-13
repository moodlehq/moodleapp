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

angular.module('mm.addons.mod_assign')

/**
 * Directive to render assign submission onlinetext.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignSubmissionOnlinetext
 */
.directive('mmaModAssignSubmissionOnlinetext', function($mmaModAssign, $mmText, $timeout, $q, $mmUtil) {

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/assign/submission/onlinetext/template.html',
        link: function(scope, element) {
            var wordCountTimeout,
                promise,
                rteEnabled;

            if (!scope.plugin) {
                return;
            }

            // Check if rich text editor is enabled.
            if (scope.edit) {
                promise = $mmUtil.isRichTextEditorEnabled();
            } else {
                // We aren't editing, so no rich text editor.
                promise = $q.when(false);
            }

            promise.then(function(enabled) {
                rteEnabled = enabled;

                // Get the text.
                var text = $mmaModAssign.getSubmissionPluginText(scope.plugin, scope.edit && !rteEnabled);
                return text;
            }).then(function(text) {
                var firstChange = true,
                    now = new Date().getTime();

                // We receive them as strings, convert to int.
                scope.configs.wordlimit = parseInt(scope.configs.wordlimit, 10);
                scope.configs.wordlimitenabled = parseInt(scope.configs.wordlimitenabled, 10);

                // Get the text.
                scope.model = {
                    text: text
                };

                if (!scope.edit) {
                    // Not editing, see full text when clicked.
                    angular.element(element).on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (text) {
                            // Open a new state with the interpolated contents.
                            $mmText.expandText(scope.plugin.name, text);
                        }
                    });
                }

                // Text changed.
                scope.onChange = function() {
                    if (rteEnabled && firstChange && new Date().getTime() - now < 1000) {
                        // On change triggered by first rendering. Store the value as the initial text.
                        // This is because rich text editor performs some minor changes (like new lines),
                        // and we don't want to detect those as real user changes.
                        scope.plugin.rteInitialText = scope.model.text;
                    }
                    firstChange = false;

                    // Count words if needed.
                    if (scope.configs.wordlimitenabled) {
                        // Cancel previous wait.
                        $timeout.cancel(wordCountTimeout);
                        // Wait before calculating, if the user keeps inputing we won't calculate.
                        // This is to prevent slowing down devices, this calculation can be slow if the text is long.
                        wordCountTimeout = $timeout(function() {
                            scope.words = $mmText.countWords(scope.model.text);
                        }, 1500);
                    }
                };
            });
        }
    };
});
