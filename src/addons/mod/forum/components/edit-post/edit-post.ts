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

import { Component, ViewChild, ElementRef, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { ModalController, Translate } from '@singletons';
import { AddonModForumData, AddonModForumPost, AddonModForumReply } from '@addons/mod/forum/services/forum';
import { AddonModForumHelper } from '@addons/mod/forum/services/forum-helper';
import { CoreForms } from '@singletons/form';
import { CoreFileEntry } from '@services/file-helper';

/**
 * Page that displays a form to edit discussion post.
 */
@Component({
    selector: 'addon-mod-forum-edit-post',
    templateUrl: 'edit-post.html',
})
export class AddonModForumEditPostComponent implements OnInit {

    @ViewChild('editFormEl') formElement!: ElementRef;

    @Input() component!: string; // Component this post belong to.
    @Input() componentId!: number; // Component ID.
    @Input() forum!: AddonModForumData; // The forum the post belongs to. Required for attachments and offline posts.
    @Input() post!: AddonModForumPost;

    messageControl = new FormControl();
    advanced = false; // Display all form fields.
    replyData!: AddonModForumReply;
    originalData!: Omit<AddonModForumReply, 'id'>; // Object with the original post data. Usually shared between posts.

    protected forceLeave = false; // To allow leaving the page without checking for changes.

    ngOnInit(): void {
        // @todo Override android back button to show confirmation before dismiss.

        this.replyData = {
            id: this.post.id,
            subject: this.post.subject,
            message: this.post.message,
            files: this.post.attachments || [],
        };

        // Delete the local files from the tmp folder if any.
        CoreFileUploader.clearTmpFiles(this.replyData.files as CoreFileEntry[]);

        // Update rich text editor.
        this.messageControl.setValue(this.replyData.message);

        // Update original data.
        this.originalData = {
            subject: this.replyData.subject,
            message: this.replyData.message,
            files: this.replyData.files.slice(),
        };

        // Show advanced fields if any of them has not the default value.
        this.advanced = this.replyData.files.length > 0;
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
     * Close modal.
     *
     * @param data Data to return to the page.
     */
    async closeModal(data?: AddonModForumReply): Promise<void> {
        const confirmDismiss = await this.confirmDismiss();

        if (!confirmDismiss) {
            return;
        }

        if (data) {
            CoreForms.triggerFormSubmittedEvent(this.formElement, false, CoreSites.getCurrentSiteId());
        } else {
            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());
        }

        ModalController.dismiss(data);
    }

    /**
     * Reply to this post.
     *
     * @param e Click event.
     */
    reply(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        // Close the modal, sending the input data.
        this.forceLeave = true;
        this.closeModal(this.replyData);
    }

    /**
     * Show or hide advanced form fields.
     */
    toggleAdvanced(): void {
        this.advanced = !this.advanced;
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    private async confirmDismiss(): Promise<boolean> {
        if (this.forceLeave || !AddonModForumHelper.hasPostDataChanged(this.replyData, this.originalData)) {
            return true;
        }

        try {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));

            // Delete the local files from the tmp folder.
            CoreFileUploader.clearTmpFiles(this.replyData.files as CoreFileEntry[]);

            return true;
        } catch (error) {
            return false;
        }
    }

}
