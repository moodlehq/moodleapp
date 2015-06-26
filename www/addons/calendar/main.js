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

angular.module('mm.addons.calendar', [])

.constant('mmaCalendarDaysInterval', 30)
.constant('mmaCalendarDefaultNotifTime', 60)
.constant('mmaCalendarComponent', 'mmaCalendarEvents')

.config(function($stateProvider) {

    $stateProvider
        .state('site.calendar', {
            url: '/calendar',
            views: {
                'site': {
                    controller: 'mmaCalendarListCtrl',
                    templateUrl: 'addons/calendar/templates/list.html'
                }
            },
            params: {
                eventid: null,
                clear: false
            }
        })

        .state('site.calendar-event', {
            url: '/calendar-event/:id', // We need to add ID to the URL to make ng-href work.
            views: {
                'site': {
                    controller: 'mmaCalendarEventCtrl',
                    templateUrl: 'addons/calendar/templates/event.html'
                }
            }
        });

})

.run(function($mmSideMenuDelegate, $mmaCalendar, $mmLocalNotifications, $state, $ionicPlatform, $mmEvents,
        mmaCalendarComponent) {
    // Register plugin in side menu.
    $mmSideMenuDelegate.registerPlugin('mmaCalendar', function() {
        if (!$mmaCalendar.isAvailable()) {
            return undefined;
        }
        return {
            icon: 'ion-calendar',
            title: 'mma.calendar.calendarevents',
            state: 'site.calendar'
        };
    });

    // Listen for notification clicks.
    $mmLocalNotifications.registerClick(mmaCalendarComponent, function(data) {
        if (data.eventid) {
            var observer = $mmEvents.on('initialized', function() {
                if (observer && observer.off) {
                    observer.off();
                }
                $state.go('redirect', {siteid: data.siteid, state: 'site.calendar', params: {eventid: data.eventid}});
            });
        }
    });

    $ionicPlatform.ready(function() {
        $mmaCalendar.scheduleAllSitesEventsNotifications();
    });
});
