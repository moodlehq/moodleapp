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
import { ContextLevel } from '@/core/constants';

/**
 * Handler for comments submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionCommentsHandlerService implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignSubmissionCommentsHandler';
    type = 'comments';

    /**
     * @inheritdoc
     */
    async canContainFiltersWhenEditing(): Promise<boolean> {
        // This plugin cannot be edited.
        return false;
    }

    /**
     * @inheritdoc
     */
    getComponent(plugin: AddonModAssignPlugin, edit = false): Type<AddonModAssignSubmissionPluginBaseComponent> | undefined {
        return edit ? undefined : AddonModAssignSubmissionCommentsComponent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isEnabledForEdit(): boolean{
        return true;
    }

    /**
     * @inheritdoc
     */
    async prefetch(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        await CoreComments.getComments(
            ContextLevel.MODULE,
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
