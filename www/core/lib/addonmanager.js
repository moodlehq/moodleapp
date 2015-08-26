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

/**
 * @ngdoc service
 * @name $mmAddonManager
 * @module mm.core
 * @description
 * This service provides functions related to addons, like checking if an addon is available.
 */
.factory('$mmAddonManager', function($log, $injector) {

    $log = $log.getInstance('$mmAddonManager');

    var self = {},
        instances = {};

    /**
     * Get a service instance if it's available.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#get
     * @param  {String} name Service name.
     * @return {Object}      Service instance.
     */
    self.get = function(name) {
        if (self.isAvailable(name)) {
            return instances[name];
        }
    };

    /**
     * Check if a service is available.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#isAvailable
     * @param  {String} name Service name.
     * @return {Boolean}     True if available, false otherwise.
     */
    self.isAvailable = function(name) {
        if (!name) {
            return false;
        }

        if (instances[name]) {
            return true;
        }

        try {
            instances[name] = $injector.get(name);
            return true;
        } catch(ex) {
            $log.warn('Service not available: '+name);
            return false;
        }
    };

    return self;
});
