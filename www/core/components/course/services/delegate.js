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
 * @description
 *
 * To register a content handler:
 *
 * .config($mmCourseDelegate, function() {
 *     $mmCourseDelegate.registerContentHandler('mmaYourAddon', 'moduleName', 'handlerName');
 *     $mmCourseDelegate.registerContentHandler('mmaModPage', 'page', '$mmaModPageCourseContentHandler');
 * })
 *
 * The content handler must provide two methods.
 *
 * 1/ isEnabled() which will be called once in a while to check if the plugin works on the current site.
 * 2/ getController(module, courseid) which should return a controller object
 *
 * The controller has its own scope inheriting the parent one. Though you should not use the
 * parent scope. To find out more what scope variables are expected look at the template
 * core/components/course/templates/section.html and at existing content handlers.
 */
.provider('$mmCourseDelegate', function() {
    var contentHandlers = {},
        self = {};

    /**
     * Register a content handler. If module is not supported in current site, handler should return undefined.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseDelegate#registerContentHandler
     * @param {String} addon The addon's name (mmaLabel, mmaForum, ...)
     * @param {String} handles The module this handler handles, e.g. forum, label. This value will be compared with
     *                         the value contained in module.modname from the Webservice core_course_get_contents.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean) Whether or not the handler is enabled on a site level.
     *                             - getController(module, courseid) (Function) Returns the function that will act as controller.
     *                                                                See core/components/course/templates/section.html
     *                                                                for the list of scope variables expected.
     */
    self.registerContentHandler = function(addon, handles, handler) {
        if (typeof contentHandlers[handles] !== 'undefined') {
            console.log("$mmCourseDelegateProvider: Addon '" + contentHandlers[handles].addon + "' already registered as handler for '" + handles + "'");
            return false;
        }
        console.log("$mmCourseDelegateProvider: Registered addon '" + addon + "' as course content handler.");
        contentHandlers[handles] = {
            addon: addon,
            handler: handler,
            instance: undefined
        };
        return true;
    };

    self.$get = function($q, $log, $mmSite, $mmUtil, $mmCourseContentHandler) {
        var enabledHandlers = {},
            self = {},
            lastUpdateHandlersStart = {};

        $log = $log.getInstance('$mmCourseDelegate');

        /**
         * Get the controller a content handler provides.
         *
         * This will first get the default data, then call the handler if any and override
         * the default data with the new data from the handler. That means that a handler
         * should always override any existing attribute if they want to change the defaults.
         *
         * @module mm.core.course
         * @ngdoc method
         * @name $mmCourseDelegate#getContentHandlerControllerFor
         * @param {String} handles   The module to work on
         * @param {Object} module    The module data
         * @param {Number} courseid  The course ID.
         * @param {Number} sectionid The section ID.
         * @return {Object}
         */
        self.getContentHandlerControllerFor = function(handles, module, courseid, sectionid) {
            if (typeof enabledHandlers[handles] !== 'undefined') {
                return enabledHandlers[handles].getController(module, courseid, sectionid);
            }
            return $mmCourseContentHandler.getController(module, courseid, sectionid);
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateContentHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.course
         * @ngdoc method
         * @name $mmCourseDelegate#isLastUpdateCall
         * @param  {Number}  time Time to check.
         * @return {Boolean}      True if equal, false otherwise.
         */
        self.isLastUpdateCall = function(time) {
            if (!lastUpdateHandlersStart) {
                return true;
            }
            return time == lastUpdateHandlersStart;
        };

        /**
         * Update the enabled handlers for the current site.
         *
         * @module mm.core.course
         * @ngdoc method
         * @name $mmCourseDelegate#updateContentHandler
         * @param {String} handles The module this handler handles, e.g. forum, label. This value will be compared with
         * @param {Object} handlerInfo The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateContentHandler = function(handles, handlerInfo, time) {
            var promise,
                siteId = $mmSite.getId();

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the content is enabled.
            return promise.catch(function() {
                return false;
            }).then(function(enabled) {
                // Verify that this call is the last one that was started.
                if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    if (enabled) {
                        enabledHandlers[handles] = handlerInfo.instance;
                    } else {
                        delete enabledHandlers[handles];
                    }
                }
            });
        };

        /**
         * Update the handlers for the current site.
         *
         * @module mm.core.course
         * @ngdoc method
         * @name $mmCourseDelegate#updateContentHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateContentHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating content handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the content handlers.
            angular.forEach(contentHandlers, function(handlerInfo, handles) {
                promises.push(self.updateContentHandler(handles, handlerInfo, now));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            });
        };

        return self;
    };


    return self;
});
