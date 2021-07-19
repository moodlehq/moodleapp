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
import { AddonModBookIndexComponent } from '../../components/index/index';

/**
 * Page that displays a book.
 */
@Component({
    selector: 'page-addon-mod-book-index',
    templateUrl: 'index.html',
})
export class AddonModBookIndexPage extends CoreCourseModuleMainActivityPage<AddonModBookIndexComponent> implements OnInit {

    @ViewChild(AddonModBookIndexComponent) activityComponent?: AddonModBookIndexComponent;

    chapterId?: number;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();
        this.chapterId = CoreNavigator.getRouteNumberParam('chapterId');
    }

}
