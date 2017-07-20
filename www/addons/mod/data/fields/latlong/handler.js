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
 * Handler for latlong data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldLatlongHandler
 */
.factory('$mmaModDataFieldLatlongHandler', function($translate) {

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
     * @param  {Object} inputData  Data entered in the search form.
     * @return {Array}             With name and value of the data to be sent.
     */
    self.getFieldEditData = function(field, inputData) {
        var fieldName = 'f_' + field.id;

        var values = [];

        if (inputData[fieldName + '_0']) {
            values.push({
                fieldid: field.id,
                subfield: '0',
                value: inputData[fieldName + '_0']
            });
        }
        if (inputData[fieldName + '_1']) {
            values.push({
                fieldid: field.id,
                subfield: '1',
                value: inputData[fieldName + '_1']
            });
        }
        return values;
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
            lat = inputData[fieldName + '_0'] || "",
            long = inputData[fieldName + '_1'] || "",
            originalLat = (originalFieldData && originalFieldData.content) || "",
            originalLong = (originalFieldData && originalFieldData.content1) || "";

        return lat != originalLat || long != originalLong;
    };


    /**
     * Check and get field requeriments.
     *
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @return {String}                     String with the notification or false.
     */
    self.getFieldsNotifications = function(field, inputData) {
        var valueCount = 0;

        // The lat long class has two values that need to be checked.
        angular.forEach(inputData, function(value) {
            if (typeof value.value != "undefined" && value.value != "") {
                valueCount++;
            }
        });

        // If we get here then only one field has been filled in.
        if (valueCount == 1) {
            return $translate.instant('mma.mod_data.latlongboth');
        } else if (field.required && valueCount == 0) {
            return $translate.instant('mma.mod_data.errormustsupplyvalue');
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
        originalContent.content = offlineContent[0] || "";
        originalContent.content1 = offlineContent[1] || "";
        return originalContent;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModDataFieldsDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the data addon will be packaged in custom apps.
    var $mmaModDataFieldsDelegate = $mmAddonManager.get('$mmaModDataFieldsDelegate');
    if ($mmaModDataFieldsDelegate) {
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldLatlong', 'latlong', '$mmaModDataFieldLatlongHandler');
    }
});
