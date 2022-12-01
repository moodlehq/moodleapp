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
import { AddonModAssignFeedbackEditPdfComponent } from '../component/editpdf';
import type { IAddonModAssignFeedbackPluginComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';

/**
 * Handler for edit pdf feedback plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignFeedbackEditPdfHandlerService implements AddonModAssignFeedbackHandler {

    name = 'AddonModAssignFeedbackEditPdfHandler';
    type = 'editpdf';

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<IAddonModAssignFeedbackPluginComponent> {
        return AddonModAssignFeedbackEditPdfComponent;
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns The files (or promise resolved with the files).
     */
    getPluginFiles(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): CoreWSFile[] {
        return AddonModAssign.getSubmissionPluginAttachments(plugin);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModAssignFeedbackEditPdfHandler = makeSingleton(AddonModAssignFeedbackEditPdfHandlerService);
