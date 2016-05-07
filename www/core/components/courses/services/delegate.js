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
     *                             - isEnabledForCourse(courseid, accessData) (Boolean|Promise) Whether or not the handler is
     *                                               enabled on a course level. When using a promise, it should return a boolean.
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
            loaded = {};

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
         * @protected
         */
        self.clearCoursesHandlers = function() {
            coursesHandlers = {};
            loaded = {};
        };

        /**
         * Get the handler for a course using a certain access type.
         *
         * @param {Number} courseId    The course ID.
         * @param {Boolean} refresh    True if it should refresh the list.
         * @param  {Object} accessData Access type and data. Default, guest, ...
         * @return {Array}             Array of objects containing 'priority' and 'controller'.
         */
        function getNavHandlersForAccess(courseId, refresh, accessData) {
            if (refresh || !coursesHandlers[courseId] || coursesHandlers[courseId].access.type != accessData.type) {
                coursesHandlers[courseId] = {
                    access: accessData,
                    handlers: []
                };
                self.updateNavHandlersForCourse(courseId, accessData);
            }
            return coursesHandlers[courseId].handlers;
        }

        /**
         * Get the handlers for a course where the user is enrolled in.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersFor
         * @param {Number} courseId The course ID.
         * @param {Boolean} refresh True if it should refresh the list.
         * @return {Array}          Array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlersFor = function(courseId, refresh) {
            // Default access.
            var accessData = {
                type: mmCoursesAccessMethods.default
            };
            return getNavHandlersForAccess(courseId, refresh, accessData);
        };

        /**
         * Get the handlers for a course as guest.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersForGuest
         * @param {Number} courseId The course ID.
         * @param {Boolean} refresh True if it should refresh the list.
         * @return {Array}          Array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlersForGuest = function(courseId, refresh) {
            // Guest access.
            var accessData = {
                type: mmCoursesAccessMethods.guest
            };
            return getNavHandlersForAccess(courseId, refresh, accessData);
        };

        /**
         * Update the handler for the current site.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#updateNavHandler
         * @param {String} addon The addon.
         * @param {Object} handlerInfo The handler details.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateNavHandler = function(addon, handlerInfo) {
            var promise;

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the content is enabled.
            return promise.then(function(enabled) {
                if (enabled) {
                    enabledNavHandlers[addon] = {
                        instance: handlerInfo.instance,
                        priority: handlerInfo.priority
                    };
                } else {
                    return $q.reject();
                }
            }).catch(function() {
                delete enabledNavHandlers[addon];
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
            var promises = [];

            $log.debug('Updating navigation handlers for current site.');

            // Loop over all the content handlers.
            angular.forEach(navHandlers, function(handlerInfo, addon) {
                promises.push(self.updateNavHandler(addon, handlerInfo));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            }).finally(function() {
                // Update handlers for all courses.
                angular.forEach(coursesHandlers, function(handler, courseId) {
                    self.updateNavHandlersForCourse(parseInt(courseId), handler.access);
                });
            });
        };

        /**
         * Update the handlers for a certain course.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#updateNavHandlersForCourse
         * @param {Number} courseId    The course ID.
         * @param  {Object} accessData Access type and data. Default, guest, ...
         * @return {Promise}           Resolved when updated.
         * @protected
         */
        self.updateNavHandlersForCourse = function(courseId, accessData) {
            var promises = [],
                enabledForCourse = [];

            angular.forEach(enabledNavHandlers, function(handler) {
                // Checks if the handler is enabled for the user.
                var promise = $q.when(handler.instance.isEnabledForCourse(courseId, accessData)).then(function(enabled) {
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
                // Update the coursesHandlers array with the new enabled addons.
                $mmUtil.emptyArray(coursesHandlers[courseId].handlers);
                angular.forEach(enabledForCourse, function(handler) {
                    coursesHandlers[courseId].handlers.push({
                        controller: handler.instance.getController(courseId),
                        priority: handler.priority
                    });
                });
                loaded[courseId] = true;
            });
        };

        return self;
    };


    return self;
});
