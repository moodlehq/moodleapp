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

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaNotes.isPluginAddNoteEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @return {Boolean}        True if handler is enabled, false otherwise.
         */
        self.isEnabledForUser = function(user, courseId) {
            // Active course required.
            return courseId && user.id != $mmSite.getUserId();
        };

        /**
         * Get the controller.
         *
         * @param {Object} user     Course ID.
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
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
                    var loadingModal = $mmUtil.showModalLoading('mm.core.sending', true);
                    // Freeze the add note button.
                    $scope.processing = true;

                    $mmaNotes.addNote(user.id, courseid, $scope.note.publishstate, $scope.note.text).then(function() {
                        $mmUtil.showModal('mm.core.success', 'mma.notes.eventnotecreated');
                        $scope.closeModal();
                    }, function(error) {
                        $mmUtil.showErrorModal(error);
                        $scope.processing = false;
                    }).finally(function() {
                        loadingModal.dismiss();
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

    /**
     * Course nav handler.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesHandlers#coursesNav
     */
    self.coursesNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaNotes.isPluginViewNotesEnabled();
        };

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} courseId Course ID.
         * @return {Boolean}        True if handler is enabled, false otherwise.
         */
        self.isEnabledForCourse = function(courseId) {
            return true;
        };

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(courseId) {

            /**
             * Courses nav handler controller.
             *
             * @module mm.addons.notes
             * @ngdoc controller
             * @name $mmaNotesHandlers#coursesNav:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-ios-list';
                $scope.title = 'mma.notes.notes';
                $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.notes-types', {
                        course: course
                    });
                };
            };
        };

        return self;
    };

    return self;
});
