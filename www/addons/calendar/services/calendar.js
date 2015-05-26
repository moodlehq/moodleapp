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

angular.module('mm.addons.calendar')

/**
 * Service to handle calendar events.
 *
 * @module mm.addons.calendar
 * @ngdoc service
 * @name $mmaCalendar
 */
.factory('$mmaCalendar', function($log, $q, $mmSite, $mmUtil, $mmCourses, $mmGroups, $mmCourse, mmCoreSecondsDay,
        mmaCalendarDaysInterval) {

    $log = $log.getInstance('$mmaCalendar');

    var self = {},
        calendarImgPath = 'addons/calendar/img/',
        eventicons = {
            'course': calendarImgPath + 'courseevent.svg',
            'group': calendarImgPath + 'groupevent.svg',
            'site': calendarImgPath + 'siteevent.svg',
            'user': calendarImgPath + 'userevent.svg'
        };

    /**
     * Get cache key for events list WS calls.
     *
     * @param {Number} daysToStart  Number of days from now to start getting events.
     * @param {Number} daysInterval Number of days between timestart and timeend.
     * @return {String} Cache key.
     */
    function getEventsListCacheKey(daysToStart, daysInterval) {
        return 'mmaCalendar:events:' + daysToStart + ':' + daysInterval;
    }

    /**
     * Get cache key for a single event WS call.
     *
     * @param {Number} id Event ID.
     * @return {String} Cache key.
     */
    function getEventCacheKey(id) {
        return 'mmaCalendar:events:' + id;
    }

    /**
     * Get the common part of the cache keys for events WS calls. Invalidate the whole list also invalidates all the
     * single events.
     *
     * @return {String} Cache key.
     */
    function getEventsCommonCacheKey() {
        return 'mmaCalendar:events:';
    }

    /**
     * Convenience function to format some event data to be rendered. Adds properties 'start', 'end', 'icon'
     * and (if it's a module event) 'moduleicon'.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#formatEventData
     * @param {Object} e Event to format.
     */
    self.formatEventData = function(e) {
        var icon = self.getEventIcon(e.eventtype);
        if (icon === '') {
            // It's a module event.
            icon = $mmCourse.getModuleIconSrc(e.modulename);
            e.moduleicon = icon;
        }
        e.icon = icon;
        e.start = new Date(e.timestart * 1000).toLocaleString();
        e.end = new Date((e.timestart + e.timeduration) * 1000).toLocaleString();
    };

    /**
     * Get event icon name based on event type.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#getEventIcon
     * @param  {String} type Event type.
     * @return {String}      Event icon name. If type not valid, return empty string.
     */
    self.getEventIcon = function(type) {
        return eventicons[type] || '';
    };

    /**
     * Get a calendar event. By default, it tries to get the data from "loadedEvents" variable. If the event is not there or
     * refresh param is true, retrieve the data from server.
     *
     * @param {Number}  id        Event ID.
     * @param {Boolean} [refresh] True when we should update the event data.
     * @return {Promise}          Promise resolved when the event data is retrieved.
     */
    self.getEvent = function(id, refresh) {
        var presets = {},
            data = {
                "options[userevents]": 0,
                "options[siteevents]": 0,
                "events[eventids][0]": id
            };

        presets.cacheKey = getEventCacheKey(id);
        if (refresh) {
            presets.getFromCache = false;
        }

        return $mmSite.read('core_calendar_get_calendar_events', data, presets).then(function(response) {
            var e = response.events[0];
            if (e) {
                return e;
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Get calendar events in a certain period.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#getEvents
     * @param {Number} [daysToStart=0]   Number of days from now to start getting events.
     * @param {Number} [daysInterval=30] Number of days between timestart and timeend.
     * @param {Boolean} [refresh]        True when we should not get the value from the cache.
     * @return {Promise}                 Promise to be resolved when the participants are retrieved.
     * @description
     * Get the events in a certain period. The period is calculated like this:
     *     start time: now + daysToStart
     *     end time: start time + daysInterval
     * E.g. using $mmaCalendar.getEvents(30, 30) is going to get the events starting after 30 days from now
     * and ending before 60 days from now.
     */
    self.getEvents = function(daysToStart, daysInterval, refresh) {
        daysToStart = daysToStart || 0;
        daysInterval = daysInterval || mmaCalendarDaysInterval;

         var now = $mmUtil.timestamp(),
            start = now + (mmCoreSecondsDay * daysToStart),
            end = start + (mmCoreSecondsDay * daysInterval);

        // The core_calendar_get_calendar_events needs all the current user courses and groups.
        var data = {
            "options[userevents]": 1,
            "options[siteevents]": 1,
            "options[timestart]": start,
            "options[timeend]": end
        };

        return $mmCourses.getUserCourses(refresh).then(function(courses) {
            courses.push({id: 1}); // Add front page.
            angular.forEach(courses, function(course, index) {
                data["events[courseids][" + index + "]"] = course.id;
            });

            return $mmGroups.getUserGroups(courses, refresh).then(function(groups) {
                angular.forEach(groups, function(group, index) {
                    data["events[groupids][" + index + "]"] = group.id;
                });

                // We need to retrieve cached data using cache key because we have timestamp in the params.
                var preSets = {
                    cacheKey: getEventsListCacheKey(daysToStart, daysInterval),
                    getCacheUsingCacheKey: true
                };
                return $mmSite.read('core_calendar_get_calendar_events', data, preSets).then(function(response) {
                    return response.events;
                });
            });

        });
    };

    /**
     * Invalidates events list and all the single events.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#invalidateEventsList
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateEventsList = function() {
        return $mmSite.invalidateWsCacheForKeyStartingWith(getEventsCommonCacheKey());
    };

    /**
     * Check if calendar events WS is available.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#isAvailable
     * @return {Boolean} True if calendar events WS is available, false otherwise.
     */
    self.isAvailable = function() {
        return $mmSite.wsAvailable('core_calendar_get_calendar_events');
    };

    return self;
});
