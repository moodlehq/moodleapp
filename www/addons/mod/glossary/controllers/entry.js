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
 * Glossary entry controller.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc controller
 * @name mmaModGlossaryEntryCtrl
 */
.controller('mmaModGlossaryEntryCtrl', function($scope, $stateParams, $mmaModGlossary, $translate, mmaModGlossaryComponent,
        mmUserProfileState) {
    var entry = $stateParams.entry || {},
        courseid = $stateParams.cid || 0,
        glossary;

    // This is a coding error, for now the course ID is required here as we need it for the author link.
    if (!courseid) {
        notifyErrorOccured();
        return;
    }

    $scope.refreshEntry = function() {
        refreshEntry().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Load the glossary first.
    $mmaModGlossary.getGlossaryById(courseid, entry.glossaryid).then(function(gloss) {
        glossary = gloss;
        var displayFormat = glossary.displayformat;

        $scope.title = entry.concept;
        $scope.entry = entry;
        $scope.courseid = courseid;
        $scope.userStateName = mmUserProfileState;
        $scope.component = mmaModGlossaryComponent;
        $scope.componentId = glossary.coursemodule;

        if (displayFormat == 'fullwithauthor' || displayFormat == 'encyclopedia') {
            $scope.showAuthor = true;
            $scope.showDate = true;

        } else if (displayFormat == 'fullwithoutauthor') {
            $scope.showAuthor = false;
            $scope.showDate = true;

        // Default, and faq, simple, entrylist, continuous.
        } else {
            $scope.showAuthor = false;
            $scope.showDate = false;
        }

        $scope.loaded = true;

        // Log that the entry was viewed.
        $mmaModGlossary.logEntryView(entry.id);

    }).catch(function() {
        notifyErrorOccured();
    });

    function fetchEntry() {
        return $mmaModGlossary.getEntry(entry.id).then(function(result) {
            $scope.entry = result.entry;
            $scope.title = result.entry.concept;
        });
    }

    function refreshEntry() {
        return $mmaModGlossary.invalidateEntry(entry.id).then(function() {
            return fetchEntry();
        });
    }

    function notifyErrorOccured() {
        $scope.title = $translate.instant('mm.core.error');
        $scope.entry = false;
        $scope.loaded = true;
    }

});
