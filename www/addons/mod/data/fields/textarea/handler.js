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
 * Handler for textarea data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldTextareaHandler
 */
.factory('$mmaModDataFieldTextareaHandler', function($mmText, $mmUtil, $translate) {

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
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Promise}                    With name and value of the data to be sent.
     */
    self.getFieldEditData = function(field, inputData, originalFieldData) {
        var fieldName = 'f_' + field.id;
        if (inputData[fieldName]) {
            return $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
                var files = self.getFieldEditFiles(field, inputData, originalFieldData),
                    text = $mmText.restorePluginfileUrls(inputData[fieldName], files);

                if (!enabled) {
                    // Rich text editor not enabled, add some HTML to the text if needed.
                    text = $mmText.formatHtmlLines(text);
                }

                return [{
                        fieldid: field.id,
                        value: text
                    },
                    {
                        fieldid: field.id,
                        subfield: 'content1',
                        value: 1
                    },
                    {
                        fieldid: field.id,
                        subfield: 'itemid',
                        files: files
                    }
                ];
            });
        }
        return false;
    };

    /**
     * Get field edit files in the input data.
     *
     * @param  {Object} field               Defines the field..
     * @param  {Object} inputData           Data entered in the edit form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Promise}                    With name and value of the data to be sent.
     */
    self.getFieldEditFiles = function(field, inputData, originalFieldData) {
        return (originalFieldData && originalFieldData.files) || [];
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
        var fieldName = 'f_' + field.id,
            input = inputData[fieldName] || "";
        originalFieldData = (originalFieldData && originalFieldData.content) || "";

        return input != originalFieldData;
    };

    /**
     * Check and get field requeriments.
     *
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @return {String}                     String with the notification or false.
     */
    self.getFieldsNotifications = function(field, inputData) {
        if (field.required) {
            if (!inputData || !inputData.length) {
                return $translate.instant('mma.mod_data.errormustsupplyvalue');
            }
            var found = false;
            for (var x in inputData) {
                if (!inputData[x].subfield) {
                    found = inputData[x].value;
                    break;
                }
            }

            if (!found) {
                return $translate.instant('mma.mod_data.errormustsupplyvalue');
            }
        }
        return false;
    };

    /**
     * Override field content data with offline submission.
     *
     * @param  {Object} originalContent     Original data to be overriden.
     * @param  {Array}  offlineContent      Array with all the offline data to override.
     * @return {Object}                     Data overriden
     */
    self.overrideData = function(originalContent, offlineContent) {
        originalContent.content = offlineContent[''] || "";
        if (originalContent.content.length > 0 && originalContent.files && originalContent.files.length > 0) {
            // Take the original files since we cannot edit them on the app.
            originalContent.content = $mmText.replacePluginfileUrls(originalContent.content, originalContent.files);
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
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldTextarea', 'textarea', '$mmaModDataFieldTextareaHandler');
    }
});
