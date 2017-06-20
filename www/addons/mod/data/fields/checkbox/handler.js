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
 * Handler for checkbox data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldCheckboxHandler
 */
.factory('$mmaModDataFieldCheckboxHandler', function() {

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
            reqName = 'f_' + field.id + '_allreq';

        var checkboxes = [],
            values = [];
        angular.forEach(inputData[fieldName], function(value, option) {
            if (value) {
                checkboxes.push(option);
            }
        });
        if (checkboxes.length > 0) {
            values.push({
                name: fieldName,
                value: checkboxes
            });

            if (inputData[reqName]['1']) {
                values.push({
                    name: reqName,
                    value: true
                });
            }
            return values;
        }

        return false;
    };

    /**
     * Get field edit data in the input data.
     *
     * @param  {Object} field      Defines the field to be rendered.
     * @param  {Object} inputData  Data entered in the edit form.
     * @return {Array}             With name and value of the data to be sent.
     */
    self.getFieldEditData = function(field, inputData) {
        var fieldName = 'f_' + field.id;

        var checkboxes = [];
        angular.forEach(inputData[fieldName], function(value, option) {
            if (value) {
                checkboxes.push(option);
            }
        });
        if (checkboxes.length > 0) {
            return [{
                fieldid: field.id,
                value: checkboxes
            }];
        }

        return false;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModDataFieldsDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the data addon will be packaged in custom apps.
    var $mmaModDataFieldsDelegate = $mmAddonManager.get('$mmaModDataFieldsDelegate');
    if ($mmaModDataFieldsDelegate) {
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldCheckbox', 'checkbox', '$mmaModDataFieldCheckboxHandler');
    }
});
