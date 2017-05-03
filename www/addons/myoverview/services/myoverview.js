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

angular.module('mm.addons.myoverview')

/**
 * My overview factory.
 *
 * @module mm.addons.myoverview
 * @ngdoc service
 * @name $mmaMyOverview
 */
.factory('$mmaMyOverview', function($log, $mmSitesManager, $mmSite) {
    $log = $log.getInstance('$mmaMyOverview');

    var self = {
        eventsLimit: 20,
        eventsLimitPerCourse: 10
    };

    /**
     * Get cache key for get calendar action events for a given list of courses value WS call.
     *
     * @return {String}       Cache key.
     */
    function getActionEventsByCoursesCacheKey() {
        return 'myoverview:bycourse';
    }

    /**
     * Get cache key for get calendar action events for the given course value WS call.
     *
     * @param {Number}   courseId    Only events in this course.
     * @return {String}             Cache key.
     */
    function getActionEventsByCourseCacheKey(courseId) {
        return getActionEventsByCoursesCacheKey() + ':' + courseId;
    }

    /**
     * Get prefix cache key for calendar action events based on the timesort value WS calls.
     *
     * @return {String}         Cache key.
     */
    function getActionEventsByTimesortPrefixCacheKey() {
        return 'myoverview:bytimesort:';
    }

    /**
     * Get cache key for get calendar action events based on the timesort value WS call.
     *
     * @param  {Number}     [afterEventId]  The last seen event id.
     * @param  {Number}     [limit]         Limit num of the call.
     * @return {String}     Cache key.
     */
    function getActionEventsByTimesortCacheKey(afterEventId, limit) {
        afterEventId = afterEventId || 0;
        return getActionEventsByTimesortPrefixCacheKey() + afterEventId + ':' + limit;
    }

    /**
     * Returns whether or not the my overview plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('core_calendar_get_action_events_by_courses');
        });
    };

    /**
     * Check if My Overview is disabled in a certain site.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isMyOverviewDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isMyOverviewDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmaMyOverview');
    };


    /**
     * Check if My Overview is avalaible to be shown on side meny.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isSideMenuAvailable
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isSideMenuAvailable = function() {
        if (!self.isMyOverviewDisabledInSite()) {
            return self.isPluginEnabled().catch(function() {
                return false;
            });
        }
        return $q.when(false);
    };


    /**
     * Get calendar action events for a given list of courses.
     *
     * @module mm.core.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#getActionEventsByCourses
     * @param {Array} courseIds
     * @param {String}  [siteId]    Site. If not defined, use current site.
     * @return {Promise}            Promise to be resolved when the info is retrieved.
     */
    self.getActionEventsByCourses = function(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data = {
                    timesortfrom: time,
                    courseids: courseIds,
                    limitnum: self.eventsLimitPerCourse
                },
                presets = {
                    cacheKey: getActionEventsByCoursesCacheKey()
                };

            return site.read('core_calendar_get_action_events_by_courses', data, presets).then(function(events) {
                if (events && events.groupedbycourse) {
                    var courseEvents = {};

                    angular.forEach(events.groupedbycourse, function(course) {
                        courseEvents[course.courseid] = treatCourseEvents(course, time);
                    });
                    return courseEvents;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates get calendar action events for a given list of courses WS call.
     *
     * @module mm.core.myoverview
     * @ngdoc method
     * @name $mmCourses#invalidateActionEventsByCourses
     * @param {String} [siteId] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateActionEventsByCourses = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getActionEventsByCoursesCacheKey());
        });
    };

    /**
     * Get calendar action events for the given course.
     *
     * @module mm.core.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#getActionEventsByCourse
     * @param {Number}  courseId    Only events in this course.
     * @param {Number}  [afterEventId]  The last seen event id.
     * @param {String}  [siteId]    Site. If not defined, use current site.
     * @return {Promise}            Promise to be resolved when the info is retrieved.
     */
    self.getActionEventsByCourse = function(courseId, afterEventId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data = {
                    timesortfrom: time,
                    courseid: courseId,
                    limitnum: self.eventsLimitPerCourse
                },
                presets = {
                    cacheKey: getActionEventsByCourseCacheKey(courseId)
                };

            if (afterEventId) {
                data.aftereventid = afterEventId;
            }

            return site.read('core_calendar_get_action_events_by_course', data, presets).then(function(courseEvents) {
                if (courseEvents && courseEvents.events) {
                    return treatCourseEvents(courseEvents, time);
                }
                return $q.reject();
            });
        });
    };

    /**
     * Handles course events, filtering and treating if more can be loaded.
     *
     * @param  {Object} course      Object containing response course events info.
     * @param  {Number} timeFrom    Current time to filter events from.
     * @return {Object}             Object containing course events and and last loaded event id if more can be loaded.
     */
    function treatCourseEvents(course, timeFrom) {
        var canLoadMore = course.events.length >= self.eventsLimitPerCourse ? course.lastid : false;

        // Filter events by time in case it uses cache.
        course.events = course.events.filter(function(element) {
            return element.timesort >= timeFrom;
        });

        return {
            events: course.events,
            canLoadMore: canLoadMore
        };
    }

    /**
     * Get calendar action events based on the timesort value.
     *
     * @module mm.core.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#getActionEventsByTimesort
     * @param {Number}  [afterEventId]  The last seen event id.
     * @param {String}  [siteId]        Site. If not defined, use current site.
     * @return {Promise}                Promise to be resolved when the info is retrieved.
     */
    self.getActionEventsByTimesort = function(afterEventId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data = {
                    timesortfrom: time,
                    limitnum: self.eventsLimit
                },
                presets = {
                    cacheKey: getActionEventsByTimesortCacheKey(afterEventId, self.eventsLimit),
                    getCacheUsingCacheKey: true,
                    uniqueCacheKey: true
                };

            if (afterEventId) {
                data.aftereventid = afterEventId;
            }

            return site.read('core_calendar_get_action_events_by_timesort', data, presets).then(function(events) {
                if (events && events.events) {
                    var canLoadMore = events.events.length >= self.eventsLimit ? events.lastid : false;

                    // Filter events by time in case it uses cache.
                    events = events.events.filter(function(element) {
                        return element.timesort >= time;
                    });

                    return {
                        events: events,
                        canLoadMore: canLoadMore
                    };
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates get calendar action events based on the timesort value WS call.
     *
     * @module mm.core.myoverview
     * @ngdoc method
     * @name $mmCourses#invalidateActionEventsByTimesort
     * @param {String} [siteId] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateActionEventsByTimesort = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getActionEventsByTimesortPrefixCacheKey());
        });
    };

    return self;
});
