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

angular.module('mm.core.courses')

/**
 * Service to interact with plugins to be shown in each course. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core.courses
 * @ngdoc service
 * @name $mmCoursesDelegate
 */
.factory('$mmCoursesDelegate', function($log) {

    $log = $log.getInstance('$mmCoursesDelegate');

    var self = {},
        plugins = {},
        data = [];

    /**
     * Add plugin data to the data array.
     *
     * @param {String} name       Plugin name,
     * @param {Number} priority   Plugin priority.
     * @param {Object} pluginData Plugin data.
     */
    function addToData(name, priority, pluginData) {
        var found = false;
        for (var i = 0; i < data.length && !found; i++) {
            if (data[i].name === name) {
                found = true;
                data.priority = priority;
                data.data = pluginData;
            }
        }
        if (!found) {
            data.push({
                name: name,
                priority: priority,
                data: pluginData
            });
        }
    }

    /**
     * Get the data of the registered plugins.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesDelegate#getData
     * @return {Object} Registered plugins data.
     */
    self.getData = function() {
        data = [];
        angular.forEach(plugins, function(value, name) {
            self.updatePluginData(name);
        });
        return data;
    };

    /**
     * Register a plugin to show in the course.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesDelegate#registerPlugin
     * @param  {String}   name      Name of the plugin.
     * @param  {Function} callback  Function to call to get the plugin data. This function should return an object with:
     *                                  -icon: Icon to show next to the plugin name.
     *                                  -title: Plugin name to be displayed.
     *                                  -state: sref to the plugin's main state (i.e. site.grades).
     *                              If the plugin should not be shown (disabled, etc.) this function should return undefined.
     * @param {Number} [priority=0] Plugin's priority to determine order to be shown. Higher priority means showing it first.
     */
    self.registerPlugin = function(name, callback, priority) {
        if (typeof priority != 'number') {
            priority = 0;
        }
        $log.debug("Register plugin '"+name+"' in course with priority "+priority);
        plugins[name] = {callback: callback, priority: priority};
    };

    /**
     * Update the plugin data stored in the delegate.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesDelegate#updatePluginData
     * @param  {String} name Name of the plugin.
     */
    self.updatePluginData = function(name) {
        $log.debug("Update plugin '"+name+"' data in course.");
        var pluginData = plugins[name].callback();
        if (typeof pluginData === 'object' && typeof pluginData.then === 'function') {
            // Promise, we only care when it is resolved.
            pluginData.then(function(finalData) {
                addToData(name, plugins[name].priority, finalData);
            });
        } else if (typeof(pluginData) !== 'undefined') {
            addToData(name, plugins[name].priority, pluginData);
        }
    };

    return self;
});
