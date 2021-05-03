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

import { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { Component, ViewChild } from '@angular/core';
import { CoreCommentsCommentsComponent } from '@features/comments/components/comments/comments';
import { CoreComments } from '@features/comments/services/comments';

/**
 * Component to render a comments submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-comments',
    templateUrl: 'addon-mod-assign-submission-comments.html',
})
export class AddonModAssignSubmissionCommentsComponent extends AddonModAssignSubmissionPluginBaseComponent {

    @ViewChild(CoreCommentsCommentsComponent) commentsComponent!: CoreCommentsCommentsComponent;

    commentsEnabled: boolean;

    constructor() {
        super();

        this.commentsEnabled = !CoreComments.areCommentsDisabledInSite();
    }

    /**
     * Invalidate the data.
     *
     * @return Promise resolved when done.
     */
    invalidate(): Promise<void> {
        return CoreComments.invalidateCommentsData(
            'module',
            this.assign.cmid,
            'assignsubmission_comments',
            this.submission.id,
            'submission_comments',
        );
    }

    /**
     * Show the comments.
     */
    showComments(e?: Event): void {
        this.commentsComponent?.openComments(e);
    }

}
