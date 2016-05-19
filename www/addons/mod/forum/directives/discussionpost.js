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
 * @param {Object} post             Post.
 * @param {Number} courseid         Post's course ID.
 * @param {String} title            Post's title.
 * @param {String} subject          Post's subject.
 * @param {String} component        Component this post belong to.
 * @param {Object} newpost          Object with the new post data. Usually shared between posts.
 * @param {Boolean} showdivider     True if it should have a list divider before the post.
 * @param {Boolean} titleimportant  True if title should be "important" (bold).
 * @oaram {Function} [postadded]    Function to call when a new post is added.
 * @param {String} [defaultsubject] Default subject to set to new posts.
 */
.directive('mmaModForumDiscussionPost', function($mmaModForum, $mmUtil, $translate, $q) {
    return {
        restrict: 'E',
        scope: {
            post: '=',
            courseid: '=',
            title: '=',
            subject: '=',
            component: '=',
            newpost: '=',
            showdivider: '=?',
            titleimportant: '=?',
            postadded: '&?',
            defaultsubject: '=?'
        },
        templateUrl: 'addons/mod/forum/templates/discussionpost.html',
        transclude: true,
        link: function(scope) {
            scope.isReplyEnabled = $mmaModForum.isReplyPostEnabled();

            // Set this post as being replied to.
            scope.showReply = function() {
                scope.newpost.replyingto = scope.post.id;
            };

            // Reply to this post.
            scope.reply = function() {
                if (!scope.newpost.subject) {
                    $mmUtil.showErrorModal('mma.mod_forum.erroremptysubject', true);
                    return;
                }
                if (!scope.newpost.message) {
                    $mmUtil.showErrorModal('mma.mod_forum.erroremptymessage', true);
                    return;
                }

                var message = '<p>' + scope.newpost.message.replace(/\n/g, '<br>') + '</p>',
                    modal = $mmUtil.showModalLoading('mm.core.sending', true);

                $mmaModForum.replyPost(scope.newpost.replyingto, scope.newpost.subject, message).then(function() {
                    if (scope.postadded) {
                        scope.postadded();
                    }
                }).catch(function(message) {
                    if (message) {
                        $mmUtil.showErrorModal(message);
                    } else {
                        $mmUtil.showErrorModal('mma.mod_forum.couldnotadd', true);
                    }
                }).finally(function() {
                    modal.dismiss();
                });
            };

            // Cancel reply.
            scope.cancel = function() {
                var promise;
                if (!scope.newpost.subject && !scope.newpost.message) {
                    promise = $q.when(); // Nothing written, cancel right away.
                } else {
                    promise = $mmUtil.showConfirm($translate('mm.core.areyousure'));
                }

                promise.then(function() {
                    scope.newpost.replyingto = undefined;
                    scope.newpost.subject = scope.defaultsubject || '';
                    scope.newpost.message = '';
                });
            };
        }
    };
});
