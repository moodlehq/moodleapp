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

angular.module('mm.core')

.constant('mmCoreConfigStore', 'config')

.config(function($mmAppProvider, mmCoreConfigStore) {
    var stores = [
        {
            name: mmCoreConfigStore,
            keyPath: 'name'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmConfig
 * @description
 * Provides access to the app settings.
 */
.factory('$mmConfig', function($q, $log, $mmApp, mmCoreConfigStore) {

    $log = $log.getInstance('$mmConfig');

    var self = {};

    /**
     * Get an app setting.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmConfig#get
     * @param {String} name           The config name.
     * @param {Mixed}  [defaultValue] Default value to use if the entry is not found.
     * @return {Promise}              Resolves upon success along with the config data. Reject on failure.
     * @description
     * Get an app setting.
     */
    self.get = function(name, defaultValue) {
        return $mmApp.getDB().get(mmCoreConfigStore, name).then(function(entry) {
            return entry.value;
        }).catch(function() {
            if (typeof defaultValue != 'undefined') {
                return defaultValue;
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Set an app setting.
     *
     * @module mm.core
     * @ngdoc service
     * @name $mmConfig#set
     * @param {String} name The config name.
     * @param {Mixed} value The config value.
     * @return {Promise}    Promise which resolves on success, providing no data.
     * @description
     * Set an app setting.
     */
    self.set = function(name, value) {
        return $mmApp.getDB().insert(mmCoreConfigStore, {name: name, value: value});
    };

    /**
     * Deletes an app setting.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmConfig#delete
     * @param {String} name The config name.
     * @return {Promise}    Promise which resolves on success, providing no data.
     * @description
     * Delete an app setting.
     */
    self.delete = function(name) {
        return $mmApp.getDB().remove(mmCoreConfigStore, name);
    };

    return self;
});
