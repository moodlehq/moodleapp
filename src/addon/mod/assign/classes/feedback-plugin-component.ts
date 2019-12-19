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

import { Input } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin } from '../providers/assign';

/**
 * Base class for component to render a feedback plugin.
 */
export class AddonModAssignFeedbackPluginComponentBase {
    @Input() assign: AddonModAssignAssign; // The assignment.
    @Input() submission: AddonModAssignSubmission; // The submission.
    @Input() plugin: AddonModAssignPlugin; // The plugin object.
    @Input() userId: number; // The user ID of the submission.
    @Input() configs: any; // The configs for the plugin.
    @Input() canEdit: boolean; // Whether the user can edit.
    @Input() edit: boolean; // Whether the user is editing.

    constructor(protected modalCtrl: ModalController) { }

    /**
     * Open a modal to edit the feedback plugin.
     *
     * @return Promise resolved with the input data, rejected if cancelled.
     */
    editFeedback(): Promise<any> {
        if (this.canEdit) {
            return new Promise((resolve, reject): void => {
                // Create the navigation modal.
                const modal = this.modalCtrl.create('AddonModAssignEditFeedbackModalPage', {
                    assign: this.assign,
                    submission: this.submission,
                    plugin: this.plugin,
                    userId: this.userId
                });

                modal.present();
                modal.onDidDismiss((data) => {
                    if (typeof data == 'undefined') {
                        reject();
                    } else {
                        resolve(data);
                    }
                });
            });
        } else {
            return Promise.reject(null);
        }
    }

    /**
     * Invalidate the data.
     *
     * @return Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve();
    }
}
