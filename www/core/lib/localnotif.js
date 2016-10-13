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

// Stores used to create unique IDs for notifications.
.constant('mmCoreNotificationsSitesStore', 'notification_sites')
.constant('mmCoreNotificationsComponentsStore', 'notification_components')
.constant('mmCoreNotificationsTriggeredStore', 'notifications_triggered')

.config(function($mmAppProvider, mmCoreNotificationsSitesStore, mmCoreNotificationsComponentsStore,
        mmCoreNotificationsTriggeredStore) {
    var stores = [
        {
            name: mmCoreNotificationsSitesStore, // Store to asigne unique codes to each site.
            keyPath: 'id',
            indexes: [
                {
                    name: 'code',
                }
            ]
        },
        {
            name: mmCoreNotificationsComponentsStore, // Store to asigne unique codes to each component.
            keyPath: 'id',
            indexes: [
                {
                    name: 'code',
                }
            ]
        },
        {
            name: mmCoreNotificationsTriggeredStore, // Store to prevent re-triggering notifications.
            keyPath: 'id',
            indexes: []
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Factory to handle local notifications.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmLocalNotifications
 * @description
 * Provides methods to trigger notifications, listen clicks on them, etc.
 */
.factory('$mmLocalNotifications', function($log, $cordovaLocalNotification, $mmApp, $q, $rootScope, $ionicPopover, $timeout,
        mmCoreNotificationsSitesStore, mmCoreNotificationsComponentsStore, mmCoreNotificationsTriggeredStore) {

    $log = $log.getInstance('$mmLocalNotifications');

    var self = {},
        observers = {},
        codes = {}, // Store codes in memory to make getCode function faster.
        scope,
        hidePopoverTimeout;

    // Setup inapp notifications popover.
    scope = $rootScope.$new();
    $ionicPopover.fromTemplateUrl('core/templates/notificationpopover.html', {
        scope: scope,
    }).then(function(popover) {
        // Disable the backdrop.
        popover.viewType = 'mm-inappnotif-popover';
        angular.element(popover.el).removeClass('popover-backdrop').addClass('mm-inapp-notification-backdrop');

        scope.popover = popover;

        scope.hide = function() {
            scope.popover.hide();
            $timeout.cancel(hidePopoverTimeout);
        };
    });

    // We need a queue to request unique codes, to handle simultaneous requests.
    var codeRequestsQueue = {};

    /**
     * Get a code to create unique notifications. If there's no code assigned, create a new one.
     *
     * @param  {String} store Store to search in local DB.
     * @param  {String} id    ID of the element to get its code.
     * @return {Promise}      Promise resolved when the code is retrieved.
     */
    function getCode(store, id) {
        var db = $mmApp.getDB(),
            key = store + '#' + id;

        if (typeof codes[key] != 'undefined') {
            return $q.when(codes[key]);
        }

        return db.get(store, id).then(function(entry) {
            var code = parseInt(entry.code);
            codes[key] = code;
            return code;
        }, function() {
            // Site is not in the DB. Create a new ID for it.
            return db.query(store, undefined, 'code', true).then(function(entries) {
                var newCode = 0;
                if (entries.length > 0) {
                    newCode = parseInt(entries[0].code) + 1;
                }
                return db.insert(store, {id: id, code: newCode}).then(function() {
                    codes[key] = newCode;
                    return newCode;
                });
            });
        });
    }

    /**
     * Get a site code to be used.
     * If it's the first time this site is used to send notifications, create a new code for it.
     *
     * @param  {String} siteid   Site ID.
     * @return {Promise}         Promise resolved when the site code is retrieved.
     */
    function getSiteCode(siteid) {
        return requestCode(mmCoreNotificationsSitesStore, siteid);
    }

    /**
     * Get a notification component code to be used.
     * If it's the first time this component is used to send notifications, create a new code for it.
     *
     * @param {String} component Component name.
     * @return {Promise}         Promise resolved when the component code is retrieved.
     */
    function getComponentCode(component) {
        return requestCode(mmCoreNotificationsComponentsStore, component);
    }

    /**
     * Create a unique notification ID, trying to prevent collisions. Generated ID must be a Number (Android).
     * The generated ID shouldn't be higher than 2147483647 or it's going to cause problems in Android.
     * This function will prevent collisions and keep the number under Android limit if:
     *     -User has used less than 21 sites.
     *     -There are less than 11 components.
     *     -The notificationid passed as parameter is lower than 10000000.
     *
     * @param  {Number} notificationid Notification ID.
     * @param {String} component       Component triggering the notification.
     * @param  {String} siteid         Site ID.
     * @return {Promise}               Promise resolved when the notification ID is generated.
     */
    function getUniqueNotificationId(notificationid, component, siteid) {
        if (!siteid || !component) {
            return $q.reject();
        }

        return getSiteCode(siteid).then(function(sitecode) {
            return getComponentCode(component).then(function(componentcode) {
                // We use the % operation to keep the number under Android's limit.
                return (sitecode * 100000000 + componentcode * 10000000 + parseInt(notificationid)) % 2147483647;
            });
        });
    }

    /**
     * Process the next request in queue.
     */
    function processNextRequest() {
        var nextKey = Object.keys(codeRequestsQueue)[0],
            request,
            promise;

        if (typeof nextKey == 'undefined') {
            // No more requests in queue, stop.
            return;
        }

        request = codeRequestsQueue[nextKey];
        // Check if request is valid.
        if (angular.isObject(request) && typeof request.store != 'undefined' && typeof request.id != 'undefined') {
            // Get the code and resolve/reject all the promises of this request.
            promise = getCode(request.store, request.id).then(function(code) {
                angular.forEach(request.promises, function(p) {
                    p.resolve(code);
                });
            }, function(error) {
                angular.forEach(request.promises, function(p) {
                    p.reject(error);
                });
            });
        } else {
            promise = $q.when();
        }

        // Once this item is treated, remove it and process next.
        promise.finally(function() {
            delete codeRequestsQueue[nextKey];
            processNextRequest();
        });
    }

    /**
     * Request a unique code. The request will be added to the queue and the queue is going to be started if it's paused.
     *
     * @param  {String} store Store to search in local DB.
     * @param  {String} id    ID of the element to get its code.
     * @return {Promise}      Promise resolved when the code is retrieved.
     */
    function requestCode(store, id) {
        var deferred = $q.defer(),
            key = store+'#'+id,
            isQueueEmpty = Object.keys(codeRequestsQueue).length == 0;

        if (typeof codeRequestsQueue[key] != 'undefined') {
            // There's already a pending request for this store and ID, add the promise to it.
            codeRequestsQueue[key].promises.push(deferred);
        } else {
            // Add a pending request to the queue.
            codeRequestsQueue[key] = {
                store: store,
                id: id,
                promises: [deferred]
            };
        }

        if (isQueueEmpty) {
            processNextRequest();
        }

        return deferred.promise;
    }

    /**
     * Cancel a local notification.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#cancel
     * @param {Number} id        Notification id.
     * @param {String} component Component of the notification.
     * @param {String} siteid    Site ID.
     * @return {Promise}         Promise resolved when the notification is cancelled.
     */
    self.cancel = function(id, component, siteid) {
        return getUniqueNotificationId(id, component, siteid).then(function(uniqueId) {
            return $cordovaLocalNotification.cancel(uniqueId);
        });
    };

    /**
     * Cancel all the scheduled notifications belonging to a certain site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#cancelSiteNotifications
     * @param {String} siteid Site ID.
     * @return {Promise} Promise resolved when the notifications are cancelled.
     */
    self.cancelSiteNotifications = function(siteid) {

        if (!self.isAvailable()) {
            return $q.when();
        } else if (!siteid) {
            return $q.reject();
        }

        return $cordovaLocalNotification.getAllScheduled().then(function(scheduled) {
            var ids = [];

            angular.forEach(scheduled, function(notif) {
                if (typeof notif.data == 'string') {
                    notif.data = JSON.parse(notif.data);
                }

                if (typeof notif.data == 'object' && notif.data.siteid === siteid) {
                    ids.push(notif.id);
                }
            });

            return $cordovaLocalNotification.cancel(ids);
        });
    };

    /**
     * Returns whether local notifications plugin is installed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#isAvailable
     * @return {Boolean} True when local notifications plugin is installed.
     */
    self.isAvailable = function() {
        return window.plugin && window.plugin.notification && window.plugin.notification.local ? true: false;
    };

    /**
     * Check if a notification has been triggered with the same trigger time.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#isTriggered
     * @param  {Object}  notification Notification to check. Needs to have 'id' and 'at' properties.
     * @return {Promise}              Promise resolved with a boolean indicating if promise is triggered (true) or not.
     */
    self.isTriggered = function(notification) {
        return $mmApp.getDB().get(mmCoreNotificationsTriggeredStore, notification.id).then(function(stored) {
            var notifTime = notification.at.getTime() / 1000;
            return stored.at === notifTime;
        }, function() {
            return false;
        });
    };

    /**
     * Notify notification click to observer. Only the observer with the same component as the notification will be notified.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#notifyClick
     * @param {Object} data Data received by the notification.
     */
    self.notifyClick = function(data) {
        var component = data.component;
        if (component) {
            var callback = observers[component];
            if (typeof callback == 'function') {
                callback(data);
            }
        }
    };

    /**
     * Register an observer to be notified when a notification belonging to a certain component is clicked.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#registerClick
     * @param {String} component  Component to listen notifications for.
     * @param {Function} callback Function to call with the data received by the notification.
     */
    self.registerClick = function(component, callback) {
        $log.debug("Register observer '"+component+"' for notification click.");
        observers[component] = callback;
    };

    /**
     * Remove a notification from triggered store.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#removeTriggered
     * @param {String} id Notification ID.
     * @return {Promise}  Promise resolved when it is removed.
     */
    self.removeTriggered = function(id) {
        return $mmApp.getDB().remove(mmCoreNotificationsTriggeredStore, id);
    };

    /**
     * Schedule a local notification.
     * @see https://github.com/katzer/cordova-plugin-local-notifications/wiki/04.-Scheduling
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#schedule
     * @param {Object} notification Notification to schedule. Its ID should be lower than 10000000 and it should be unique inside
     *                              its component and site. If the ID is higher than that number there might be collisions.
     * @param {String} component    Component triggering the notification. It is used to generate unique IDs.
     * @param {String} siteid       Site ID.
     * @return {Promise}            Promise resolved when the notification is scheduled.
     */
    self.schedule = function(notification, component, siteid) {
        return getUniqueNotificationId(notification.id, component, siteid).then(function(uniqueId) {
            notification.id = uniqueId;
            notification.data = notification.data || {};
            notification.data.component = component;
            notification.data.siteid = siteid;
            if (ionic.Platform.isAndroid()) {
                notification.icon = notification.icon || 'res://icon';
                notification.smallIcon = notification.smallIcon || 'res://icon';
                notification.led = notification.led || 'FF9900';
                notification.ledOnTime = notification.ledOnTime || 1000;
                notification.ledOffTime = notification.ledOffTime || 1000;
            }

            return self.isTriggered(notification).then(function(triggered) {
                if (!triggered) {
                    // Remove from triggered, since the notification could be in there with a different time.
                    self.removeTriggered(notification.id);
                    return $cordovaLocalNotification.schedule(notification);
                }
            });
        });
    };

    /**
     * Show an in app notification popover.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#showNotificationPopover
     * @param  {Object} notification Notification.
     * @return {Void}
     */
    self.showNotificationPopover = function(notification) {
        if (!scope || !scope.popover) {
            // Not initialized yet.
            return;
        }

        if (!notification || !notification.title || !notification.text) {
            // Invalid data.
            return;
        }

        var isShown = scope.popover.isShown();

        // Set the data.
        setData(isShown);

        if (isShown) {
            // Already shown, restart the hide timeout.
            $timeout.cancel(hidePopoverTimeout);
        } else {
            // Not shown, show the popover.
            scope.popover.show(document.querySelector('ion-nav-bar'));
        }

        hidePopoverTimeout = $timeout(function() {
            scope.popover.hide();
        }, 4000);

        function setData(isShown) {
            // Use a timeout to update the texts so the changes are applied to the view.
            $timeout(function() {
                if (isShown && scope.title == notification.title) {
                    if (scope.ids.indexOf(notification.id) != -1) {
                        // Notification already shown, don't show it.
                        return;
                    }

                    // Same title and the notification is shown, update it.
                    scope.texts.push(notification.text);
                    scope.ids.push(notification.id);
                    if (scope.texts.length > 3) {
                        scope.texts.shift();
                        scope.ids.shift();
                    }
                } else {
                    // Not shown or title is different, set new data.
                    scope.title = notification.title;
                    scope.texts = [notification.text];
                    scope.ids = [notification.id];
                }
            });
        }
    };

    /**
     * Function to call when a notification is triggered. Stores the notification so it's not scheduled again unless the
     * time is changed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#trigger
     * @param {Object} notification Triggered notification.
     * @return {Promise}            Promise resolved when stored, rejected otherwise.
     */
    self.trigger = function(notification) {
        if (ionic.Platform.isIOS() && ionic.Platform.version() == 10) {
            // In iOS10 show in app notification.
            self.showNotificationPopover(notification);
        }

        var id = parseInt(notification.id);
        if (!isNaN(id)) {
            return $mmApp.getDB().insert(mmCoreNotificationsTriggeredStore, {
                id: id,
                at: parseInt(notification.at)
            });
        } else {
            return $q.reject();
        }
    };

    return self;
})

.run(function($rootScope, $log, $mmLocalNotifications, $mmEvents, mmCoreEventSiteDeleted) {
    $log = $log.getInstance('$mmLocalNotifications');

    $rootScope.$on('$cordovaLocalNotification:trigger', function(e, notification, state) {
        $mmLocalNotifications.trigger(notification);
    });

    $rootScope.$on('$cordovaLocalNotification:click', function(e, notification, state) {
        if (notification && notification.data) {
            $log.debug('Notification clicked: '+notification.data);
            var data = JSON.parse(notification.data);
            $mmLocalNotifications.notifyClick(data);
        }
    });

    $mmEvents.on(mmCoreEventSiteDeleted, function(site) {
        if (site) {
            $mmLocalNotifications.cancelSiteNotifications(site.id);
        }
    });
});
