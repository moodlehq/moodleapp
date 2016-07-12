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
            $ionicModal, $state, $translate) {

    $log = $log.getInstance('$mmSharedFilesHelper');

    var self = {},
        filePickerDeferred;

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
                close();
                deferred.resolve(name);
            };

            scope.closeModal = function() {
                close();
                deferred.reject();
            };

            function close() {
                modal.remove();
                scope.$destroy();
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
     * @return {Void}
     */
    self.filePickerClosed = function() {
        if (filePickerDeferred) {
            filePickerDeferred.reject();
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
        var parentState = $state.$current.name.split('.')[0];
        return $state.go(parentState + '.sharedfiles-choose-site', {filepath: filePath});
    };

    /**
     * Open the view to select a shared file.
     *
     * @module mm.core.sharedfiles
     * @ngdoc method
     * @name $mmSharedFilesHelper#pickSharedFile
     * @return {Promise} Promise resolved when a file is picked, rejected if file picker is closed without selecting a file.
     */
    self.pickSharedFile = function() {
        filePickerDeferred = $q.defer();
        $state.go('site.sharedfiles-list', {pick: true});
        return filePickerDeferred.promise;
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
