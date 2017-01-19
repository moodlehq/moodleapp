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
            mmaModForumAutomSyncedEvent, mmaModForumManualSyncedEvent, $mmApp, $ionicPlatform, mmCoreEventOnlineStatusChanged) {

    var discussionId = $stateParams.discussionid,
        courseid = $stateParams.cid,
        forumId = $stateParams.forumid,
        cmid = $stateParams.cmid,
        scrollView,
        syncObserver, syncManualObserver, onlineObserver;

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, leaveView);

    $scope.discussionId = discussionId;
    $scope.trackPosts = $stateParams.trackposts;
    $scope.component = mmaModForumComponent;
    $scope.discussionStr = $translate.instant('discussion');
    $scope.componentId = cmid;
    $scope.courseid = courseid;
    $scope.refreshPostsIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.newpost = {
        replyingto: undefined,
        editing: undefined,
        subject: '',
        text: '',
        isEditing: false
    };
    $scope.sort = {
        icon: 'ion-arrow-up-c',
        direction: 'ASC',
        text: $translate.instant('mma.mod_forum.sortnewestfirst')
    };
    $scope.nested = {
        icon: 'ion-arrow-swap',
        isnested: false,
        text: $translate.instant('mma.mod_forum.nestposts')
    };
    // Receive locked as param since it's returned by getDiscussions. This means that PullToRefresh won't update this value.
    $scope.locked = !!$stateParams.locked;

    $scope.originalData = {};

    // Convenience function to get the forum.
    function fetchForum() {
        if (courseid && cmid) {
            return $mmaModForum.getForum(courseid, cmid);
        } else if (courseid && forumId) {
            return $mmaModForum.getForumById(courseid, forumId);
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
                return $mmaModForumOffline.hasDiscussionReplies(discussionId).then(function(hasOffline) {
                    $scope.postHasOffline = hasOffline;

                    if (hasOffline) {
                        return $mmaModForumOffline.getDiscussionReplies(discussionId).then(function(replies) {
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
                                if (!courseid) {
                                    courseid = offlineReply.courseid;
                                    $scope.courseid = courseid;
                                }

                                convertPromises.push($mmaModForumOffline.convertOfflineReplyToOnline(offlineReply)
                                        .then(function(reply) {
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
                    }
                });
            });
        }).then(function() {
            var posts = offlineReplies.concat(onlinePosts);
            $scope.discussion = $mmaModForum.extractStartingPost(posts);

            // If $scope.nested.isnested is true, normal sorting is disabled and nested posts will be displayed.
            if ($scope.nested.isnested) {
                // Sort first by creation date to make format tree work.
                posts = $mmaModForum.sortDiscussionPosts(posts, 'ASC');
                $scope.posts = $mmUtil.formatTree(posts, 'parent', 'id', $scope.discussion.id);
            } else {
                // Set default reply subject.
                $scope.posts = $mmaModForum.sortDiscussionPosts(posts, $scope.sort.direction);
            }
            $scope.defaultSubject = $translate.instant('mma.mod_forum.re') + ' ' + $scope.discussion.subject;
            $scope.newpost.subject = $scope.defaultSubject;

            // Now try to get the forum.
            return fetchForum().then(function(forum) {
                if ($scope.discussion.userfullname && $scope.discussion.parent == 0 && forum.type == 'single') {
                    // Hide author for first post and type single.
                    $scope.discussion.userfullname = null;
                }

                forumId = forum.id;
                cmid = forum.cmid;
                $scope.componentId = cmid;
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
    $scope.changeSort = function(init) {
        $scope.discussionLoaded = false;
        scrollTop();
        // Set $scope.nested attributes to default.
        $scope.nested.icon = 'ion-arrow-swap';
        $scope.nested.isnested = false;
        $scope.nested.text = $translate.instant('mma.mod_forum.nestposts');

        if (!init) {
            $scope.sort.direction = $scope.sort.direction == 'ASC' ? 'DESC' : 'ASC';
        }

        return fetchPosts(init).then(function() {
            if ($scope.sort.direction == 'ASC') {
                $scope.sort.icon = 'ion-arrow-up-c';
                $scope.sort.text = $translate.instant('mma.mod_forum.sortnewestfirst');
            } else {
                $scope.sort.icon = 'ion-arrow-down-c';
                $scope.sort.text = $translate.instant('mma.mod_forum.sortoldestfirst');
            }
        });
    };

    // Function to change nested posts.
    $scope.nestPosts = function(init) {
        $scope.discussionLoaded = false;
        scrollTop();
        $scope.nested.isnested = !$scope.nested.isnested;

        return fetchPosts(init).then(function() {
            if ($scope.nested.isnested) {
                $scope.nested.icon = 'ion-navicon';
                $scope.nested.text = $translate.instant('mma.mod_forum.flatposts');
            } else {
                $scope.nested.icon = 'ion-arrow-swap';
                $scope.nested.text = $translate.instant('mma.mod_forum.nestposts');
            }
        });
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

    $scope.changeSort(true).then(function() {
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
        if (!$scope.originalData || typeof $scope.originalData.subject == 'undefined' ||
                ($scope.originalData.subject == $scope.newpost.subject && $scope.originalData.text == $scope.newpost.text)) {
            return $q.when();
        } else {
            // Show confirmation if some data has been modified.
            return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModForumPostsScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // New post added.
    $scope.postListChanged = function() {
        $scope.newpost.replyingto = undefined;
        $scope.newpost.editing = undefined;
        $scope.newpost.subject = $scope.defaultSubject;
        $scope.newpost.text = '';
        $scope.newpost.isEditing = false;

        notifyPostListChanged();

        $scope.discussionLoaded = false;
        refreshPosts(false).finally(function() {
            $scope.discussionLoaded = true;
        });

        // Update original data.
        $mmUtil.copyProperties($scope.newpost, $scope.originalData);
    };

    $scope.$on('$destroy', function(){
        syncObserver && syncObserver.off && syncObserver.off();
        syncManualObserver && syncManualObserver.off && syncManualObserver.off();
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
