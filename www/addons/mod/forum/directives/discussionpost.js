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
 * @param {Function} [onpostchange]   Function to call when a post is added, updated or discarded.
 * @param {String}   [defaultsubject] Default subject to set to new posts.
 * @param {String}   [scrollHandle]   Name of the scroll handle of the page containing the post.
 * @param {Object}   [originalData]   Original newpost data. Used to detect if data has changed.
 */
.directive('mmaModForumDiscussionPost', function($mmaModForum, $mmUtil, $translate, $q, $mmaModForumOffline, $mmSyncBlock,
        mmaModForumComponent, $mmaModForumSync, $mmText) {

    // Confirm discard changes if any.
    function confirmDiscard(scope) {
        if (!scope.originalData || typeof scope.originalData.subject == 'undefined' ||
                (scope.originalData.subject == scope.newpost.subject && scope.originalData.text == scope.newpost.text)) {
            return $q.when();
        } else {
            // Show confirmation if some data has been modified.
            return $mmUtil.showConfirm($translate('mm.core.confirmloss'));
        }
    }

    // Get a forum. Returns empty object if params aren't valid.
    function getForum(courseId, cmId) {
        if (courseId && cmId) {
            return $mmaModForum.getForum(courseId, cmId);
        } else {
            return $q.when({}); // Return empty object.
        }
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
            onpostchange: '&?',
            defaultsubject: '=?',
            scrollHandle: '@?',
            originalData: '=?'
        },
        templateUrl: 'addons/mod/forum/templates/discussionpost.html',
        transclude: true,
        link: function(scope) {
            var syncId;

            scope.isReplyEnabled = $mmaModForum.isReplyPostEnabled();

            scope.uniqueid = scope.post.id ? 'reply' + scope.post.id : 'edit' + scope.post.parent;

            // Set this post as being replied to.
            scope.showReply = function() {
                var promise,
                    wasReplying = typeof scope.newpost.replyingto != 'undefined';

                if (scope.newpost.isEditing) {
                    // User is editing a post, data needs to be resetted. Ask confirm if there is unsaved data.
                    promise = confirmDiscard(scope);
                } else if (!wasReplying) {
                    // User isn't replying, it's a brand new reply. Nothing to confirm, just initialize the data.
                    promise = $q.when();
                }

                if (promise) {
                    promise.then(function() {
                        scope.newpost.replyingto = scope.post.id;
                        scope.newpost.editing = 'reply' + scope.post.id;
                        scope.newpost.isEditing = false;
                        scope.newpost.subject = scope.defaultsubject || '';
                        scope.newpost.text = '';

                        // Update original data.
                        $mmUtil.copyProperties(scope.newpost, scope.originalData);
                    });
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
                    syncId = $mmaModForumSync.getDiscussionSyncId(scope.discussionId);
                    $mmSyncBlock.blockOperation(mmaModForumComponent, syncId);

                    scope.newpost.replyingto = scope.post.parent;
                    scope.newpost.editing = 'edit' + scope.post.parent;
                    scope.newpost.isEditing = true;
                    scope.newpost.subject = scope.post.subject;
                    scope.newpost.text = scope.post.message;

                    // Update original data.
                    $mmUtil.copyProperties(scope.newpost, scope.originalData);
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

                var message = scope.newpost.text,
                    modal = $mmUtil.showModalLoading('mm.core.sending', true);

                // Check if rich text editor is enabled or not.
                $mmUtil.isRichTextEditorEnabled().then(function(enabled) {
                    if (!enabled) {
                        // Rich text editor not enabled, add some HTML to the message if needed.
                        message = message = $mmText.formatHtmlLines(message);
                    }

                    return getForum(scope.courseid, scope.componentId).then(function(forum) {
                        return $mmaModForum.replyPost(scope.newpost.replyingto, scope.discussionId, forum.id, forum.name,
                                scope.courseid, scope.newpost.subject, message).then(function() {
                            if (scope.onpostchange) {
                                scope.onpostchange();
                            }
                        });
                    }).catch(function(message) {
                        $mmUtil.showErrorModalDefault(message, 'mma.mod_forum.couldnotadd', true);
                    });
                }).finally(function() {
                    modal.dismiss();
                    if (syncId) {
                        $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                    }
                });
            };

            // Cancel reply.
            scope.cancel = function() {
                confirmDiscard(scope).then(function() {
                    scope.newpost.replyingto = undefined;
                    scope.newpost.editing = undefined;
                    scope.newpost.subject = scope.defaultsubject || '';
                    scope.newpost.text = '';
                    scope.newpost.isEditing = false;

                    // Update original data.
                    $mmUtil.copyProperties(scope.newpost, scope.originalData);
                });

                if (syncId) {
                    $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                }
            };

            // Discard reply.
            scope.discard = function() {
                $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
                    return $mmaModForumOffline.deleteReply(scope.post.parent).finally(function() {
                        scope.newpost.replyingto = undefined;
                        scope.newpost.editing = undefined;
                        scope.newpost.subject = scope.defaultsubject || '';
                        scope.newpost.text = '';
                        scope.newpost.isEditing = false;
                        if (scope.onpostchange) {
                            scope.onpostchange();
                        }
                    });
                });

                if (syncId) {
                    $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                }
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
