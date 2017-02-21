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

.factory('$mmFileUploader', function($mmSite, $mmFS, $q, $timeout, $log, $mmSitesManager, $mmFilepool, $mmUtil) {

    $log = $log.getInstance('$mmFileUploader');

    var self = {};

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be uploaded later.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#storeFilesToUpload
     * @param  {String} folderPath Path of the folder where to store the files.
     * @param  {Object[]} files    List of files.
     * @return {Promise}           Promise resolved if success, rejected otherwise.
     */
    self.storeFilesToUpload = function(folderPath, files) {
        var result = {
            online: [],
            offline: 0
        };

        if (!files || !files.length) {
            return $q.when(result);
        }

        // Remove unused files from previous saves.
        return $mmFS.removeUnusedFiles(folderPath, files).then(function() {
            var promises = [];

            angular.forEach(files, function(file) {
                if (file.filename && !file.name) {
                    // It's an online file, add it to the result and ignore it.
                    result.online.push({
                        filename: file.filename,
                        fileurl: file.fileurl
                    });
                } else if (!file.name) {
                    // Error.
                    promises.push($q.reject());
                } else if (file.fullPath && file.fullPath.indexOf(folderPath) != -1) {
                    // File already in the submission folder.
                    result.offline++;
                } else {
                    // Local file, copy it. Use copy instead of move to prevent having a unstable state if
                    // some copies succeed and others don't.
                    var destFile = $mmFS.concatenatePaths(folderPath, file.name);
                    promises.push($mmFS.copyFile(file.toURL(), destFile));
                    result.offline++;
                }
            });

            return $q.all(promises).then(function() {
                return result;
            });
        });
    };

    /**
     * Upload a file.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadFile
     * @param  {Object} uri      File URI.
     * @param  {Object} options  Options for the upload.
     *                           - {Boolean} deleteAfterUpload Whether or not to delete the original after upload. It will only
     *                                                         be deleted in success.
     *                           - {String} fileKey The name of the form element. Defaults to "file".
     *                           - {String} fileName The file name to use when saving the file on the server.
     *                           - {String} mimeType The mime type of the data to upload.
     * @param  {String} [siteId] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}
     */
    self.uploadFile = function(uri, options, siteId) {
        options = options || {};
        siteId = siteId || $mmSite.getId();

        var deleteAfterUpload = options.deleteAfterUpload,
            ftOptions = angular.copy(options);

        delete ftOptions.deleteAfterUpload;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.uploadFile(uri, ftOptions);
        }).then(function(result) {
            if (deleteAfterUpload) {
                $timeout(function() {
                    // Use set timeout, otherwise in Node-Webkit the upload threw an error sometimes.
                    $mmFS.removeExternalFile(uri);
                }, 500);
            }
            return result;
        });
    };

    /**
     * Upload image.
     * @todo Handle Node Webkit.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadImage
     * @param  {String}  uri         File URI.
     * @param  {Boolean} isFromAlbum True if the image was taken from album, false if it's a new image taken with camera.
     * @return {Promise}
     */
    self.uploadImage = function(uri, isFromAlbum) {
        $log.debug('Uploading an image');
        var options = {
                fileName: 'image_' + $mmUtil.readableTimestamp() + '.jpg', // Default file name.
                mimeType: 'image/jpeg'
            },
            fileName,
            extension;

        if (typeof uri == 'undefined' || uri === '') {
            // In Node-Webkit, if you successfully upload a picture and then you open the file picker again
            // and cancel, this function is called with an empty uri. Let's filter it.
            $log.debug('Received invalid URI in $mmFileUploader.uploadImage()');
            return $q.reject();
        }

        // Check if we know the real file name.
        if (isFromAlbum) {
            fileName = $mmFS.getFileAndDirectoryFromPath(uri).name;
            // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
            fileName = fileName.replace(/(\.[^\.]*)\?[^\.]*$/, '$1');

            extension = $mmFS.getFileExtension(fileName);

            if (extension) {
                // The file has extension, use the real name.
                options.fileName = fileName;
                options.mimeType = $mmFS.getMimeType(extension);
            }
        }


        options.deleteAfterUpload = !isFromAlbum;
        options.fileKey = 'file';

        return self.uploadFile(uri, options);
    };

    /**
     * Upload media.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadMedia
     * @param  {Object} mediaFile File object to upload.
     * @return {Promise}          Promise resolved once the file has been uploaded.
     */
    self.uploadMedia = function(mediaFile) {
        $log.debug('Uploading media');
        var options = {},
            filename = mediaFile.name,
            split;

        // Add a timestamp to the filename to make it unique.
        split = filename.split('.');
        split[0] += '_' + $mmUtil.readableTimestamp();
        filename = split.join('.');

        options.fileKey = null;
        options.fileName = filename;
        options.mimeType = null;
        options.deleteAfterUpload = true;
        return self.uploadFile(mediaFile.fullPath, options);
    };

    /**
     * Upload a file of any type.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadGenericFile
     * @param  {String} uri                File URI.
     * @param  {String} name               File name.
     * @param  {String} type               File type.
     * @param  {Boolean} deleteAfterUpload Whether the file should be deleted after upload.
     * @param  {String} [fileArea]         File area to upload the file to.
     *                                     In Moodle 3.1 or higher defaults to 'draft', in previous versions defaults to 'private'.
     * @param  {Number} [itemId]           Draft ID to upload the file to, 0 to create new. Only for draft files.
     * @param  {String} [siteId]           Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}                   Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type, deleteAfterUpload, fileArea, itemId, siteId) {
        var options = {};
        options.fileKey = null;
        options.fileName = name;
        options.mimeType = type;
        options.deleteAfterUpload = deleteAfterUpload;
        options.itemId = itemId || 0;
        options.fileArea = fileArea;

        return self.uploadFile(uri, options, siteId);
    };

    /**
     * Upload a file to a draft area. If the file is an online file it will be downloaded and then re-uploaded.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadOrReuploadFile
     * @param  {Object} file          Online file or local FileEntry.
     * @param  {Number} [itemId]      Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param  {String} [component]   The component to set to the downloaded files.
     * @param  {Number} [componentId] An ID to use in conjunction with the component.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the itemId.
     */
    self.uploadOrReuploadFile = function(file, itemId, component, componentId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promise,
            fileName;

        if (file.filename && !file.name) {
            // It's an online file. We need to download it and re-upload it.
            fileName = file.filename;
            promise = $mmFilepool.downloadUrl(siteId, file.fileurl, false, component, componentId).then(function(path) {
                return $mmFS.getExternalFile(path);
            });
        } else {
            // Local file, we already have the file entry.
            fileName = file.name;
            promise = $q.when(file);
        }

        return promise.then(function(fileEntry) {
            // Now upload the file.
            return self.uploadGenericFile(fileEntry.toURL(), fileName, fileEntry.type, true, 'draft', itemId, siteId)
                    .then(function(result) {
                return result.itemid;
            });
        });
    };

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     * Online files will be downloaded and then re-uploaded.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadOrReuploadFiles
     * @param  {Object[]} files       List of files.
     * @param  {String} [component]   The component to set to the downloaded files.
     * @param  {Number} [componentId] An ID to use in conjunction with the component.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the itemId.
     */
    self.uploadOrReuploadFiles = function(files, component, componentId, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!files || !files.length) {
            // Return fake draft ID.
            return $q.when(1);
        }

        // Upload only the first file first to get a draft id.
        return self.uploadOrReuploadFile(files[0], 0, component, componentId, siteId).then(function(itemId) {
            var promises = [],
                error;

            angular.forEach(files, function(file, index) {
                if (index === 0) {
                    // First file has already been uploaded.
                    return;
                }

                promises.push(self.uploadOrReuploadFile(file, itemId, component, componentId, siteId).catch(function(message) {
                    error = message;
                    return $q.reject();
                }));
            });

            return $q.all(promises).then(function() {
                return itemId;
            }).catch(function() {
                return $q.reject(error);
            });
        });
    };

    return self;
});
