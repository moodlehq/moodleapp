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
 * Handler for date data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldDateHandler
 */
.factory('$mmaModDataFieldDateHandler', function($translate) {

    var self = {};

    /**
     * Get field search data in the input data.
     *
     * @param  {Object} field      Defines the field to be rendered.
     * @param  {Object} inputData  Data entered in the search form.
     * @return {Array}             With name and value of the data to be sent.
     */
    self.getFieldSearchData = function(field, inputData) {
        var fieldName = 'f_' + field.id,
            enabledName = fieldName + '_z';

        if (inputData[enabledName]['1']) {
            var values = [],
                date = inputData[fieldName].split('-'),
                year = date[0],
                month = date[1],
                day = date[2];
            values.push({
                name: fieldName + '_y',
                value: year
            });
            values.push({
                name: fieldName + '_m',
                value: month
            });
            values.push({
                name: fieldName + '_d',
                value: day
            });
            values.push({
                name: enabledName,
                value: 1
            });
            return values;
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

        if (inputData[fieldName]) {
            var values = [],
                date = inputData[fieldName].split('-'),
                year = date[0],
                month = date[1],
                day = date[2];
            values.push({
                fieldid: field.id,
                subfield: 'year',
                value: year
            });
            values.push({
                fieldid: field.id,
                subfield: 'month',
                value: month
            });
            values.push({
                fieldid: field.id,
                subfield: 'day',
                value: day
            });
            return values;
        }
        return false;
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

        originalFieldData = (originalFieldData && originalFieldData.content &&
                new Date(originalFieldData.content * 1000).toISOString().substr(0, 10)) || "";

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
        if (field.required &&
                (!inputData || inputData.length < 2 || !inputData[0].value || !inputData[1].value || !inputData[2].value)) {
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
        var date = Date.UTC(offlineContent.year || "", offlineContent.month ? offlineContent.month - 1 : "",
            offlineContent.day || "");
        date = Math.floor(date / 1000);

        originalContent.content = date || "";
        return originalContent;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModDataFieldsDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the data addon will be packaged in custom apps.
    var $mmaModDataFieldsDelegate = $mmAddonManager.get('$mmaModDataFieldsDelegate');
    if ($mmaModDataFieldsDelegate) {
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldDate', 'date', '$mmaModDataFieldDateHandler');
    }
});
