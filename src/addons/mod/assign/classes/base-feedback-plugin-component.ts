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

import { Component, Input } from '@angular/core';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreError } from '@classes/errors/error';
import { CoreModals } from '@services/overlays/modals';
import { AddonModAssignFeedbackCommentsTextData } from '../feedback/comments/services/handler';
import { AddonModAssignAssign, AddonModAssignPlugin, AddonModAssignSubmission } from '../services/assign';
import { toBoolean } from '@/core/transforms/boolean';

/**
 * Base class for component to render a feedback plugin.
 */
@Component({
    template: '',
})
export class AddonModAssignFeedbackPluginBaseComponent implements IAddonModAssignFeedbackPluginComponent {

    @Input({ required: true }) assign!: AddonModAssignAssign; // The assignment.
    @Input({ required: true }) submission!: AddonModAssignSubmission; // The submission.
    @Input({ required: true }) plugin!: AddonModAssignPlugin; // The plugin object.
    @Input({ required: true }) userId!: number; // The user ID of the submission.
    @Input() configs?: Record<string,string>; // The configs for the plugin.
    @Input({ transform: toBoolean }) canEdit = false; // Whether the user can edit.
    @Input({ transform: toBoolean }) edit = false; // Whether the user is editing.

    /**
     * Open a modal to edit the feedback plugin.
     *
     * @returns Promise resolved with the input data, rejected if cancelled.
     * @deprecated since 5.0.0. Use inline forms instead.
     */
    async editFeedback(): Promise<AddonModAssignFeedbackCommentsTextData> {
        if (!this.canEdit) {
            throw new CoreError('Cannot edit feedback');
        }

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const { AddonModAssignEditPluginFeedbackModalComponent } =
            await import('@addons/mod/assign/components/edit-feedback-plugin-modal/edit-feedback-plugin-modal');

        // Create the navigation modal.
        const modalData = await CoreModals.openModal<AddonModAssignFeedbackCommentsTextData>({
            component: AddonModAssignEditPluginFeedbackModalComponent,
            componentProps: {
                assign: this.assign,
                submission: this.submission,
                plugin: this.plugin,
                userId: this.userId,
            },
        });

        if (modalData === undefined) {
            throw new CoreCanceledError(); // User cancelled.
        }

        return modalData;
    }

    /**
     * @inheritdoc
     */
    async invalidate(): Promise<void> {
        return;
    }

}

/**
 * Interface for component to render a feedback plugin.
 */
export interface IAddonModAssignFeedbackPluginComponent {

    /**
     * Invalidate the data.
     *
     * @returns Promise resolved when done.
     */
    invalidate(): Promise<void>;

}
