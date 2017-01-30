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

angular.module('mm.addons.notifications')

/**
 * Controller to handle notification list.
 *
 * @module mm.addons.notifications
 * @ngdoc controller
 * @name mmaNotificationsListCtrl
 */
.controller('mmaNotificationsListCtrl', function($scope, $mmUtil, $mmaNotifications, mmaNotificationsListLimit, $mmAddonManager,
            mmUserProfileState, $q, $mmEvents, $mmSite, mmaNotificationsReadChangedEvent, mmaNotificationsReadCronEvent, $state) {

    var readCount = 0,
        unreadCount = 0,
        siteId = $mmSite.getId(),
        $mmPushNotificationsDelegate = $mmAddonManager.get('$mmPushNotificationsDelegate'),
        cronObserver;

    $scope.notifications = [];
    $scope.userStateName = mmUserProfileState;

    // Convenience function to get notifications. Get unread notifications first.
    function fetchNotifications(refresh) {

        if (refresh) {
            readCount = 0;
            unreadCount = 0;
        }

        return $mmaNotifications.getUnreadNotifications(unreadCount, mmaNotificationsListLimit).then(function(unread) {
            var promise;
            // Don't add the unread notifications to $scope.notifications yet. If there are no unread notifications
            // that causes that the "There are no notifications" message is shown in pull to refresh.
            unreadCount += unread.length;

            if (unread.length < mmaNotificationsListLimit) {
                // Limit not reached. Get read notifications until reach the limit.
                var readLimit = mmaNotificationsListLimit - unread.length;
                promise = $mmaNotifications.getReadNotifications(readCount, readLimit).then(function(read) {
                    readCount += read.length;
                    if (refresh) {
                        $scope.notifications = unread.concat(read);
                    } else {
                        $scope.notifications = $scope.notifications.concat(unread).concat(read);
                    }
                    $scope.canLoadMore = read.length >= readLimit;
                }, function(error) {
                    if (unread.length == 0) {
                        $mmUtil.showErrorModalDefault(error, 'mma.notifications.errorgetnotifications', true);
                        $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
                    }
                });
            } else {
                promise = $q.when();
                if (refresh) {
                    $scope.notifications = unread;
                } else {
                    $scope.notifications = $scope.notifications.concat(unread);
                }
                $scope.canLoadMore = true;
            }

            return promise.then(function() {
                // Mark retrieved notifications as read if they are not.
                markNotificationsAsRead(unread);
            });
        }, function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.notifications.errorgetnotifications', true);
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }

    fetchNotifications().finally(function() {
        $scope.notificationsLoaded = true;
    });

    cronObserver = $mmEvents.on(mmaNotificationsReadCronEvent, function(data) {
        if ($state.current.name == 'site.notifications' && data && (data.siteid == siteId || !data.siteid)) {
            refreshData();
        }
    });

    // If a message push notification is received, refresh the view.
    if ($mmPushNotificationsDelegate) {
        $mmPushNotificationsDelegate.registerReceiveHandler('mmaNotifications:discussions', function(notification) {
            if ($state.current.name == 'site.notifications' && $mmUtil.isTrueOrOne(notification.notif) &&
                    notification.site == siteId) {
                // New notification received. If it's from current site, refresh the data.
                refreshData();
            }
        });
    }

    // Refresh when entering again.
    var skip = true;
    $scope.$on('$ionicView.enter', function() {
        if (skip) {
            skip = false;
            return;
        }
        $scope.notificationsLoaded = false;
        refreshData().finally(function() {
            $scope.notificationsLoaded = true;
        });
    });

    // Mark notifications as read.
    function markNotificationsAsRead(notifications) {
        // Only mark as read if we are in the state.
        if (notifications.length > 0) {
            var promises = [];

            angular.forEach(notifications, function(notification) {
                // If the notification is unread, call $mmaNotifications.markNotificationRead.
                promises.push($mmaNotifications.markNotificationRead(notification.id));
            });

            $q.all(promises).finally(function() {
                $mmaNotifications.invalidateNotificationsList().finally(function() {
                    $mmEvents.trigger(mmaNotificationsReadChangedEvent, {siteid: siteId});
                });
            });
        }
    }

    function refreshData() {
        return $mmaNotifications.invalidateNotificationsList().finally(function() {
            return fetchNotifications(true);
        });
    }

    $scope.refreshNotifications = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.loadMoreNotifications = function(){
        fetchNotifications().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.$on('$destroy', function() {
        cronObserver && cronObserver.off && cronObserver.off();

        if ($mmPushNotificationsDelegate) {
            $mmPushNotificationsDelegate.unregisterReceiveHandler('mmaNotifications:discussions');
        }
    });
});
