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
        $translate, $state) {

    var module = $stateParams.module,
        courseId = $stateParams.courseid,
        cmid = $stateParams.cmid,
        glossaryId = module.instance;

    $scope.entry = {
        concept: '',
        text: ''
    };
    $scope.title = module.name;
    $scope.component = mmaModGlossaryComponent;
    $scope.componentId = module.id;

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, cancel);

    // Fetch Glossary data.
    function fetchGlossaryData(refresh) {
        // Nothing to do now.
        return $q.when();
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

            return $mmaModGlossary.addEntry(glossaryId, concept, definition);
        }).then(function(entryId) {
            $scope.entry.glossaryid = glossaryId;
            $scope.entry.id = entryId;
            $scope.entry.definition = definition;
            return gotoEntry(entryId);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.cannoteditentry', true);
        });
    };

    function gotoEntry() {

        var stateParams = {
            entry: $scope.entry,
            entryid: $scope.entry.id,
            cid: courseId
        };
        return $state.go('site.mod_glossary-entry', stateParams);
    }

    fetchGlossaryData().finally(function() {
        $scope.glossaryLoaded = true;
    });

});
