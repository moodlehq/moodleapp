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

angular.module('mm.core.fileuploader')

/**
 * Controller to select and upload a file.
 *
 * @module mm.core.fileuploader
 * @ngdoc controller
 * @name mmFileUploaderPickerCtrl
 */
.controller('mmFileUploaderPickerCtrl', function($scope, $stateParams, $mmUtil, $mmFileUploaderHelper, $ionicHistory, $mmApp) {

    var uploadMethods = {
            album: $mmFileUploaderHelper.uploadImage,
            camera: $mmFileUploaderHelper.uploadImage,
            audio: $mmFileUploaderHelper.uploadAudioOrVideo,
            video: $mmFileUploaderHelper.uploadAudioOrVideo
        };

    $scope.isAndroid = ionic.Platform.isAndroid();

    // Function called when a file is uploaded.
    function successUploading(result) {
        $mmFileUploaderHelper.fileUploaded(result);
        $ionicHistory.goBack();
    }

    // Function called when a file upload fails.
    function errorUploading(err) {
        if (err) {
            $mmUtil.showErrorModal(err);
        }
    }

    // Upload media.
    $scope.upload = function(type, param) {
        if (!$mmApp.isOnline()) {
            $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
        } else {
            if (typeof(uploadMethods[type]) !== 'undefined') {
                uploadMethods[type](param).then(successUploading, errorUploading);
            }
        }
    };

    // Upload a file selected with input type="file".
    $scope.uploadFile = function(evt) {
        var input = evt.srcElement;
        var file = input.files[0];
        input.value = ''; // Unset input.
        if (file) {
            $mmFileUploaderHelper.confirmUploadFile(file.size).then(function() {
                // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
                $mmFileUploaderHelper.copyAndUploadFile(file).then(successUploading, errorUploading);
            }, errorUploading);
        }
    };

    $scope.$on('$destroy', function(){
        $mmFileUploaderHelper.filePickerClosed();
    });
});
