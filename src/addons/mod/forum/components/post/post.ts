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

import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    SimpleChange,
    ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonModForum,
    AddonModForumAccessInformation,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumPost,
    AddonModForumProvider,
    AddonModForumReply,
    AddonModForumUpdateDiscussionPostWSOptionsObject,
} from '../../services/forum';
import { CoreTag } from '@features/tag/services/tag';
import { Translate } from '@singletons';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { IonContent } from '@ionic/angular';
import { AddonModForumSync } from '../../services/forum-sync';
import { CoreSync } from '@services/sync';
import { CoreTextUtils } from '@services/utils/text';
import { AddonModForumHelper } from '../../services/forum-helper';
import { AddonModForumOffline, AddonModForumReplyOptions } from '../../services/forum-offline';
import { CoreUtils } from '@services/utils/utils';
import { AddonModForumPostOptionsMenuComponent } from '../post-options-menu/post-options-menu';
import { AddonModForumEditPostComponent } from '../edit-post/edit-post';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreForms } from '@singletons/form';
import { CoreFileEntry } from '@services/file-helper';

/**
 * Components that shows a discussion post, its attachments and the action buttons allowed (reply, etc.).
 */
@Component({
    selector: 'addon-mod-forum-post',
    templateUrl: 'post.html',
    styleUrls: ['post.scss'],
})
export class AddonModForumPostComponent implements OnInit, OnDestroy, OnChanges {

    @Input() post!: AddonModForumPost; // Post.
    @Input() courseId!: number; // Post's course ID.
    @Input() discussionId!: number; // Post's' discussion ID.
    @Input() discussion?: AddonModForumDiscussion; // Post's' discussion, only for starting posts.
    @Input() component!: string; // Component this post belong to.
    @Input() componentId!: number; // Component ID.
    @Input() replyData!: AddonModForumReply; // Object with the new post data. Usually shared between posts.
    @Input() originalData!: Omit<AddonModForumReply, 'id'>; // Object with the original post data. Usually shared between posts.
    @Input() trackPosts!: boolean; // True if post is being tracked.
    @Input() forum!: AddonModForumData; // The forum the post belongs to. Required for attachments and offline posts.
    @Input() accessInfo!: AddonModForumAccessInformation; // Forum access information.
    @Input() parentSubject?: string; // Subject of parent post.
    @Input() ratingInfo?: CoreRatingInfo; // Rating info item.
    @Input() leavingPage?: boolean; // Whether the page that contains this post is being left and will be destroyed.
    @Input() highlight = false;
    @Output() onPostChange: EventEmitter<void> = new EventEmitter<void>(); // Event emitted when a reply is posted or modified.

    @ViewChild('replyFormEl') formElement!: ElementRef;

    messageControl = new FormControl();

    uniqueId!: string;
    defaultReplySubject!: string;
    advanced = false; // Display all form fields.
    tagsEnabled!: boolean;
    displaySubject = true;
    optionsMenuEnabled = false;

    protected syncId!: string;

    constructor(
        protected elementRef: ElementRef,
        @Optional() protected content?: IonContent,
    ) {}

    get showForm(): boolean {
        return this.post.id > 0
            ? !this.replyData.isEditing && this.replyData.replyingTo === this.post.id
            : !!this.replyData.isEditing && this.replyData.replyingTo === this.post.parentid;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();
        this.uniqueId = this.post.id > 0 ? 'reply' + this.post.id : 'edit' + this.post.parentid;

        const reTranslated = Translate.instant('addon.mod_forum.re');
        this.displaySubject = !this.parentSubject ||
            (this.post.subject != this.parentSubject && this.post.subject != `Re: ${this.parentSubject}` &&
                this.post.subject != `${reTranslated} ${this.parentSubject}`);
        this.defaultReplySubject = this.post.replysubject || ((this.post.subject.startsWith('Re: ') ||
            this.post.subject.startsWith(reTranslated)) ? this.post.subject : `${reTranslated} ${this.post.subject}`);

        this.optionsMenuEnabled = this.post.id < 0 || (AddonModForum.isGetDiscussionPostAvailable() &&
                    (AddonModForum.isDeletePostAvailable() || AddonModForum.isUpdatePostAvailable()));
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.leavingPage && this.leavingPage) {
            // Download all courses is enabled now, initialize it.
            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());
        }
    }

    /**
     * Deletes an online post.
     */
    async deletePost(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('addon.mod_forum.deletesure');

            const modal = await CoreDomUtils.showModalLoading('core.deleting', true);

            try {
                const response = await AddonModForum.deletePost(this.post.id);

                const data = {
                    forumId: this.forum.id,
                    discussionId: this.discussionId,
                    cmId: this.forum.cmid,
                    deleted: response.status,
                    post: this.post,
                };

                CoreEvents.trigger(
                    AddonModForumProvider.CHANGE_DISCUSSION_EVENT,
                    data,
                    CoreSites.getCurrentSiteId(),
                );

                CoreDomUtils.showToast('addon.mod_forum.deletedpost', true);
            } catch (error) {
                CoreDomUtils.showErrorModal(error);
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            // Do nothing.
        }
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
    protected setReplyFormData(
        replyingTo?: number,
        isEditing?: boolean,
        subject?: string,
        message?: string,
        files?: CoreFileEntry[],
        isPrivate?: boolean,
    ): void {
        // Delete the local files from the tmp folder if any.
        CoreFileUploader.clearTmpFiles(this.replyData.files);

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
     * @param event Click Event.
     */
    async showOptionsMenu(event: Event): Promise<void> {
        const popoverData = await CoreDomUtils.openPopover<{ action?: string }>({
            component: AddonModForumPostOptionsMenuComponent,
            componentProps: {
                post: this.post,
                forumId: this.forum.id,
                cmId: this.forum.cmid,
            },
            event,
        });

        if (popoverData && popoverData.action) {
            switch (popoverData.action) {
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
            }
        }
    }

    /**
     * Shows a form modal to edit an online post.
     */
    async editPost(): Promise<void> {
        const modalData = await CoreDomUtils.openModal<AddonModForumReply>({
            component: AddonModForumEditPostComponent,
            componentProps: {
                post: this.post,
                component: this.component,
                componentId: this.componentId,
                forum: this.forum,
            },
            backdropDismiss: false,
            cssClass: 'core-modal-fullscreen',
        });

        if (!modalData) {
            return;
        }

        // Add some HTML to the message if needed.
        const message = CoreTextUtils.formatHtmlLines(modalData.message!);
        const files = modalData.files;
        const options: AddonModForumUpdateDiscussionPostWSOptionsObject = {};

        const sendingModal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            // Upload attachments first if any.
            if (files.length) {
                const attachment = await AddonModForumHelper.uploadOrStoreReplyFiles(
                    this.forum.id,
                    this.post.id,
                    files as CoreFileEntry[],
                    false,
                );

                options.attachmentsid = attachment;
            }

            // Try to send it to server.
            const sent = await AddonModForum.updatePost(this.post.id, modalData.subject!, message, options);

            if (sent && this.forum.id) {
                // Data sent to server, delete stored files (if any).
                AddonModForumHelper.deleteReplyStoredFiles(this.forum.id, this.post.id);

                this.onPostChange.emit();
                this.post.subject = modalData.subject!;
                this.post.message = message;
                this.post.attachments = modalData.files;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_forum.couldnotupdate', true);
        } finally {
            sendingModal.dismiss();
        }
    }

    /**
     * Set this post as being replied to.
     *
     * @param event Click event.
     */
    async showReplyForm(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        if (this.replyData.isEditing) {
            // User is editing a post, data needs to be resetted. Ask confirm if there is unsaved data.
            try {
                await this.confirmDiscard();
                this.setReplyFormData(this.post.id);

                if (this.content) {
                    setTimeout(() => {
                        CoreDomUtils.scrollToElementBySelector(
                            this.elementRef.nativeElement,
                            this.content,
                            '#addon-forum-reply-edit-form-' + this.uniqueId,
                        );
                    });
                }
            } catch {
                // Cancelled.
            }

            return;
        }

        if (!this.replyData.replyingTo) {
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
                CoreDomUtils.scrollToElementBySelector(
                    this.elementRef.nativeElement,
                    this.content,
                    '#addon-forum-reply-edit-form-' + this.uniqueId,
                );
            });
        }

    }

    /**
     * Set this post as being edited to.
     */
    async editOfflineReply(): Promise<void> {
        // Ask confirm if there is unsaved data.
        try {
            await this.confirmDiscard();

            this.syncId = AddonModForumSync.getDiscussionSyncId(this.discussionId);
            CoreSync.blockOperation(AddonModForumProvider.COMPONENT, this.syncId);

            this.setReplyFormData(
                this.post.parentid,
                true,
                this.post.subject,
                this.post.message,
                this.post.attachments,
                this.post.isprivatereply,
            );
        } catch (error) {
            // Cancelled.
        }
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
    async reply(): Promise<void> {
        if (!this.replyData.subject) {
            CoreDomUtils.showErrorModal('addon.mod_forum.erroremptysubject', true);

            return;
        }

        if (!this.replyData.message) {
            CoreDomUtils.showErrorModal('addon.mod_forum.erroremptymessage', true);

            return;
        }

        let saveOffline = false;
        let message = this.replyData.message;
        const subject = this.replyData.subject;
        const replyingTo = this.replyData.replyingTo!;
        const files = this.replyData.files || [];
        const options: AddonModForumReplyOptions = {};
        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        // Add some HTML to the message if needed.
        message = CoreTextUtils.formatHtmlLines(message);

        // Set private option if checked.
        if (this.replyData.isprivatereply) {
            options.private = true;
        }

        // Upload attachments first if any.
        let attachments;

        if (files.length) {
            try {
                attachments = await AddonModForumHelper.uploadOrStoreReplyFiles(this.forum.id, replyingTo, files, false);
            } catch (error) {

                // Cannot upload them in online, save them in offline.
                if (!this.forum.id) {
                    // Cannot store them in offline without the forum ID. Reject.
                    return Promise.reject(error);
                }

                saveOffline = true;
                attachments = await AddonModForumHelper.uploadOrStoreReplyFiles(this.forum.id, replyingTo, files, true);
            }
        }

        try {
            if (attachments) {
                options.attachmentsid = attachments;
            }

            let sent;
            if (saveOffline) {
                // Save post in offline.
                await AddonModForumOffline.replyPost(
                    replyingTo,
                    this.discussionId,
                    this.forum.id,
                    this.forum.name,
                    this.courseId,
                    subject,
                    message,
                    options,
                );

                // Set sent to false since it wasn't sent to server.
                sent = false;
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                sent = await AddonModForum.replyPost(
                    replyingTo,
                    this.discussionId,
                    this.forum.id,
                    this.forum.name,
                    this.courseId,
                    subject,
                    message,
                    options,
                    undefined,
                    !files.length,
                );
            }

            if (sent && this.forum.id) {
                // Data sent to server, delete stored files (if any).
                AddonModForumHelper.deleteReplyStoredFiles(this.forum.id, replyingTo);
            }

            // Reset data.
            this.setReplyFormData();

            this.onPostChange.emit();

            CoreForms.triggerFormSubmittedEvent(this.formElement, sent, CoreSites.getCurrentSiteId());

            if (this.syncId) {
                CoreSync.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_forum.couldnotadd', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Cancel reply.
     */
    async cancel(): Promise<void> {
        try {
            await this.confirmDiscard();

            // Reset data.
            this.setReplyFormData();

            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

            if (this.syncId) {
                CoreSync.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
            }
        } catch (error) {
            // Cancelled.
        }
    }

    /**
     * Discard offline reply.
     */
    async discardOfflineReply(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm();

            const promises: Promise<void>[] = [];

            promises.push(AddonModForumOffline.deleteReply(this.post.parentid!));

            if (this.forum.id) {
                promises.push(AddonModForumHelper.deleteReplyStoredFiles(this.forum.id, this.post.parentid!).catch(() => {
                    // Ignore errors, maybe there are no files.
                }));
            }

            await CoreUtils.ignoreErrors(Promise.all(promises));

            // Reset data.
            this.setReplyFormData();

            this.onPostChange.emit();

            if (this.syncId) {
                CoreSync.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
            }
        } catch (error) {
            // Cancelled.
        }
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        AddonModForum.invalidateDiscussionPosts(this.discussionId, this.forum.id);
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
            CoreSync.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
        }
    }

    /**
     * Confirm discard changes if any.
     *
     * @return Promise resolved if the user confirms or data was not changed and rejected otherwise.
     */
    protected confirmDiscard(): Promise<void> {
        if (AddonModForumHelper.hasPostDataChanged(this.replyData, this.originalData)) {
            // Show confirmation if some data has been modified.
            return CoreDomUtils.showConfirm(Translate.instant('core.confirmloss'));
        } else {
            return Promise.resolve();
        }
    }

}
