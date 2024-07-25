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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import {
    CoreDataPrivacy,
    CoreDataPrivacyDataRequestType,
    CoreDataPrivacyGetAccessInformationWSResponse,
} from '@features/dataprivacy/services/dataprivacy';
import { CoreDomUtils, ToastDuration } from '@services/utils/dom';

import { ModalController } from '@singletons';

/**
 * Component that displays the new request page.
 */
@Component({
    selector: 'core-data-privacy-new-request',
    templateUrl: 'newrequest.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreDataPrivacyNewRequestComponent implements OnInit {

    @Input() accessInfo?: CoreDataPrivacyGetAccessInformationWSResponse;
    @Input() createType?: CoreDataPrivacyDataRequestType;

    message = '';

    // Form variables.
    form: FormGroup;
    typeControl: FormControl<CoreDataPrivacyDataRequestType>;

    constructor(
        protected fb: FormBuilder,
    ) {
        this.form = new FormGroup({});

        // Initialize form variables.
        this.typeControl = this.fb.control(
            CoreDataPrivacyDataRequestType.DATAREQUEST_TYPE_EXPORT,
            { validators: Validators.required, nonNullable: true },
        );
        this.form.addControl('type', this.typeControl);
        this.form.addControl('message', this.fb.control(''));
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // It should not happen. If there's no access info, close the modal.
        if (!this.accessInfo) {
            ModalController.dismiss();

            return;
        }

        switch (this.createType) {
            case CoreDataPrivacyDataRequestType.DATAREQUEST_TYPE_EXPORT:
                if (this.accessInfo?.cancreatedatadownloadrequest) {
                    this.typeControl.setValue(this.createType);

                }
                break;
            case CoreDataPrivacyDataRequestType.DATAREQUEST_TYPE_DELETE:
                if (this.accessInfo?.cancreatedatadeletionrequest) {
                    this.typeControl.setValue(this.createType);
                }
                break;
            default:
                // Just in case only deleting is allowed, change the default type.
                if (!this.accessInfo.cancreatedatadownloadrequest && this.accessInfo.cancreatedatadeletionrequest){
                    this.typeControl.setValue(CoreDataPrivacyDataRequestType.DATAREQUEST_TYPE_DELETE);
                }
                break;
        }
    }

    /**
     * Sends the request.
     */
    async send(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const modal = await CoreDomUtils.showModalLoading();

        try {
            // Send the message.
            const requestId = await CoreDataPrivacy.createDataRequest(this.typeControl.value, this.message);
            if (requestId) {
                CoreDomUtils.showToast('core.dataprivacy.requestsubmitted', true, ToastDuration.LONG);
                ModalController.dismiss(true);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error sending data privacy request');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Close modal.
     */
    close(): void {
        ModalController.dismiss();
    }

}
