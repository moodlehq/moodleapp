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
    Output,
    SimpleChange,
    ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonModForum,
    AddonModForumAccessInformation,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumPost,
    AddonModForumPostFormData,
    AddonModForumPrepareDraftAreaForPostWSResponse,
} from '../../services/forum';
import { CoreTag } from '@features/tag/services/tag';
import { Translate } from '@singletons';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { AddonModForumSync } from '../../services/forum-sync';
import { CoreSync } from '@services/sync';
import { CoreText } from '@singletons/text';
import { AddonModForumHelper } from '../../services/forum-helper';
import { AddonModForumOffline } from '../../services/forum-offline';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreForms } from '@singletons/form';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { AddonModForumSharedPostFormData } from '../../pages/discussion/discussion';
import { CoreDom } from '@singletons/dom';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, ADDON_MOD_FORUM_COMPONENT } from '../../constants';
import { CoreToasts } from '@services/overlays/toasts';
import { toBoolean } from '@/core/transforms/boolean';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreWSFile } from '@services/ws';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Components that shows a discussion post, its attachments and the action buttons allowed (reply, etc.).
 */
@Component({
    selector: 'addon-mod-forum-post',
    templateUrl: 'post.html',
    styleUrl: 'post.scss',
})
export class AddonModForumPostComponent implements OnInit, OnDestroy, OnChanges {

    @Input({ required: true }) post!: AddonModForumPost; // Post.
    @Input({ required: true }) courseId!: number; // Post's course ID.
    @Input({ required: true }) discussionId!: number; // Post's' discussion ID.
    @Input() discussion?: AddonModForumDiscussion; // Post's' discussion, only for starting posts.
    @Input({ required: true }) component!: string; // Component this post belong to.
    @Input({ required: true }) componentId!: number; // Component ID.
    @Input({ required: true }) formData!: AddonModForumSharedPostFormData; // New post data. Usually shared between posts.
    @Input({ required: true }) originalData!: Omit<AddonModForumPostFormData, 'id'>; // Original data. Usually shared between posts.
    @Input({ required: true, transform: toBoolean }) trackPosts = false; // True if post is being tracked.
    @Input({ required: true }) forum!: AddonModForumData; // The forum the post belongs to.
    @Input({ required: true }) accessInfo!: AddonModForumAccessInformation; // Forum access information.
    @Input() parentSubject?: string; // Subject of parent post.
    @Input() ratingInfo?: CoreRatingInfo; // Rating info item.
    @Input({ transform: toBoolean }) leavingPage = false; // Whether the page that contains this post is being left.
    @Input({ transform: toBoolean }) highlight = false;
    @Output() onPostChange: EventEmitter<void> = new EventEmitter<void>(); // Event emitted when a reply is posted or modified.

    @ViewChild('replyFormEl') formElement!: ElementRef;

    messageControl = new FormControl<string | null>(null);

    uniqueId!: string;
    defaultReplySubject!: string;
    advanced = false; // Display all form fields.
    tagsEnabled!: boolean;
    displaySubject = true;
    optionsMenuEnabled = false;

    protected preparePostData?: AddonModForumPrepareDraftAreaForPostWSResponse;

    constructor(
        protected elementRef: ElementRef,
    ) {}

    get showForm(): boolean {
        return this.post.id > 0
            ? (!this.formData.isEditing && this.formData.replyingTo === this.post.id) ||
                (!!this.formData.isEditing && this.formData.id === this.post.id)
            : !!this.formData.isEditing && this.formData.replyingTo === this.post.parentid;
    }

    /**
     * @inheritdoc
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

        if (this.post.id < 0) {
            this.optionsMenuEnabled = true;
        } else if (this.post.capabilities.delete !== undefined) {
            this.optionsMenuEnabled = this.post.capabilities.delete === true || this.post.capabilities.edit === true;
        } else {
            // Cannot know if the user can edit/delete or not, display the menu if the WebServices are available.
            this.optionsMenuEnabled = this.post.id < 0 || (AddonModForum.isGetDiscussionPostAvailable() &&
                        (AddonModForum.isDeletePostAvailable() || AddonModForum.isUpdatePostAvailable()));
        }
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
        // Log analytics even if the user cancels for consistency with LMS.
        this.analyticsLogEvent('mod_forum_delete_post', `/mod/forum/post.php?delete=${this.post.id}`);

        try {
            await CoreAlerts.confirmDelete(Translate.instant('addon.mod_forum.deletesure'));

            const modal = await CoreLoadings.show('core.deleting', true);

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
                    ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT,
                    data,
                    CoreSites.getCurrentSiteId(),
                );

                CoreToasts.show({
                    message: 'addon.mod_forum.deletedpost',
                    translateMessage: true,
                });
            } catch (error) {
                CoreAlerts.showError(error);
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            // Do nothing.
        }
    }

    /**
     * Set data to new/edit post, clearing temporary files and updating original data.
     *
     * @param replyingTo Id of post beeing replied.
     * @param isEditing True it's an offline reply beeing edited, false otherwise.
     * @param subject Subject of the reply.
     * @param message Message of the reply.
     * @param files Reply attachments.
     * @param isPrivate True if it's private reply.
     * @param postId The post ID if user is editing an online post.
     */
    protected setFormData(
        replyingTo?: number,
        isEditing?: boolean,
        subject?: string,
        message?: string,
        files?: CoreFileEntry[],
        isPrivate?: boolean,
        postId?: number,
    ): void {
        // Delete the local files from the tmp folder if any.
        CoreFileUploader.clearTmpFiles(this.formData.files);

        this.formData.replyingTo = replyingTo || 0;
        this.formData.isEditing = !!isEditing;
        this.formData.subject = subject || this.defaultReplySubject || '';
        this.formData.message = message || null;
        this.formData.files = (files ?? []).slice(); // Make a copy to avoid modifying the original array.
        this.formData.isprivatereply = !!isPrivate;
        this.formData.id = postId;

        // Update rich text editor.
        this.messageControl.setValue(this.formData.message);

        // Update original data.
        this.originalData.subject = this.formData.subject;
        this.originalData.message = this.formData.message;
        this.originalData.files = this.formData.files.slice();
        this.originalData.isprivatereply = this.formData.isprivatereply;

        // Show advanced fields if any of them has not the default value.
        this.advanced = this.formData.files.length > 0;

        if (!isEditing || !postId || postId <= 0) {
            this.preparePostData = undefined;
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     */
    async showOptionsMenu(event: Event): Promise<void> {
        const { AddonModForumPostOptionsMenuComponent } =
            await import('../post-options-menu/post-options-menu');

        const popoverData = await CorePopovers.open<{ action?: string }>({
            component: AddonModForumPostOptionsMenuComponent,
            componentProps: {
                post: this.post,
                forumId: this.forum.id,
                cmId: this.forum.cmid,
            },
            event,
            waitForDismissCompleted: true,
        });

        if (popoverData && popoverData.action) {
            switch (popoverData.action) {
                case 'edit':
                    this.editPost();
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
     * Set this post as being replied to.
     *
     * @param event Click event.
     */
    async showReplyForm(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        if (this.formData.isEditing) {
            // User is editing a post, data needs to be resetted. Ask confirm if there is unsaved data.
            try {
                await this.confirmDiscard();
                this.setFormData(this.post.id);

                this.scrollToForm();
            } catch {
                // Cancelled.
            }

            return;
        }

        if (!this.formData.replyingTo) {
            // User isn't replying, it's a brand new reply. Initialize the data.
            this.setFormData(this.post.id);
        } else {
            // The post being replied has changed but the data will be kept.
            this.formData.replyingTo = this.post.id;

            if (this.formData.subject == this.originalData.subject) {
                // Update subject only if it hadn't been modified
                this.formData.subject = this.defaultReplySubject;
                this.originalData.subject = this.defaultReplySubject;
            }

            this.messageControl.setValue(this.formData.message);
        }

        this.scrollToForm();

        this.analyticsLogEvent('mod_forum_add_discussion_post', `/mod/forum/post.php?reply=${this.post.id}`);
    }

    /**
     * Set this post as being edited to.
     */
    async editPost(): Promise<void> {
        // Ask confirm if there is unsaved data.
        try {
            await this.confirmDiscard();
        } catch {
            // Cancelled.
            return;
        }

        const modal = await CoreLoadings.show();

        try {
            let message = this.post.message;

            if (this.post.id > 0) {
                // Call prepare post for edition to retrieve the message without any added content (like filters and plagiarism).
                this.preparePostData = await AddonModForum.preparePostForEdition(this.post.id, 'post');

                const { text } = CoreFileHelper.replaceDraftfileUrls(
                    CoreSites.getRequiredCurrentSite().getURL(),
                    this.preparePostData.messagetext,
                    this.post.messageinlinefiles?.length ? this.post.messageinlinefiles : (this.preparePostData.files ?? []),
                );

                message = text;
            }

            this.formData.syncId = AddonModForumSync.getDiscussionSyncId(this.discussionId);
            CoreSync.blockOperation(ADDON_MOD_FORUM_COMPONENT, this.formData.syncId);

            this.setFormData(
                this.post.parentid,
                true,
                this.post.subject,
                message,
                this.post.attachments,
                this.post.isprivatereply,
                this.post.id > 0 ? this.post.id : undefined,
            );

            this.scrollToForm();

            this.analyticsLogEvent('mod_forum_update_discussion_post', `/mod/forum/post.php?edit=${this.post.id}`);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_forum.errorgetpost') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Message changed.
     *
     * @param text The new text.
     */
    onMessageChange(text?: string | null): void {
        this.formData.message = text ?? null;
    }

    /**
     * Reply to this post or edit post data.
     */
    async send(): Promise<void> {
        if (!this.formData.subject) {
            CoreAlerts.showError(Translate.instant('addon.mod_forum.erroremptysubject'));

            return;
        }

        if (!this.formData.message) {
            CoreAlerts.showError(Translate.instant('addon.mod_forum.erroremptymessage'));

            return;
        }

        let message = this.formData.message;
        const subject = this.formData.subject;
        const replyingTo = this.formData.replyingTo ?? 0;
        const files = this.formData.files || [];
        const isEditOnline = this.formData.id && this.formData.id > 0;
        const modal = await CoreLoadings.show('core.sending', true);

        if (isEditOnline && this.preparePostData) {
            // Restore the draft file URLs, otherwise the treated URLs would be saved in the content, which can cause problems.
            message = CoreFileHelper.restoreDraftfileUrls(
                CoreSites.getRequiredCurrentSite().getURL(),
                message,
                this.preparePostData.messagetext,
                this.post.messageinlinefiles?.length ? this.post.messageinlinefiles : (this.preparePostData.files ?? []),
            );
        }

        // Add some HTML to the message if needed.
        message = CoreText.formatHtmlLines(message);

        try {
            let sent = false;

            if (this.formData.id && this.formData.id > 0) {
                const attachments = await this.uploadAttachmentsForEditOnline(this.formData.id);

                sent = await AddonModForum.updatePost(this.formData.id, subject, message, {
                    attachmentsid: attachments,
                    inlineattachmentsid: this.preparePostData?.draftitemid,
                });
            } else {
                const { attachments, saveOffline } = await this.uploadAttachmentsForReply(replyingTo);

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
                        {
                            attachmentsid: attachments,
                            private: !!this.formData.isprivatereply,
                        },
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
                        {
                            attachmentsid: attachments,
                            private: !!this.formData.isprivatereply,
                        },
                        undefined,
                        !files.length,
                    );
                }
            }

            if (sent && this.forum.id) {
                // Data sent to server, delete stored files (if any).
                AddonModForumHelper.deleteReplyStoredFiles(this.forum.id, replyingTo);
            }

            // Reset data.
            this.setFormData();

            this.onPostChange.emit();

            CoreForms.triggerFormSubmittedEvent(this.formElement, sent, CoreSites.getCurrentSiteId());

            this.unblockOperation();
        } catch (error) {
            CoreAlerts.showError(error, {
                default: Translate.instant(isEditOnline ? 'addon.mod_forum.couldnotupdate' : 'addon.mod_forum.couldnotadd'),
            });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Upload attachments when editing an online post.
     *
     * @param postId Post ID being edited.
     * @returns Draft area id (if any attachment has changed).
     */
    protected async uploadAttachmentsForEditOnline(postId: number): Promise<number | undefined> {
        const files = this.formData.files || [];
        const previousAttachments = (this.post.attachments ?? []) as CoreWSFile[];

        if (!CoreFileUploader.areFileListDifferent(files, previousAttachments)) {
            return;
        }

        // Use prepare post for edition to avoid re-uploading all files.
        let filesToKeep = files.filter((file): file is CoreWSFile => !CoreFileUtils.isFileEntry(file));
        let removedFiles: { filepath: string; filename: string }[] | undefined;

        if (previousAttachments.length && !filesToKeep.length) {
            // Post had attachments but they were all removed. We cannot use the filesToKeep option because it doesn't allow
            // removing all files. In this case we'll just keep 1 file and remove it later.
            filesToKeep = [previousAttachments[0]];
            removedFiles = [{
                filename: previousAttachments[0].filename ?? '',
                filepath: previousAttachments[0].filepath ?? '',
            }];
        }

        const preparePostData = await AddonModForum.preparePostForEdition(postId, 'attachment', { filesToKeep });

        if (removedFiles?.length) {
            await CoreFileUploader.deleteDraftFiles(preparePostData.draftitemid, removedFiles);
        }

        await CoreFileUploader.uploadFiles(preparePostData.draftitemid, files);

        return preparePostData.draftitemid;
    }

    /**
     * Upload attachments for a reply that isn't an online post being edited.
     *
     * @param replyingTo Replying to post ID.
     * @returns Draft area id (if any attachment was uploaded) and whether data should be saved offline.
     */
    async uploadAttachmentsForReply(
        replyingTo: number,
    ): Promise<{ attachments: CoreFileUploaderStoreFilesResult | number | undefined; saveOffline: boolean }> {
        const files = this.formData.files || [];
        if (!files.length) {
            return { attachments: undefined, saveOffline: false };
        }

        try {
            const attachments = await AddonModForumHelper.uploadOrStoreReplyFiles(
                this.forum.id,
                replyingTo,
                files,
                false,
            );

            return { attachments, saveOffline: false };
        } catch (error) {
            // Cannot upload them in online, save them in offline.
            if (!this.forum.id || CoreWSError.isWebServiceError(error)) {
                // Cannot store them in offline. Reject.
                throw error;
            }

            const attachments = await AddonModForumHelper.uploadOrStoreReplyFiles(this.forum.id, replyingTo, files, true);

            return { attachments, saveOffline: true };
        }
    }

    /**
     * Cancel reply.
     */
    async cancel(): Promise<void> {
        try {
            await this.confirmDiscard();

            // Reset data.
            this.setFormData();

            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

            this.unblockOperation();
        } catch (error) {
            // Cancelled.
        }
    }

    /**
     * Discard offline reply.
     */
    async discardOfflineReply(): Promise<void> {
        try {
            await CoreAlerts.confirmDelete(Translate.instant('core.areyousure'));

            const promises: Promise<void>[] = [];

            promises.push(AddonModForumOffline.deleteReply(this.post.parentid!));

            if (this.forum.id) {
                promises.push(AddonModForumHelper.deleteReplyStoredFiles(this.forum.id, this.post.parentid!).catch(() => {
                    // Ignore errors, maybe there are no files.
                }));
            }

            await CorePromiseUtils.ignoreErrors(Promise.all(promises));

            // Reset data.
            this.setFormData();

            this.onPostChange.emit();

            this.unblockOperation();
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
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.unblockOperation();
    }

    /**
     * Confirm discard changes if any.
     *
     * @returns Promise resolved if the user confirms or data was not changed and rejected otherwise.
     */
    protected async confirmDiscard(): Promise<void> {
        if (AddonModForumHelper.hasPostDataChanged(this.formData, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreAlerts.confirm(Translate.instant('core.confirmloss'));
        }

        this.unblockOperation();
    }

    /**
     * Unblock operation if there's any blocked operation.
     */
    protected unblockOperation(): void {
        if (!this.formData.syncId) {
            return;
        }

        CoreSync.unblockOperation(ADDON_MOD_FORUM_COMPONENT, this.formData.syncId);
        delete this.formData.syncId;
    }

    /**
     * Scroll to reply/edit form.
     *
     * @returns Promise resolved when done.
     */
    protected async scrollToForm(): Promise<void> {
        await CoreDom.scrollToElement(
            this.elementRef.nativeElement,
            '#addon-forum-reply-edit-form-' + this.uniqueId,
        );
    }

    /**
     * Log analytics event.
     *
     * @param wsName WS name.
     * @param url URL.
     */
    protected analyticsLogEvent(wsName: string, url: string): void {
        if (this.post.id <= 0) {
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: wsName,
            name: this.post.subject,
            data: { id: this.post.id, forumid: this.forum.id, category: 'forum' },
            url,
        });
    }

}
