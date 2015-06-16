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

    var handlers = {},
        self = {},
        controllers = {};

    /**
     * Register a plugin to show in the user profile.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserDelegate#registerPlugin
     * @param  {String}   name     Name of the plugin.
     * @param  {Object}   handler  Object defining the following methods:
     *                             - isEnabled (Boolean) Whether or not the handler is enabled on a site level.
     *                             - isEnabledForUser(user) (Boolean) Whether or not the handler is to be used for the user.
     *                             - getController(user) (Function) Returns the function that will act as controller.
     *                                                              See core/components/user/templates/profile.html for the list
     *                                                              of scope variables expected.
     *
     * @todo Support promises in isEnabled/isEnabledForUser.
     */
    self.registerPlugin = function(name, handler) {
        $log.debug("Register plugin '" + name + "' in profile.");
        handlers[name] = handler();
    };

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
        controllers = {};

        angular.forEach(handlers, function(handler, name) {

            if (!handler.isEnabled()) {
                delete controllers[name];
                return;
            } else if (!handler.isEnabledForUser(user, courseid)) {
                delete controllers[name];
                return;
            }

            controllers[name] = handler.getController(user, courseid);
        });

        return controllers;
    };

    return self;
});
