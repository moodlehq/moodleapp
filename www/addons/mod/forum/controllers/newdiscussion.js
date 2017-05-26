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
            mmaModForumAutomSyncedEvent, $mmSyncBlock, $mmaModForumSync, $mmText, $mmaModForumHelper, $mmFileUploaderHelper) {

    var courseId = $stateParams.cid,
        forumId = $stateParams.forumid,
        cmId = $stateParams.cmid,
        timecreated = $stateParams.timecreated,
        syncObserver,
        syncId,
        originalData;

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, leaveView);

    $scope.newDiscussion = {
        subject: '',
        text: '',
        subscribe: true,
        pin: false,
        files: []
    };

    $scope.hasOffline = false;
    $scope.component = mmaModForumComponent;
    $scope.canCreateAttachments = true; // Assume he can by default.
    $scope.canPin = false;

    $mmaModForum.canAddAttachments().then(function(canAdd) {
        $scope.canAddAttachments = canAdd;
    });

    // Fetch if forum uses groups and the groups it uses.
    function fetchDiscussionData(refresh) {
        return $mmGroups.getActivityGroupMode(cmId).then(function(mode) {
            var promises = [];

            if (mode === $mmGroups.SEPARATEGROUPS || mode === $mmGroups.VISIBLEGROUPS) {
                promises.push($mmGroups.getActivityAllowedGroups(cmId).then(function(forumgroups) {
                    var promise;
                    if (mode === $mmGroups.VISIBLEGROUPS) {
                        // We need to check which of the returned groups the user can post to.
                        promise = validateVisibleGroups(forumgroups, refresh);
                    } else {
                        // WS already filters groups, no need to do it ourselves. Add "All participants" if needed.
                        promise = addAllParticipantsOption(forumgroups, true);
                    }

                    return promise.then(function(forumgroups) {
                        if (forumgroups.length > 0) {
                            $scope.groups = forumgroups;
                            // Do not override groupid.
                            $scope.newDiscussion.groupid = $scope.newDiscussion.groupid ?
                                $scope.newDiscussion.groupid : forumgroups[0].id;
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

                if ($mmaModForum.isCanAddDiscussionAvailable()) {
                    // Use the canAddDiscussion WS to check if the user can add attachments and pin discussions.
                    promises.push($mmaModForum.canAddDiscussionToAll(forumId).then(function(response) {
                        $scope.canPin = !!response.canpindiscussions;
                        $scope.canCreateAttachments = !!response.cancreateattachment;
                    }).catch(function() {
                        // Ignore errors, use default values.
                    }));
                }
            }

            // Get forum.
            promises.push($mmaModForum.getForum(courseId, cmId).then(function(forum) {
                $scope.forum = forum;
            }));

            // If editing a discussion, get offline data.
            if (timecreated && !refresh) {
                syncId = $mmaModForumSync.getForumSyncId(forumId);
                promises.push($mmaModForumSync.waitForSync(syncId).then(function() {
                    // Do not block if the scope is already destroyed.
                    if (!$scope.$$destroyed) {
                        $mmSyncBlock.blockOperation(mmaModForumComponent, syncId);
                    }
                    return $mmaModForumOffline.getNewDiscussion(forumId, timecreated).then(function(discussion) {
                        $scope.hasOffline = true;
                        discussion.options = discussion.options || {};
                        $scope.newDiscussion.groupid = discussion.groupid ? discussion.groupid : $scope.newDiscussion.groupid;
                        $scope.newDiscussion.subject = discussion.subject;
                        $scope.newDiscussion.text = discussion.message;
                        $scope.newDiscussion.subscribe = discussion.options.discussionsubscribe;
                        $scope.newDiscussion.pin = discussion.options.discussionpinned;

                        // Treat offline attachments if any.
                        if (discussion.options.attachmentsid && discussion.options.attachmentsid.offline) {
                            return $mmaModForumHelper.getNewDiscussionStoredFiles(forumId, timecreated).then(function(files) {
                                $scope.newDiscussion.files = files;
                            });
                        }
                    });
                }));
            }

            return $q.all(promises);
        }).then(function() {
            if (!originalData) {
                // Initialize original data.
                originalData = angular.copy($scope.newDiscussion);
            }
            $scope.showForm = true;
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mma.mod_forum.errorgetgroups', true);
            $scope.showForm = false;
            return $q.reject();
        });
    }

    // Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
    function validateVisibleGroups(forumgroups, refresh) {
        if ($mmaModForum.isCanAddDiscussionAvailable()) {
            // Use the canAddDiscussion function to filter the groups.
            // We first check if the user can post to all the groups.
            return $mmaModForum.canAddDiscussionToAll(forumId).catch(function() {
                // The call failed, let's assume he can't.
                return {
                    status: false,
                    canpindiscussions: false,
                    cancreateattachment: true
                };
            }).then(function(response) {
                $scope.canPin = !!response.canpindiscussions;
                $scope.canCreateAttachments = !!response.cancreateattachment;

                if (response.status) {
                    // The user can post to all groups, add the "All participants" option and return them all.
                    return addAllParticipantsOption(forumgroups);
                } else {
                    // The user can't post to all groups, let's check which groups he can post to.
                    var promises = [],
                        filtered = [];

                    angular.forEach(forumgroups, function(group) {
                        promises.push($mmaModForum.canAddDiscussion(forumId, group.id).catch(function() {
                            // The call failed, let's return true so the group is shown. If the user can't post to
                            // it an error will be shown when he tries to add the discussion.
                            return {
                                status: true
                            };
                        }).then(function(response) {
                            if (response.status) {
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
            return $mmGroups.getUserGroupsInCourse(courseId, refresh).then(function(usergroups) {
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

    // Add the "All participants" option to a list of groups if the user can add a discussion to all participants.
    function addAllParticipantsOption(groups, check) {
        var promise;

        if (!$mmaModForum.isAllParticipantsFixed()) {
            // All participants has a bug, don't add it.
            return $q.when(groups);
        } else if (check) {
            // We need to check if the user can add a discussion to all participants.
            promise = $mmaModForum.canAddDiscussionToAll(forumId).then(function(response) {
                $scope.canPin = !!response.canpindiscussions;
                $scope.canCreateAttachments = !!response.cancreateattachment;
                return response.status;
            }).catch(function() {
                // The call failed, let's assume he can't.
                return false;
            });
        } else {
            // No need to check, assume the user can.
            promise = $q.when(true);
        }

        return promise.then(function(canAdd) {
            if (canAdd) {
                groups.unshift({
                    courseid: courseId,
                    id: -1,
                    name: $translate.instant('mm.core.allparticipants')
                });
            }

            return groups;
        });
    }

    fetchDiscussionData().finally(function() {
        $scope.groupsLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshGroups = function() {
        var p1 = $mmGroups.invalidateActivityGroupMode(cmId),
            p2 = $mmGroups.invalidateActivityAllowedGroups(cmId),
            p3 = $mmaModForum.invalidateCanAddDiscussion(forumId);

        $q.all([p1, p2, p3]).finally(function() {
            fetchDiscussionData(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Convenience function to update or return to discussions depending on device.
    function returnToDiscussions(discussionId) {
        var data = {
            forumid: forumId,
            cmid: cmId
        };

        if (discussionId) {
            data.discussionid = discussionId;
        }
        $mmEvents.trigger(mmaModForumNewDiscussionEvent, data);

        // Delete the local files from the tmp folder.
        $mmFileUploaderHelper.clearTmpFiles($scope.newDiscussion.files);

        if ($ionicPlatform.isTablet()) {
            // Empty form.
            $scope.hasOffline = false;
            $scope.newDiscussion.subject = '';
            $scope.newDiscussion.text = '';
            $scope.newDiscussion.files = [];
            originalData = angular.copy($scope.newDiscussion);
        } else {
            // Go back to discussions list.
            $ionicHistory.goBack();
        }
    }

    // Ask to confirm if there are changes.
    function leaveView() {
        var promise;

        if (!$mmaModForumHelper.hasPostDataChanged($scope.newDiscussion, originalData)) {
            promise = $q.when();
        } else {
            // Show confirmation if some data has been modified.
            promise = $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }

        return promise.then(function() {
            // Delete the local files from the tmp folder.
            $mmFileUploaderHelper.clearTmpFiles($scope.newDiscussion.files);
        });
    }

    // Add a new discussion.
    $scope.add = function() {
        var modal,
            forumName = $scope.forum.name,
            subject = $scope.newDiscussion.subject,
            message = $scope.newDiscussion.text,
            pin = $scope.newDiscussion.pin,
            groupId = $scope.newDiscussion.groupid,
            attachments = $scope.newDiscussion.files,
            discTimecreated = timecreated || Date.now(),
            options = {
                discussionsubscribe: !!$scope.newDiscussion.subscribe
            },
            saveOffline = false;

        if (!subject) {
            $mmUtil.showErrorModal('mma.mod_forum.erroremptysubject', true);
            return;
        }
        if (!message) {
            $mmUtil.showErrorModal('mma.mod_forum.erroremptymessage', true);
            return;
        }

        modal = $mmUtil.showModalLoading('mm.core.sending', true);

        // Check if rich text editor is enabled or not.
        $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
            if (!enabled) {
                // Rich text editor not enabled, add some HTML to the message if needed.
                message = $mmText.formatHtmlLines(message);
            }

            // Upload attachments first if any.
            if (attachments.length) {
                return $mmaModForumHelper.uploadOrStoreNewDiscussionFiles(forumId, discTimecreated, attachments, false)
                        .catch(function() {
                    // Cannot upload them in online, save them in offline.
                    saveOffline = true;
                    return $mmaModForumHelper.uploadOrStoreNewDiscussionFiles(forumId, discTimecreated, attachments, true);
                });
            }
        }).then(function(attach) {
            if (attach) {
                options.attachmentsid = attach;
            }
            if (pin) {
                options.discussionpinned = true;
            }

            if (saveOffline) {
                // Save discussion in offline.
                return $mmaModForumOffline.addNewDiscussion(forumId, forumName, courseId, subject,
                        message, options, groupId, discTimecreated).then(function() {
                    // Don't return anything.
                });
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return $mmaModForum.addNewDiscussion(forumId, forumName, courseId, subject, message, options,
                        groupId, undefined, discTimecreated, !attachments.length);
            }
        }).then(function(discussionId) {
            if (discussionId) {
                // Data sent to server, delete stored files (if any).
                $mmaModForumHelper.deleteNewDiscussionStoredFiles(forumId, discTimecreated);
            }

            returnToDiscussions(discussionId);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mma.mod_forum.cannotcreatediscussion', true);
        }).finally(function() {
            modal.dismiss();
        });
    };

    if (timecreated) {
        // Refresh data if this forum is synchronized automatically. Only if we're editing one.
        syncObserver = $mmEvents.on(mmaModForumAutomSyncedEvent, function(data) {
            if (data && data.siteid == $mmSite.getId() && data.forumid == forumId && data.userid == $mmSite.getUserId()) {
                $mmUtil.showModal('mm.core.notice', 'mm.core.contenteditingsynced');
                returnToDiscussions();
            }
        });
    }

    // Discard an offline saved discussion.
    $scope.discard = function() {
        return $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            var promises = [];

            promises.push($mmaModForumOffline.deleteNewDiscussion(forumId, timecreated));
            promises.push($mmaModForumHelper.deleteNewDiscussionStoredFiles(forumId, timecreated).catch(function() {
                // Ignore errors, maybe there are no files.
            }));

            return $q.all(promises).then(function() {
                returnToDiscussions();
            });
        });
    };

    // Text changed when rendered.
    $scope.firstRender = function() {
        if (originalData) {
            originalData.text = $scope.newDiscussion.text;
        }
    };

    $scope.$on('$destroy', function(){
        syncObserver && syncObserver.off && syncObserver.off();
        if (syncId) {
            $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
        }
    });
});
