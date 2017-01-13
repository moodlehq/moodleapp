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
.controller('mmaModGlossaryEditCtrl', function($stateParams, $scope, mmaModGlossaryComponent, $mmUtil, $q, $mmaModGlossary,
        $translate, $ionicHistory, $mmEvents, mmaModGlossaryAddEntryEvent, $mmaModGlossaryOffline) {

    var module = $stateParams.module,
        courseId = $stateParams.courseid,
        cmid = $stateParams.cmid,
        glossaryId = $stateParams.glossaryid,
        glossary = $stateParams.glossary || {},
        entry = $stateParams.entry || false;

    $scope.entry = {
        concept: '',
        text: ''
    };
    $scope.title = module.name;
    $scope.component = mmaModGlossaryComponent;
    $scope.componentId = module.id;
    $scope.autolinking = glossary.usedynalink;
    $scope.options = {
        categories: null,
        aliases: "",
        usedynalink: glossary.usedynalink,
        casesensitive: false,
        fullmatch: false
    };

    if (entry) {
        $scope.entry.concept = entry.concept || '';
        $scope.entry.text = entry.definition || '';
        if (entry.options) {
            $scope.options.categories = entry.options.categories || null;
            $scope.options.aliases = entry.options.aliases || "";
            $scope.options.usedynalink = !!entry.options.usedynalink || glossary.usedynalink;
            $scope.options.casesensitive = !!entry.options.casesensitive
            $scope.options.fullmatch = !!entry.options.fullmatch;
        }
    }

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, cancel);

    // Fetch Glossary data.
    function fetchGlossaryData(refresh) {
        return $mmaModGlossary.getAllCategories(glossaryId).then(function(categories) {
            $scope.categories = categories;
        });
    }

    // Just ask to confirm the lost of data.
    function cancel() {
        if (!$scope.entry.text && !$scope.entry.concept) {
            return $q.when();
        } else {
            // Show confirmation if some data has been modified.
            return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }
    }

    $scope.save = function() {
        var concept = $scope.entry.concept,
            definition = $scope.entry.text;

        if (!concept || !definition) {
            $mmUtil.showErrorModal('mma.mod_glossary.fillfields', true);
            return;
        }

        // Check if rich text editor is enabled or not.
        $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
            if (!enabled) {
                // Rich text editor not enabled, add some HTML to the definition if needed.
                //definition = $mmText.formatHtmlLines(definition);
            }

            // If editing an offline entry and concept is different, delete previous first.
            if (entry.concept && entry.concept != concept) {
                return $mmaModGlossaryOffline.deleteAddEntry(glossaryId, entry.concept);
            }
            return $q.when();

        }).then(function(entryId) {
            var cats = $scope.categories.filter(function(category) {
                return category.selected;
            }).map(function(category) {
                return category.id;
            });

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

            return $mmaModGlossary.addEntry(glossaryId, concept, definition, options, courseId);
        }).then(function(entryId) {
            $scope.entry.glossaryid = glossaryId;
            $scope.entry.id = entryId;
            $scope.entry.definition = definition;
            return returnToEntryList();
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.cannoteditentry', true);
        });
    };

    function returnToEntryList(entryId) {
        var data = {
            glossaryid: glossaryId,
            cmid: cmid,
            entry: $scope.entry
        };

        $mmEvents.trigger(mmaModGlossaryAddEntryEvent, data);

        // Go back to discussions list.
        $ionicHistory.goBack();
    }

    fetchGlossaryData().finally(function() {
        $scope.glossaryLoaded = true;
    });

});
