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
            $mmEvents, $ionicScrollDelegate, $ionicPlatform, mmUserProfileState, mmaModForumNewDiscussionEvent) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        forum,
        page = 0,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModForumDiscussionsScroll'),
        shouldScrollTop = false,
        usesGroups = false;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleurl = module.url;
    $scope.courseid = courseid;
    $scope.userStateName = mmUserProfileState;
    $scope.isCreateEnabled = $mmaModForum.isCreateDiscussionEnabled();

    // Convenience function to get forum data and discussions.
    function fetchForumDataAndDiscussions(refresh) {
        return $mmaModForum.getForum(courseid, module.id).then(function(forumdata) {
            if (forumdata) {
                forum = forumdata;

                $scope.title = forum.name || $scope.title;
                $scope.description = forum.intro || $scope.description;
                $scope.forum = forum;

                return $mmGroups.getActivityGroupMode(forum.cmid).then(function(mode) {
                    usesGroups = mode === $mmGroups.SEPARATEGROUPS || mode === $mmGroups.VISIBLEGROUPS;
                }).finally(function() {
                    return fetchDiscussions(refresh);
                });
            } else {
                $mmUtil.showErrorModal('mma.mod_forum.errorgetforum', true);
                return $q.reject();
            }
        }, function(message) {
            $mmUtil.showErrorModal(message);
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
        if (forum) {
            promises.push($mmaModForum.invalidateDiscussionsList(courseid, forum.id));
            promises.push($mmGroups.invalidateActivityGroupMode(forum.cmid));
        }
        return $q.all(promises).finally(function() {
            return fetchForumDataAndDiscussions(true);
        });
    }

    fetchForumDataAndDiscussions().then(function() {
        $mmaModForum.logView(forum.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
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
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Listen for discussions added. When a discussion is added, we reload the data.
    var obsNewDisc = $mmEvents.on(mmaModForumNewDiscussionEvent, function(data) {
        if ((forum && forum.id === data.forumid) || data.cmid === module.id) {
            if ($ionicPlatform.isTablet()) {
                scrollView.scrollTop();
            } else {
                // We can't scroll top inmediately because the scroll is not seen.
                shouldScrollTop = true;
            }
            $scope.discussionsLoaded = false;
            refreshData().finally(function() {
                $scope.discussionsLoaded = true;
            });
        }
    });

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
    });
});
