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

import { Component, ViewChild, ElementRef, Input } from '@angular/core';
import { CoreComments } from '@features/comments/services/comments';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreForms } from '@singletons/form';
import { ModalController } from '@singletons';

/**
 * Component that displays a text area for composing a comment.
 */
@Component({
    selector: 'core-comments-add',
    templateUrl: 'add.html',
})
export class CoreCommentsAddComponent {

    @ViewChild('commentForm') formElement?: ElementRef;

    @Input() protected contextLevel!: string;
    @Input() protected instanceId!: number;
    @Input() protected componentName!: string;
    @Input() protected itemId!: number;
    @Input() protected area = '';
    @Input() content = '';

    processing = false;

    /**
     * Send the comment or store it offline.
     *
     * @param e Event.
     */
    async addComment(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreApp.closeKeyboard();
        const loadingModal = await CoreDomUtils.showModalLoading('core.sending', true);
        // Freeze the add comment button.
        this.processing = true;
        try {
            const commentsResponse = await CoreComments.addComment(
                this.content,
                this.contextLevel,
                this.instanceId,
                this.componentName,
                this.itemId,
                this.area,
            );

            CoreForms.triggerFormSubmittedEvent(
                this.formElement,
                !!commentsResponse,
                CoreSites.getCurrentSiteId(),
            );

            ModalController.dismiss(commentsResponse).finally(() => {
                CoreDomUtils.showToast(
                    commentsResponse ? 'core.comments.eventcommentcreated' : 'core.datastoredoffline',
                    true,
                    3000,
                );
            });
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            this.processing = false;
        } finally {
            loadingModal.dismiss();
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());
        ModalController.dismiss();
    }

}
