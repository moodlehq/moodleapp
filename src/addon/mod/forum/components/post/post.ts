// (C) Copyright 2015 Moodle Pty Ltd.
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

import { Component, Input, Output, Optional, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Content, PopoverController, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonModForumProvider } from '../../providers/forum';
import { AddonModForumHelperProvider } from '../../providers/helper';
import { AddonModForumOfflineProvider } from '../../providers/offline';
import { AddonModForumSyncProvider } from '../../providers/sync';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { CoreTagProvider } from '@core/tag/providers/tag';
import { AddonForumPostOptionsMenuComponent } from '../post-options-menu/post-options-menu';

/**
 * Components that shows a discussion post, its attachments and the action buttons allowed (reply, etc.).
 */
@Component({
    selector: 'addon-mod-forum-post',
    templateUrl: 'addon-mod-forum-post.html',
})
export class AddonModForumPostComponent implements OnInit, OnDestroy {
    @Input() post: any; // Post.
    @Input() courseId: number; // Post's course ID.
    @Input() discussionId: number; // Post's' discussion ID.
    @Input() component: string; // Component this post belong to.
    @Input() componentId: number; // Component ID.
    @Input() replyData: any; // Object with the new post data. Usually shared between posts.
    @Input() originalData: any; // Object with the original post data. Usually shared between posts.
    @Input() trackPosts: boolean; // True if post is being tracked.
    @Input() forum: any; // The forum the post belongs to. Required for attachments and offline posts.
    @Input() accessInfo: any; // Forum access information.
    @Input() parentSubject?: string; // Subject of parent post.
    @Input() ratingInfo?: CoreRatingInfo; // Rating info item.
    @Output() onPostChange: EventEmitter<void>; // Event emitted when a reply is posted or modified.

    messageControl = new FormControl();

    uniqueId: string;
    defaultReplySubject: string;
    advanced = false; // Display all form fields.
    tagsEnabled: boolean;
    displaySubject = true;
    optionsMenuEnabled = false;

    protected syncId: string;

    constructor(
            private uploaderProvider: CoreFileUploaderProvider,
            private syncProvider: CoreSyncProvider,
            private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider,
            private translate: TranslateService,
            private forumProvider: AddonModForumProvider,
            private forumHelper: AddonModForumHelperProvider,
            private forumOffline: AddonModForumOfflineProvider,
            private forumSync: AddonModForumSyncProvider,
            private tagProvider: CoreTagProvider,
            @Optional() private content: Content,
            protected popoverCtrl: PopoverController,
            protected modalCtrl: ModalController,
            protected eventsProvider: CoreEventsProvider,
            protected sitesProvider: CoreSitesProvider) {
        this.onPostChange = new EventEmitter<void>();
        this.tagsEnabled = this.tagProvider.areTagsAvailableInSite();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.uniqueId = this.post.id ? 'reply' + this.post.id : 'edit' + this.post.parent;

        const reTranslated = this.translate.instant('addon.mod_forum.re');
        this.displaySubject = !this.parentSubject ||
            (this.post.subject != this.parentSubject && this.post.subject != `Re: ${this.parentSubject}` &&
                this.post.subject != `${reTranslated} ${this.parentSubject}`);
        this.defaultReplySubject = (this.post.subject.startsWith('Re: ') || this.post.subject.startsWith(reTranslated))
            ? this.post.subject : `${reTranslated} ${this.post.subject}`;

        this.optionsMenuEnabled = !this.post.id || (this.forumProvider.isGetDiscussionPostAvailable() &&
                    (this.forumProvider.isDeletePostAvailable() || this.forumProvider.isUpdatePostAvailable()));
    }

    /**
     * Deletes an online post.
     */
    deletePost(): void {
        this.domUtils.showDeleteConfirm('addon.mod_forum.deletesure').then(() => {
            const modal = this.domUtils.showModalLoading('core.deleting', true);

            this.forumProvider.deletePost(this.post.id).then((response) => {

                const data = {
                    forumId: this.forum.id,
                    discussionId: this.discussionId,
                    cmId: this.forum.cmid,
                    deleted: response.status,
                    post: this.post
                };

                this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data,
                    this.sitesProvider.getCurrentSiteId());

                this.domUtils.showToast('addon.mod_forum.deletedpost', true);
            }).catch((error) => {
                this.domUtils.showErrorModal(error);
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            // Do nothing.
        });
    }

    /**
     * Set data to new reply post, clearing temporary files and updating original data.
     *
     * @param replyingTo Id of post beeing replied.
     * @param isEditing True it's an offline reply beeing edited, false otherwise.
     * @param subject Subject of the reply.
     * @param message Message of the reply.
     * @param isPrivate True if it's private reply.
     * @param files Reply attachments.
     */
    protected setReplyFormData(replyingTo?: number, isEditing?: boolean, subject?: string, message?: string, files?: any[],
            isPrivate?: boolean): void {
        // Delete the local files from the tmp folder if any.
        this.uploaderProvider.clearTmpFiles(this.replyData.files);

        this.replyData.replyingTo = replyingTo || 0;
        this.replyData.isEditing = !!isEditing;
        this.replyData.subject = subject || this.defaultReplySubject || '';
        this.replyData.message = message || null;
        this.replyData.files = files || [];
        this.replyData.isprivatereply = !!isPrivate;

        // Update rich text editor.
        this.messageControl.setValue(this.replyData.message);

        // Update original data.
        this.originalData.subject = this.replyData.subject;
        this.originalData.message = this.replyData.message;
        this.originalData.files = this.replyData.files.slice();
        this.originalData.isprivatereply = this.replyData.isprivatereply;

        // Show advanced fields if any of them has not the default value.
        this.advanced = this.replyData.files.length > 0;
    }

    /**
     * Show the context menu.
     *
     * @param e Click Event.
     */
    showOptionsMenu(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        const popover = this.popoverCtrl.create(AddonForumPostOptionsMenuComponent, {
            post: this.post,
            forumId: this.forum.id
        });
        popover.onDidDismiss((data) => {
            if (data && data.action) {
                switch (data.action) {
                    case 'edit':
                        this.editPost();
                        break;
                    case 'editoffline':
                        this.editOfflineReply();
                        break;
                    case 'delete':
                        this.deletePost();
                        break;
                    case 'deleteoffline':
                        this.discardOfflineReply();
                        break;
                    default:
                        break;
                }
            }
        });
        popover.present({
            ev: e
        });
    }

    /**
     * Shows a form modal to edit an online post.
     */
    editPost(): void {
        const modal = this.modalCtrl.create('AddonModForumEditPostPage', {
            post: this.post,
            component: this.component,
            componentId:  this.componentId,
            forum: this.forum
        });

        modal.present();
        modal.onDidDismiss((data) => {
            if (typeof data != 'undefined') {
                // Add some HTML to the message if needed.
                const message = this.textUtils.formatHtmlLines(data.message);
                const files = data.files || [];
                const sendingModal = this.domUtils.showModalLoading('core.sending', true);
                let promise;

                // Upload attachments first if any.
                if (files.length) {
                    promise = this.forumHelper.uploadOrStoreReplyFiles(this.forum.id, this.post.id, files, false);
                } else {
                    promise = Promise.resolve();
                }

                promise.then((attach) => {
                    const options: any = {};

                    if (attach) {
                        options.attachmentsid = attach;
                    }

                    // Try to send it to server.
                    return this.forumProvider.updatePost(this.post.id, data.subject, message, options);
                }).then((sent) => {
                    if (sent && this.forum.id) {
                        // Data sent to server, delete stored files (if any).
                        this.forumHelper.deleteReplyStoredFiles(this.forum.id, this.post.id);

                        this.onPostChange.emit();
                        this.post.subject = data.subject;
                        this.post.message = message;
                        this.post.attachments = data.files;
                    }
                }).catch((message) => {
                    this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.couldnotupdate', true);
                }).finally(() => {
                    sendingModal.dismiss();
                });
            }
        });
    }

    /**
     * Set this post as being replied to.
     */
    showReplyForm(): void {
        if (this.replyData.isEditing) {
            // User is editing a post, data needs to be resetted. Ask confirm if there is unsaved data.
            this.confirmDiscard().then(() => {
                this.setReplyFormData(this.post.id);

                if (this.content) {
                    setTimeout(() => {
                        this.content.resize();
                        this.domUtils.scrollToElementBySelector(this.content, '#addon-forum-reply-edit-form-' + this.uniqueId);
                    });
                }
            }).catch(() => {
                // Cancelled.
            });

            return;
        } else if (!this.replyData.replyingTo) {
            // User isn't replying, it's a brand new reply. Initialize the data.
            this.setReplyFormData(this.post.id);
        } else {
            // The post being replied has changed but the data will be kept.
            this.replyData.replyingTo = this.post.id;

            if (this.replyData.subject == this.originalData.subject) {
                // Update subject only if it hadn't been modified
                this.replyData.subject = this.defaultReplySubject;
                this.originalData.subject = this.defaultReplySubject;
            }

            this.messageControl.setValue(this.replyData.message);
        }

        if (this.content) {
            setTimeout(() => {
                this.content.resize();
                this.domUtils.scrollToElementBySelector(this.content, '#addon-forum-reply-edit-form-' + this.uniqueId);
            });
        }

    }

    /**
     * Set this post as being edited to.
     */
    editOfflineReply(): void {
        // Ask confirm if there is unsaved data.
        this.confirmDiscard().then(() => {
            this.syncId = this.forumSync.getDiscussionSyncId(this.discussionId);
            this.syncProvider.blockOperation(AddonModForumProvider.COMPONENT, this.syncId);

            this.setReplyFormData(this.post.parent, true, this.post.subject, this.post.message, this.post.attachments,
                    this.post.isprivatereply);
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Message changed.
     *
     * @param text The new text.
     */
    onMessageChange(text: string): void {
        this.replyData.message = text;
    }

    /**
     * Reply to this post.
     */
    reply(): void {
        if (!this.replyData.subject) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptysubject', true);

            return;
        }

        if (!this.replyData.message) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptymessage', true);

            return;
        }

        let saveOffline = false;
        let message = this.replyData.message;
        const subject = this.replyData.subject;
        const replyingTo = this.replyData.replyingTo;
        const files = this.replyData.files || [];
        const options: any = {};
        const modal = this.domUtils.showModalLoading('core.sending', true);
        let promise;

        // Add some HTML to the message if needed.
        message = this.textUtils.formatHtmlLines(message);

        // Set private option if checked.
        if (this.replyData.isprivatereply) {
            options.private = true;
        }

        // Upload attachments first if any.
        if (files.length) {
            promise = this.forumHelper.uploadOrStoreReplyFiles(this.forum.id, replyingTo, files, false).catch((error) => {
                // Cannot upload them in online, save them in offline.
                if (!this.forum.id) {
                    // Cannot store them in offline without the forum ID. Reject.
                    return Promise.reject(error);
                }

                saveOffline = true;

                return this.forumHelper.uploadOrStoreReplyFiles(this.forum.id, replyingTo, files, true);
            });
        } else {
            promise = Promise.resolve();
        }

        promise.then((attach) => {
            if (attach) {
                options.attachmentsid = attach;
            }

            if (saveOffline) {
                // Save post in offline.
                return this.forumOffline.replyPost(replyingTo, this.discussionId, this.forum.id, this.forum.name,
                        this.courseId, subject, message, options).then(() => {
                    // Return false since it wasn't sent to server.
                    return false;
                });
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return this.forumProvider.replyPost(replyingTo, this.discussionId, this.forum.id, this.forum.name,
                        this.courseId, subject, message, options, undefined, !files.length);
            }
        }).then((sent) => {
            if (sent && this.forum.id) {
                // Data sent to server, delete stored files (if any).
                this.forumHelper.deleteReplyStoredFiles(this.forum.id, replyingTo);
            }

            // Reset data.
            this.setReplyFormData();

            this.onPostChange.emit();

            if (this.syncId) {
                this.syncProvider.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
            }
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.couldnotadd', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Cancel reply.
     */
    cancel(): void {
        this.confirmDiscard().then(() => {
            // Reset data.
            this.setReplyFormData();

            if (this.syncId) {
                this.syncProvider.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
            }
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Discard offline reply.
     */
    discardOfflineReply(): void {
        this.domUtils.showDeleteConfirm().then(() => {
            const promises = [];

            promises.push(this.forumOffline.deleteReply(this.post.parent));
            if (this.forum.id) {
                promises.push(this.forumHelper.deleteReplyStoredFiles(this.forum.id, this.post.parent).catch(() => {
                    // Ignore errors, maybe there are no files.
                }));
            }

            return Promise.all(promises).finally(() => {
                // Reset data.
                this.setReplyFormData();

                this.onPostChange.emit();

                if (this.syncId) {
                    this.syncProvider.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
                }
            });
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        this.forumProvider.invalidateDiscussionPosts(this.discussionId, this.forum.id);
    }

    /**
     * Show or hide advanced form fields.
     */
    toggleAdvanced(): void {
        this.advanced = !this.advanced;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        if (this.syncId) {
            this.syncProvider.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
        }
    }

    /**
     * Confirm discard changes if any.
     *
     * @return Promise resolved if the user confirms or data was not changed and rejected otherwise.
     */
    protected confirmDiscard(): Promise<void> {
        if (this.forumHelper.hasPostDataChanged(this.replyData, this.originalData)) {
            // Show confirmation if some data has been modified.
            return this.domUtils.showConfirm(this.translate.instant('core.confirmloss'));
        } else {
            return Promise.resolve();
        }
    }
}
