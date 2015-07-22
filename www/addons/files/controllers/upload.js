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

/**
 * Controller to upload any kind of file.
 *
 * @module mm.addons.files
 * @ngdoc controller
 * @name mmaFilesUploadCtrl
 */
.controller('mmaFilesUploadCtrl', function($scope, $stateParams, $mmUtil, $mmaFilesHelper, $ionicHistory, $mmaFiles, $mmApp) {

    var uploadMethods = {
            album: $mmaFilesHelper.uploadImageFromAlbum,
            camera: $mmaFilesHelper.uploadImageFromCamera,
            audio: $mmaFilesHelper.uploadAudio,
            video: $mmaFilesHelper.uploadVideo
        },
        path = $stateParams.path,
        root = $stateParams.root;

    $scope.isAndroid = ionic.Platform.isAndroid();

    // Function called when a file is uploaded.
    function successUploading() {
        $mmaFiles.invalidateDirectory(root, path).finally(function() {
            $mmUtil.showModal('mm.core.success', 'mma.files.fileuploaded');
            $ionicHistory.goBack();
        });
    }

    // Function called when a file upload fails.
    function errorUploading(err) {
        if (err) {
            $mmUtil.showErrorModal(err);
        }
    }

    $scope.upload = function(type) {
        if (!$mmApp.isOnline()) {
            $mmUtil.showErrorModal('mma.files.errormustbeonlinetoupload', true);
        } else {
            if (typeof(uploadMethods[type]) !== 'undefined') {
                uploadMethods[type]().then(successUploading, errorUploading);
            }
        }
    };

    $scope.uploadFile = function(evt) {
        var input = evt.srcElement;
        var file = input.files[0];
        input.value = ''; // Unset input.
        if (file) {
            $mmaFilesHelper.confirmUploadFile(file.size).then(function() {
                // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
                $mmaFilesHelper.copyAndUploadFile(file).then(successUploading, errorUploading);
            }, errorUploading);
        }
    }
});
