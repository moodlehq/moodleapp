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
.directive('mmaModAssignSubmissionFile', function($mmaModAssign, $mmFileSession, mmaModAssignComponent, $mmaModAssignHelper,
            $mmaModAssignOffline, mmaModAssignSubmissionFileName, $mmFileUploaderHelper, $q, $mmFS) {

    /**
     * Add a dot to the beginning of an extension.
     *
     * @param  {String} extension Extension.
     * @return {String}           Treated extension.
     */
    function addDot(extension) {
        return '.' + extension;
    }

    /**
     * Parse filetypeslist to get the list of allowed mimetypes and the data to render information.
     *
     * @param  {Object} scope Directive's scope.
     * @return {Void}
     */
    function treatFileTypes(scope) {
        var mimetypes = {}, // Use an object to prevent duplicates.
            filetypes = scope.configs.filetypeslist.replace(/,/g, ';').split(';');

        scope.typesInfo = [];

        angular.forEach(filetypes, function(filetype) {
            filetype = filetype.trim();

            if (filetype) {
                if (filetype.indexOf('/') != -1) {
                    // It's a mimetype.
                    mimetypes[filetype] = true;

                    scope.typesInfo.push({
                        type: 'mimetype',
                        value: {
                            name: $mmFS.getMimetypeDescription(filetype),
                            extlist: $mmFS.getExtensions(filetype).map(addDot).join(' ')
                        }
                    });
                } else if (filetype.indexOf('.') === 0) {
                    // It's an extension.
                    var mimetype = $mmFS.getMimeType(filetype);
                    if (mimetype) {
                        mimetypes[mimetype] = true;
                    }

                    scope.typesInfo.push({
                        type: 'extension',
                        value: filetype
                    });
                } else {
                    // It's a group.
                    var groupMimetypes = $mmFS.getGroupMimeInfo(filetype, 'mimetypes'),
                        groupExtensions = $mmFS.getGroupMimeInfo(filetype, 'extensions');

                    angular.forEach(groupMimetypes, function(mimetype) {
                        if (mimetype) {
                            mimetypes[mimetype] = true;
                        }
                    });

                    scope.typesInfo.push({
                        type: 'mimetype',
                        value: {
                            name: $mmFS.getTranslatedGroupName(filetype),
                            extlist: groupExtensions ? groupExtensions.map(addDot).join(' ') : ''
                        }
                    });
                }
            }
        });

        scope.mimetypes = Object.keys(mimetypes);
    }

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/assign/submission/file/template.html',
        link: function(scope) {
            if (!scope.plugin) {
                return;
            }

            if (scope.edit && scope.configs && scope.configs.filetypeslist && scope.configs.filetypeslist.trim()) {
                treatFileTypes(scope);
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
                $mmFileSession.setFiles(mmaModAssignComponent, scope.assign.id, scope.files);
            });
        }
    };
});
