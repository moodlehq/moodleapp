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
 * Factory to provide access to app config and settings. It should not be abused into a temporary storage.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmConfig
 * @description
 * Provides access to the app settings.
 */
.factory('$mmConfig', function($http, $q, $log, $mmApp, mmCoreConfigStore) {

    $log = $log.getInstance('$mmConfig');

    var initialized = false,
        self = {
            config: {}
        };

    function init() {
        var deferred = $q.defer();

        $http.get('config.json').then(function(response) {
            var data = response.data;
            for (var name in data) {
                self.config[name] = data[name];
            }
            initialized = true;
            deferred.resolve();
        }, deferred.reject);

        return deferred.promise;
    };

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

        if (!initialized) {
            return init().then(function() {
                return getConfig(name);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }

        return getConfig(name);

        function getConfig(name) {
            var deferred = $q.defer(),
                value = self.config[name];

            if (typeof value == 'undefined') {
                $mmApp.getDB().get(mmCoreConfigStore, name).then(function(entry) {
                    deferred.resolve(entry.value);
                }, function() {
                    if (typeof defaultValue != 'undefined') {
                        deferred.resolve(defaultValue);
                    } else {
                        deferred.reject();
                    }
                });
            } else {
                deferred.resolve(value);
            }

            return deferred.promise;
        }
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

        if (!initialized) {
            return init().then(function() {
                return setConfig(name, value);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }

        return setConfig(name, value);

        function setConfig(name, value) {
            var deferred,
                fromStatic = self.config[name];

            if (typeof(fromStatic) === 'undefined') {
                return $mmApp.getDB().insert(mmCoreConfigStore, {name: name, value: value});
            }

            $log.error('Cannot save static config setting \'' + name + '\'.');
            deferred = $q.defer()
            deferred.reject();
            return deferred.promise;
        }
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

        if (!initialized) {
            return init().then(function() {
                return deleteConfig(name);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }

        return deleteConfig(name);

        function deleteConfig(name) {
            var deferred,
                fromStatic = self.config[name];

            if (typeof(fromStatic) === 'undefined') {
                return $mmApp.getDB().remove(mmCoreConfigStore, name);
            }

            $log.error('Cannot delete static config setting \'' + name + '\'.');
            deferred = $q.defer()
            deferred.reject();
            return deferred.promise;
        }
    };

    return self;
});
