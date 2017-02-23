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
.controller('mmaModForumDiscussionCtrl', function($q, $scope, $stateParams, $mmaModForum, $mmSite, $mmUtil, $translate, $mmEvents,
            $ionicScrollDelegate, mmaModForumComponent, mmaModForumReplyDiscussionEvent, $mmaModForumOffline, $mmaModForumSync,
            mmaModForumAutomSyncedEvent, mmaModForumManualSyncedEvent, $mmApp, $ionicPlatform, mmCoreEventOnlineStatusChanged,
            $mmaModForumHelper, $mmFileUploaderHelper) {

    var discussionId = $stateParams.discussionid,
        courseId = $stateParams.cid,
        forumId = $stateParams.forumid,
        cmid = $stateParams.cmid,
        scrollView,
        syncObserver, syncManualObserver, onlineObserver;

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, leaveView);

    // Possible sort types.
    $scope.sortTypeFlatNewest = 'flat-newest';
    $scope.sortTypeFlatOldest = 'flat-oldest';
    $scope.sortTypeNested = 'nested';

    $scope.discussionId = discussionId;
    $scope.trackPosts = $stateParams.trackposts;
    $scope.component = mmaModForumComponent;
    $scope.discussionStr = $translate.instant('discussion');
    $scope.componentId = cmid;
    $scope.courseId = courseId;
    $scope.refreshPostsIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.newPost = {
        replyingto: undefined,
        editing: undefined,
        subject: '',
        text: '',
        isEditing: false,
        files: []
    };
    $scope.sort = $scope.sortTypeFlatOldest; // By default, flat with oldest first.

    // Receive locked as param since it's returned by getDiscussions. This means that PullToRefresh won't update this value.
    $scope.locked = !!$stateParams.locked;

    $scope.originalData = {};

    // Convenience function to get the forum.
    function fetchForum() {
        if (courseId && cmid) {
            return $mmaModForum.getForum(courseId, cmid);
        } else if (courseId && forumId) {
            return $mmaModForum.getForumById(courseId, forumId);
        } else {
            // Cannot get the forum.
            return $q.reject();
        }
    }

    // Convenience function to get forum discussions.
    function fetchPosts(sync, showErrors) {
        var syncPromise,
            onlinePosts = [],
            offlineReplies = [];

        $scope.isOnline = $mmApp.isOnline();
        $scope.isTablet = $ionicPlatform.isTablet();
        if (sync) {
            // Try to synchronize the forum.
            syncPromise = syncDiscussion(showErrors).catch(function() {
                // Ignore errors.
            });
        } else {
            syncPromise = $q.when();
        }

        return syncPromise.then(function() {
            return $mmaModForum.getDiscussionPosts(discussionId).then(function(posts) {
                onlinePosts = posts;

            }).then(function() {
                // Check if there are responses stored in offline.
                return $mmaModForumOffline.getDiscussionReplies(discussionId).then(function(replies) {
                    $scope.postHasOffline = !!replies.length;

                    var convertPromises = [];

                    // Index posts to allow quick access.
                    var posts = {};
                    angular.forEach(onlinePosts, function(post) {
                        posts[post.id] = post;
                    });

                    angular.forEach(replies, function(offlineReply) {
                        // If we don't have forumId and courseId, get it from the post.
                        if (!forumId) {
                            forumId = offlineReply.forumid;
                        }
                        if (!courseId) {
                            courseId = offlineReply.courseid;
                            $scope.courseId = courseId;
                        }

                        convertPromises.push($mmaModForumHelper.convertOfflineReplyToOnline(offlineReply).then(function(reply) {
                            offlineReplies.push(reply);

                            // Disable reply of the parent. Reply in offline to the same post is not allowed, edit instead.
                            posts[reply.parent].canreply = false;
                        }));
                    });

                    return $q.all(convertPromises).then(function() {
                        // Convert back to array.
                        onlinePosts = Object.keys(posts).map(function (key) {return posts[key];});
                    });
                });
            });
        }).then(function() {
            var posts = offlineReplies.concat(onlinePosts);
            $scope.discussion = $mmaModForum.extractStartingPost(posts);

            // If sort type is nested, normal sorting is disabled and nested posts will be displayed.
            if ($scope.sort == $scope.sortTypeNested) {
                // Sort first by creation date to make format tree work.
                posts = $mmaModForum.sortDiscussionPosts(posts, 'ASC');
                $scope.posts = $mmUtil.formatTree(posts, 'parent', 'id', $scope.discussion.id);
            } else {
                // Set default reply subject.
                var direction = $scope.sort == $scope.sortTypeFlatNewest ? 'DESC' : 'ASC';
                $scope.posts = $mmaModForum.sortDiscussionPosts(posts, direction);
            }
            $scope.defaultSubject = $translate.instant('mma.mod_forum.re') + ' ' + $scope.discussion.subject;
            $scope.newPost.subject = $scope.defaultSubject;

            // Now try to get the forum.
            return fetchForum().then(function(forum) {
                if ($scope.discussion.userfullname && $scope.discussion.parent == 0 && forum.type == 'single') {
                    // Hide author for first post and type single.
                    $scope.discussion.userfullname = null;
                }

                forumId = forum.id;
                cmid = forum.cmid;
                $scope.componentId = cmid;
                $scope.forum = forum;
            }).catch(function() {
                // Ignore errors.
            });
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
            return $q.reject();
        }).finally(function() {
            $scope.discussionLoaded = true;
            $scope.refreshPostsIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
        });
    }

    // Function to change posts sorting.
    $scope.changeSort = function(type) {
        $scope.discussionLoaded = false;
        scrollTop();

        $scope.sort = type;
        return fetchPosts();
    };

    // Tries to synchronize the posts discussion.
    function syncDiscussion(showErrors) {
        return $mmaModForumSync.syncDiscussionReplies(discussionId).then(function(result) {
            if (result.warnings && result.warnings.length) {
                $mmUtil.showErrorModal(result.warnings[0]);
            }

            if (result && result.updated) {
                // Sync successful, send event.
                $mmEvents.trigger(mmaModForumManualSyncedEvent, {
                    siteid: $mmSite.getId(),
                    forumid: forumId,
                    userid: $mmSite.getUserId(),
                    warnings: result.warnings
                });
            }

            return result.updated;
        }).catch(function(error) {
            if (showErrors) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mm.core.errorsync', true);
                }
            }
            return $q.reject();
        });
    }

    // Refresh posts.
    function refreshPosts(sync, showErrors) {
        scrollTop();
        $scope.refreshPostsIcon = 'spinner';
        $scope.syncIcon = 'spinner';
        return $mmaModForum.invalidateDiscussionPosts(discussionId).finally(function() {
            return fetchPosts(sync, showErrors);
        });
    }

    // Trigger an event to notify a new reply.
    function notifyPostListChanged() {
        var data = {
            forumid: forumId,
            discussionid: discussionId,
            cmid: cmid
        };
        $mmEvents.trigger(mmaModForumReplyDiscussionEvent, data);
    }

    fetchPosts(true).then(function() {
        // Add log in Moodle.
        $mmaModForum.logDiscussionView(discussionId);
    });

    // Pull to refresh.
    $scope.refreshPosts = function(showErrors) {
        if ($scope.discussionLoaded) {
            return refreshPosts(true, showErrors).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Refresh data if this forum discussion is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModForumAutomSyncedEvent, function(data) {
        if (data && data.siteid == $mmSite.getId() && data.forumid == forumId && data.userid == $mmSite.getUserId() &&
                discussionId == data.discussionid) {
            // Refresh the data.
            $scope.discussionLoaded = false;
            refreshPosts(false);
        }
    });

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh data if this forum discussion is synchronized from discussions list.
    syncManualObserver = $mmEvents.on(mmaModForumManualSyncedEvent, function(data) {
        if (data && data.siteid == $mmSite.getId() && data.forumid == forumId && data.userid == $mmSite.getUserId()) {
            // Refresh the data.
            $scope.discussionLoaded = false;
            refreshPosts(false);
        }
    });

    // Ask to confirm if there are changes.
    function leaveView() {
        var promise;

        if (!$mmaModForumHelper.hasPostDataChanged($scope.newPost, $scope.originalData)) {
            promise = $q.when();
        } else {
            // Show confirmation if some data has been modified.
            promise = $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }

        return promise.then(function() {
            // Delete the local files from the tmp folder.
            $mmFileUploaderHelper.clearTmpFiles($scope.newPost.files);
        });
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModForumPostsScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // New post added.
    $scope.postListChanged = function() {
        notifyPostListChanged();

        $scope.discussionLoaded = false;
        refreshPosts(false).finally(function() {
            $scope.discussionLoaded = true;
        });
    };

    $scope.$on('$destroy', function(){
        syncObserver && syncObserver.off && syncObserver.off();
        syncManualObserver && syncManualObserver.off && syncManualObserver.off();
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
