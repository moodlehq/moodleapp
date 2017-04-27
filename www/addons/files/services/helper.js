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

angular.module('mm.addons.files')

.factory('$mmaFilesHelper', function($q, $mmUtil, $log, $mmaFiles, $mmFileUploaderHelper, $mmSite) {

    $log = $log.getInstance('$mmaFilesHelper');

    var self = {};

    /**
     * Open the view to select and upload a file and, once uploaded, move it to private files if needed.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#selectAndUploadFile
     * @return {Promise} Promise resolved when a file is uploaded, rejected otherwise.
     */
    self.selectAndUploadFile = function() {
        // Open the file picker.
        var maxSize = $mmSite.getInfo().usermaxuploadfilesize,
            userQuota = $mmSite.getInfo().userquota;

        if (userQuota === 0) {
            // 0 means ignore user quota. In the app it is -1.
            userQuota = -1;
        }

        if (typeof maxSize == 'undefined') {
            if (typeof userQuota != 'undefined') {
                maxSize = userQuota;
            } else {
                // In versions pre Moodle 2.9 this field is not present, so we force to ignore the file size.
                maxSize = -1;
            }
        } else if (typeof userQuota != 'undefined') {
            // Use the minimum value.
            maxSize = Math.min(maxSize, userQuota);
        }

        return $mmFileUploaderHelper.selectAndUploadFile(maxSize).then(function(result) {
            // File uploaded. Move it to private files if needed.
            return $mmaFiles.shouldMoveFromDraftToPrivate().then(function(move) {
                if (move) {
                    if (!result) {
                        return $q.reject();
                    }

                    var modal = $mmUtil.showModalLoading('mm.fileuploader.uploading', true);
                    return $mmaFiles.moveFromDraftToPrivate(result.itemid).catch(function(error) {
                        if (error) {
                            $mmUtil.showErrorModal(error);
                        } else {
                            $mmUtil.showErrorModal('mm.fileuploader.errorwhileuploading', true);
                        }
                        return $q.reject();
                    }).finally(function() {
                        modal.dismiss();
                    });
                }
            });
        }).then(function() {
            $mmUtil.showModal('mm.core.success', 'mm.fileuploader.fileuploaded');
        });
    };

    return self;
});
