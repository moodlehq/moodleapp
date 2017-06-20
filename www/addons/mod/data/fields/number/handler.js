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
 * Handler for number data field plugin.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldNumberHandler
 */
.factory('$mmaModDataFieldNumberHandler', function() {

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
     * @param  {Object} inputData  Data entered in the edit form.
     * @return {Array}             With name and value of the data to be sent.
     */
    self.getFieldEditData = function(field, inputData) {
        var fieldName = 'f_' + field.id;
        if (inputData[fieldName]) {
            return [{
                fieldid: field.id,
                value: inputData[fieldName]
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
        $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldNumber', 'number', '$mmaModDataFieldNumberHandler');
    }
});
