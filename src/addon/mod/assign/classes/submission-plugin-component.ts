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

import { Input } from '@angular/core';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin } from '../providers/assign';

/**
 * Base class for component to render a submission plugin.
 */
export class AddonModAssignSubmissionPluginComponent {
    @Input() assign: AddonModAssignAssign; // The assignment.
    @Input() submission: AddonModAssignSubmission; // The submission.
    @Input() plugin: AddonModAssignPlugin; // The plugin object.
    @Input() configs: {[name: string]: string}; // The configs for the plugin.
    @Input() edit: boolean; // Whether the user is editing.
    @Input() allowOffline: boolean; // Whether to allow offline.

    constructor() {
        // Nothing to do.
    }

    /**
     * Invalidate the data.
     *
     * @return Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve();
    }
}
