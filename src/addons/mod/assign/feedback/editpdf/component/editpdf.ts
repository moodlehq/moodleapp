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

import { AddonModAssignFeedbackPluginBaseComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';
import { AddonModAssignProvider, AddonModAssign } from '@addons/mod/assign/services/assign';
import { Component, OnInit } from '@angular/core';
import { CoreWSFile } from '@services/ws';

/**
 * Component to render a edit pdf feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-edit-pdf',
    templateUrl: 'addon-mod-assign-feedback-editpdf.html',
})
export class AddonModAssignFeedbackEditPdfComponent extends AddonModAssignFeedbackPluginBaseComponent implements OnInit {

    component = AddonModAssignProvider.COMPONENT;
    files: CoreWSFile[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.plugin) {
            this.plugin.fileareas = this.plugin.fileareas?.filter((filearea) => filearea.area === 'download');

            this.files = AddonModAssign.getSubmissionPluginAttachments(this.plugin);
        }
    }

}
