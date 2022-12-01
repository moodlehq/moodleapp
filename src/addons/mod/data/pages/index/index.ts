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
import { AddonModDataIndexComponent } from '../../components/index/index';

/**
 * Page that displays a data.
 */
@Component({
    selector: 'page-addon-mod-data-index',
    templateUrl: 'index.html',
})
export class AddonModDataIndexPage extends CoreCourseModuleMainActivityPage<AddonModDataIndexComponent> implements OnInit {

    @ViewChild(AddonModDataIndexComponent) activityComponent?: AddonModDataIndexComponent;

    group = 0;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        super.ngOnInit();
        this.group = CoreNavigator.getRouteNumberParam('group') || 0;
    }

}
