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

.factory('$mmConfig', function($http, $q) {

    var store = window.sessionStorage;
    var self = {};
    self.config = {};

    self.initConfig = function() {

        var deferred = $q.defer();

        if( Object.keys(self.config).length > 0) {
            // Already loaded
            deferred.resolve();
            return deferred.promise;
        }

        $http.get('config.json')
            .then(function(response) {
                self.config = response.data;
                deferred.resolve();
            }, function(response) {
                deferred.reject();
            });

        return deferred.promise;
    };

    self.get = function(name) {
        var value = self.config[name];
        if(typeof(value) == 'undefined' ){
            value = store[name];
            if(typeof(value) == 'undefined' || value == null) {
                return undefined;
            }
            return JSON.parse( value );
        }
        return value;
    };

    self.set = function(name, value) {
        self.config[name] = value;
        store[name] = JSON.stringify(value);
    };

    return self;

});
