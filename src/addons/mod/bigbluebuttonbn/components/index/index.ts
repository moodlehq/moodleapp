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

import { Component, OnInit, Optional } from '@angular/core';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { AddonModBBBData, AddonModBBBService } from '../../services/bigbluebuttonbn';

/**
 * Component that displays a Big Blue Button activity.
 */
@Component({
    selector: 'addon-mod-bbb-index',
    templateUrl: 'index.html',
})
export class AddonModBBBIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = AddonModBBBService.COMPONENT;
    moduleName = 'bigbluebuttonbn';
    bbb?: AddonModBBBData;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModBBBIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();

        // @todo
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh: boolean = false): Promise<void> {
        try {
            // @todo
        } finally {
            this.fillContextMenu(refresh);
        }
    }

}
