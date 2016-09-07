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

angular.module('mm.addons.mod_forum')

/**
 * Forum discussion controller.
 *
 * @module mm.addons.mod_forum
 * @ngdoc controller
 * @name mmaModForumDiscussionCtrl
 */
.controller('mmaModForumDiscussionCtrl', function($q, $scope, $stateParams, $mmaModForum, $mmSite, $mmUtil, $translate,
            $ionicScrollDelegate, $mmEvents, mmaModForumComponent, mmaModForumReplyDiscussionEvent) {

    var discussionid = $stateParams.discussionid,
        courseid = $stateParams.cid,
        forumId = $stateParams.forumid,
        cmid = $stateParams.cmid,
        scrollView;

    $scope.component = mmaModForumComponent;
    $scope.componentId = cmid;
    $scope.courseid = courseid;
    $scope.refreshPostsIcon = 'spinner';
    $scope.newpost = {
        replyingto: undefined,
        subject: '',
        text: ''
    };
    $scope.sort = {
        icon: 'ion-arrow-up-c',
        direction: 'DESC',
        text: $translate.instant('mma.mod_forum.sortnewestfirst')
    };

    // Convenience function to get forum discussions.
    function fetchPosts() {
        return $mmaModForum.getDiscussionPosts(discussionid).then(function(posts) {
            posts = $mmaModForum.sortDiscussionPosts(posts, $scope.sort.direction);

            $scope.discussion = $mmaModForum.extractStartingPost(posts);
            $scope.posts = posts;

            // Set default reply subject.
            return $translate('mma.mod_forum.re').then(function(strReplyPrefix) {
                $scope.defaultSubject = strReplyPrefix + ' ' + $scope.discussion.subject;
                $scope.newpost.subject = $scope.defaultSubject;
            });
        }, function(message) {
            $mmUtil.showErrorModal(message);
            return $q.reject();
        }).finally(function() {
            $scope.discussionLoaded = true;
            $scope.refreshPostsIcon = 'ion-refresh';
        });
    }

    // Function to change posts sorting.
    $scope.changeSort = function(init) {
        $scope.discussionLoaded = false;

        if (!init) {
            $scope.sort.direction = $scope.sort.direction == 'DESC' ? 'ASC' : 'DESC';
        } else {
            $scope.sort.direction = 'DESC';
        }

        return fetchPosts().then(function() {
            if ($scope.sort.direction == 'DESC') {
                $scope.sort.icon = 'ion-arrow-up-c';
                $scope.sort.text = $translate.instant('mma.mod_forum.sortnewestfirst');
            } else {
                $scope.sort.icon = 'ion-arrow-down-c';
                $scope.sort.text = $translate.instant('mma.mod_forum.sortoldestfirst');
            }
        });
    };

    // Refresh posts.
    function refreshPosts() {
        if ($scope.discussionLoaded) {
            $scope.discussionLoaded = false;
            $scope.refreshPostsIcon = 'spinner';
            return $mmaModForum.invalidateDiscussionPosts(discussionid).finally(function() {
                return fetchPosts();
            });
        }
    }

    // Trigger an event to notify a new reply.
    function notifyNewReply() {
        var data = {
            forumid: forumId,
            discussionid: discussionid,
            cmid: cmid
        };
        $mmEvents.trigger(mmaModForumReplyDiscussionEvent, data);
    }

    $scope.changeSort(true).then(function() {
        // Add log in Moodle.
        $mmSite.write('mod_forum_view_forum_discussion', {
            discussionid: discussionid
        });
    });

    // Pull to refresh.
    $scope.refreshPosts = function() {
        return refreshPosts().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // New post added.
    $scope.newPostAdded = function() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModForumPostsScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();

        $scope.newpost.replyingto = undefined;
        $scope.newpost.subject = $scope.defaultSubject;
        $scope.newpost.text = '';

        notifyNewReply();

        $scope.discussionLoaded = false;
        refreshPosts().finally(function() {
            $scope.discussionLoaded = true;
        });
    };
});
