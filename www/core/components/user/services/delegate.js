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

angular.module('mm.core.user')

/**
 * Service to interact with plugins to be shown in user profile. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core.user
 * @ngdoc service
 * @name $mmUserDelegate
 */
.factory('$mmUserDelegate', function($log, $mmSite) {

    $log = $log.getInstance('$mmUserDelegate');

    var self = {},
        plugins = {},
        controllers = [];
    /**
     * Add plugin controller to the controllers array.
     *
     * @param {String} name       Plugin name,
     * @param {Number} priority   Plugin priority.
     * @param {Object} controller Plugin controller.
     */
    function addToControllers(name, priority, controller) {
        var found = false;
        for (var i = 0; i < controllers.length && !found; i++) {
            if (controllers[i].name === name) {
                found = true;
                controllers.priority = priority;
                controllers.controller = controller;
            }
        }
        if (!found) {
            controllers.push({
                name: name,
                priority: priority,
                controller: controller
            });
        }
    }
    /**
     * Remove plugin controller from the controllers array.
     *
     * @param {String} name Plugin name,
     */
    function removeFromControllers(name) {
        for (var i = 0; i < controllers.length; i++) {
            if (controllers[i].name === name) {
                delete controllers[i];
                return;
            }
        }
    }

    /**
     * Get the data of the registered plugins.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserDelegate#getData
     * @param {Object} user The user object.
     * @param {Number} courseid The course id.
     * @return {Object} Registered plugins data.
     */
    self.getData = function(user, courseid) {
        controllers = [];

        angular.forEach(plugins, function(plugin, name) {
            if (plugin.handler.isEnabled() && plugin.handler.isEnabledForUser(user, courseid)) {
                controllers.push({
                    name: name,
                    priority: plugin.priority,
                    controller: plugin.handler.getController(user, courseid)
                });
            }
        });

        return controllers;
    };

    /**
     * Register a plugin to show in the user profile.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserDelegate#registerPlugin
     * @param  {String}   name      Name of the plugin.
     * @param  {Object}   handler   Object defining the following methods:
     *                              - isEnabled (Boolean) Whether or not the handler is enabled on a site level.
     *                              - isEnabledForUser(user) (Boolean) Whether or not the handler is to be used for the user.
     *                              - getController(user) (Function) Returns the function that will act as controller.
     *                                                               See core/components/user/templates/profile.html for the list
     *                                                               of scope variables expected.
     * @param {Number} [priority=0] Plugin's priority to determine order to be shown. Higher priority means showing it first.
     *
     * @todo Support promises in isEnabled/isEnabledForUser.
     */
    self.registerPlugin = function(name, handler, priority) {
        if (typeof priority != 'number') {
            priority = 0;
        }
        $log.debug("Register plugin '"+name+"' in profile with priority "+priority);
        plugins[name] = {handler: handler(), priority: priority};
    };

    return self;
});
