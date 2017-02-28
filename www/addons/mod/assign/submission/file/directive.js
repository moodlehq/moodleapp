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
 * Directive to render assign submission file.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignSubmissionFile
 */
.directive('mmaModAssignSubmissionFile', function($mmaModAssign, $mmaModAssignSubmissionFileSession, $mmaModAssignHelper,
            $mmaModAssignOffline, mmaModAssignSubmissionFileName, $mmFileUploaderHelper, $q) {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/assign/submission/file/template.html',
        link: function(scope) {
            if (!scope.plugin) {
                return;
            }

            // Get the offline data.
            $mmaModAssignOffline.getSubmission(scope.assign.id).catch(function() {
                // Error getting data, assume there's no offline submission.
            }).then(function(offlineData) {
                if (offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager) {
                    // Has offline data.
                    var promise;
                    if (offlineData.plugindata.files_filemanager.offline) {
                        promise = $mmaModAssignHelper.getStoredSubmissionFiles(scope.assign.id, mmaModAssignSubmissionFileName);
                    } else {
                        promise = $q.when([]);
                    }

                    return promise.then(function(offlineFiles) {
                        var onlineFiles = offlineData.plugindata.files_filemanager.online || [];
                        offlineFiles = $mmFileUploaderHelper.markOfflineFiles(offlineFiles);
                        scope.files = onlineFiles.concat(offlineFiles);
                    });
                } else {
                    // No offline data, get the online files.
                    scope.files = $mmaModAssign.getSubmissionPluginAttachments(scope.plugin);
                }
            }).finally(function() {
                $mmaModAssignSubmissionFileSession.setFiles(scope.assign.id, scope.files);
            });
        }
    };
});
