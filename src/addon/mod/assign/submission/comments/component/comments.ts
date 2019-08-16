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

import { Component, ViewChild } from '@angular/core';
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreCommentsCommentsComponent } from '@core/comments/components/comments/comments';
import { AddonModAssignSubmissionPluginComponent } from '../../../classes/submission-plugin-component';

/**
 * Component to render a comments submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-comments',
    templateUrl: 'addon-mod-assign-submission-comments.html'
})
export class AddonModAssignSubmissionCommentsComponent extends AddonModAssignSubmissionPluginComponent {
    @ViewChild(CoreCommentsCommentsComponent) commentsComponent: CoreCommentsCommentsComponent;

    commentsEnabled: boolean;

    constructor(protected commentsProvider: CoreCommentsProvider) {
        super();

        this.commentsEnabled = !commentsProvider.areCommentsDisabledInSite();
    }

    /**
     * Invalidate the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return this.commentsProvider.invalidateCommentsData('module', this.assign.cmid, 'assignsubmission_comments',
                this.submission.id, 'submission_comments');
    }

    /**
     * Show the comments.
     */
    showComments(): void {
        this.commentsComponent && this.commentsComponent.openComments();
    }
}
