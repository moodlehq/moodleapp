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
 * Forum discussion list controller.
 *
 * @module mm.addons.mod_forum
 * @ngdoc controller
 * @name mmaModForumDiscussionsCtrl
 */
.controller('mmaModForumDiscussionsCtrl', function($q, $scope, $stateParams, $mmaModForum, $mmCourse, $mmUtil, $mmGroups,
            $mmEvents, $ionicScrollDelegate, $ionicPlatform, mmUserProfileState, mmaModForumNewDiscussionEvent,
            mmaModForumReplyDiscussionEvent, $mmText, $translate) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        forum,
        page = 0,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModForumDiscussionsScroll'),
        shouldScrollTop = false,
        usesGroups = false,
        obsNewDisc,
        obsReply;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.courseid = courseid;
    $scope.userStateName = mmUserProfileState;
    $scope.isCreateEnabled = $mmaModForum.isCreateDiscussionEnabled();
    $scope.refreshIcon = 'spinner';

    // Convenience function to get forum data and discussions.
    function fetchForumDataAndDiscussions(refresh) {
        return $mmaModForum.getForum(courseid, module.id).then(function(forumdata) {
            forum = forumdata;

            $scope.title = forum.name || $scope.title;
            $scope.description = forum.intro || $scope.description;
            $scope.forum = forum;

            return $mmGroups.getActivityGroupMode(forum.cmid).then(function(mode) {
                usesGroups = mode === $mmGroups.SEPARATEGROUPS || mode === $mmGroups.VISIBLEGROUPS;
            }).finally(function() {
                return fetchDiscussions(refresh);
            });
        }, function(message) {
            if (!refresh) {
                // Get forum failed, retry without using cache since it might be a new activity.
                return refreshData();
            }

            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_forum.errorgetforum', true);
            }
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
            return $q.reject();
        });
    }

    // Convenience function to get forum discussions.
    function fetchDiscussions(refresh) {
        if (refresh) {
            page = 0;
        }

        return $mmaModForum.getDiscussions(forum.id, page).then(function(response) {
            var promise = usesGroups ?
                    $mmaModForum.formatDiscussionsGroups(forum.cmid, response.discussions) : $q.when(response.discussions);
            return promise.then(function(discussions) {
                if (page == 0) {
                    $scope.discussions = discussions;
                } else {
                    $scope.discussions = $scope.discussions.concat(discussions);
                }

                $scope.count = $scope.discussions.length;
                $scope.canLoadMore = response.canLoadMore;
                page++;

                preFetchDiscussionsPosts(discussions);
            });
        }, function(message) {
            $mmUtil.showErrorModal(message);
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
            return $q.reject();
        });
    }

    // Convenience function to prefetch the posts of each discussion, so they're available in offline mode.
    function preFetchDiscussionsPosts(discussions) {
        angular.forEach(discussions, function(discussion) {
            var discussionid = discussion.discussion;
            $mmaModForum.getDiscussionPosts(discussionid);
        });
    }

    // Refresh forum data and discussions list.
    function refreshData() {
        var promises = [];
        promises.push($mmaModForum.invalidateForumData(courseid));
        if (forum) {
            promises.push($mmaModForum.invalidateDiscussionsList(forum.id));
            promises.push($mmGroups.invalidateActivityGroupMode(forum.cmid));
        }
        return $q.all(promises).finally(function() {
            return fetchForumDataAndDiscussions(true);
        });
    }

    // Function called when we receive an event of new discussion or reply to discussion.
    function eventReceived(data) {
        if ((forum && forum.id === data.forumid) || data.cmid === module.id) {
            if ($ionicPlatform.isTablet()) {
                scrollView.scrollTop();
            } else {
                // We can't scroll top inmediately because the scroll is not seen.
                shouldScrollTop = true;
            }
            $scope.discussionsLoaded = false;
            $scope.refreshIcon = 'spinner';
            refreshData().finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.discussionsLoaded = true;
            });
            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        }
    }

    fetchForumDataAndDiscussions().then(function() {
        $mmaModForum.logView(forum.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.refreshIcon = 'ion-refresh';
        $scope.discussionsLoaded = true;
    });

    // Load more discussions.
    $scope.loadMoreDiscussions = function() {
        fetchDiscussions().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    // Pull to refresh.
    $scope.refreshDiscussions = function() {
        if ($scope.discussionsLoaded) {
            $scope.refreshIcon = 'spinner';
            refreshData().finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description);
    };

    // Listen for discussions added. When a discussion is added, we reload the data.
    obsNewDisc = $mmEvents.on(mmaModForumNewDiscussionEvent, eventReceived);
    obsReply = $mmEvents.on(mmaModForumReplyDiscussionEvent, eventReceived);

    // Scroll top if needed.
    $scope.$on('$ionicView.enter', function() {
        if (shouldScrollTop) {
            shouldScrollTop = false;
            scrollView.scrollTop();
        }
    });

    $scope.$on('$destroy', function(){
        if (obsNewDisc && obsNewDisc.off) {
            obsNewDisc.off();
        }
        if (obsReply && obsReply.off) {
            obsReply.off();
        }
    });
});
