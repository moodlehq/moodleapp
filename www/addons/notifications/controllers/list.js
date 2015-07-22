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
.controller('mmaNotificationsListCtrl', function($scope, $mmUtil, $mmaNotifications, mmaNotificationsListLimit) {

    var readCount = 0,
        unreadCount = 0;

    $scope.notifications = [];

    // Convenience function to get notifications. Get unread notifications first.
    function fetchNotifications(refresh) {

        if (refresh) {
            readCount = 0;
            unreadCount = 0;
        }

        return $mmaNotifications.getUnreadNotifications(unreadCount, mmaNotificationsListLimit).then(function(unread) {
            // Don't add the unread notifications to $scope.notifications yet. If there are no unread notifications
            // that causes that the "There are no notifications" message is shown in pull to refresh.
            unreadCount += unread.length;

            if (unread.length < mmaNotificationsListLimit) {
                // Limit not reached. Get read notifications until reach the limit.
                var readLimit = mmaNotificationsListLimit - unread.length;
                return $mmaNotifications.getReadNotifications(readCount, readLimit).then(function(read) {
                    readCount += read.length;
                    if (refresh) {
                        $scope.notifications = unread.concat(read);
                    } else {
                        $scope.notifications = $scope.notifications.concat(unread).concat(read);
                    }
                    $scope.canLoadMore = read.length >= readLimit;
                }, function(error) {
                    if (unread.length == 0) {
                        if (error) {
                            $mmUtil.showErrorModal(error);
                        } else {
                            $mmUtil.showErrorModal('mma.notifications.errorgetnotifications', true);
                        }
                        $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
                    }
                });
            } else {
                if (refresh) {
                    $scope.notifications = unread;
                } else {
                    $scope.notifications = $scope.notifications.concat(unread);
                }
                $scope.canLoadMore = true;
            }
        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.notifications.errorgetnotifications', true);
            }
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }
    fetchNotifications().finally(function() {
        $scope.notificationsLoaded = true;
    });

    $scope.refreshNotifications = function() {
        $mmaNotifications.invalidateNotificationsList().finally(function() {
            fetchNotifications(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    $scope.loadMoreNotifications = function(){
        fetchNotifications().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };
});
