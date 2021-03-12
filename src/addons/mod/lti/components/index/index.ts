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

import { Component, Optional, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular';

import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { AddonModLti, AddonModLtiLti, AddonModLtiProvider } from '../../services/lti';
import { AddonModLtiHelper } from '../../services/lti-helper';

/**
 * Component that displays an LTI entry page.
 */
@Component({
    selector: 'addon-mod-lti-index',
    templateUrl: 'addon-mod-lti-index.html',
})
export class AddonModLtiIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = AddonModLtiProvider.COMPONENT;
    moduleName = 'lti';

    lti?: AddonModLtiLti; // The LTI object.

    protected fetchContentDefaultError = 'addon.mod_lti.errorgetlti';

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModLtiIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.loadContent();
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh: boolean = false): Promise<void> {
        try {
            this.lti = await AddonModLti.getLti(this.courseId, this.module.id);

            this.description = this.lti.intro;
            this.dataRetrieved.emit(this.lti);
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModLti.invalidateLti(this.courseId));
        if (this.lti) {
            promises.push(AddonModLti.invalidateLtiLaunchData(this.lti.id));
        }

        await Promise.all(promises);
    }

    /**
     * Launch the LTI.
     */
    launch(): void {
        AddonModLtiHelper.getDataAndLaunch(this.courseId, this.module, this.lti);
    }

}
