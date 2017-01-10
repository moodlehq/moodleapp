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
.constant('mmaCalendarPriority', 400)
.constant('mmaCalendarDefaultNotifTimeSetting', 'mmaCalendarDefaultNotifTime')
.constant('mmaCalendarDefaultNotifTimeChangedEvent', 'mma_calendar_default_notif_time_changed')

.config(function($stateProvider, $mmSideMenuDelegateProvider, mmaCalendarPriority) {

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
        })

        .state('site.calendar-settings', {
            url: '/calendar-settings',
            views: {
                'site': {
                    controller: 'mmaCalendarSettingsCtrl',
                    templateUrl: 'addons/calendar/templates/settings.html'
                }
            }
        });

    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaCalendar', '$mmaCalendarHandlers.sideMenuNav', mmaCalendarPriority);

})

.run(function($mmaCalendar, $mmLocalNotifications, $state, $mmApp, mmaCalendarComponent) {

    // Listen for notification clicks.
    $mmLocalNotifications.registerClick(mmaCalendarComponent, function(data) {
        if (data.eventid) {
            $mmApp.ready().then(function() {
                $state.go('redirect', {siteid: data.siteid, state: 'site.calendar', params: {eventid: data.eventid}});
            });
        }
    });

    $mmApp.ready().then(function() {
        $mmaCalendar.scheduleAllSitesEventsNotifications();
    });
});
