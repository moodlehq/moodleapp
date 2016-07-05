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

angular.module('mm.core.sharedfiles')

/**
 * Shared files handlers factory. This factory holds the different handlers used for delegates.
 *
 * @module mm.core.sharedfiles
 * @ngdoc service
 * @name $mmSharedFilesHandlers
 */
.factory('$mmSharedFilesHandlers', function($mmSharedFilesHelper) {

    var self = {};

    /**
     * File picker handler.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHandlers#filePicker
     */
    self.filePicker = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return ionic.Platform.isIOS();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * File picker handler controller.
             *
             * @module mm.core.sharedfiles
             * @ngdoc controller
             * @name $mmSharedFilesHandlers#filePicker:controller
             */
            return function($scope) {

                // Button title.
                $scope.title = 'mm.sharedfiles.sharedfiles';
                $scope.class = 'mm-sharedfiles-filepicker-handler';

                $scope.action = function(maxSize) {
                    // We don't use maxSize because we aren't uploading the file ourselves, we return
                    // the file to upload to the fileuploader.
                    return $mmSharedFilesHelper.pickSharedFile();
                };
            };

        };

        return self;
    };

    return self;
});
