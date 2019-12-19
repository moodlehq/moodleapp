
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

import { Injectable, Injector } from '@angular/core';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin
} from '../../../providers/assign';
import { AddonModAssignFeedbackHandler } from '../../../providers/feedback-delegate';
import { AddonModAssignFeedbackEditPdfComponent } from '../component/editpdf';

/**
 * Handler for edit pdf feedback plugin.
 */
@Injectable()
export class AddonModAssignFeedbackEditPdfHandler implements AddonModAssignFeedbackHandler {
    name = 'AddonModAssignFeedbackEditPdfHandler';
    type = 'editpdf';

    constructor(private assignProvider: AddonModAssignProvider) { }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: AddonModAssignPlugin): any | Promise<any> {
        return AddonModAssignFeedbackEditPdfComponent;
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return The files (or promise resolved with the files).
     */
    getPluginFiles(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): any[] | Promise<any[]> {
        return this.assignProvider.getSubmissionPluginAttachments(plugin);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
