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
.controller('mmaNotesListCtrl', function($scope, $stateParams, $mmUtil, $mmaNotes, $mmSite, $translate, $mmEvents, $mmaNotesSync,
            $q, $mmText, $ionicScrollDelegate, mmaNotesAutomSyncedEvent) {

    var courseid = $stateParams.courseid,
        type = $stateParams.type,
        syncObserver,
        scrollView;

    $scope.courseid = courseid;
    $scope.type = type;
    $scope.title = $translate.instant('mma.notes.' + type + 'notes');
    $scope.notesStr = $scope.title.toLowerCase();
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';

    function fetchNotes(sync, showErrors) {
        var promise = sync ? syncNotes(showErrors) : $q.when();

        return promise.catch(function() {
            // Ignore errors.
        }).then(function() {
            return $mmaNotes.getNotes(courseid).then(function(notes) {
                notes = notes[type + 'notes'];

                $scope.hasOffline = $mmaNotes.hasOfflineNote(notes);

                return $mmaNotes.getNotesUserData(notes, courseid).then(function(notes) {
                    $scope.notes = notes;
                });

            }, function(message) {
                $mmUtil.showErrorModal(message);
            });
        }).finally(function() {
            $scope.notesLoaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
        });
    }

    fetchNotes(true, false).then(function() {
        // Add log in Moodle.
        $mmSite.write('core_notes_view_notes', {
            courseid: courseid,
            userid: 0
        });
    });

    $scope.refreshNotes = function(showErrors) {
        $scope.refreshIcon = 'spinner';
        $scope.syncIcon = 'spinner';
        $mmaNotes.invalidateNotes(courseid).finally(function() {
            fetchNotes(true, showErrors).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Tries to synchronize the course notes.
    function syncNotes(showErrors) {
        return $mmaNotesSync.syncNotes(courseid).then(function(warnings) {
            showSyncWarnings(warnings);
        }).catch(function(error) {
            if (showErrors) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mm.core.errorsync', true);
                }
            }
            return $q.reject();
        });
    }

    // Show sync warnings if any.
    function showSyncWarnings(warnings) {
        var message = $mmText.buildMessage(warnings);
        if (message) {
            $mmUtil.showErrorModal(message);
        }
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaNotesListScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Refresh data if this course notes are synchronized automatically.
    syncObserver = $mmEvents.on(mmaNotesAutomSyncedEvent, function(data) {
        if (data && data.siteid == $mmSite.getId() && data.courseid == courseid) {
            // Show the sync warnings.
            showSyncWarnings(data.warnings);

            // Refresh the data.
            $scope.notesLoaded = false;
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            scrollTop();

            fetchNotes(false);
        }
    });

    $scope.$on('$destroy', function() {
        syncObserver && syncObserver.off && syncObserver.off();
    });
});
