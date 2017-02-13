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
 * Service to interact with courses.
 *
 * @module mm.core.courses
 * @ngdoc service
 * @name $mmCoursesDelegate
 */
.provider('$mmCoursesDelegate', function() {
    var navHandlers = {},
        self = {};

    /**
     * Register a navigation handler.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesDelegate#registerNavHandler
     * @param {String} addon The addon's name (mmaLabel, mmaForum, ...)
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isEnabledForCourse(courseid, accessData, navOptions, admOptions) (Boolean|Promise) Whether or
     *                                               not the handler is enabled on a course level. When using a promise, it should
     *                                               return a boolean. navOptions and admOptions are optional parameters.
     *                             - getController(courseid) (Object) Returns the object that will act as controller.
     *                                                                See core/components/courses/templates/list.html
     *                                                                for the list of scope variables expected.
     */
    self.registerNavHandler = function(addon, handler, priority) {
        if (typeof navHandlers[addon] !== 'undefined') {
            console.log("$mmCoursesDelegateProvider: Addon '" + navHandlers[addon].addon + "' already registered as navigation handler");
            return false;
        }
        console.log("$mmCoursesDelegateProvider: Registered addon '" + addon + "' as navibation handler.");
        navHandlers[addon] = {
            addon: addon,
            handler: handler,
            instance: undefined,
            priority: priority
        };
        return true;
    };

    self.$get = function($mmUtil, $q, $log, $mmSite, mmCoursesAccessMethods) {
        var enabledNavHandlers = {},
            coursesHandlers = {},
            self = {},
            loaded = {},
            lastUpdateHandlersStart,
            lastUpdateHandlersForCoursesStart = {};

        $log = $log.getInstance('$mmCoursesDelegate');

        /**
         * Check if addons are loaded for a certain course.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#areNavHandlersLoadedFor
         * @param {Number} courseId The course ID.
         * @return {Boolean} True if addons are loaded, false otherwise.
         */
        self.areNavHandlersLoadedFor = function(courseId) {
            return loaded[courseId];
        };

        /**
         * Clear all courses handlers.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#clearCoursesHandlers
         * @param {Number} [courseId]   The course ID. If not defined, all handlers will be cleared.
         * @protected
         */
        self.clearCoursesHandlers = function(courseId) {
            if (courseId) {
                coursesHandlers[courseId] = false;
                loaded[courseId] = false;
            } else {
                coursesHandlers = {};
                loaded = {};
            }
        };

        /**
         * Get the handler for a course using a certain access type.
         *
         * @param  {Number} courseId     The course ID.
         * @param  {Boolean} refresh     True if it should refresh the list.
         * @param  {Object} accessData   Access type and data. Default, guest, ...
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Array}               Array of objects containing 'priority' and 'controller'.
         */
        function getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions) {
            if (refresh || !coursesHandlers[courseId] || coursesHandlers[courseId].access.type != accessData.type) {
                coursesHandlers[courseId] = {
                    access: accessData,
                    navOptions: navOptions,
                    admOptions: admOptions,
                    handlers: []
                };
                self.updateNavHandlersForCourse(courseId, accessData, navOptions, admOptions);
            }
            return coursesHandlers[courseId].handlers;
        }

        /**
         * Get the handlers for a course where the user is enrolled in.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersFor
         * @param  {Number} courseId     The course ID.
         * @param  {Boolean} refresh     True if it should refresh the list.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Array}               Array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlersFor = function(courseId, refresh, navOptions, admOptions) {
            // Default access.
            var accessData = {
                type: mmCoursesAccessMethods.default
            };
            return getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions);
        };

        /**
         * Get the handlers for a course as guest.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersForGuest
         * @param  {Number} courseId     The course ID.
         * @param  {Boolean} refresh     True if it should refresh the list.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Array}               Array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlersForGuest = function(courseId, refresh, navOptions, admOptions) {
            // Guest access.
            var accessData = {
                type: mmCoursesAccessMethods.guest
            };
            return getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions);
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateNavHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#isLastUpdateCall
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
         * Check if a time belongs to the last update handlers for course call.
         * This is to handle the cases where updateNavHandlersForCourse don't finish in the same order as they're called.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#isLastUpdateCourseCall
         * @param  {Number} courseId Course ID.
         * @param  {Number} time     Time to check.
         * @return {Boolean}         True if equal, false otherwise.
         */
        self.isLastUpdateCourseCall = function(courseId, time) {
            if (!lastUpdateHandlersForCoursesStart[courseId]) {
                return true;
            }
            return time == lastUpdateHandlersForCoursesStart[courseId];
        };

        /**
         * Update the handler for the current site.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#updateNavHandler
         * @param {String} addon The addon.
         * @param {Object} handlerInfo The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateNavHandler = function(addon, handlerInfo, time) {
            var promise,
                siteId = $mmSite.getId();

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else if ($mmSite.isFeatureDisabled('$mmCoursesDelegate_' + addon)) {
                promise = $q.when(false);
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the content is enabled.
            return promise.catch(function() {
                return false;
            }).then(function(enabled) {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    if (enabled) {
                        enabledNavHandlers[addon] = {
                            instance: handlerInfo.instance,
                            priority: handlerInfo.priority
                        };
                    } else {
                        delete enabledNavHandlers[addon];
                    }
                }
            });
        };

        /**
         * Update the handlers for the current site.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#updateNavHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateNavHandlers = function() {
            var promises = [],
                siteId = $mmSite.getId(),
                now = new Date().getTime();

            $log.debug('Updating navigation handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the content handlers.
            angular.forEach(navHandlers, function(handlerInfo, addon) {
                promises.push(self.updateNavHandler(addon, handlerInfo, now));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            }).finally(function() {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCall(now) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    // Update handlers for all courses.
                    angular.forEach(coursesHandlers, function(handler, courseId) {
                        self.updateNavHandlersForCourse(parseInt(courseId), handler.access, handler.navOptions, handler.admOptions);
                    });
                }
            });
        };

        /**
         * Update the handlers for a certain course.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#updateNavHandlersForCourse
         * @param {Number} courseId      The course ID.
         * @param  {Object} accessData   Access type and data. Default, guest, ...
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}             Resolved when updated.
         * @protected
         */
        self.updateNavHandlersForCourse = function(courseId, accessData, navOptions, admOptions) {
            var promises = [],
                enabledForCourse = [],
                siteId = $mmSite.getId(),
                now = new Date().getTime();

            lastUpdateHandlersForCoursesStart[courseId] = now;

            angular.forEach(enabledNavHandlers, function(handler) {
                // Checks if the handler is enabled for the user.
                var promise = $q.when(handler.instance.isEnabledForCourse(courseId, accessData, navOptions, admOptions))
                        .then(function(enabled) {
                    if (enabled) {
                        enabledForCourse.push(handler);
                    } else {
                        return $q.reject();
                    }
                }).catch(function() {
                    // Nothing to do here, it is not enabled for this user.
                });
                promises.push(promise);
            });

            return $q.all(promises).then(function() {
                return true;
            }).catch(function() {
                // Never fails.
                return true;
            }).finally(function() {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCourseCall(courseId, now) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    // Update the coursesHandlers array with the new enabled addons.
                    $mmUtil.emptyArray(coursesHandlers[courseId].handlers);
                    angular.forEach(enabledForCourse, function(handler) {
                        coursesHandlers[courseId].handlers.push({
                            controller: handler.instance.getController(courseId),
                            priority: handler.priority
                        });
                    });
                    loaded[courseId] = true;
                }
            });
        };

        return self;
    };

    return self;
});
