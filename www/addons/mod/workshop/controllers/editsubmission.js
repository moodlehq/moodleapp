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

angular.module('mm.addons.mod_workshop')

/**
 * Workshop edit submission controller.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name mmaModWorkshopSubmissionCtrl
 */
.controller('mmaModWorkshopEditSubmissionCtrl', function($scope, $stateParams, $mmaModWorkshop, $q, $mmUtil, $mmaModWorkshopHelper,
        $mmSite, mmaModWorkshopComponent, $mmFileUploaderHelper, $translate, $mmText, $mmEvents, $mmFileSession,
        mmaModWorkshopSubmissionChangedEvent, $mmaModWorkshopOffline, $mmSyncBlock) {

    var submission = $stateParams.submission || {},
        module = $stateParams.module,
        workshopId = module.instance,
        access = $stateParams.access,
        userId = $mmSite.getUserId(),
        originalData = {},
        blockData,
        hasOffline,
        editing = false;

    $scope.title = module.name;
    $scope.component = mmaModWorkshopComponent;
    $scope.courseId = $stateParams.courseid;
    $scope.submissionLoaded = false;
    $scope.module = module;
    $scope.submission = {
        title: "",
        text: "",
        attachmentfiles: []
    };

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    blockData = $mmUtil.blockLeaveView($scope, leaveView);

    if (!$scope.$$destroyed) {
        // Block the workshop.
        $mmSyncBlock.blockOperation(mmaModWorkshopComponent, workshopId);
    }

    function fetchSubmissionData() {
        return $mmaModWorkshop.getWorkshop($scope.courseId, module.id).then(function(workshopData) {
            $scope.workshop = workshopData;

            if (submission && submission.id > 0) {
                editing = true;
                return $mmaModWorkshopHelper.getSubmissionById(workshopId, submission.id).then(function(submissionData) {
                    $scope.submission = submissionData;
                    $scope.submission.text = submissionData.content;

                    var canEdit = (userId == submissionData.authorid && access.cansubmit && access.modifyingsubmissionallowed);
                    if (!canEdit) {
                        // Should not happen, but go back if does.
                        blockData && blockData.back();
                        return;
                    }
                });
            } else if (!access.cansubmit || !access.creatingsubmissionallowed) {
                // Should not happen, but go back if does.
                blockData && blockData.back();
                return;
            }

        }).then(function() {
            return $mmaModWorkshopOffline.getSubmissions(workshopId).then(function(submissionsActions) {
                if (submissionsActions && submissionsActions.length) {
                    hasOffline = true;
                    var actions = $mmaModWorkshopHelper.filterSubmissionActions(submissionsActions, editing ? submission.id : false);

                    return $mmaModWorkshopHelper.applyOfflineData(submission, actions).then(function(offlineSubmission) {
                        $scope.submission.title = offlineSubmission.title;
                        $scope.submission.text = offlineSubmission.content;
                        $scope.submission.attachmentfiles = offlineSubmission.attachmentfiles;
                    });
                } else {
                    hasOffline = false;
                }
            }).finally(function() {
                originalData.title = $scope.submission.title;
                originalData.text = $scope.submission.text;
                originalData.attachmentfiles = [];

                angular.forEach($scope.submission.attachmentfiles, function(file) {
                    var filename;
                    if (file.filename) {
                        filename = file.filename;
                    } else {
                        // We don't have filename, extract it from the path.
                        filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }

                    originalData.attachmentfiles.push({
                        'filename' : filename,
                        'fileurl': file.fileurl
                    });
                });
            });
        }).then(function() {
            var submissionId = submission.id || 'newsub';
            $mmFileSession.setFiles(mmaModWorkshopComponent, workshopId + '_' + submissionId, $scope.submission.attachmentfiles || []);

            $scope.submissionLoaded = true;
        }).catch(function(message) {
            $scope.submissionLoaded = false;

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            blockData && blockData.back();
            return $q.reject();
        });
    }

    // Content changed in first render.
    $scope.firstRender = function() {
        originalData.text = $scope.submission.text;
    };

    function getInputData() {
        var submissionId = submission.id || 'newsub';

        return {
                title: $scope.submission.title,
                content: $scope.submission.text,
                attachmentfiles: $mmFileSession.getFiles(mmaModWorkshopComponent, workshopId + '_' + submissionId) || []
            };
    }

    // Check if data has changed.
    function hasDataChanged() {
        if (!$scope.submissionLoaded) {
            return false;
        }

        var inputData = getInputData();
        if (!originalData || typeof originalData.title == 'undefined') {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        if (originalData.title != inputData.title || originalData.text != inputData.content) {
            return true;
        }

        return $mmFileUploaderHelper.areFileListDifferent(inputData.attachmentfiles, originalData.attachmentfiles);
    }

    function saveSubmission() {
        var modal,
            inputData = getInputData(),
            allowOffline = true,
            submissionId = submission && (submission.id || submission.submissionid) || false,
            saveOffline = false;

        if (!inputData.title) {
            $mmUtil.showModal('mm.core.notice', 'mm.core.requireduserdatamissing');
            return $q.reject();
        }
        if (!inputData.content) {
            $mmUtil.showModal('mm.core.notice', 'mma.mod_workshop.submissionrequiredcontent');
            return $q.reject();
        }

        modal = $mmUtil.showModalLoading('mm.core.sending', true);

        // Check if rich text editor is enabled or not.
        return $mmUtil.isRichTextEditorEnabled().then(function(rteEnabled) {
            if (rteEnabled) {
                inputData.content = $mmText.restorePluginfileUrls(inputData.content, $scope.submission.inlinefiles);
            } else {
                // Rich text editor not enabled, add some HTML to the message if needed.
                inputData.content = $mmText.formatHtmlLines(inputData.content);
            }

            // Upload attachments first if any.
            allowOffline = !inputData.attachmentfiles.length;
            return $mmaModWorkshopHelper.uploadOrStoreSubmissionFiles(workshopId, submissionId, inputData.attachmentfiles,
                    editing, saveOffline).catch(function() {
                // Cannot upload them in online, save them in offline.
                saveOffline = true;
                allowOffline = true;
                return $mmaModWorkshopHelper.uploadOrStoreSubmissionFiles(workshopId, submissionId, inputData.attachmentfiles,
                    editing, saveOffline);
            });
        }).then(function(attachmentsId) {
            if (editing) {
                if (saveOffline) {
                    // Save submission in offline.
                    return $mmaModWorkshopOffline.saveSubmission(workshopId, $scope.courseId, inputData.title, inputData.content,
                            attachmentsId, submissionId, 'update').then(function() {
                        // Don't return anything.
                    });
                }

                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return $mmaModWorkshop.updateSubmission(workshopId, submissionId, $scope.courseId, inputData.title,
                    inputData.content, attachmentsId, false, allowOffline);
            }

            if (saveOffline) {
                // Save submission in offline.
                return $mmaModWorkshopOffline.saveSubmission(workshopId, $scope.courseId, inputData.title, inputData.content,
                    attachmentsId, submissionId, 'add').then(function() {
                    // Don't return anything.
                });
            }

            // Try to send it to server.
            // Don't allow offline if there are attachments since they were uploaded fine.
            return $mmaModWorkshop.addSubmission(workshopId, $scope.courseId, inputData.title, inputData.content, attachmentsId,
                false, submissionId, allowOffline);
        }).then(function(newSubmissionId) {
            var data = {
                workshopid: workshopId,
                cmid: module.cmid
            };

            if (newSubmissionId && submissionId) {
                // Data sent to server, delete stored files (if any).
                $mmaModWorkshopOffline.deleteSubmissionAction(workshopId, submissionId, editing ? 'update' : 'add');
                $mmaModWorkshopHelper.deleteSubmissionStoredFiles(workshopId, submissionId, editing);
                data.submissionid = newSubmissionId;
            }

            var promise = newSubmissionId ? $mmaModWorkshop.invalidateSubmissionData(workshopId, newSubmissionId) : $q.when();

            return promise.finally(function() {
                $mmEvents.trigger(mmaModWorkshopSubmissionChangedEvent, data);

                // Delete the local files from the tmp folder.
                $mmFileUploaderHelper.clearTmpFiles(inputData.attachmentfiles);
            });
        }).catch(function(message) {
            $mmUtil.showErrorModal(message, 'Cannot save submission');
        }).finally(function() {
            modal.dismiss();
        });
    }

    // Save the submission.
    $scope.save = function() {
        // Check if data has changed.
        if (hasDataChanged()) {
            saveSubmission().then(function() {
                blockData && blockData.back();
            });
        } else {
            // Nothing to save, just go back.
            blockData && blockData.back();
        }
    };

    // Ask to confirm if there are changes.
    function leaveView() {
        var promise;

        if (!hasDataChanged()) {
            promise = $q.when();
        } else {
            // Show confirmation if some data has been modified.
            promise = $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }

        return promise.then(function() {
            if ($scope.submission.attachmentfiles) {
                // Delete the local files from the tmp folder.
                $mmFileUploaderHelper.clearTmpFiles($scope.submission.attachmentfiles);
            }
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModWorkshop.invalidateSubmissionData(workshopId, submission.id));
        promises.push($mmaModWorkshop.invalidateSubmissionsData(workshopId));

        return $q.all(promises).finally(function() {
            return fetchSubmissionData();
        });
    }

    fetchSubmissionData();

    // Pull to refresh.
    $scope.refreshSubmission = function() {
        if ($scope.submissionLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    $scope.$on('$destroy', function() {
        // Restore original back functions.
        $mmSyncBlock.unblockOperation(mmaModWorkshopComponent, workshopId);
    });
});
