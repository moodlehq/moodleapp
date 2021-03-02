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
import { CoreCourseWSModule } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { AddonModAssignIndexComponent } from '../../components/index/index';
import { AddonModAssignAssign } from '../../services/assign';

/**
 * Page that displays an assign.
 */
@Component({
    selector: 'page-addon-mod-assign-index',
    templateUrl: 'index.html',
})
export class AddonModAssignIndexPage implements OnInit {

    @ViewChild(AddonModAssignIndexComponent) assignComponent?: AddonModAssignIndexComponent;

    title?: string;
    module?: CoreCourseWSModule;
    courseId?: number;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.module = CoreNavigator.getRouteParam('module');
        this.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.title = this.module?.name;
    }

    /**
     * Update some data based on the assign instance.
     *
     * @param assign Assign instance.
     */
    updateData(assign: AddonModAssignAssign): void {
        this.title = assign.name || this.title;
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.assignComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.assignComponent?.ionViewDidLeave();
    }

}
