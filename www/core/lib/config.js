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

.constant('mmConfigStore', 'config')

.config(function($mmAppProvider, mmConfigStore) {
    var stores = [
        {
            name: mmConfigStore,
            keyPath: 'name'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Factory to provide access to app config and settings.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmConfig
 * @description
 * Provides access to the app settings.
 */
.factory('$mmConfig', function($http, $q, $mmApp, mmConfigStore) {

    var self = {
        config: {}
    };

    self.initConfig = function() {

        var deferred = $q.defer();

        if( Object.keys(self.config).length > 0) {
            // Already loaded
            deferred.resolve();
            return deferred.promise;
        }

        $http.get('config.json').then(function(response) {
            var data = response.data;
            for(var name in data) {
                self.set(name, data[name]);
            }
            deferred.resolve();
        }, deferred.reject);

        return deferred.promise;
    };

    self.get = function(name) {

        var deferred = $q.defer();

        var value = self.config[name];

        if (typeof(value) == 'undefined' ){
            $mmApp.getDB().get(mmConfigStore, name).then(deferred.resolve, deferred.reject);
        }
        else {
            deferred.resolve(value);
        }

        return deferred.promise;
    };

    self.set = function(name, value) {
        self.config[name] = value;
        $mmApp.getDB().insert(mmConfigStore, {name: name, value: value});
    };

    return self;

});
