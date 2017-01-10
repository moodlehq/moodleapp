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
 * @param {Function} [onpostchange]   Function to call when a post is added, updated or discarded.
 * @param {String}   [defaultsubject] Default subject to set to new posts.
 * @param {String}   [scrollHandle]   Name of the scroll handle of the page containing the post.
 */
.directive('mmaModForumDiscussionPost', function($mmaModForum, $mmUtil, $translate, $q, $mmaModForumOffline, $mmSyncBlock,
        mmaModForumComponent, $mmaModForumSync) {
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
            onpostchange: '&?',
            defaultsubject: '=?',
            scrollHandle: '@?'
        },
        templateUrl: 'addons/mod/forum/templates/discussionpost.html',
        transclude: true,
        link: function(scope) {
            var syncId;

            scope.isReplyEnabled = $mmaModForum.isReplyPostEnabled();

            scope.uniqueid = scope.post.id ? 'reply' + scope.post.id : 'edit' + scope.post.parent;

            // Set this post as being replied to.
            scope.showReply = function() {
                scope.newpost.replyingto = scope.post.id;
                scope.newpost.editing = 'reply' + scope.post.id;
                scope.newpost.isEditing = false;
                scope.newpost.subject = scope.defaultsubject || '';
                scope.newpost.text = '';
            };

            // Set this post as being edited to.
            scope.editReply = function() {
                syncId = $mmaModForumSync.getDiscussionSyncId(scope.discussionId);
                $mmSyncBlock.blockOperation(mmaModForumComponent, syncId);

                scope.newpost.replyingto = scope.post.parent;
                scope.newpost.editing = 'edit' + scope.post.parent;
                scope.newpost.isEditing = true;
                scope.newpost.subject = scope.post.subject;
                scope.newpost.text = scope.post.message;
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
                        if (message.indexOf('<p>') == -1) {
                            // Wrap the text in <p> tags.
                            message = '<p>' + message + '</p>';
                        }
                        message = message.replace(/\n/g, '<br>');
                    }

                    return $mmaModForum.getForum(scope.courseid, scope.componentId).then(function(forum) {
                        return $mmaModForum.replyPost(scope.newpost.replyingto, scope.discussionId, forum.id, forum.name,
                                scope.courseid, scope.newpost.subject, message).then(function() {
                            if (scope.onpostchange) {
                                scope.onpostchange();
                            }
                        });
                    }).catch(function(message) {
                        if (message) {
                            $mmUtil.showErrorModal(message);
                        } else {
                            $mmUtil.showErrorModal('mma.mod_forum.couldnotadd', true);
                        }
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
                var promise;
                if ((!scope.newpost.subject || scope.newpost.subject == scope.defaultsubject) && !scope.newpost.text) {
                    promise = $q.when(); // Nothing written, cancel right away.
                } else {
                    promise = $mmUtil.showConfirm($translate('mm.core.areyousure'));
                }

                promise.then(function() {
                    scope.newpost.replyingto = undefined;
                    scope.newpost.editing = undefined;
                    scope.newpost.subject = scope.defaultsubject || '';
                    scope.newpost.text = '';
                    scope.newpost.isEditing = false;
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

            scope.$on('$destroy', function(){
                if (syncId) {
                    $mmSyncBlock.unblockOperation(mmaModForumComponent, syncId);
                }
            });
        }
    };
});
