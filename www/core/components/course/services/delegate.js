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

angular.module('mm.core.course')

/**
 * Delegate to register content handlers.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourseDelegate
 */
.factory('$mmCourseDelegate', function($log, $mmCourse, $mmUtil) {
    $log = $log.getInstance('$mmCourseDelegate');

    var contentHandlers = {},
        self = {};

    /**
     * Register a content handler.
     *
     * A handler should return an object with the following keys:
     *
     * - title: The title of the module
     * - icon: The image SRC to the icon
     * - state: The state to go to
     * - stateParams: Parameters to use with state,
     * - buttons: An array of buttons with the properties:
     *            - icon: The ionicon to use
     *            - hidden: Whether the button should be hidden
     *            - callback: The function to execute on click, this will receive $scope as argument
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseDelegate#registerContentHandler
     * @param {String} addon The addon's name
     * @param {String} handles The module this handler handles, e.g. forum, label. This value will be compared with
     *                         the value contained in module.modname from the Webservice core_course_get_contents.
     * @param {Function} callback The callback function
     */
    self.registerContentHandler = function(addon, handles, callback) {
        if (typeof contentHandlers[handles] !== 'undefined') {
            $log.error("Addon '" + contentHandlers[handles].addon + "' already registered as handler for '" + handles + "'");
            return;
        }
        $log.debug("Registered addon '" + addon + "' as course content handler.");
        contentHandlers[handles] = {
            addon: addon,
            callback: callback
        };
    };

    /**
     * Get the data a content handler provides.
     *
     * This will first get the default data, then call the handler if any and override
     * the default data with the new data from the handler. That means that a handler
     * should always override any existing attribute if they want to change the defaults.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseDelegate#getDataFromContentHandlerFor
     * @param {String} handles The module to work on
     * @param {Object} module The module data
     * @return {Object}
     */
    self.getDataFromContentHandlerFor = function(handles, module) {
        var data = {
            icon: $mmCourse.getModuleIconSrc(module.modname),
            title: module.name
        };

        // We do not have a handler, add some additional info.
        if (typeof contentHandlers[handles] === 'undefined') {
            data.state = 'site.mm_course-modcontent';
            data.stateParams = { module: module };
            if (module.url) {
                data.buttons = [{
                    icon: 'ion-ios-browsers-outline',
                    callback: function($scope) {
                        $mmUtil.openInBrowser(module.url);
                    }
                }];
            }
            return data;
        }

        data = angular.extend(data, contentHandlers[handles].callback(module));
        return data;
    };

    return self;
});
