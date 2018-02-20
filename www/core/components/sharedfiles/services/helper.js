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

.factory('$mmSharedFilesHelper', function($mmSharedFiles, $mmUtil, $log, $mmApp, $mmSitesManager, $mmFS, $rootScope, $q,
            $ionicModal, $state, $translate, $mmSite, $mmFileUploaderHelper) {

    $log = $log.getInstance('$mmSharedFilesHelper');

    var self = {},
        filePickerDeferred,
        fileListScope;

    /**
     * Ask a user if he wants to replace a file (using originalName) or rename it (using newName).
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#askRenameReplace
     * @param  {String} originalName Original name.
     * @param  {String} newName      New name.
     * @return {Promise}             Promise resolved with the name to use when the user chooses. Rejected if user cancels.
     */
    self.askRenameReplace = function(originalName, newName) {
        var scope = $rootScope.$new();
        scope.originalName = originalName;
        scope.newName = newName;

        return $ionicModal.fromTemplateUrl('core/components/sharedfiles/templates/renamereplace.html', {
            scope: scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            var deferred = $q.defer();

            scope.modal = modal;
            modal.show();

            scope.click = function(name) {
                close().catch(function() {}).then(function() {
                    deferred.resolve(name);
                });
            };

            scope.closeModal = function() {
                close().catch(function() {}).then(function() {
                    deferred.reject();
                });
            };

            function close() {
                return modal.remove().then(function() {
                    scope.$destroy();
                });
            }

            return deferred.promise;
        });
    };

    /**
     * Function called when the file picker is closed.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#filePickerClosed
     * @param  {String} [error] The error message if any.
     * @return {Void}
     */
    self.filePickerClosed = function(error) {
        if (filePickerDeferred) {
            filePickerDeferred.reject(error);
            filePickerDeferred = undefined;
        }
    };

    /**
     * Function to call once a file is picked.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#filePicked
     * @param  {String} filePath Path of the file picked.
     * @return {Void}
     */
    self.filePicked = function(filePath) {
        if (filePickerDeferred) {
            filePickerDeferred.resolve({
                path: filePath,
                uploaded: false
            });
            filePickerDeferred = undefined;
        }
    };

    /**
     * Go to the choose site view.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#goToChooseSite
     * @param  {String} filePath File path to send to the view.
     * @return {Promise}         Promise resolved when state changed.
     */
    self.goToChooseSite = function(filePath) {
        // If the modal is shown, close it.
        fileListScope && fileListScope.closeModal && fileListScope.closeModal();

        var parentState = $state.$current.name.split('.')[0];
        return $state.go(parentState + '.sharedfiles-choose-site', {filepath: filePath});
    };

    /**
     * Initialize the file list modal if it isn't initialized already.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#initFileListModal
     * @return {Promise} Promise resolved when the modal is initialized.
     */
    self.initFileListModal = function() {
        if (fileListScope && fileListScope.modal) {
            // Already initialized.
            return $q.when();
        }

        fileListScope = $rootScope.$new();

        return $ionicModal.fromTemplateUrl('core/components/sharedfiles/templates/listmodal.html', {
            scope: fileListScope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            fileListScope.modal = modal;
        });
    };

    /**
     * Open the view to select a shared file.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#pickSharedFile
     * @param  {String[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise} Promise resolved when a file is picked, rejected if file picker is closed without selecting a file.
     */
    self.pickSharedFile = function(mimetypes) {
        var path = '',
            siteId = $mmSite.getId();

        filePickerDeferred = $q.defer();

        self.initFileListModal().then(function() {
            fileListScope.filesLoaded = false;
            // fileListScope.mimetypes = mimetypes;
            if (path) {
                fileListScope.title = $mmFS.getFileAndDirectoryFromPath(path).name;
            } else {
                fileListScope.title = $translate.instant('mm.sharedfiles.sharedfiles');
            }

            // Load the shared files to show.
            loadFiles().then(function() {

                // Close the modal.
                fileListScope.closeModal = function() {
                    fileListScope.modal.hide();
                    self.filePickerClosed();
                };

                // Refresh current list.
                fileListScope.refreshFiles = function() {
                    loadFiles().finally(function() {
                        fileListScope.$broadcast('scroll.refreshComplete');
                    });
                };

                // Open a subfolder.
                fileListScope.openFolder = function(folder) {
                    path = $mmFS.concatenatePaths(path, folder.name);
                    fileListScope.filesLoaded = false;
                    loadFiles();
                };

                // Change site loaded.
                fileListScope.changeSite = function(sid) {
                    siteId = sid;
                    path = '';
                    fileListScope.filesLoaded = false;
                    loadFiles();
                };

                // File picked.
                fileListScope.filePicked = function(file) {
                    fileListScope.modal.hide();

                    var error = $mmFileUploaderHelper.isInvalidMimetype(mimetypes, file.fullPath);
                    if (error) {
                        self.filePickerClosed(error);
                        return;
                    }

                    self.filePicked(file.fullPath);
                };
            });

            fileListScope.modal.show();
        }).catch(function() {
            self.filePickerClosed();
        });

        return filePickerDeferred.promise;

        function loadFiles() {
            return $mmSharedFiles.getSiteSharedFiles(siteId, path, mimetypes).then(function(files) {
                fileListScope.files = files;
                fileListScope.filesLoaded = true;
            });
        }
    };

    /**
     * Checks if there is a new file received in iOS and move it to the shared folder of current site.
     * If more than one site is found, the user will have to choose the site where to store it in.
     * If more than one file is found, treat only the first one.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#searchIOSNewSharedFiles
     * @return {Promise} Promise resolved when done.
     */
    self.searchIOSNewSharedFiles = function() {
        return $mmApp.ready().then(function() {
            if ($state.$current.name == 'site.sharedfiles-choose-site') {
                // We're already treating a shared file. Abort.
                return $q.reject();
            }

            return $mmSharedFiles.checkIOSNewFiles().then(function(fileEntry) {
                return $mmSitesManager.getSitesIds().then(function(siteIds) {
                    if (!siteIds.length) {
                        // No sites stored, show error and delete the file.
                        $mmUtil.showErrorModal('mm.sharedfiles.errorreceivefilenosites', true);
                        $mmSharedFiles.deleteInboxFile(fileEntry);
                    } else if (siteIds.length == 1) {
                        self.storeSharedFileInSite(fileEntry, siteIds[0]);
                    } else {
                        self.goToChooseSite(fileEntry.fullPath);
                    }
                });
            });
        });
    };

    /**
     * Store a shared file in a site's shared files folder.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#storeSharedFileInSite
     * @param  {Object} fileEntry Shared file entry.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {promise}          Promise resolved when done.
     */
    self.storeSharedFileInSite = function(fileEntry, siteId) {
        siteId = siteId || $mmSite.getId();

        // First of all check if there's already a file with the same name in the shared files folder.
        var sharedFilesDirPath = $mmSharedFiles.getSiteSharedFilesDirPath(siteId);
        return $mmFS.getUniqueNameInFolder(sharedFilesDirPath, fileEntry.name).then(function(newName) {
            if (newName == fileEntry.name) {
                // No file with the same name. Use the original file name.
                return newName;
            } else {
                // Repeated name. Ask the user what he wants to do.
                return self.askRenameReplace(fileEntry.name, newName);
            }
        }).then(function(name) {
            return $mmSharedFiles.storeFileInSite(fileEntry, name, siteId).finally(function() {
                $mmSharedFiles.deleteInboxFile(fileEntry);
                $mmUtil.showModal(undefined, $translate.instant('mm.sharedfiles.successstorefile'));
            }).catch(function(err) {
                $mmUtil.showErrorModal(err || 'Error moving file.');
                return $q.reject();
            });
        });
    };

    return self;
});
