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

.constant('mmCoreEventKeyboardShow', 'keyboard_show')
.constant('mmCoreEventKeyboardHide', 'keyboard_hide')
.constant('mmCoreEventSessionExpired', 'session_expired')
.constant('mmCoreEventLogin', 'login')
.constant('mmCoreEventLogout', 'logout')
.constant('mmCoreEventLanguageChanged', 'language_changed')
.constant('mmCoreEventSiteAdded', 'site_added')
.constant('mmCoreEventSiteUpdated', 'site_updated')
.constant('mmCoreEventSiteDeleted', 'site_deleted')
.constant('mmCoreEventQueueEmpty', 'filepool_queue_empty')
.constant('mmCoreEventCompletionModuleViewed', 'completion_module_viewed')
.constant('mmCoreEventUserDeleted', 'user_deleted')
.constant('mmCoreEventPackageStatusChanged', 'filepool_package_status_changed')
.constant('mmCoreEventSectionStatusChanged', 'section_status_changed')
.constant('mmCoreEventRemoteAddonsLoaded', 'remote_addons_loaded')
.constant('mmCoreEventOnline', 'online') // Deprecated on version 3.1.3.
.constant('mmCoreEventOnlineStatusChanged', 'online_status_changed')


/**
 * Service to send and listen to events.
 *
 * @ngdoc service
 * @name $mmEvents
 * @module mm.core
 * @description
 * This service allows sending and listening to events in the Moodle Mobile app.
 */
.factory('$mmEvents', function($log, md5) {

    $log = $log.getInstance('$mmEvents');

    var self = {},
        observers = {},
        uniqueEvents = {},
        uniqueEventsData = {};

    /**
     * Adds an observer for a certain event.
     * To deregister the event:
     * var observer = $mmEvents.on('something', myCallBack);
     * observer.off();
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmEvents#on
     * @param  {String}   eventName  Name of the event to listen to.
     * @param  {Function} callBack   Function to call when the event is triggered.
     * @return {Object}              Object to deregister the observer. Undefined if it's an already triggered unique event.
     */
    self.on = function(eventName, callBack) {

        // If it's a unique event and has been triggered already, call the callBack.
        // We don't need to store the observer because the event won't be triggered again.
        if (uniqueEvents[eventName]) {
            callBack(uniqueEventsData[eventName]);
            // Return a fake observer to prevent errors.
            return {
                id: -1,
                off: function() {}
            };
        }

        var observerID;

        if (typeof(observers[eventName]) === 'undefined') {
            observers[eventName] = {};
        }

        while (typeof(observerID) === 'undefined') {
            var candidateID = md5.createHash(Math.random().toString());
            if (typeof(observers[eventName][candidateID]) === 'undefined') {
                observerID = candidateID;
            }
        }
        $log.debug('Observer ' + observerID + ' listening to event '+eventName);

        observers[eventName][observerID] = callBack;

        // Create observer object to deregister the listener.
        var observer = {
            id: observerID,
            off: function() {
                $log.debug('Disable observer ' + observerID + ' for event '+eventName);
                delete observers[eventName][observerID];
            }
        };
        return observer;
    };

    /**
     * Triggers an event, notifying all the observers.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmEvents#trigger
     * @param {String} event Name of the event to trigger.
     * @param {Mixed}  data  Data to pass to the observers.
     */
    self.trigger = function(eventName, data) {
        $log.debug('Event ' + eventName + ' triggered.');
        var affected = observers[eventName];
        for (var observerName in affected) {
            if (typeof(affected[observerName]) === 'function') {
                affected[observerName](data);
            }
        }
    };

    /**
     * Triggers a unique event, notifying all the observers. If the event has already been triggered, don't do anything.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmEvents#trigger
     * @param {String} event Name of the event to trigger.
     * @param {Mixed}  data  Data to pass to the observers.
     */
    self.triggerUnique = function(eventName, data) {
        if (uniqueEvents[eventName]) {
            $log.debug('Unique event ' + eventName + ' ignored because it was already triggered.');
        } else {
            $log.debug('Unique event ' + eventName + ' triggered.');
            uniqueEvents[eventName] = true;
            uniqueEventsData[eventName] = data;
            var affected = observers[eventName];
            angular.forEach(affected, function(callBack) {
                if (typeof callBack === 'function') {
                    callBack(data);
                }
            });
        }
    };

    return self;
});
