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

angular.module('mm.addons.mod_glossary')

/**
 * Glossary edit entry controller.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc controller
 * @name mmaModGlossaryEditCtrl
 */
.controller('mmaModGlossaryEditCtrl', function($stateParams, $scope, mmaModGlossaryComponent, $mmUtil, $q, $mmaModGlossary, $mmText,
        $translate, $ionicHistory, $mmEvents, mmaModGlossaryAddEntryEvent, $mmaModGlossaryOffline, $mmaModGlossaryHelper, $mmLang,
        $mmFileUploaderHelper) {

    var module = $stateParams.module,
        courseId = $stateParams.courseid,
        cmid = $stateParams.cmid,
        glossaryId = $stateParams.glossaryid,
        glossary = $stateParams.glossary || {},
        originalData = null,
        entry = $stateParams.entry || false,
        allowDuplicateEntries = !!glossary.allowduplicatedentries;

    $scope.entry = {
        concept: '',
        text: ''
    };
    $scope.title = module.name;
    $scope.component = mmaModGlossaryComponent;
    $scope.componentId = module.id;
    $scope.autolinking = !!glossary.usedynalink;
    $scope.options = {
        categories: null,
        aliases: "",
        usedynalink: false,
        casesensitive: false,
        fullmatch: false
    };
    $scope.attachments = [];

    if (entry) {
        $scope.entry.concept = entry.concept || '';
        $scope.entry.text = entry.definition || '';

        originalData = {};
        originalData.text = $scope.entry.text;
        originalData.concept = $scope.entry.concept;
        originalData.files = [];

        if (entry.options) {
            $scope.options.categories = entry.options.categories || null;
            $scope.options.aliases = entry.options.aliases || "";
            $scope.options.usedynalink = !!entry.options.usedynalink;
            if ($scope.options.usedynalink) {
                $scope.options.casesensitive = !!entry.options.casesensitive;
                $scope.options.fullmatch = !!entry.options.fullmatch;
            }
        }

        // Treat offline attachments if any.
        if (entry.attachments && entry.attachments.offline) {
            $mmaModGlossaryHelper.getStoredFiles(glossaryId, entry.concept, entry.timecreated).then(function(files) {
                $scope.attachments = files;
                originalData.files = angular.copy(files);
            });
        }
    }

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, cancel);

    // Fetch Glossary data.
    function fetchGlossaryData() {
        return $mmaModGlossary.getAllCategories(glossaryId).then(function(categories) {
            $scope.categories = categories;

            if ($scope.options.categories) {
                var cats = $scope.options.categories.split(",");
                angular.forEach(cats, function(catId) {
                    angular.forEach($scope.categories, function(category) {
                        if (category.id == catId) {
                            category.selected = true;
                        }
                    });
                });
            }
        });
    }

    // Just ask to confirm the lost of data.
    function cancel() {
        var promise;

        if (!$mmaModGlossaryHelper.hasEntryDataChanged($scope.entry, $scope.attachments, originalData)) {
           promise = $q.when();
        } else {
            // Show confirmation if some data has been modified.
            promise =  $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }

        return promise.then(function() {
            // Delete the local files from the tmp folder.
            $mmFileUploaderHelper.clearTmpFiles($scope.attachments);
        });
    }

    $scope.save = function() {
        var concept = $scope.entry.concept,
            definition = $scope.entry.text,
            modal,
            attachments,
            timecreated = entry && entry.timecreated || Date.now(),
            saveOffline = false;

        if (!concept || !definition) {
            $mmUtil.showErrorModal('mma.mod_glossary.fillfields', true);
            return;
        }

        modal = $mmUtil.showModalLoading('mm.core.sending', true);

        // Check if rich text editor is enabled or not.
        $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
            if (!enabled) {
                // Rich text editor not enabled, add some HTML to the definition if needed.
                definition = $mmText.formatHtmlLines(definition);
            }

            attachments = $scope.attachments;

            // Upload attachments first if any.
            if (!!attachments.length) {
                return $mmaModGlossaryHelper.uploadOrStoreFiles(glossaryId, concept, timecreated, attachments, false)
                        .catch(function() {
                    // Cannot upload them in online, save them in offline.
                    saveOffline = true;
                    return $mmaModGlossaryHelper.uploadOrStoreFiles(glossaryId, concept, timecreated, attachments, true);
                });
            }
        }).then(function(attach) {
            var cats = [];

            if ($scope.categories) {
                cats = $scope.categories.filter(function(category) {
                    return category.selected;
                }).map(function(category) {
                    return category.id;
                });
            }

            var options = {
                aliases: $scope.options.aliases || "",
                categories: cats.join(',') || ""
            };

            if ($scope.autolinking) {
                options.usedynalink = $scope.options.usedynalink ? 1 : 0;
                if ($scope.options.usedynalink) {
                    options.casesensitive = $scope.options.casesensitive ? 1 : 0;
                    options.fullmatch = $scope.options.fullmatch ? 1 : 0;
                }
            }

            if (saveOffline) {
                var promise;
                if (entry && !allowDuplicateEntries) {
                    // Check if the entry is duplicated in online or offline mode.
                    promise = $mmaModGlossary.isConceptUsed(glossaryId, concept, entry.timecreated).then(function(used) {
                        if (used) {
                            // There's a entry with same name, reject with error message.
                            return $mmLang.translateAndReject('mma.mod_glossary.errconceptalreadyexists');
                        }
                    });
                } else {
                    promise = $q.when();
                }

                return promise.then(function() {
                    // Save entry in offline.
                    return $mmaModGlossaryOffline.saveAddEntry(glossaryId, concept, definition, courseId, options, attach,
                            timecreated, undefined, undefined, entry).then(function() {
                        // Don't return anything.
                    });
                });
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return $mmaModGlossary.addEntry(glossaryId, concept, definition, courseId, options, attach, timecreated, undefined,
                    entry, !attachments.length, !allowDuplicateEntries);
            }
        }).then(function(entryId) {
            if (entryId) {
                $scope.entry.id = entryId;
                // Data sent to server, delete stored files (if any).
                $mmaModGlossaryHelper.deleteStoredFiles(glossaryId, concept, timecreated);
            }
            $scope.entry.glossaryid = glossaryId;
            $scope.entry.definition = definition;
            return returnToEntryList();
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.cannoteditentry', true);
        }).finally(function() {
            modal.dismiss();
        });
    };

    function returnToEntryList() {
        var data = {
            glossaryid: glossaryId,
            cmid: cmid,
            entry: $scope.entry
        };

        $mmFileUploaderHelper.clearTmpFiles($scope.attachments);

        $mmEvents.trigger(mmaModGlossaryAddEntryEvent, data);

        // Go back to discussions list.
        $ionicHistory.goBack();
    }

    fetchGlossaryData().finally(function() {
        $scope.glossaryLoaded = true;
    });

});
