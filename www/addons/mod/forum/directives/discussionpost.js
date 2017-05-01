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
 * Directive to show a discussion post, its attachments and the action buttons allowed (reply, etc.).
 *
 * @module mm.addons.mod_forum
 * @ngdoc directive
 * @name mmaForumDiscussionPost
 * @description
 * This directive will show a forum post if the right data is supplied. Attributes:
 *
 * @param {Object}   post             Post.
 * @param {Number}   courseid         Post's course ID.
 * @param {Number}   discussionId     Post's' discussion ID.
 * @param {String}   title            Post's title.
 * @param {String}   subject          Post's subject.
 * @param {String}   component        Component this post belong to.
 * @param {Mixed}    componentId      Component ID.
 * @param {Object}   newpost          Object with the new post data. Usually shared between posts.
 * @param {Boolean}  showdivider      True if it should have a list divider before the post.
 * @param {Boolean}  titleimportant   True if title should be "important" (bold).
 * @param {Boolean}  unread           True if post is being tracked and its not read.
 * @param {Object}   [forum]          The forum the post belongs to. Required for attachments and offline posts.
 * @param {Function} [onpostchange]   Function to call when a post is added, updated or discarded.
 * @param {String}   [defaultsubject] Default subject to set to new posts.
 * @param {String}   [scrollHandle]   Name of the scroll handle of the page containing the post.
 * @param {Object}   [originalData]   Original newpost data. Used to detect if data has changed.
 */
.directive('mmaModForumDiscussionPost', function($mmaModForum, $mmUtil, $translate, $q, $mmaModForumOffline, $mmSyncBlock,
        mmaModForumComponent, $mmaModForumSync, $mmText, $mmaModForumHelper, $ionicScrollDelegate, $mmFileUploaderHelper) {

    // Confirm discard changes if any.
    function confirmDiscard(scope) {
        if (!$mmaModForumHelper.hasPostDataChanged(scope.newpost, scope.originalData)) {
            return $q.when();
        } else {
            // Show confirmation if some data has been modified.
            return $mmUtil.showConfirm($translate('mm.core.confirmloss'));
        }
    }

    // Set data to new post, clearing tmp files and updating original data.
    function setPostData(scope, scrollView, replyingTo, editing, isEditing, subject, text, files) {
        // Delete the local files from the tmp folder if any.
        $mmFileUploaderHelper.clearTmpFiles(scope.newpost.files);

        scope.newpost.replyingto = replyingTo;
        scope.newpost.editing = editing;
        scope.newpost.isEditing = !!isEditing;
        scope.newpost.subject = subject || scope.defaultsubject || '';
        scope.newpost.text = text || '';
        scope.newpost.files = files || [];

        // Update original data.
        $mmUtil.copyProperties(scope.newpost, scope.originalData);

        // Resize the scroll, some elements might have appeared or disappeared.
        scrollView && scrollView.resize();
    }

    return {
        restrict: 'E',
        scope: {
            post: '=',
            courseid: '=',
            discussionId: '=',
            title: '=',
            subject: '=',
            component: '=',
            componentId: '=',
            newpost: '=',
            showdivider: '=?',
            titleimportant: '=?',
            unread: '=?',
            forum: '=?',
            onpostchange: '&?',
            defaultsubject: '=?',
            scrollHandle: '@?',
            originalData: '=?'
        },
        templateUrl: 'addons/mod/forum/templates/discussionpost.html',
        transclude: true,
        link: function(scope) {
            var syncId,
                scrollView = $ionicScrollDelegate.$getByHandle(scope.scrollHandle);

            scope.isReplyEnabled = $mmaModForum.isReplyPostEnabled();
            scope.canAddAttachments = $mmaModForum.canAddAttachments();

            scope.uniqueid = scope.post.id ? 'reply' + scope.post.id : 'edit' + scope.post.parent;

            // Set this post as being replied to.
            scope.showReply = function() {
                var uniqueId = 'reply' + scope.post.id,
                    wasReplying = typeof scope.newpost.replyingto != 'undefined';

                if (scope.newpost.isEditing) {
                    // User is editing a post, data needs to be resetted. Ask confirm if there is unsaved data.
                    confirmDiscard(scope).then(function() {
                        setPostData(scope, scrollView, scope.post.id, uniqueId, false);
                    });
                } else if (!wasReplying) {
                    // User isn't replying, it's a brand new reply. Initialize the data.
                    setPostData(scope, scrollView, scope.post.id, uniqueId, false);
                } else {
                    // The post being replied has changed but the data will be kept.
                    scope.newpost.replyingto = scope.post.id;
                    scope.newpost.editing = 'reply' + scope.post.id;
                }
            };

            // Set this post as being edited to.
            scope.editReply = function() {
                // Ask confirm if there is unsaved data.
                confirmDiscard(scope).then(function() {
                    var uniqueId = 'edit' + scope.post.parent;

                    syncId = $mmaModForumSync.getDiscussionSyncId(scope.discussionId);
                    $mmSyncBlock.blockOperation(mmaModForumComponent, syncId);

                    setPostData(scope, scrollView, scope.post.parent, uniqueId, true, scope.post.subject,
                            scope.post.message, scope.post.attachments);
                });
            };

            // Reply to this post.
            scope.reply = function() {
                if (!scope.newpost.subject) {
                    $mmUtil.showErrorModal('mma.mod_forum.erroremptysubject', true);
                    return;
                }
                if (!scope.newpost.text) {
                    $mmUtil.showErrorModal('mma.mod_forum.erroremptymessage', true);
                    return;
                }

                var forum = scope.forum || {}, // Use empty object if forum isn't defined.
                    subject = scope.newpost.subject,
                    message = scope.newpost.text,
                    replyingTo = scope.newpost.replyingto,
                    files = scope.newpost.files || [],
                    options = {},
                    modal = $mmUtil.showModalLoading('mm.core.sending', true),
                    saveOffline = false;

                // Check if rich text editor is enabled or not.
                $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
                    if (!enabled) {
                        // Rich text editor not enabled, add some HTML to the message if needed.
                        message = $mmText.formatHtmlLines(message);
                    }

                    // Upload attachments first if any.
                    if (files.length) {
                        return $mmaModForumHelper.uploadOrStoreReplyFiles(forum.id, replyingTo, files, false).catch(function(err) {
                            // Cannot upload them in online, save them in offline.
                            if (!forum.id) {
                                // Cannot store them in offline without the forum ID. Reject.
                                return $q.reject(err);
                            }

                            saveOffline = true;
                            return $mmaModForumHelper.uploadOrStoreReplyFiles(forum.id, replyingTo, files, true);
                        });
                    }
                }).then(function(attach) {
                    if (attach) {
                        options.attachmentsid = attach;
                    }

                    if (saveOffline) {
                        // Save post in offline.
                        return $mmaModForumOffline.replyPost(replyingTo, scope.discussionId, forum.id, forum.name,
                                scope.courseid, subject, message, options).then(function() {
                            // Return false since it wasn't sent to server.
                            return false;
                        });
                    } else {
                        // Try to send it to server.
                        // Don't allow offline if there are attachments since they were uploaded fine.
                        return $mmaModForum.replyPost(replyingTo, scope.discussionId, forum.id, forum.name,
                                scope.courseid, subject, message, options, undefined, !files.length);
                    }
                }).then(function(sent) {
                    if (sent && forum.id) {
                        // Data sent to server, delete stored files (if any).
                        $mmaModForumHelper.deleteReplyStoredFiles(forum.id, replyingTo);
                    }

                    // Reset data.
                    setPostData(scope, scrollView);

                    if (scope.onpostchange) {
                        scope.onpostchange();
                    }

                    if (syncId) {
                        $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                    }
                }).catch(function(message) {
                    $mmUtil.showErrorModalDefault(message, 'mma.mod_forum.couldnotadd', true);
                }).finally(function() {
                    modal.dismiss();
                });
            };

            // Cancel reply.
            scope.cancel = function() {
                confirmDiscard(scope).then(function() {
                    // Reset data.
                    setPostData(scope, scrollView);

                    if (syncId) {
                        $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                    }
                });
            };

            // Discard reply.
            scope.discard = function() {
                $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
                    var promises = [],
                        forum = scope.forum || {}; // Use empty object if forum isn't defined.

                    promises.push($mmaModForumOffline.deleteReply(scope.post.parent));
                    if (forum.id) {
                        promises.push($mmaModForumHelper.deleteReplyStoredFiles(forum.id, scope.post.parent).catch(function() {
                            // Ignore errors, maybe there are no files.
                        }));
                    }

                    return $q.all(promises).finally(function() {
                        // Reset data.
                        setPostData(scope, scrollView);

                        if (scope.onpostchange) {
                            scope.onpostchange();
                        }

                        if (syncId) {
                            $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                        }
                    });
                });

            };

            // Text changed when rendered.
            scope.firstRender = function() {
                if (scope.newpost.isEditing) {
                    // Update original data.
                    $mmUtil.copyProperties(scope.newpost, scope.originalData);
                }
            };

            scope.$on('$destroy', function(){
                if (syncId) {
                    $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                }
            });
        }
    };
});
