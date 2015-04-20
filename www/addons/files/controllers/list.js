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

.controller('mmaFilesListController', function($q, $scope, $stateParams, $ionicActionSheet,
        $mmaFiles, $mmSite, $translate, $timeout, $mmUtil, $mmFS, $mmWS, $log, $cordovaCamera) {

    var path = $stateParams.path,
        root = $stateParams.root,
        title,
        promise;

    // We're loading the files.
    $scope.count = -1;

    // Convenience function that fetches the files and updates the scope.
    // It was place in its own function so that we can refresh the files.
    function fetchFiles(root, path, refresh) {
        refresh = (typeof refresh === 'undefined') ? false : refresh;

        if (!path) {
            // The path is unknown, the user must be requesting a root.
            if (root === 'site') {
                promise = $mmaFiles.getSiteFiles(refresh);
                title = $translate('mm.addons.files.sitefiles');
            } else if (root === 'my') {
                promise = $mmaFiles.getMyFiles(refresh);
                title = $translate('mm.addons.files.myprivatefiles');
            } else {
                // Upon error we create a fake promise that is rejected.
                promise = (function() {
                    var q = $q.defer();
                    q.reject();
                    return q.promise;
                })();
                title = '';
            }
        } else {
            // Serve the files the user requested.
            pathdata = JSON.parse(path);
            promise = $mmaFiles.getFiles(pathdata, refresh);

            // Put the title in a promise to act like translate does.
            title = (function() {
                var q = $q.defer();
                q.resolve($stateParams.title);
                return q.promise;
            })();
        }

        $q.all([promise, title]).then(function(data) {
            var files = data[0],
                title = data[1];

            $scope.files = files.entries;
            $scope.count = files.count;
            $scope.title = title;
        }, function() {
            $mmUtil.showErrorModal('mm.addons.files.couldnotloadfiles', true);
        });
    }
    fetchFiles(root, path);

    // Downloading a file.
    $scope.download = function(file) {
        var downloadURL = $mmUtil.fixPluginfileURL(file.url),
            siteId = $mmSite.getId(),
            linkId = file.linkId,
            filename = $mmFS.normalizeFileName(file.filename),
            directory = siteId + "/files/" + linkId,
            filePath = directory + "/" + filename;

        $log.debug("Starting download of Moodle file: " + downloadURL);
        $mmFS.createDir(directory).then(function() {
            $log.debug("Downloading Moodle file to " + filePath + " from URL: " + downloadURL);

            // TODO Notify downloading...
            $mmWS.downloadFile(downloadURL, filePath).then(function(fullpath) {
                $log.debug("Download of content finished " + fullpath + " URL: " + downloadURL);

                // TODO Caching.
                // var uniqueId = siteId + "-" + hex_md5(url);
                // var file = {
                //     id: uniqueId,
                //     url: url,
                //     site: siteId,
                //     localpath: fullpath
                // };
                // MM.db.insert("files", file);
                $mmUtil.openFile(fullpath);
            }, function() {
                $log.error('Error downloading ' + fullpath + ' URL: ' + downloadURL);
            });
        }, function() {
            $log.error('Error while creating the directory ' + directory);
        });
    };

    // When we are in the root of the private files we can add more files.
    if (root === 'my' && !path) {
        $scope.add = function() {
            $ionicActionSheet.show({
                buttons: [
                    { text: 'Photo albums' },
                    { text: 'Camera' },
                    { text: 'Audio' },
                    { text: 'Video' },
                ],
                titleText: 'Upload a file from',
                cancelText: 'Cancel',
                buttonClicked: function(index) {
                    if (index === 0) {
                        $log.info('Trying to get a image from albums');

                        var width  =  window.innerWidth  - 200;
                        var height =  window.innerHeight - 200;

                        // iPad popOver, see https://tracker.moodle.org/browse/MOBILE-208
                        var popover = new CameraPopoverOptions(10, 10, width, height, Camera.PopoverArrowDirection.ARROW_ANY);
                        $cordovaCamera.getPicture({
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.FILE_URI,
                            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
                            popoverOptions : popover
                        }).then(function(img) {
                            $translate('loading').then(function(loadingString) {
                                $mmUtil.showModalLoading(loadingString);
                            });

                            $mmaFiles.uploadImage(img).then(function() {
                                // Success.
                                fetchFiles(root, path, true);
                                $mmUtil.closeModalLoading();
                            }, function() {
                                $log.error('Whoops, the file could not be uploaded');
                                $mmUtil.closeModalLoading();
                                $mmUtil.showErrorModal('mm.addons.files.errorwhileuploading', true);
                            });

                        }, function() {
                            // Cancelled, or error.
                        });

                    } else if (index === 1) {
                        $log.info('Trying to get a media from camera');

                        $cordovaCamera.getPicture({
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.FILE_URI
                        }).then(function(img) {
                            $translate('loading').then(function(loadingString) {
                                $mmUtil.showModalLoading(loadingString);
                            });

                            $mmaFiles.uploadImage(img).then(function() {
                                // Success.
                                fetchFiles(root, path, true);
                                $mmUtil.closeModalLoading();
                            }, function() {
                                $log.error('Whoops, the file could not be uploaded');
                                $mmUtil.closeModalLoading();
                                $mmUtil.showErrorModal('mm.addons.files.errorwhileuploading', true);
                            });

                        }, function() {
                            // Cancelled, or error.
                        });

                    } else if (index === 2) {
                    } else if (index === 3) {
                    }

                    return true;
                }
            });
        };
    }
});
