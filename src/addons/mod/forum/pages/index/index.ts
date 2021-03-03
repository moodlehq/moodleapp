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

import { Component, OnInit } from '@angular/core';

import { AddonModForumData } from '@addons/mod/forum/services/forum';
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';

@Component({
    selector: 'page-addon-mod-forum-index',
    templateUrl: 'index.html',
})
export class AddonModForumIndexPage implements OnInit {

    title!: string;
    module!: CoreCourseAnyModuleData;
    courseId!: number;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.module = CoreNavigator.getRouteParam<CoreCourseAnyModuleData>('module')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.title = this.module?.name;
    }

    /**
     * Update some data based on the forum instance.
     *
     * @param forum Forum instance.
     */
    updateData(forum: AddonModForumData): void {
        this.title = forum.name || this.title;
    }

}
