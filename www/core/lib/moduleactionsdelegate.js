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
 * Service to handle module context URLs.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmModuleActionsDelegate
 */
.factory('$mmModuleActionsDelegate', function($log) {

    $log = $log.getInstance('$mmModuleActionsDelegate');

    var handlers = {},
        self = {};

    /**
     * Register a module handler. The handler will receive a URL to treat.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmModuleActionsDelegate#registerModuleHandler
     * @param {String} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the URL to handle.
     * @description
     *
     * If the URL received is not the expected by the handler, it should return undefined.
     * If the URL is the one the handler expects, it should return an array of objects (actions) with the following keys:
     *
     * - message: A message for the action to take.
     * - icon: The name of the icon.
     * - state: The state to go to.
     * - stateParams: Parameters to use with state.
     */
    self.registerModuleHandler = function(name, callback) {
        $log.debug("Registered handler '" + name + "' as module handler.");
        handlers[name] = callback;
    };

    /**
     * Get the actions a module handler provides.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmModuleActionsDelegate#getActionsFor
     * @param {String} url      Module URL to handle.
     * @param {Number} courseid Course ID of the module.
     * @return {Object[]}       Array of actions. Undefined if no action found.
     */
    self.getActionsFor = function(url, courseid) {
        for (var name in handlers) {
            var callback = handlers[name];
            if (typeof callback == 'function') {
                var data = callback(url, courseid);
                if (data) {
                    return data;
                }
            }
        }
    };

    return self;
});
