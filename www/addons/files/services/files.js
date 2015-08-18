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

.config(function($mmAppProvider, mmaFilesSharedFilesStore) {
    var stores = [
        {
            name: mmaFilesSharedFilesStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

.factory('$mmaFiles', function($mmSite, $mmUtil, $mmFS, $mmWS, $q, $timeout, $log, $mmSitesManager, $mmApp, md5,
            mmaFilesSharedFilesStore) {

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

    /**
     * Check if core_files_get_files WS call is available.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#canAccessFiles
     * @return {Boolean} True if WS is available, false otherwise.
     */
    self.canAccessFiles = function() {
        return $mmSite.wsAvailable('core_files_get_files');
    };

    /**
     * Checks if there is a new file received in iOS. If more than one file is found, treat only the first one.
     * The file returned is marked as "treated" and will be deleted in the next execution.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#checkIOSNewFiles
     * @return {Promise} Promise resolved with a new file to be treated. If no new files found, promise is rejected.
     */
    self.checkIOSNewFiles = function() {

        var deferred = $q.defer();

        $log.debug('Search for new files on iOS');
        $mmFS.getDirectoryContents('Inbox').then(function(entries) {

            if (entries.length > 0) {

                var promises = [];
                angular.forEach(entries, function(entry) {

                    var fileDeferred = $q.defer(),
                        fileId = md5.createHash(entry.name);

                    // Check if file was already treated.
                    $mmApp.getDB().get(mmaFilesSharedFilesStore, fileId).then(function() {
                        // File already treated. Delete it.
                        $log.debug('Delete already treated file: ' + entry.name);
                        fileDeferred.resolve();

                        entry.remove(function() {
                            $log.debug('File deleted: ' + entry.name);
                            $mmApp.getDB().remove(mmaFilesSharedFilesStore, fileId).then(function() {
                                $log.debug('"Treated" mark removed from file: ' + entry.name);
                            }, function() {
                                $log.debug('Error deleting "treated" mark from file: ' + entry.name);
                            });
                        }, function() {
                            $log.debug('Error deleting file in Inbox: ' + entry.name);
                        });

                    }, function() {
                        // File not treated before, send it to resolve so it's a candidate to be notified.
                        $log.debug('Found new file ' + entry.name + ' shared with the app.');
                        fileDeferred.resolve(entry);
                    });

                    promises.push(fileDeferred.promise);
                });

                $q.all(promises).then(function(responses) {
                    var fileToReturn,
                        fileId;
                    for (var i = 0; i < responses.length; i++) {
                        if (typeof(responses[i]) !== 'undefined') {
                            // Found new entry to treat.
                            fileToReturn = responses[i];
                            break;
                        }
                    }
                    if (fileToReturn) {
                        fileId = md5.createHash(fileToReturn.name);
                        // Mark it as "treated".
                        $mmApp.getDB().insert(mmaFilesSharedFilesStore, {id: fileId}).then(function() {
                            $log.debug('File marked as "treated": ' + fileToReturn.name);
                            deferred.resolve(fileToReturn);
                        }, function() {
                            $log.debug('Error marking file as "treated": ' + fileToReturn.name);
                            deferred.reject();
                        });
                    } else {
                        deferred.reject();
                    }
                }, deferred.reject);
            } else {
                deferred.reject();
            }
        });

        return deferred.promise;
    };

    /**
     * Get the list of files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getFiles
     * @param  {Object} params A list of parameters accepted by the Web service.
     * @return {Object}        An object containing the files in the key 'entries', and 'count'.
     *                         Additional properties is added to the entries, such as:
     *                          - imgpath: The path to the icon.
     *                          - link: The JSON string of params to get to the file.
     *                          - linkId: A hash of the file parameters.
     */
    self.getFiles = function(params) {
        var deferred = $q.defer(),
            options = {};

        options.cacheKey = getFilesListCacheKey(params);

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
     * Get cache key for file list WS calls.
     *
     * @param  {Object} params Params of the directory to get.
     * @return {String}        Cache key.
     */
    function getFilesListCacheKey(params) {
        var root = params.component === '' ? 'site' : 'my';
        return 'mmaFiles:list:' + root + ':' + params.contextid + ':' + params.filepath;
    }

    /**
     * Get the private files of the current user.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getMyFiles
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getMyFiles = function() {
        var params = getMyFilesRootParams();
        return self.getFiles(params);
    };

    /**
     * Get the common part of the cache keys for private files WS calls.
     *
     * @return {String} Cache key.
     */
    function getMyFilesListCommonCacheKey() {
        return 'mmaFiles:list:my';
    }

    /**
     * Get params to get root private files directory.
     *
     * @return {Object} Params.
     */
    function getMyFilesRootParams() {
        var params = angular.copy(defaultParams, {});
        params.component = "user";
        params.filearea = "private";
        params.contextid = -1;
        params.contextlevel = "user";
        params.instanceid = $mmSite.getUserId();
        return params;
    }

    /**
     * Get the site files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getSiteFiles
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getSiteFiles = function() {
        var params = angular.copy(defaultParams, {});
        return self.getFiles(params);
    };

    /**
     * Get the common part of the cache keys for site files WS calls.
     *
     * @return {String} Cache key.
     */
    function getSiteFilesListCommonCacheKey() {
        return 'mmaFiles:list:site';
    }

    /**
     * Invalidates list of files in a certain directory.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#invalidateDirectory
     * @param  {String} root     Root of the directory ('my' for private files, 'site' for site files).
     * @param  {String} path     Path to the directory.
     * @param  {String} [siteid] Id of the site to invalidate. If not defined, use current site.
     * @return {Promise}         Promise resolved when the list is invalidated.
     */
    self.invalidateDirectory = function(root, path, siteid) {
        siteid = siteid || $mmSite.getId();

        var params = {};
        if (!path) {
            if (root === 'site') {
                params = angular.copy(defaultParams, {});
            } else if (root === 'my') {
                params = getMyFilesRootParams();
            }
        } else {
            params = JSON.parse(path);
        }

        return $mmSitesManager.getSite(siteid).then(function(site) {
            site.invalidateWsCacheForKey(getFilesListCacheKey(params));
        });
    };

    /**
     * Invalidates list of private files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#invalidateMyFiles
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateMyFiles = function() {
        return $mmSite.invalidateWsCacheForKeyStartingWith(getMyFilesListCommonCacheKey());
    };

    /**
     * Invalidates list of site files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#invalidateSiteFiles
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateSiteFiles = function() {
        return $mmSite.invalidateWsCacheForKeyStartingWith(getSiteFilesListCommonCacheKey());
    };

    /**
     * Return whether or not the plugin is enabled. Plugin is enabled if:
     *     - Site supports core_files_get_files
     *     or
     *     - User has capability moodle/user:manageownfiles and WS allows uploading files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#isPluginEnabled
     * @return {Boolean}
     */
    self.isPluginEnabled = function() {
        var canAccessFiles = self.canAccessFiles(),
            canAccessMyFiles = $mmSite.canAccessMyFiles(),
            canUploadFiles = $mmSite.canUploadFiles();

        return canAccessFiles || (canUploadFiles && canAccessMyFiles);
    };

    /**
     * Upload a file.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadFile
     * @param  {Object} uri      File URI.
     * @param  {Object} options  Options for the upload.
     *                           - {Boolean} deleteAfterUpload Whether or not to delete the original after upload.
     *                           - {String} fileKey
     *                           - {String} fileName
     *                           - {String} mimeType
     * @param  {String} [siteid] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}
     */
    self.uploadFile = function(uri, options, siteid) {
        options = options || {};
        siteid = siteid || $mmSite.getId();

        var deleteAfterUpload = options.deleteAfterUpload,
            deferred = $q.defer(),
            ftOptions = {
                fileKey: options.fileKey,
                fileName: options.fileName,
                mimeType: options.mimeType
            };

        function deleteFile() {
            $timeout(function() {
                // Use set timeout, otherwise in Node-Webkit the upload threw an error sometimes.
                $mmFS.removeExternalFile(uri);
            }, 500);
        }

        $mmSitesManager.getSite(siteid).then(function(site) {
            site.uploadFile(uri, ftOptions).then(deferred.resolve, deferred.reject, deferred.notify).finally(function() {
                if (deleteAfterUpload) {
                    deleteFile();
                }
            });
        }, function() {
            if (deleteAfterUpload) {
                deleteFile();
            }
            deferred.reject(error);
        });

        return deferred.promise;
    };

    /**
     * Upload image.
     * @todo Handle Node Webkit.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadImage
     * @param  {String}  uri         File URI.
     * @param  {Boolean} isFromAlbum True if the image was taken from album, false if it's a new image taken with camera.
     * @return {Promise}
     */
    self.uploadImage = function(uri, isFromAlbum) {
        $log.debug('Uploading an image');
        var d = new Date(),
            options = {};

        if (typeof(uri) === 'undefined' || uri === ''){
            // In Node-Webkit, if you successfully upload a picture and then you open the file picker again
            // and cancel, this function is called with an empty uri. Let's filter it.
            $log.debug('Received invalid URI in $mmaFiles.uploadImage()');
            return $q.reject();
        }

        options.deleteAfterUpload = !isFromAlbum;
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
        $log.debug('Uploading media');
        var promises = [];
        angular.forEach(mediaFiles, function(mediaFile, index) {
            var options = {};
            options.fileKey = null;
            options.fileName = mediaFile.name;
            options.mimeType = null;
            options.deleteAfterUpload = true;
            promises.push(self.uploadFile(mediaFile.fullPath, options));
        });
        return promises;
    };

    /**
     * Upload a file of any type.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#uploadGenericFile
     * @param  {String} uri      File URI.
     * @param  {String} name     File name.
     * @param  {String} type     File type.
     * @param  {String} [siteid] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}     Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type, siteid) {
        var options = {};
        options.fileKey = null;
        options.fileName = name;
        options.mimeType = type;
        // Don't delete the file on iOS, it's going to be deleted on $mmaFiles#checkIOSNewFiles.
        options.deleteAfterUpload = !ionic.Platform.isIOS();

        return self.uploadFile(uri, options, siteid);
    };

    return self;
});
