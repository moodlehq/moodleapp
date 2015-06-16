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
.controller('mmaModForumDiscussionsCtrl', function($scope, $stateParams, $mmaModForum, $mmSite, $mmUtil) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        forum,
        page = 0;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleurl = module.url;
    $scope.courseid = courseid;

    // Convenience function to get forum data and discussions.
    function fetchForumDataAndDiscussions(refresh) {
        return $mmaModForum.getForum(courseid, module.id).then(function(forumdata) {
            if (forumdata) {
                forum = forumdata;

                $scope.title = forum.name;
                $scope.description = forum.intro;
                $scope.forum = forum;

                return fetchDiscussions(refresh);
            } else {
                $mmUtil.showErrorModal('mma.mod_forum.errorgetforum', true);
            }
        });
    }

    // Convenience function to get forum discussions.
    function fetchDiscussions(refresh) {
        if (refresh) {
            page = 0;
        }

        return $mmaModForum.getDiscussions(forum.id, page).then(function(response) {
            if (page == 0) {
                $scope.discussions = response.discussions;
            } else {
                $scope.discussions = $scope.discussions.concat(response.discussions);
            }

            $scope.count = $scope.discussions.length;
            $scope.canLoadMore = response.canLoadMore;
            page++;

            preFetchDiscussionsPosts(response.discussions);

        }, function(message) {
            $mmUtil.showErrorModal(message);
        });
    }

    // Convenience function to prefetch the posts of each discussion, so they're available in offline mode.
    function preFetchDiscussionsPosts(discussions) {
        angular.forEach(discussions, function(discussion) {
            var discussionid = discussion.discussion;
            $mmaModForum.getDiscussionPosts(discussionid);
        });
    }

    fetchForumDataAndDiscussions().then(function() {
        // Add log in Moodle.
        $mmSite.write('mod_forum_view_forum', {
            forumid: forum.id
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
        $mmaModForum.invalidateDiscussionsList(courseid, forum.id).finally(function() {
            fetchForumDataAndDiscussions(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
