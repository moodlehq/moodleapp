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

import { Component, OnInit } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { AddonModAssignProvider } from '../../../providers/assign';
import { AddonModAssignFeedbackPluginComponentBase } from '../../../classes/feedback-plugin-component';

/**
 * Component to render a edit pdf feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-edit-pdf',
    templateUrl: 'addon-mod-assign-feedback-editpdf.html'
})
export class AddonModAssignFeedbackEditPdfComponent extends AddonModAssignFeedbackPluginComponentBase implements OnInit {

    component = AddonModAssignProvider.COMPONENT;
    files: any[];

    constructor(modalCtrl: ModalController, protected assignProvider: AddonModAssignProvider) {
        super(modalCtrl);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.plugin) {
            this.files = this.assignProvider.getSubmissionPluginAttachments(this.plugin);
        }
    }
}
