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
import { AddonModPageIndexComponent } from '../../components/index/index';
import { AddonModPagePage } from '../../services/page';

/**
 * Page that displays a page.
 */
@Component({
    selector: 'page-addon-mod-page-index',
    templateUrl: 'index.html',
})
export class AddonModPageIndexPage implements OnInit {

    @ViewChild(AddonModPageIndexComponent) pageComponent?: AddonModPageIndexComponent;

    title?: string;
    module?: CoreCourseWSModule;
    courseId?: number;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.module = CoreNavigator.instance.getRouteParam('module');
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId');
        this.title = this.module?.name;
    }

    /**
     * Update some data based on the page instance.
     *
     * @param page Page instance.
     */
    updateData(page: CoreCourseWSModule | AddonModPagePage): void {
        this.title = 'name' in page ? page.name : this.title;
    }

}
