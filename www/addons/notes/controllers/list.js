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

angular.module('mm.addons.notes')

/**
 * Controller to handle notes.
 *
 * @module mm.addons.notes
 * @ngdoc controller
 * @name mmaNotesListCtrl
 */
.controller('mmaNotesListCtrl', function($scope, $stateParams, $mmUtil, $mmaNotes, $mmSite, $translate) {

    var courseid = $stateParams.courseid,
        type = $stateParams.type;

    $scope.courseid = courseid;
    $scope.type = type;

    $translate('mma.notes.' + type + 'notes').then(function(string) {
        $scope.title = string;
    });

    function fetchNotes(refresh) {
        return $mmaNotes.getNotes(courseid, refresh).then(function(notes) {
            notes = notes[type + 'notes'];

            return $mmaNotes.getNotesUserData(notes, courseid).then(function(notes) {
                $scope.notes = notes;
            });

        }, function(message) {
            $mmUtil.showErrorModal(message);
        });
    }

    fetchNotes().then(function() {
        // Add log in Moodle.
        $mmSite.write('core_notes_view_notes', {
            courseid: courseid,
            userid: 0
        });
    })
    .finally(function() {
        $scope.notesLoaded = true;
    });

    $scope.refreshNotes = function() {
        fetchNotes(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
