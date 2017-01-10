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
 * Add new discussion controller.
 *
 * @module mm.addons.mod_forum
 * @ngdoc controller
 * @name mmaModForumNewDiscussionCtrl
 */
.controller('mmaModForumNewDiscussionCtrl', function($scope, $stateParams, $mmGroups, $q, $mmaModForum, $mmEvents, $ionicPlatform,
            $mmUtil, $ionicHistory, $translate, mmaModForumNewDiscussionEvent, $mmaModForumOffline, $mmSite, mmaModForumComponent,
            mmaModForumAutomSyncedEvent, $mmSyncBlock, $mmaModForumSync) {

    var courseid = $stateParams.cid,
        forumid = $stateParams.forumid,
        cmid = $stateParams.cmid,
        timecreated = $stateParams.timecreated,
        forumName,
        syncObserver,
        syncId;

    $scope.newdiscussion = {
        subject: '',
        text: '',
        subscribe: true
    };

    $scope.hasOffline = false;

    // Fetch if forum uses groups and the groups it uses.
    function fetchDiscussionData(refresh) {
        return $mmGroups.getActivityGroupMode(cmid).then(function(mode) {
            var promises = [];

            if (mode === $mmGroups.SEPARATEGROUPS || mode === $mmGroups.VISIBLEGROUPS) {
                promises.push($mmGroups.getActivityAllowedGroups(cmid).then(function(forumgroups) {
                    var promise;
                    if (mode === $mmGroups.VISIBLEGROUPS) {
                        // We need to check which of the returned groups the user can post to.
                        promise = validateVisibleGroups(forumgroups, refresh);
                    } else {
                        // WS already filters groups, no need to do it ourselves.
                        promise = $q.when(forumgroups);
                    }

                    return promise.then(function(forumgroups) {
                        if (forumgroups.length > 0) {
                            $scope.groups = forumgroups;
                            // Do not override groupid.
                            $scope.newdiscussion.groupid = $scope.newdiscussion.groupid ?
                                $scope.newdiscussion.groupid : forumgroups[0].id;
                            $scope.showGroups = true;
                        } else {
                            var message = mode === $mmGroups.SEPARATEGROUPS ?
                                                'mma.mod_forum.cannotadddiscussionall' : 'mma.mod_forum.cannotadddiscussion';
                            return $q.reject($translate.instant(message));
                        }
                    });
                }));
            } else {
                $scope.showGroups = false;
            }

            // Get forum name to send offline discussions.
            promises.push($mmaModForum.getForum(courseid, cmid).then(function(forum) {
                forumName = forum.name;
            }).catch(function() {
                // Ignore errors.
            }));

            // If editing a discussion, get offline data.
            if (timecreated && !refresh) {
                syncId = $mmaModForumSync.getForumSyncId(forumid);
                promises.push($mmaModForumSync.waitForSync(syncId).then(function() {
                    // Do not block if the scope is already destroyed.
                    if (!$scope.$$destroyed) {
                        $mmSyncBlock.blockOperation(mmaModForumComponent, syncId);
                    }
                    return $mmaModForumOffline.getNewDiscussion(forumid, timecreated).then(function(discussion) {
                        $scope.hasOffline = true;
                        $scope.newdiscussion.groupid = discussion.groupid ? discussion.groupid : $scope.newdiscussion.groupid;
                        $scope.newdiscussion.subject = discussion.subject;
                        $scope.newdiscussion.text = discussion.message;
                        $scope.newdiscussion.subscribe = discussion.subscribe;
                    });
                }));
            }
            return $q.all(promises);
        }).then(function(message) {
            $scope.showForm = true;
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_forum.errorgetgroups', true);
            }
            $scope.showForm = false;
            return $q.reject();
        });
    }

    // Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
    function validateVisibleGroups(forumgroups, refresh) {
        if ($mmaModForum.isCanAddDiscussionAvailable()) {
            // Use the canAddDiscussion function to filter the groups.
            // We first check if the user can post to all the groups.
            return $mmaModForum.canAddDiscussionToAll(forumid).catch(function() {
                // The call failed, let's assume he can't.
                return false;
            }).then(function(canAdd) {
                if (canAdd) {
                    // The user can post to all groups, return them all.
                    return forumgroups;
                } else {
                    // The user can't post to all groups, let's check which groups he can post to.
                    var promises = [],
                        filtered = [];

                    angular.forEach(forumgroups, function(group) {
                        promises.push($mmaModForum.canAddDiscussion(forumid, group.id).catch(function() {
                            // The call failed, let's return true so the group is shown. If the user can't post to
                            // it an error will be shown when he tries to add the discussion.
                            return true;
                        }).then(function(canAdd) {
                            if (canAdd) {
                                filtered.push(group);
                            }
                        }));
                    });

                    return $q.all(promises).then(function() {
                        return filtered;
                    });
                }
            });
        } else {
            // We can't check it using WS. We'll get the groups the user belongs to and use them to
            // filter the groups to post.
            return $mmGroups.getUserGroupsInCourse(courseid, refresh).then(function(usergroups) {
                if (usergroups.length === 0) {
                    // User doesn't belong to any group, probably a teacher. Let's return all groups,
                    // if the user can't post to some of them it will be filtered by add discussion WS.
                    return forumgroups;
                }
                return filterGroups(forumgroups, usergroups);
            });
        }
    }

    // Filter forumgroups, returning only those that are inside usergroups.
    function filterGroups(forumgroups, usergroups) {
        var filtered = [],
            usergroupsids = usergroups.map(function(g) {
                return g.id;
            });

        angular.forEach(forumgroups, function(fg) {
            if (usergroupsids.indexOf(fg.id) > -1) {
                filtered.push(fg);
            }
        });

        return filtered;
    }

    fetchDiscussionData().finally(function() {
        $scope.groupsLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshGroups = function() {
        var p1 = $mmGroups.invalidateActivityGroupMode(cmid),
            p2 = $mmGroups.invalidateActivityAllowedGroups(cmid),
            p3 = $mmaModForum.invalidateCanAddDiscussion(forumid);

        $q.all([p1, p2, p3]).finally(function() {
            fetchDiscussionData(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Convenience function to update or return to discussions depending on device.
    function returnToDiscussions(discussionid) {
        var data = {
            forumid: forumid,
            cmid: cmid
        };

        if (discussionid) {
            data.discussionid = discussionid;
        }
        $mmEvents.trigger(mmaModForumNewDiscussionEvent, data);

        if ($ionicPlatform.isTablet()) {
            // Empty form.
            $scope.hasOffline = false;
            $scope.newdiscussion.subject = '';
            $scope.newdiscussion.text = '';
        } else {
            // Go back to discussions list.
            $ionicHistory.goBack();
        }
    }

    // Add a new discussion.
    $scope.add = function() {
        var subject = $scope.newdiscussion.subject,
            message = $scope.newdiscussion.text,
            subscribe = $scope.newdiscussion.subscribe,
            groupid = $scope.newdiscussion.groupid;

        if (!subject) {
            $mmUtil.showErrorModal('mma.mod_forum.erroremptysubject', true);
            return;
        }
        if (!message) {
            $mmUtil.showErrorModal('mma.mod_forum.erroremptymessage', true);
            return;
        }

        // Check if rich text editor is enabled or not.
        $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
            if (!enabled) {
                // Rich text editor not enabled, add some HTML to the message if needed.
                if (message.indexOf('<p>') == -1) {
                    // Wrap the text in <p> tags.
                    message = '<p>' + message + '</p>';
                }
                message = message.replace(/\n/g, '<br>');
            }

            return $mmaModForum.addNewDiscussion(forumid, forumName, courseid, subject, message, subscribe, groupid, undefined,
                timecreated);
        }).then(function(discussionid) {
            returnToDiscussions(discussionid);
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_forum.cannotcreatediscussion', true);
            }
        });
    };

    if (timecreated) {
        // Refresh data if this forum is synchronized automatically. Only if we're editing one.
        syncObserver = $mmEvents.on(mmaModForumAutomSyncedEvent, function(data) {
            if (data && data.siteid == $mmSite.getId() && data.forumid == forumid && data.userid == $mmSite.getUserId()) {
                $mmUtil.showModal('mm.core.notice', 'mm.core.contenteditingsynced');
                returnToDiscussions();
            }
        });
    }

    // Discard an offline saved discussion.
    $scope.discard = function() {
        return $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            return $mmaModForumOffline.deleteNewDiscussion(forumid, timecreated).then(function() {
                returnToDiscussions();
            });
        });
    };

    $scope.$on('$destroy', function(){
        syncObserver && syncObserver.off && syncObserver.off();
        if (syncId) {
            $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
        }
    });
});
