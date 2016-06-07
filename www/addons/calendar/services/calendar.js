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

.constant('mmaCalendarEventsStore', 'calendar_events')

.config(function($mmSitesFactoryProvider, mmaCalendarEventsStore) {
    var stores = [
        {
            name: mmaCalendarEventsStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'notificationtime'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Service to handle calendar events.
 *
 * @module mm.addons.calendar
 * @ngdoc service
 * @name $mmaCalendar
 */
.factory('$mmaCalendar', function($log, $q, $mmSite, $mmUtil, $mmCourses, $mmGroups, $mmCourse, $mmLocalNotifications,
        $mmSitesManager, mmCoreSecondsDay, mmaCalendarDaysInterval, mmaCalendarEventsStore, mmaCalendarDefaultNotifTime,
        mmaCalendarComponent) {

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
     * Store events in local DB.
     *
     * @param {Object[]} events  Events to store.
     * @param  {String} [siteid] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise}         Promise resolved when the events are stored.
     */
    function storeEventsInLocalDB(events, siteid) {
        siteid = siteid || $mmSite.getId();

        return $mmSitesManager.getSite(siteid).then(function(site) {
            var promises = [],
                db = site.getDb();

            angular.forEach(events, function(event) {
                // Get the event notification time to prevent overriding it in DB.
                var promise = self.getEventNotificationTime(event.id, siteid).then(function(time) {
                    event.notificationtime = time;
                    return db.insert(mmaCalendarEventsStore, event);
                });
                promises.push(promise);
            });

            return $q.all(promises);
        });
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
    };

    /**
     * Get a calendar event from server or cache. If the server request fails and data is not cached,
     * try to get it from local DB.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#getEvent
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
                return self.getEventFromLocalDb(id);
            }
        }, function() {
            return self.getEventFromLocalDb(id);
        });
    };

    /**
     * Get a calendar event from local Db.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#getEventFromLocalDb
     * @param {Number}  id Event ID.
     * @return {Promise}   Promise resolved when the event data is retrieved.
     */
    self.getEventFromLocalDb = function(id) {
        if (!$mmSite.isLoggedIn()) {
            // Not logged in, we can't get the site DB. User logged out or session expired while an operation was ongoing.
            return $q.reject();
        }
        return $mmSite.getDb().get(mmaCalendarEventsStore, id);
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
     * Get event notification time.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#getEventNotificationTime
     * @param  {Number} id       Event ID.
     * @param  {String} [siteid] ID of the site the event belongs to. If not defined, use current site.
     * @return {String}          Event icon name. If type not valid, return empty string.
     */
    self.getEventNotificationTime = function(id, siteid) {
        siteid = siteid || $mmSite.getId();

        return $mmSitesManager.getSite(siteid).then(function(site) {
            var db = site.getDb();

            return db.get(mmaCalendarEventsStore, id).then(function(e) {
                if (typeof e.notificationtime != 'undefined') {
                    return e.notificationtime;
                }
                return mmaCalendarDefaultNotifTime;
            }, function(err) {
                return mmaCalendarDefaultNotifTime;
            });
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
     * @param {String} [siteid]          Site to get the events from. If not defined, use current site.
     * @return {Promise}                 Promise to be resolved when the participants are retrieved.
     * @description
     * Get the events in a certain period. The period is calculated like this:
     *     start time: now + daysToStart
     *     end time: start time + daysInterval
     * E.g. using $mmaCalendar.getEvents(30, 30) is going to get the events starting after 30 days from now
     * and ending before 60 days from now.
     */
    self.getEvents = function(daysToStart, daysInterval, refresh, siteid) {
        daysToStart = daysToStart || 0;
        daysInterval = daysInterval || mmaCalendarDaysInterval;
        siteid = siteid || $mmSite.getId();

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

        return $mmCourses.getUserCourses(false, siteid).then(function(courses) {
            courses.push({id: 1}); // Add front page.
            angular.forEach(courses, function(course, index) {
                data["events[courseids][" + index + "]"] = course.id;
            });

            return $mmGroups.getUserGroups(courses, refresh, siteid).then(function(groups) {
                angular.forEach(groups, function(group, index) {
                    data["events[groupids][" + index + "]"] = group.id;
                });

                return $mmSitesManager.getSite(siteid).then(function(site) {

                    // We need to retrieve cached data using cache key because we have timestamp in the params.
                    var preSets = {
                        cacheKey: getEventsListCacheKey(daysToStart, daysInterval),
                        getCacheUsingCacheKey: true
                    };
                    return site.read('core_calendar_get_calendar_events', data, preSets).then(function(response) {
                        storeEventsInLocalDB(response.events, siteid);
                        return response.events;
                    });
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
        var p1 = $mmCourses.invalidateUserCourses(),
            p2 = $mmSite.invalidateWsCacheForKeyStartingWith(getEventsCommonCacheKey());
        return $q.all([p1, p2]);
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

    /**
     * Get the next events for all the sites and schedules their notifications.
     * If an event notification time is 0, cancel its scheduled notification (if any).
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#scheduleAllSitesEventsNotifications
     * @param  {Object[]} events Events to schedule.
     * @return {Promise}         Promise resolved when all the notifications have been scheduled.
     */
    self.scheduleAllSitesEventsNotifications = function() {

        if ($mmLocalNotifications.isAvailable()) {
            return $mmSitesManager.getSitesIds().then(function(siteids) {

                var promises = [];
                angular.forEach(siteids, function(siteid) {
                    // Get first events.
                    var promise = self.getEvents(undefined, undefined, false, siteid).then(function(events) {
                        return self.scheduleEventsNotifications(events, siteid);
                    });
                    promises.push(promise);
                });

                return $q.all(promises);
            });
        } else {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        }
    };

    /**
     * Schedules an event notification. If time is 0, cancel scheduled notification if any.
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#scheduleEventNotification
     * @param  {Object} event    Event to schedule.
     * @param  {Number} time     Notification setting time (in minutes). E.g. 10 means "notificate 10 minutes before start".
     * @param  {String} [siteid] Site ID the event belongs to. If not defined, use current site.
     * @return {Promise}       Promise resolved when the notification is scheduled.
     */
    self.scheduleEventNotification = function(event, time, siteid) {
        siteid = siteid || $mmSite.getId();

        if ($mmLocalNotifications.isAvailable()) {
            if (time === 0) {
                return $mmLocalNotifications.cancel(event.id, mmaCalendarComponent, siteid); // Cancel if it was scheduled.
            } else {
                var timeend = (event.timestart + event.timeduration) * 1000;
                if (timeend <= new Date().getTime()) {
                    // The event has finished already, don't schedule it.
                    return $q.when();
                }

                var dateTriggered = new Date((event.timestart - (time * 60)) * 1000),
                    startDate = new Date(event.timestart * 1000),
                    notification = {
                        id: event.id,
                        title: event.name,
                        text: startDate.toLocaleString(),
                        at: dateTriggered,
                        data: {
                            eventid: event.id,
                            siteid: siteid
                        }
                    };

                return $mmLocalNotifications.schedule(notification, mmaCalendarComponent, siteid);
            }
        } else {
            return $q.when();
        }
    };

    /**
     * Schedules the notifications for a list of events.
     * If an event notification time is 0, cancel its scheduled notification (if any).
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#scheduleEventsNotifications
     * @param  {Object[]} events Events to schedule.
     * @param  {String} [siteid] ID of the site the events belong to. If not defined, use current site.
     * @return {Promise}         Promise resolved when all the notifications have been scheduled.
     */
    self.scheduleEventsNotifications = function(events, siteid) {
        siteid = siteid || $mmSite.getId();
        var promises = [];

        if ($mmLocalNotifications.isAvailable()) {
            angular.forEach(events, function(e) {
                var promise = self.getEventNotificationTime(e.id, siteid).then(function(time) {
                    return self.scheduleEventNotification(e, time, siteid);
                });
                promises.push(promise);
            });
        }

        return $q.all(promises);
    };

    /**
     * Updates an event notification time and schedule a new notification.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendar#updateNotificationTime
     * @param  {Object} event Event to update its notification time.
     * @param  {Number} time  New notification setting time (in minutes). E.g. 10 means "notificate 10 minutes before start".
     * @return {Promise}      Promise resolved when the notification is updated.
     */
    self.updateNotificationTime = function(event, time) {
        if (!$mmSite.isLoggedIn()) {
            // Not logged in, we can't get the site DB. User logged out or session expired while an operation was ongoing.
            return $q.reject();
        }

        var db = $mmSite.getDb();

        event.notificationtime = time;

        return db.insert(mmaCalendarEventsStore, event).then(function() {
            return self.scheduleEventNotification(event, time);
        });
    };

    return self;
});
