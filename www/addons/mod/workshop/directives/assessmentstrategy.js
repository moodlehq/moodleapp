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
 * Directive to render a workshop assessment strategy.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopAssessmentStrategy
 * @description
 * Directive to render feedback plugin.
 *
 * It requires to receive an "assessment" scope variable indicating the strategy to render the form.
 *
 * Parameters received by this directive and shared with the directive to render the plugin (if any):
 *
 * @param {Object}  assessment      The assessment info.
 * @param {String}  strategy        The assessment strategy name.
 * @param {Object}  workshop        The workshop activity data.
 * @param {Object}  access          The access data to the activity.
 *
 */
.directive('mmaModWorkshopAssessmentStrategy', function($compile, $mmaModWorkshopAssessmentStrategyDelegate, $mmEvents, $mmText,
        mmaModWorkshopComponent, mmaModWorkshopAssessmentInvalidatedEvent, mmaModWorkshopAssessmentRefreshedEvent, $translate, $q,
        $mmaModWorkshopHelper, $mmUtil, mmaModWorkshopAssessmentSaveEvent, $mmFileSession, $mmFileUploaderHelper, $mmaModWorkshop,
        mmaModWorkshopAssessmentSavedEvent, $mmSite, $mmaModWorkshopOffline, $mmSyncBlock) {

    var originalData = {
        text: '',
        files: [],
        weight: 1,
        assessment: false
    };

    return {
        restrict: 'E',
        scope: {
            assessmentId: '=',
            userId: '=',
            strategy: '=',
            workshop: '=',
            access: '=',
            edit: '=?'
        },
        templateUrl: 'addons/mod/workshop/templates/assessmentstrategy.html',
        link: function(scope, element) {
            var strategy = scope.strategy,
                container = element[0].querySelector('.mma-mod-workshop-assessment-strategy-container'),
                directive,
                blockData,
                obsInvalidated,
                obsSaveAssessment,
                promise,
                hasOffline,
                edit = !!scope.edit,
                rteEnabled = false;

            if (!scope.assessmentId || !container || !strategy) {
                scope.assessmentStrategyLoaded = true;
                return;
            }

            var load = function() {
                return $mmaModWorkshopHelper.getReviewerAssessmentById(scope.workshopId, scope.assessmentId, scope.userId)
                        .then(function(assessmentData) {
                    scope.assessment = assessmentData;

                    if (edit) {
                        return $mmaModWorkshopOffline.getAssessment(scope.workshopId, scope.assessmentId)
                                .then(function(offlineAssessment) {
                            var offlineData = offlineAssessment.inputdata;

                            hasOffline = true;

                            assessmentData.feedbackauthor = offlineData.feedbackauthor;

                            if (scope.access.canallocate) {
                                assessmentData.weight = offlineData.weight;
                            }

                            // Override assessment plugins values.
                            assessmentData.form.current = $mmaModWorkshop.parseFields(
                                $mmUtil.objectToArrayOfObjects(offlineData, 'name', 'value'));

                            // Override offline files.
                            if (offlineData) {
                                return $mmaModWorkshopHelper.getAssessmentFilesFromOfflineFilesObject(
                                        offlineData.feedbackauthorattachmentsid, scope.workshopId, scope.assessmentId)
                                        .then(function(files) {
                                    assessmentData.feedbackattachmentfiles = files;
                                });
                            }
                        }).catch(function() {
                            hasOffline = false;
                            // Ignore errors.
                        }).finally(function() {
                            scope.feedback.text = assessmentData.feedbackauthor;

                            originalData.text = scope.assessment.feedbackauthor;

                            if (scope.access.canallocate) {
                                originalData.weight = assessmentData.weight;
                            }

                            originalData.files = [];
                            angular.forEach(assessmentData.feedbackattachmentfiles, function(file) {
                                var filename;
                                if (file.filename) {
                                    filename = file.filename;
                                } else {
                                    // We don't have filename, extract it from the path.
                                    filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                                }

                                originalData.files.push({
                                    'filename' : filename,
                                    'fileurl': file.fileurl
                                });
                            });

                            return $mmaModWorkshopAssessmentStrategyDelegate.getOriginalValues(strategy, assessmentData.form,
                                    scope.workshopId).then(function(values) {
                                originalData.assessment = values;
                            }).finally(function() {
                                $mmFileSession.setFiles(mmaModWorkshopComponent, scope.workshopId + '_' + scope.assessmentId,
                                    assessmentData.feedbackattachmentfiles);
                                if (scope.access.canallocate) {
                                    scope.weight = assessmentData.weight;
                                }
                            });
                        });
                    }
                }).then(function() {
                    $mmEvents.trigger(mmaModWorkshopAssessmentRefreshedEvent);
                });
            };

            // Check if the strategy has defined its own directive to render itself.
            directive = $mmaModWorkshopAssessmentStrategyDelegate.getDirectiveForPlugin(strategy);
            if (directive) {
                scope.feedback = {};
                scope.workshopId = scope.workshop.id;
                scope.overallFeedkback = !!scope.workshop.overallfeedbackmode;
                scope.overallFeedkbackRequired = scope.workshop.overallfeedbackmode == 2;
                scope.component = mmaModWorkshopComponent;
                scope.componentId = scope.workshop.cmid;

                // Load Weights selector.
                if (edit && scope.access.canallocate) {
                    scope.weights = [];
                    for (var i = 16; i >= 0; i--) {
                        scope.weights[i] = i;
                    }
                }

                // Check if rich text editor is enabled.
                if (edit) {
                    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
                    blockData = $mmUtil.blockLeaveView(scope, cancel);
                    if (!scope.$$destroyed) {
                        // Block the workshop.
                        $mmSyncBlock.blockOperation(mmaModWorkshopComponent, scope.workshopId);
                    }

                    promise = $mmUtil.isRichTextEditorEnabled();
                } else {
                    // We aren't editing, so no rich text editor.
                    promise = $q.when(false);
                }

                promise.then(function(enabled) {
                    rteEnabled = enabled;

                    return load();
                }).then(function() {
                    // Add the directive to the element.
                    container.setAttribute(directive, '');
                    // Compile the new directive.
                    $compile(container)(scope);

                    obsInvalidated = $mmEvents.on(mmaModWorkshopAssessmentInvalidatedEvent, load);
                }).finally(function() {
                    scope.assessmentStrategyLoaded = true;
                });
            } else {
                // Helper data and fallback.
                scope.notSupported = !$mmaModWorkshopAssessmentStrategyDelegate.isPluginSupported(strategy);
                scope.assessmentStrategyLoaded = true;
            }

            // Save the assessment.
            obsSaveAssessment = $mmEvents.on(mmaModWorkshopAssessmentSaveEvent, function() {
                // Check if data has changed.
                if (hasDataChanged()) {
                    saveAssessment().then(function() {
                        blockData && blockData.back();
                    });
                } else {
                    // Nothing to save, just go back.
                    blockData && blockData.back();
                }
            });

            // Text changed in first render.
            scope.firstRender = function() {
                originalData.text = scope.feedback.text;
            };

            // Get the input data.
            function getInputData() {
                var data = $mmUtil.getInfoValuesFromForm(document.forms['mma-mod_workshop-assessment-form']);
                data.feedbackauthor = $mmText.restorePluginfileUrls(scope.feedback.text, scope.assessment.feedbackcontentfiles || []);
                data.files =  $mmFileSession.getFiles(mmaModWorkshopComponent,  scope.workshopId + '_' + scope.assessmentId) || [];

                return data;
            }

            // Check if data has changed.
            function hasDataChanged() {
                if (!scope.assessmentStrategyLoaded) {
                    return false;
                }

                var inputData = getInputData();

                // Compare feedback text.
                if (rteEnabled) {
                    inputData.feedbackauthor = scope.feedback.text;
                }
                if (originalData.text != inputData.feedbackauthor) {
                    return true;
                }
                if (scope.access.canallocate && originalData.weight != inputData.weight) {
                    return true;
                }

                // Compare feedback files.
                if ($mmFileUploaderHelper.areFileListDifferent(inputData.files, originalData.files)) {
                    return true;
                }

                return $mmaModWorkshopAssessmentStrategyDelegate.hasPluginDataChanged(scope.workshop, originalData.assessment, inputData);
            }

            function saveAssessment() {
                var modal,
                    filePromise,
                    inputData = getInputData(),
                    saveOffline = false,
                    allowOffline = true,
                    tempFiles = inputData.files;

                modal = $mmUtil.showModalLoading('mm.core.sending', true);

                scope.fieldErrors = false;

                // Upload attachments first if any.
                allowOffline = !tempFiles.length;
                filePromise = $mmaModWorkshopHelper.uploadOrStoreAssessmentFiles(scope.workshop.id, scope.assessmentId,
                        tempFiles, saveOffline).catch(function() {
                    // Cannot upload them in online, save them in offline.
                    saveOffline = true;
                    allowOffline = true;
                    return $mmaModWorkshopHelper.uploadOrStoreAssessmentFiles(scope.workshop.id, scope.assessmentId,
                        tempFiles, saveOffline);
                });

                return filePromise.then(function(attachmentsId) {
                    return $mmaModWorkshopHelper.prepareAssessmentData(scope.workshop, inputData, scope.assessment.form,
                            attachmentsId).catch(function(errors) {
                        scope.fieldErrors = errors;
                        return $q.reject($translate.instant('mm.core.errorinvalidform'));
                    });
                }).then(function(assessmentData) {
                    if (saveOffline) {
                        // Save assessment in offline.
                        return $mmaModWorkshopOffline.saveAssessment(scope.workshop.id, scope.assessmentId, scope.workshop.course,
                                assessmentData).then(function() {
                            // Don't return anything.
                        });
                    }

                    // Try to send it to server.
                    // Don't allow offline if there are attachments since they were uploaded fine.
                    return $mmaModWorkshop.updateAssessment(scope.workshop.id, scope.assessmentId, scope.workshop.course,
                        assessmentData, false, allowOffline);
                }).then(function(grade) {
                    var promises = [];

                    // If sent to the server, invalidate and clean.
                    if (grade) {
                        promises.push($mmaModWorkshopHelper.deleteAssessmentStoredFiles(scope.workshop.id, scope.assessmentId));
                        promises.push($mmaModWorkshop.invalidateAssessmentFormData(scope.workshop.id, scope.assessmentId));
                        promises.push($mmaModWorkshop.invalidateAssessmentData(scope.workshop.id, scope.assessmentId));
                    }

                    return $q.all(promises).catch(function() {
                        // Ignore errors.
                    }).finally(function() {
                        $mmEvents.trigger(mmaModWorkshopAssessmentSavedEvent, {
                            workshopid: scope.workshop.id,
                            assessmentid: scope.assessmentId,
                            userId: $mmSite.getUserId(),
                            siteId: $mmSite.getId()
                        });

                        if (tempFiles) {
                            // Delete the local files from the tmp folder.
                            $mmFileUploaderHelper.clearTmpFiles(tempFiles);
                        }
                    });
                }).catch(function(message) {
                    $mmUtil.showErrorModalDefault(message, 'Error saving assessment.');
                    return $q.reject();
                }).finally(function() {
                    modal.dismiss();
                });
            }

            // Just ask to confirm the lost of data.
            function cancel() {
                var promise;

                if (!hasDataChanged()) {
                    promise = $q.when();
                } else {
                    // Show confirmation if some data has been modified.
                    promise = $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
                }

                return promise.then(function() {
                    if (scope.assessment.feedbackattachmentfiles) {
                        // Delete the local files from the tmp folder.
                        $mmFileUploaderHelper.clearTmpFiles(scope.assessment.feedbackattachmentfiles);
                    }
                });
            }

            scope.$on('$destroy', function() {
                obsInvalidated && obsInvalidated.off && obsInvalidated.off();
                obsSaveAssessment && obsSaveAssessment.off && obsSaveAssessment.off();
                // Restore original back functions.
                $mmSyncBlock.unblockOperation(mmaModWorkshopComponent, scope.workshopId);
            });
        }
    };
});
