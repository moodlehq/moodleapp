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

import type { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin } from '@addons/mod/assign/services/assign';
import { AddonModAssignSubmissionHandler } from '@addons/mod/assign/services/submission-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreComments } from '@features/comments/services/comments';
import { makeSingleton } from '@singletons';
import { AddonModAssignSubmissionCommentsComponent } from '../component/comments';

/**
 * Handler for comments submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionCommentsHandlerService implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignSubmissionCommentsHandler';
    type = 'comments';

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @returns Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(): boolean {
        // This plugin is read only, but return true to prevent blocking the edition.
        return true;
    }

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param plugin The plugin object.
     * @param edit Whether the user is editing.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(plugin: AddonModAssignPlugin, edit = false): Type<AddonModAssignSubmissionPluginBaseComponent> | undefined {
        return edit ? undefined : AddonModAssignSubmissionCommentsComponent;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @returns Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit(): boolean{
        return true;
    }

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async prefetch(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        await CoreComments.getComments(
            'module',
            assign.cmid,
            'assignsubmission_comments',
            submission.id,
            'submission_comments',
            0,
            siteId,
        );
    }

}
export const AddonModAssignSubmissionCommentsHandler = makeSingleton(AddonModAssignSubmissionCommentsHandlerService);
