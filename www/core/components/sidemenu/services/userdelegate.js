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
 * Service to interact with plugins to be shown in user views. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmUserDelegate
 */
.factory('$mmUserDelegate', function($log) {

    var plugins = {},
        self = {},
        data,
        controllers = [];

    /**
     * Register a plugin to show in the user.
     *
     * @param  {String}   name     Name of the plugin.
     * @param  {Function} callback Function to call to get the plugin data. This function should return an object with:
     *                                 -icon: Icon to show next to the plugin name.
     *                                 -name: Plugin name.
     *                                 -state: sref to the plugin's main state (i.e. site.grades).
     *                             If the plugin should not be shown (disabled, etc.) this function should return undefined.
     */
    self.registerPlugin = function(name, callback) {
        $log.debug("Register plugin '"+name+"' in user.");
        plugins[name] = callback;
    };

    /**
     * Update the plugin data stored in the delegate.
     *
     * @param  {String}   name     Name of the plugin.
     */
    self.updatePluginData = function(name) {
        $log.debug("Update plugin '"+name+"' data in user.");
        var pluginData = plugins[name]();
        if (typeof(pluginData) !== 'undefined') {
            data[name] = pluginData;
        }
    };

    /**
     * Get the data of the registered plugins.
     *
     * @return {Object} Registered plugins data.
     */
    self.getData = function() {
        if (typeof(data) == 'undefined') {
            data = {};
            angular.forEach(plugins, function(callback, plugin) {
                self.updatePluginData(plugin);
            });
        }
        return data;
    };

    return self;
});
