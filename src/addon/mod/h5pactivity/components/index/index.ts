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

import { Component, Optional, Injector } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModH5PActivity, AddonModH5PActivityProvider, AddonModH5PActivityData } from '../../providers/h5pactivity';

/**
 * Component that displays an H5P activity entry page.
 */
@Component({
    selector: 'addon-mod-h5pactivity-index',
    templateUrl: 'addon-mod-h5pactivity-index.html',
})
export class AddonModH5PActivityIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModH5PActivityProvider.COMPONENT;
    moduleName = 'h5pactivity';

    h5pActivity: AddonModH5PActivityData; // The H5P activity object.

    protected fetchContentDefaultError = 'addon.mod_h5pactivity.errorgetactivity';

    constructor(injector: Injector,
            @Optional() protected content: Content) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent();
    }

    /**
     * Check the completion.
     */
    protected checkCompletion(): void {
        this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
    }

    /**
     * Get the activity data.
     *
     * @param refresh If it's refreshing content.
     * @param sync If it should try to sync.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        try {
            this.h5pActivity = await AddonModH5PActivity.instance.getH5PActivity(this.courseId, this.module.id);

            this.description = this.h5pActivity.intro;
            this.dataRetrieved.emit(this.h5pActivity);
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
       return AddonModH5PActivity.instance.invalidateActivityData(this.courseId);
    }
}
