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

.factory('$mmaFiles', function($mmSite, $mmUtil, $mmFS, $mmWS, $q, $timeout, $log, md5) {

    $log = $log.getInstance('$mmaFiles');

    var self = {},
        defaultParams = {
            "contextid": 0,
            "component": "",
            "filearea": "",
            "itemid": 0,
            "filepath": "",
            "filename": ""
        };

    self.canAccessFiles = function() {
        return $mmSite.wsAvailable('core_files_get_files');
    };

    /**
     * Get a file.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getFile
     * @param  {Object} A file object typically returned from $mmaFiles#getFiles()
     * @return {FileEntry}
     */
    self.getFile = function(file) {
        var deferred = $q.defer(),
            downloadURL = $mmSite.fixPluginfileURL(file.url),
            siteId = $mmSite.getId(),
            linkId = file.linkId,
            filename = $mmFS.normalizeFileName(file.filename),
            directory = siteId + "/files/" + linkId,
            filePath = directory + "/" + filename;

        $log.debug("Starting download of Moodle file: " + downloadURL);
        $mmFS.createDir(directory).then(function() {
            $log.debug("Downloading Moodle file to " + filePath + " from URL: " + downloadURL);

            $mmWS.downloadFile(downloadURL, filePath).then(function(fileEntry) {
                $log.debug("Download of content finished " + fileEntry.toURL() + " URL: " + downloadURL);

                // TODO Caching.
                // var uniqueId = siteId + "-" + hex_md5(url);
                // var file = {
                //     id: uniqueId,
                //     url: url,
                //     site: siteId,
                //     localpath: fullpath
                // };
                // MM.db.insert("files", file);
                deferred.resolve(fileEntry);
            }, function() {
                $log.error('Error downloading from URL: ' + downloadURL);
                deferred.reject();
            });
        }, function() {
            $log.error('Error while creating the directory ' + directory);
            deferred.reject();
        });

        return deferred.promise;
    };

    /**
     * Get the list of files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getFiles
     * @param  {Object} A list of parameters accepted by the Web service.
     * @param  {Boolean} refresh Pass true to ignore the cache.
     * @return {Object} An object containing the files in the key 'entries', and 'count'.
     *                  Additional properties is added to the entries, such as:
     *                  - imgpath: The path to the icon.
     *                  - link: The JSON string of params to get to the file.
     *                  - linkId: A hash of the file parameters.
     */
    self.getFiles = function(params, refresh) {
        var deferred = $q.defer(),
            options = {};

        if (refresh === true) {
            options.getFromCache = false;
        }

        $mmSite.read('core_files_get_files', params, options).then(function(result) {
            var data = {
                entries: [],
                count: 0
            };

            if (typeof result.files == 'undefined') {
                deferred.reject();
                return;
            }

            angular.forEach(result.files, function(entry) {
                entry.link = {};
                entry.link.contextid = (entry.contextid) ? entry.contextid : "";
                entry.link.component = (entry.component) ? entry.component : "";
                entry.link.filearea = (entry.filearea) ? entry.filearea : "";
                entry.link.itemid = (entry.itemid) ? entry.itemid : 0;
                entry.link.filepath = (entry.filepath) ? entry.filepath : "";
                entry.link.filename = (entry.filename) ? entry.filename : "";

                if (entry.component && entry.isdir) {
                    // Delete unused elements that may break the request.
                    entry.link.filename = "";
                }

                if (entry.isdir) {
                    entry.imgpath = $mmUtil.getFolderIcon();
                } else {
                    entry.imgpath = $mmUtil.getFileIcon(entry.filename);
                }

                entry.link = JSON.stringify(entry.link);
                entry.linkId = md5.createHash(entry.link);
                // entry.localpath = "";

                // if (!entry.isdir && entry.url) {
                //     // TODO Check $mmSite.
                //     var uniqueId = $mmSite.id + "-" + md5.createHash(entry.url);
                //     var path = MM.db.get("files", uniqueId);
                //     if (path) {
                //         entry.localpath = path.get("localpath");
                //     }
                // }

                data.count += 1;
                data.entries.push(entry);
            });

            deferred.resolve(data);
        }, function() {
            deferred.reject();
        });

        return deferred.promise;
    };

    /**
     * Get the private files of the current user.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getMyFiles
     * @param  {Boolean} refresh Pass true to ignore the cache.
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getMyFiles = function(refresh) {
        var params = angular.copy(defaultParams, {});
        params.component = "user";
        params.filearea = "private";
        params.contextid = -1;
        params.contextlevel = "user";
        params.instanceid = $mmSite.getInfo().userid;
        return self.getFiles(params, refresh);
    };

    /**
     * Get the site files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getSiteFiles
     * @param  {Boolean} refresh Pass true to ignore the cache.
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getSiteFiles = function(refresh) {
        var params = angular.copy(defaultParams, {});
        return self.getFiles(params, refresh);
    };

    /**
     * Return whether or not the plugin is enabled.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#isPluginEnabled
     * @return {Boolean}
     */
    self.isPluginEnabled = function() {
        var canAccessFiles = self.canAccessFiles(),
            canUploadFiles = $mmSite.canUploadFiles();

        return canAccessFiles || canUploadFiles;
    };

    /**
     * Upload a file.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadFile
     * @param  {Object} uri File URI.
     * @param  {Object} options Options for the upload.
     *                          - {Boolean} deleteAfterUpload Whether or not to delete the original after upload
     *                          - {String} fileKey
     *                          - {String} fileName
     *                          - {String} mimeType
     * @return {Promise}
     */
    self.uploadFile = function(uri, options) {
        options = options || {};
        var deleteAfterUpload = options.deleteAfterUpload && ionic.Platform.isIOS(),
            deferred = $q.defer(),
            ftOptions = {
                fileKey: options.fileKey,
                fileName: options.fileName,
                mimeType: options.mimeType
            };

        $mmSite.uploadFile(uri, ftOptions).then(function(result) {
            // Success.
            if (deleteAfterUpload) {
                $timeout(function() {
                    // Delete image after upload in iOS (always copies the image to the tmp folder)
                    // or if the photo is taken with the camera, not browsed.
                    $mmFS.removeExternalFile(uri);
                }, 500);
            }
            deferred.resolve(result);
        }, function(error) {
            // Error.
            if (deleteAfterUpload) {
                $timeout(function() {
                    // Delete image after upload in iOS (always copies the image to the tmp folder)
                    // or if the photo is taken with the camera, not browsed.
                    $mmFS.removeExternalFile(uri);
                }, 500);
            }
            deferred.reject(error);
        }, function(progress) {
            // Progress.
            deferred.notify(progress);
        });

        return deferred.promise;
    };

    /**
     * Upload image.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadImage
     * @param  {Object} uri File URI.
     * @return {Promise}
     */
    self.uploadImage = function(uri) {
        $log.info('Uploading an image');
        var d = new Date(),
            options = {};

        if (typeof(uri) === 'undefined' || uri === ''){
            // In Node-Webkit, if you successfully upload a picture and then you open the file picker again
            // and cancel, this function is called with an empty uri. Let's filter it.
            $log.info('Received invalid URI in $mmaFiles.uploadImage()');

            var deferred = $q.defer();
            deferred.reject();
            return deferred.promise;
        }

        // TODO Handle Node Webkit.
        options.deleteAfterUpload = true;
        options.fileKey = "file";
        options.fileName = "image_" + d.getTime() + ".jpg";
        options.mimeType = "image/jpeg";

        return self.uploadFile(uri, options);
    };

    /**
     * Upload media.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadMedia
     * @param  {Array} mediaFiles Array of file objects.
     * @return {Array} Array of promises.
     */
    self.uploadMedia = function(mediaFiles) {
        $log.info('Uploading media');
        var promises = [];
        angular.forEach(mediaFiles, function(mediaFile, index) {
            var options = {};
            options.fileKey = null;
            options.fileName = mediaFile.name;
            options.mimeType = null;
            promises.push(self.uploadFile(mediaFile.fullPath, options));
        });
        return promises;
    };

    return self;
});
