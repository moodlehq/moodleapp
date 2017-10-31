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
 * Directive to render assign feedback comments.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignFeedbackComments
 */
.directive('mmaModAssignFeedbackComments', function($mmaModAssign, $mmText, $mmUtil, $q, $mmaModAssignFeedbackCommentsHandler,
        $mmEvents, mmaModAssignFeedbackSavedEvent, $mmSite, $mmaModAssignOffline) {

    // Convenience function to getContents.
    function getContents(scope, rteEnabled) {
        var draft = $mmaModAssignFeedbackCommentsHandler.getDraft(scope.assign.id, scope.userid);
        if (!draft) {
            // Get the text. Check if we have anything offline.
            // Submission grades are not identified using attempt number so it can retrieve the feedback for a previous
            // attempt. The app will not treat that as an special case.
            return $mmaModAssignOffline.getSubmissionGrade(scope.assign.id, scope.userid).catch(function() {
                // No offline data found.
            }).then(function(offlineData) {
                if (offlineData && offlineData.plugindata && offlineData.plugindata.assignfeedbackcomments_editor) {
                    scope.isSent = false;
                    // Save offline as draft.
                    $mmaModAssignFeedbackCommentsHandler.saveDraft(scope.assign.id, scope.userid,
                        offlineData.plugindata.assignfeedbackcomments_editor);
                    return offlineData.plugindata.assignfeedbackcomments_editor.text;
                }

                scope.isSent = true;
                // No offline data found, return online text.
                return $mmaModAssign.getSubmissionPluginText(scope.plugin, scope.edit && !rteEnabled);
            });
        } else {
            scope.isSent = false;
        }
        return $q.when(draft.text);
    }

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/assign/feedback/comments/template.html',
        link: function(scope, element, attributes) {
            var obsSaved;

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

                return getContents(scope, rteEnabled);
            }).then(function(text) {

                // Get the text.
                scope.model = {
                    text: text
                };

                if (!scope.canEdit && !scope.edit) {
                    angular.element(element).on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (scope.model.text && scope.model.text != "") {
                            // Open a new state with the interpolated contents.
                            $mmText.expandText(scope.plugin.name, scope.model.text, false, scope.assignComponent,
                                scope.assign.cmid);
                        }
                    });
                }

                if (!scope.edit) {
                    // Listen for feedback saved event to refresh data.
                    obsSaved = $mmEvents.on(mmaModAssignFeedbackSavedEvent, function(data) {
                        if (scope.plugin.type ==  data.pluginType && scope.assign && data.assignmentId == scope.assign.id &&
                                data.userId == scope.userid && data.siteId == $mmSite.getId()) {
                            return getContents(scope, rteEnabled).then(function(text) {
                                scope.model.text = text;
                            });
                        }
                    });

                    scope.$on('$destroy', function() {
                        obsSaved && obsSaved.off && obsSaved.off();
                    });
                } else {
                    scope.plugin.originalText = text;
                }

                // Text changed in first render.
                scope.firstRender = function() {
                    scope.plugin.originalText = scope.model.text;
                };
            });
        }
    };
});
