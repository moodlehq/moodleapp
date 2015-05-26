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
.factory('$mmaCalendar', function($log, $q, $mmSite, $mmUtil, $mmCourses, $mmGroups, mmCoreSecondsDay, mmaCalendarDaysInterval) {

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
     * @return {String} Cache key.
     */
    function getEventsListCacheKey() {
        return 'mmaCalendar:events';
    }

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

        // The core_calendar_get_calendar_events needs all the current user courses and groups.
        var now = $mmUtil.timestamp(),
            start = now + (mmCoreSecondsDay * daysToStart),
            end = start + (mmCoreSecondsDay * daysInterval),
            data = {
                "options[userevents]": 1,
                "options[siteevents]": 1,
                "options[timestart]": start,
                "options[timeend]": end
            };

        return $mmCourses.getUserCourses(refresh).then(function(courses) {
            angular.forEach(courses, function(course, index) {
                data["events[courseids][" + index + "]"] = course.id;
            });

            return $mmGroups.getUserGroups(courses, refresh).then(function(groups) {
                angular.forEach(groups, function(group, index) {
                    data["events[groupids][" + index + "]"] = group.id;
                });

                var preSets = {
                    cacheKey: getEventsListCacheKey()
                };
                return $mmSite.read('core_calendar_get_calendar_events', data, preSets).then(function(response) {
                    return response.events;
                });
            });

        });
    };

    /**
     * Invalidates events list.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#invalidateEventsList
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateEventsList = function() {
        return $mmSite.invalidateWsCacheForKey(getEventsListCacheKey());
    };

    return self;
});
