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

.config(function($mmAppProvider, mmSharedFilesStore) {
    var stores = [
        {
            name: mmSharedFilesStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

.factory('$mmSharedFiles', function($mmFS, $q, $log, $mmApp, $mmSite, $mmEvents, md5, mmSharedFilesStore, mmSharedFilesFolder,
            mmSharedFilesEventFileShared) {

    $log = $log.getInstance('$mmSharedFiles');

    var self = {};

    /**
     * Checks if there is a new file received in iOS. If more than one file is found, treat only the first one.
     * The file returned is marked as "treated" and will be deleted in the next execution.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#checkIOSNewFiles
     * @return {Promise} Promise resolved with a new file to be treated. If no new files found, promise is rejected.
     */
    self.checkIOSNewFiles = function() {

        $log.debug('Search for new files on iOS');
        return $mmFS.getDirectoryContents('Inbox').then(function(entries) {
            if (entries.length > 0) {
                var promises = [],
                    fileToReturn;

                angular.forEach(entries, function(entry) {
                    var fileId = self._getFileId(entry);

                    // Check if file was already treated.
                    promises.push(self._isFileTreated(fileId).then(function() {
                        // File already treated, delete it. Don't return delete promise, we'll ignore errors.
                        self.deleteInboxFile(entry);
                    }).catch(function() {
                        // File not treated before.
                        $log.debug('Found new file ' + entry.name + ' shared with the app.');
                        if (!fileToReturn) {
                            fileToReturn = entry;
                        }
                    }));
                });

                return $q.all(promises).then(function() {
                    var fileId;

                    if (fileToReturn) {
                        // Mark it as "treated".
                        fileId = self._getFileId(fileToReturn);
                        return self._markAsTreated(fileId).then(function() {
                            $log.debug('File marked as "treated": ' + fileToReturn.name);
                            return fileToReturn;
                        });
                    } else {
                        return $q.reject();
                    }
                });
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Deletes a file in the Inbox folder (shared with the app).
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#deleteInboxFile
     * @param  {Object} entry FileEntry.
     * @return {Promise}      Promise resolved when done, rejected otherwise.
     */
    self.deleteInboxFile = function(entry) {
        var fileId = self._getFileId(entry),
            deferred = $q.defer();

        function removeMark() {
            self._unmarkAsTreated(fileId).then(function() {
                $log.debug('"Treated" mark removed from file: ' + entry.name);
                deferred.resolve();
            }).catch(function() {
                $log.debug('Error deleting "treated" mark from file: ' + entry.name);
                deferred.reject();
            });
        }

        $log.debug('Delete inbox file: ' + entry.name);
        entry.remove(removeMark, removeMark);

        return deferred.promise;
    };

    /**
     * Get the ID of a file for managing "treated" marks.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#_getFileId
     * @param  {Object} entry FileEntry.
     * @return {String}       File ID.
     * @protected
     */
    self._getFileId = function(entry) {
        return md5.createHash(entry.name);
    };

    /**
     * Get the shared files stored in a site.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#getSiteSharedFiles
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {String} [path]   Path to search inside the site shared folder.
     * @return {Promise}         Promise resolved with the files.
     */
    self.getSiteSharedFiles = function(siteId, path) {
        siteId = siteId || $mmSite.getId();

        var pathToGet = self.getSiteSharedFilesDirPath(siteId);
        if (path) {
            pathToGet = $mmFS.concatenatePaths(pathToGet, path);
        }

        return $mmFS.getDirectoryContents(pathToGet).catch(function() {
            // Directory not found, return empty list.
            return [];
        });
    };

    /**
     * Get the path to a site's shared files folder.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#getSiteSharedFilesDirPath
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {String}          Path.
     */
    self.getSiteSharedFilesDirPath = function(siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmFS.getSiteFolder(siteId) + '/' + mmSharedFilesFolder;
    };

    /**
     * Check if a file has been treated already.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#_isFileTreated
     * @param  {String} fileId File ID.
     * @return {Promise}       Resolved if treated, rejected otherwise.
     * @protected
     */
    self._isFileTreated = function(fileId) {
        return $mmApp.getDB().get(mmSharedFilesStore, fileId);
    };

    /**
     * Mark a file as treated.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#_markAsTreated
     * @param  {String} fileId File ID.
     * @return {Promise}       Resolved when marked.
     * @protected
     */
    self._markAsTreated = function(fileId) {
        return $mmApp.getDB().insert(mmSharedFilesStore, {id: fileId});
    };

    /**
     * Store a file in a site's shared folder.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#storeFileInSite
     * @param  {Object} entry     File entry.
     * @param  {String} [newName] Name of the new file. If not defined, use original file's name.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when done.
     */
    self.storeFileInSite = function(entry, newName, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!entry || !siteId) {
            return $q.reject();
        }

        newName = newName || entry.name;

        var sharedFilesFolder = self.getSiteSharedFilesDirPath(siteId),
            newPath = $mmFS.concatenatePaths(sharedFilesFolder, newName);

        // Create dir if it doesn't exist already.
        return $mmFS.createDir(sharedFilesFolder).then(function() {
            return $mmFS.moveFile(entry.fullPath, newPath).then(function(newFile) {
                $mmEvents.trigger(mmSharedFilesEventFileShared, {siteid: siteId, name: newName});
                return newFile;
            });
        });
    };

    /**
     * Unmark a file as treated.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFiles#_unmarkAsTreated
     * @param  {String} fileId File ID.
     * @return {Promise}       Resolved when unmarked.
     * @protected
     */
    self._unmarkAsTreated = function(fileId) {
        return $mmApp.getDB().remove(mmSharedFilesStore, fileId);
    };

    return self;
});
