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

import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { IonicPage, ViewController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModForumProvider } from '../../providers/forum';
import { AddonModForumHelperProvider } from '../../providers/helper';

/**
 * Page that displays a form to edit discussion post.
 */
@IonicPage({ segment: 'addon-mod-edit-post' })
@Component({
    selector: 'addon-mod-forum-edit-post',
    templateUrl: 'addon-mod-forum-edit-post.html',
})
export class AddonModForumEditPostPage {
    component: string; // Component this post belong to.
    componentId: number; // Component ID.
    forum: any; // The forum the post belongs to. Required for attachments and offline posts.

    messageControl = new FormControl();
    advanced = false; // Display all form fields.
    replyData: any = {};
    originalData: any = {}; // Object with the original post data. Usually shared between posts.

    protected forceLeave = false; // To allow leaving the page without checking for changes.

    constructor(
            params: NavParams,
            protected forumProvider: AddonModForumProvider,
            protected viewCtrl: ViewController,
            protected domUtils: CoreDomUtilsProvider,
            protected uploaderProvider: CoreFileUploaderProvider,
            protected forumHelper: AddonModForumHelperProvider,
            protected translate: TranslateService) {

        const post = params.get('post');
        this.component = params.get('component');
        this.componentId = params.get('componentId');
        this.forum = params.get('forum');

        this.replyData.id = post.id;
        this.replyData.subject = post.subject;
        this.replyData.message = post.message;
        this.replyData.files = post.attachments || [];

        // Delete the local files from the tmp folder if any.
        this.uploaderProvider.clearTmpFiles(this.replyData.files);

        // Update rich text editor.
        this.messageControl.setValue(this.replyData.message);

        // Update original data.
        this.originalData.subject = this.replyData.subject;
        this.originalData.message = this.replyData.message;
        this.originalData.files = this.replyData.files.slice();

        // Show advanced fields if any of them has not the default value.
        this.advanced = this.replyData.files.length > 0;
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        let promise: any;

        if (this.forumHelper.hasPostDataChanged(this.replyData, this.originalData)) {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Delete the local files from the tmp folder.
            this.uploaderProvider.clearTmpFiles(this.replyData.files);
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
     * Close modal.
     *
     * @param data Data to return to the page.
     */
    closeModal(data: any): void {
        this.viewCtrl.dismiss(data);
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
}
