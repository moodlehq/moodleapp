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
        observers = {};

    /**
     * Triggers an event, notifying all the observers.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmEvents#trigger
     * @param {String} event Name of the event to trigger.
     */
    self.trigger = function(eventName) {
        $log.debug('Event ' + eventName + ' triggered.');
        var affected = observers[eventName];
        for (var observerName in affected) {
            if (typeof(affected[observerName]) === 'function') {
                affected[observerName]();
            }
        }
    };

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
     * @return {Object}              Object to deregister the observer.
     */
    self.on = function(eventName, callBack) {

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

    return self;
});
