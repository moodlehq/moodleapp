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

angular.module('mm.addons.mod_glossary')

/**
 * Helper to gather some common functions for glossary.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryHelper
 */
.factory('$mmaModGlossaryHelper', function($mmaModGlossaryOffline, $mmSite, $mmFileUploader, $mmFS, mmaModGlossaryComponent,
        $mmFileUploaderHelper) {

    var self = {};

    /**
     * Delete stored attachment files for a new discussion.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHelper#deleteStoredFiles
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {String} entryName   The name of the entry.
     * @param  {Number} timecreated The time the entry was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when deleted.
     */
    self.deleteStoredFiles = function(glossaryId, entryName, timecreated, siteId) {
        return $mmaModGlossaryOffline.getEntryFolder(glossaryId, entryName, timecreated, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Get a list of stored attachment files for a new entry. See $mmaModGlossaryHelper#storeFiles.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHelper#getStoredFiles
     * @param  {Number} glossaryId      lossary ID.
     * @param  {String} entryName       The name of the entry.
     * @param  {Number} [timecreated]   The time the entry was created.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the files.
     */
    self.getStoredFiles = function(glossaryId, entryName, timecreated, siteId) {
        return $mmaModGlossaryOffline.getEntryFolder(glossaryId, entryName, timecreated, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath);
        });
    };

    /**
     * Check if the data of an entry has changed.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHelper#hasEntryDataChanged
     * @param  {Object}  entry       Current data.
     * @param  {Object}  files       Files attached.
     * @param  {Object}  original    Original content.
     * @return {Boolean}           True if data has changed, false otherwise.
     */
    self.hasEntryDataChanged = function(entry, files, original) {
        if (!original || typeof original.concept == 'undefined') {
            // There is no original data.
            return entry.text || entry.concept || files.length > 0;
        }

        if (original.text != entry.text || original.concept != entry.concept) {
            return true;
        }

        return $mmFileUploaderHelper.areFileListDifferent(files, original.files);
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHelper#storeFiles
     * @param  {Number} glossaryId      Glossary ID.
     * @param  {String} entryName       The name of the entry.
     * @param  {Number} [timecreated]   The time the entry was created.
     * @param  {Object[]} files         List of files.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved if success, rejected otherwise.
     */
    self.storeFiles = function(glossaryId, entryName, timecreated, files, siteId) {
        // Get the folder where to store the files.
        return $mmaModGlossaryOffline.getEntryFolder(glossaryId, entryName, timecreated, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHelper#uploadOrStoreFiles
     * @param  {Number}   glossaryId    Glossary ID.
     * @param  {String}   entryName     The name of the entry.
     * @param  {Number}   [timecreated] The time the entry was created.
     * @param  {Object[]} files         List of files.
     * @param  {Boolean}  offline       True if files sould be stored for offline, false to upload them.
     * @param  {String}   [siteId]      Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved if success.
     */
    self.uploadOrStoreFiles = function(glossaryId, entryName, timecreated, files, offline, siteId) {
        if (offline) {
            return self.storeFiles(glossaryId, entryName, timecreated, files, siteId);
        } else {
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModGlossaryComponent, glossaryId, siteId);
        }
    };

    return self;
});