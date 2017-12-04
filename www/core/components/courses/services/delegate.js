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
     *                             - isEnabled() (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isEnabledForCourse(courseid, accessData, navOptions, admOptions) (Boolean|Promise) Whether or
     *                                               not the handler is enabled on a course level. When using a promise, it should
     *                                               return a boolean. navOptions and admOptions are optional parameters.
     *                                               For perfomance reasons, do NOT call WebServices in here, call them in
     *                                               shouldDisplayForCourse.
     *                             - shouldDisplayForCourse(courseid, accessData, navOptions, admOptions) (Boolean|Promise) Whether
     *                                               or not the handler should be displayed in a course. When using a promise, it
     *                                               should return a boolean. navOptions and admOptions are optional parameters.
     *                                               If not implemented, assume it's true.
     *                             - getController(courseid) (Object) Returns the object that will act as controller.
     *                                                                See core/components/courses/templates/list.html
     *                                                                for the list of scope variables expected.
     *                             - invalidateEnabledForCourse(courseId, navOptions, admOptions) (Promise) Optional. Should
     *                                               invalidate data to determine if handler is enabled for a certain course.
     *                             - prefetch(course) (Promise) Optional. Will be called when a course is downloaded, and it
     *                                               should prefetch all the data to be able to see the addon in offline.
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

    self.$get = function($mmUtil, $q, $log, $mmSite, mmCoursesAccessMethods, $mmCourses, $mmEvents,
            mmCoursesEventMyCoursesRefreshed) {
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
         * Clear all courses handlers and invalidate its options.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#clearAndInvalidateCoursesOptions
         * @param {Number} [courseId]   The course ID. If not defined, all handlers will be cleared.
         * @protected
         */
        self.clearAndInvalidateCoursesOptions = function(courseId) {
            var promises = [];

            $mmEvents.trigger(mmCoursesEventMyCoursesRefreshed);

            // Invalidate course enabled data for the handlers that are enabled at site level.
            if (courseId) {
                // Invalidate only options for this course.
                promises.push($mmCourses.invalidateCoursesOptions([courseId]));
                promises.push(self.invalidateCourseHandlers(courseId));
            } else {
                // Invalidate all options.
                promises.push($mmCourses.invalidateUserNavigationOptions());
                promises.push($mmCourses.invalidateUserAdministrationOptions());

                for (var cId in coursesHandlers) {
                    promises.push(self.invalidateCourseHandlers(cId));
                }
            }

            self.clearCoursesHandlers(courseId);

            // In the past, mmCoursesEventCourseOptionsInvalidated was triggered here. This caused a lot of WS calls to be
            // performed, so it was removed to decrease the amount of WS calls. The downside is that calling this function
            // in a certain view will not affect other views.
            return $q.all(promises);
        };

        /**
         * Get the handlers for a course using a certain access type.
         *
         * @param  {Number}  courseId         The course ID.
         * @param  {Boolean} refresh          True if it should refresh the list.
         * @param  {Object}  accessData       Access type and data. Default, guest, ...
         * @param  {Object}  [navOptions]     Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object}  [admOptions]     Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @param  {Boolean} [waitForPromise] Wait for handlers to be loaded.
         * @return {Array|Promise}            Array (or promise resolved with array) of handlers.
         */
        function getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions, waitForPromise) {
            courseId = parseInt(courseId, 10);

            // If the promise is pending, do not refresh.
            if (coursesHandlers[courseId] && coursesHandlers[courseId].deferred &&
                    coursesHandlers[courseId].deferred.promise.$$state &&
                    coursesHandlers[courseId].deferred.promise.$$state.status === 0) {
                refresh = false;
            }

            if (refresh || !coursesHandlers[courseId] || coursesHandlers[courseId].access.type != accessData.type) {
                coursesHandlers[courseId] = {
                    access: accessData,
                    navOptions: navOptions,
                    admOptions: admOptions,
                    enabledHandlers: [],
                    deferred: $q.defer()
                };
                self.updateNavHandlersForCourse(courseId, accessData, navOptions, admOptions);
            }

            if (waitForPromise) {
                return coursesHandlers[courseId].deferred.promise.then(function() {
                    return coursesHandlers[courseId].enabledHandlers;
                });
            }
            return coursesHandlers[courseId].enabledHandlers;
        }

        /**
         * Get the handlers for a course where the user is enrolled in.
         * These handlers shouldn't be used directly, only to know if there's any enabled.
         * Please use $mmCoursesDelegate#getNavHandlersToDisplay when you need to display them.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersFor
         * @param  {Number}  courseId         The course ID.
         * @param  {Boolean} refresh          True if it should refresh the list.
         * @param  {Object}  [navOptions]     Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object}  [admOptions]     Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @param  {Boolean} [waitForPromise] Wait for handlers to be loaded.
         * @return {Array|Promise}            Array (or promise resolved with array) of handlers. These handlers shouldn't be used
         *                                    directly, only to know if there's any enabled. Please use getNavHandlersToDisplay.
         */
        self.getNavHandlersFor = function(courseId, refresh, navOptions, admOptions, waitForPromise) {
            // Default access.
            var accessData = {
                type: mmCoursesAccessMethods.default
            };
            return getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions, waitForPromise);
        };

        /**
         * Get the handlers for a course where the user is enrolled in, using course object.
         * These handlers shouldn't be used directly, only to know if there's any enabled.
         * Please use $mmCoursesDelegate#getNavHandlersToDisplay when you need to display them.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersForCourse
         * @param  {Object}  course           The course object.
         * @param  {Boolean} refresh          True if it should refresh the list.
         * @param  {Boolean} [waitForPromise] Wait for handlers to be loaded.
         * @return {Array|Promise}            Array (or promise resolved with array) of handlers. These handlers shouldn't be used
         *                                    directly, only to know if there's any enabled. Please use getNavHandlersToDisplay.
         */
        self.getNavHandlersForCourse = function(course, refresh, waitForPromise) {
            // Load course options if missing.
            return loadCourseOptions(course, refresh).then(function() {
                return self.getNavHandlersFor(course.id, refresh, course.navOptions, course.admOptions, waitForPromise);
            });
        };

        /**
         * Get the handlers for a course as guest.
         * These handlers shouldn't be used directly, only to know if there's any enabled.
         * Please use $mmCoursesDelegate#getNavHandlersToDisplay when you need to display them.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersForGuest
         * @param  {Number}  courseId         The course ID.
         * @param  {Boolean} refresh          True if it should refresh the list.
         * @param  {Object}  [navOptions]     Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object}  [admOptions]     Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @param  {Boolean} [waitForPromise] Wait for handlers to be loaded.
         * @return {Array|Promise}            Array (or promise resolved with array) of handlers. These handlers shouldn't be used
         *                                    directly, only to know if there's any enabled. Please use getNavHandlersToDisplay.
         */
        self.getNavHandlersForGuest = function(courseId, refresh, navOptions, admOptions, waitForPromise) {
            // Guest access.
            var accessData = {
                type: mmCoursesAccessMethods.guest
            };
            return getNavHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions, waitForPromise);
        };

        /**
         * Get the list of handlers that should be displayed for a course.
         * This function should be called only when the handlers need to be displayed, since it can call several WebServices.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#getNavHandlersToDisplay
         * @param  {Object}  course           The course object.
         * @param  {Boolean} refresh          True if it should refresh the list.
         * @param  {Boolean} isGuest          True if guest, false otherwise.
         * @param  {Boolean} [waitForPromise] Wait for handlers to be loaded.
         * @param  {Object}  [navOptions]     Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object}  [admOptions]     Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}                  Promise resolved with array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlersToDisplay = function(course, refresh, isGuest, waitForPromise, navOptions, admOptions) {
            course.id = parseInt(course.id, 10);

            var accessData = {
                type: isGuest ? mmCoursesAccessMethods.guest : mmCoursesAccessMethods.default
            };

            if (navOptions) {
                course.navOptions = navOptions;
            }
            if (admOptions) {
                course.admOptions = admOptions;
            }

            return loadCourseOptions(course, refresh).then(function() {
                // Call getNavHandlersForAccess to make sure the handlers have been loaded.
                return getNavHandlersForAccess(course.id, refresh, accessData, course.navOptions, course.admOptions, waitForPromise);
            }).then(function() {
                var handlersToDisplay = [],
                    promises = [],
                    promise;

                angular.forEach(coursesHandlers[course.id].enabledHandlers, function(handler) {
                    if (handler.instance.shouldDisplayForCourse) {
                        promise = $q.when(handler.instance.shouldDisplayForCourse(
                                course.id, accessData, course.navOptions, course.admOptions));
                    } else {
                        // Not implemented, assume it should be displayed.
                        promise = $q.when(true);
                    }

                    promises.push(promise.then(function(enabled) {
                        if (enabled) {
                            handlersToDisplay.push({
                                controller: handler.instance.getController(course.id),
                                priority: handler.priority,
                                prefetch: handler.instance.prefetch
                            });
                        }
                    }));
                });

                return $mmUtil.allPromises(promises).then(function() {
                    return handlersToDisplay;
                });
            });
        };

        /**
         * Invalidate the data to be able to determine if handlers are enabled for a certain course.
         *
         * @module mm.core.courses
         * @ngdoc method
         * @name $mmCoursesDelegate#invalidateCourseHandlers
         * @param  {Number} courseId Course ID.
         * @return {Promise}         Promise resolved when done.
         */
        self.invalidateCourseHandlers = function(courseId) {
            var promises = [],
                courseData = coursesHandlers[courseId];

            if (!courseData) {
                return $q.when();
            }

            angular.forEach(courseData.enabledHandlers, function(handler) {
                if (handler && handler.instance && handler.instance.invalidateEnabledForCourse) {
                    promises.push($q.when(
                            handler.instance.invalidateEnabledForCourse(courseId, courseData.navOptions, courseData.admOptions)));
                }
            });

            return $mmUtil.allPromises(promises);
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
         * Load course options if missing.
         *
         * @param  {Object} course   Course object.
         * @param  {Boolean} refresh True if it should refresh the options.
         * @return {Promise}         Promise resolved when done.
         */
        function loadCourseOptions(course, refresh) {
            var promise;

            if (typeof course.navOptions == "undefined" || typeof course.admOptions == "undefined" || refresh) {
                promise = $mmCourses.getCoursesOptions([course.id]).then(function(options) {
                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });
            } else {
                promise = $q.when();
            }

            return promise;
        }

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

            angular.forEach(enabledNavHandlers, function(handler, name) {
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
                    $mmUtil.emptyArray(coursesHandlers[courseId].enabledHandlers);
                    angular.forEach(enabledForCourse, function(handler) {
                        coursesHandlers[courseId].enabledHandlers.push(handler);
                    });
                    loaded[courseId] = true;

                    // Resolve the promise.
                    coursesHandlers[courseId].deferred.resolve();
                }
            });
        };

        return self;
    };

    return self;
});
