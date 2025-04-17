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
    AddonModAssignPlugin,
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssign,
} from '@addons/mod/assign/services/assign';
import { AddonModAssignFeedbackHandler } from '@addons/mod/assign/services/feedback-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import type { IAddonModAssignFeedbackPluginComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';

/**
 * Handler for edit pdf feedback plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignFeedbackEditPdfHandlerService implements AddonModAssignFeedbackHandler {

    name = 'AddonModAssignFeedbackEditPdfHandler';
    type = 'editpdf';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<IAddonModAssignFeedbackPluginComponent>> {
        const { AddonModAssignFeedbackEditPdfComponent } = await import('../component/editpdf');

        return AddonModAssignFeedbackEditPdfComponent;
    }

    /**
     * @inheritdoc
     */
    getPluginFiles(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): CoreWSFile[] {
        return AddonModAssign.getSubmissionPluginAttachments(plugin);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModAssignFeedbackEditPdfHandler = makeSingleton(AddonModAssignFeedbackEditPdfHandlerService);
