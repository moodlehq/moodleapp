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

import { Component, OnInit, ViewChild } from '@angular/core';
import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { CoreNavigator } from '@services/navigator';
import { AddonModScormAutoPlayData, AddonModScormIndexComponent } from '../../components/index/index';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the scorm entry page.
 */
@Component({
    selector: 'page-addon-mod-scorm-index',
    templateUrl: 'index.html',
    imports: [
        CoreSharedModule,
        AddonModScormIndexComponent,
    ],
})
export default class AddonModScormIndexPage extends CoreCourseModuleMainActivityPage<AddonModScormIndexComponent>
    implements OnInit {

    @ViewChild(AddonModScormIndexComponent) activityComponent?: AddonModScormIndexComponent;

    autoPlayData?: AddonModScormAutoPlayData; // Data to auto-play the SCORM.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        super.ngOnInit();

        if (CoreNavigator.getRouteBooleanParam('autoPlay')) {
            this.autoPlayData = {
                mode: CoreNavigator.getRouteParam('mode'),
                newAttempt: CoreNavigator.getRouteBooleanParam('newAttempt'),
                organizationId: CoreNavigator.getRouteParam('organizationId'),
                scoId: CoreNavigator.getRouteNumberParam('scoId'),
            };
        }
    }

}
