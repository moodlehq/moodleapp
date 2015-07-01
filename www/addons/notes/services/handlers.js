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
 * Notes handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.notes
 * @ngdoc service
 * @name $mmaNotesHandlers
 */
.factory('$mmaNotesHandlers', function($mmaNotes, $mmSite, $translate, $ionicLoading, $ionicModal, $mmUtil) {

    var self = {};

    /**
     * Add a note handler.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesHandlers#addNote
     */
    self.addNote = function() {

        var self = {};

        self.isEnabled = function() {
            return $mmaNotes.isPluginAddNoteEnabled();
        };

        self.isEnabledForUser = function(user, courseId) {
            // Active course required.
            return courseId && user.id != $mmSite.getUserId();
        };

        self.getController = function(user, courseid) {

            /**
             * Add note handler controller.
             *
             * @module mm.addons.notes
             * @ngdoc controller
             * @name $mmaNotesHandlers#addNote:controller
             */
            return function($scope) {

                // Button title.
                $scope.title = 'mma.notes.addnewnote';

                $ionicModal.fromTemplateUrl('addons/notes/templates/add.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function(m) {
                    $scope.modal = m;
                });

                $scope.closeModal = function(){
                    $scope.modal.hide();
                };

                $scope.addNote = function(){
                    // Freeze the add note button.
                    $scope.processing = true;

                    $mmaNotes.addNote(user.id, courseid, $scope.note.publishstate, $scope.note.text).then(function() {
                        $translate('mma.notes.eventnotecreated').then(function(str) {
                            $ionicLoading.show({
                                template: str,
                                duration: 2000
                            });
                        });
                    }, function(error) {
                        $mmUtil.showErrorModal(error);
                    }).finally(function() {
                        $scope.closeModal();
                    });
                };

                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    $scope.note = {
                        publishstate: 'personal',
                        text: ''
                    };
                    $scope.processing = false;

                    $scope.modal.show();

                };
            };

        };

        return self;
    };

    return self;
});
