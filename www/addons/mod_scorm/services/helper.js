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

angular.module('mm.addons.mod_scorm')

/**
 * Helper to gather some common SCORM functions.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmCourseHelper
 */
.factory('$mmaModScormHelper', function($mmaModScorm, $mmUtil, $translate, $q) {

    var self = {};

    /**
     * Show a confirm dialog if needed. If SCORM doesn't have size, try to calculate it.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#confirmDownload
     * @param {Object} scorm SCORM to download.
     * @return {Promise}     Promise resolved if the user confirms or no confirmation needed.
     */
    self.confirmDownload = function(scorm) {
        var promise;
        if (!scorm.packagesize) {
            // We don't have package size, try to calculate it.
            promise = $mmaModScorm.calculateScormSize(scorm).then(function(size) {
                // Store it so we don't have to calculate it again when using the same object.
                scorm.packagesize = size;
                return size;
            });
        } else {
            promise = $q.when(scorm.packagesize);
        }

        return promise.then(function(size) {
            return $mmUtil.confirmDownloadSize(size);
        });
    };

    /**
     * Show error because a SCORM download failed.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#showDownloadError
     * @param {Object} scorm SCORM downloaded.
     * @return {Void}
     */
    self.showDownloadError = function(scorm) {
        $translate('mma.mod_scorm.errordownloadscorm', {name: scorm.name}).then(function(message) {
            $mmUtil.showErrorModal(message);
        });
    };

    return self;
});
