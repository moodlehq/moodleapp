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

import { Component, Input } from '@angular/core';
import { IonicPage, ViewController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModAssignFeedbackDelegate } from '../../providers/feedback-delegate';

/**
 * Modal that allows editing a feedback plugin.
 */
@IonicPage({ segment: 'addon-mod-assign-edit-feedback-modal' })
@Component({
    selector: 'page-addon-mod-assign-edit-feedback-modal',
    templateUrl: 'edit-feedback-modal.html',
})
export class AddonModAssignEditFeedbackModalPage {

    @Input() assign: any; // The assignment.
    @Input() submission: any; // The submission.
    @Input() plugin: any; // The plugin object.
    @Input() userId: number; // The user ID of the submission.

    protected forceLeave = false; // To allow leaving the page without checking for changes.

    constructor(params: NavParams, protected viewCtrl: ViewController, protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService, protected feedbackDelegate: AddonModAssignFeedbackDelegate) {

        this.assign = params.get('assign');
        this.submission = params.get('submission');
        this.plugin = params.get('plugin');
        this.userId = params.get('userId');
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        return this.hasDataChanged().then((changed) => {
            if (changed) {
                return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
            }
        });
    }

    /**
     * Close modal.
     *
     * @param {any} data Data to return to the page.
     */
    closeModal(data: any): void {
        this.viewCtrl.dismiss(data);
    }

    /**
     * Done editing.
     *
     * @param {Event} e Click event.
     */
    done(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        // Close the modal, sending the input data.
        this.forceLeave = true;
        this.closeModal(this.getInputData());
    }

    /**
     * Get the input data.
     *
     * @return {any} Object with the data.
     */
    protected getInputData(): any {
        return this.domUtils.getDataFromForm(document.forms['addon-mod_assign-edit-feedback-form']);
    }

    /**
     * Check if data has changed.
     *
     * @return {Promise<boolean>} Promise resolved with boolean: whether the data has changed.
     */
    protected hasDataChanged(): Promise<boolean> {
        return this.feedbackDelegate.hasPluginDataChanged(this.assign, this.userId, this.plugin, this.getInputData(), this.userId)
                .catch(() => {
            // Ignore errors.
            return true;
        });
    }
}
