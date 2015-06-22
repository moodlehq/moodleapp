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

        var limitFrom = refresh ? 0: unreadCount;
        return $mmaNotifications.getUnreadNotifications(limitFrom, mmaNotificationsListLimit).then(function(unread) {
            if (refresh) {
                unreadCount = unread.length;
                readCount = 0;
                $scope.notifications = unread;
            } else {
                unreadCount += unread.length;
                $scope.notifications = $scope.notifications.concat(unread);
            }

            if (unread.length < mmaNotificationsListLimit) {
                // Limit not reached. Get read notifications until reach the limit.
                var readLimit = mmaNotificationsListLimit - unread.length;
                return $mmaNotifications.getReadNotifications(readCount, readLimit).then(function(read) {
                    readCount += read.length;
                    $scope.notifications = $scope.notifications.concat(read);
                    $scope.canLoadMore = read.length >= readLimit;
                }, function() {
                    if (unread.length == 0) {
                        $mmUtil.showErrorModal('mma.notifications.errorgetnotifications', true);
                    }
                });
            } else {
                $scope.canLoadMore = true;
            }
        }, function() {
            $mmUtil.showErrorModal('mma.notifications.errorgetnotifications', true);
            $scope.canLoadMore = false;
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
