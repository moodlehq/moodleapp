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

angular.module('mm.addons.mod_data')

/**
 * Handler for file data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldFileHandler
 */
.factory('$mmaModDataFieldFileHandler', function($mmFileSession, mmaModDataComponent, $mmFileUploaderHelper, $translate) {

    var self = {};

    /**
     * Get field search data in the input data.
     *
     * @param  {Object} field      Defines the field to be rendered.
     * @param  {Object} inputData  Data entered in the search form.
     * @return {Array}             With name and value of the data to be sent.
     */
    self.getFieldSearchData = function(field, inputData) {
        var fieldName = 'f_' + field.id;
        if (inputData[fieldName]) {
            return [{
                name: fieldName,
                value: inputData[fieldName]
            }];
        }
        return false;
    };

    /**
     * Get field edit data in the input data.
     *
     * @param  {Object} field      Defines the field to be rendered.
     * @return {Promise}           With name and value of the data to be sent.
     */
    self.getFieldEditData = function(field) {
        var files = self.getFieldEditFiles(field);
        if (files.length) {
            return [{
                fieldid: field.id,
                subfield: 'file',
                files: files
            }];
        }
        return false;
    };

    /**
     * Get field edit files in the input data.
     *
     * @param  {Object} field        Defines the field..
     * @return {Promise}             With name and value of the data to be sent.
     */
    self.getFieldEditFiles = function(field) {
        return $mmFileSession.getFiles(mmaModDataComponent,  field.dataid + '_' + field.id);
    };

    /**
     * Get field data in changed.
     *
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Boolean}                    If the field has changes.
     */
    self.hasFieldDataChanged = function(field, inputData, originalFieldData) {
        var files = $mmFileSession.getFiles(mmaModDataComponent,  field.dataid + '_' + field.id) || [],
            originalFiles = (originalFieldData && originalFieldData.files) || [];

        if (originalFiles.length) {
            originalFiles = [originalFiles[0]];
        }

        return $mmFileUploaderHelper.areFileListDifferent(files, originalFiles);
    };

    /**
     * Check and get field requeriments.
     *
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @return {String}                     String with the notification or false.
     */
    self.getFieldsNotifications = function(field, inputData) {
        if (field.required && (!inputData || !inputData.length || !inputData[0].value)) {
            return $translate.instant('mma.mod_data.errormustsupplyvalue');
        }
        return false;
    };

    /**
     * Override field content data with offline submission.
     *
     * @param  {Object} originalContent     Original data to be overriden.
     * @param  {Array}  offlineContent      Array with all the offline data to override.
     * @param  {Array}  offlineFiles        Array with all the offline files in the field.
     * @return {Object}                     Data overriden
     */
    self.overrideData = function(originalContent, offlineContent, offlineFiles) {
        if (offlineContent && offlineContent.file && offlineContent.file.offline > 0 && offlineFiles && offlineFiles.length > 0) {
            originalContent.content = offlineFiles[0].filename;
            originalContent.files = [offlineFiles[0]];
        } else if (offlineContent && offlineContent.file && offlineContent.file.online && offlineContent.file.online.length > 0) {
            originalContent.content = offlineContent.file.online[0].filename;
            originalContent.files = [offlineContent.file.online[0]];
        }

        return originalContent;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModDataFieldsDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the data addon will be packaged in custom apps.
    var $mmaModDataFieldsDelegate = $mmAddonManager.get('$mmaModDataFieldsDelegate');
    if ($mmaModDataFieldsDelegate) {
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldFile', 'file', '$mmaModDataFieldFileHandler');
    }
});
