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

import { CoreCourseWSModule } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreTextUtils } from '@services/utils/text';
import { Translate } from '@singletons';

/**
 * Page that displays info about an unsupported module.
 */
@Component({
    selector: 'page-core-course-unsupported-module',
    templateUrl: 'unsupported-module.html',
})
export class CoreCourseUnsupportedModulePage implements OnInit {

    module?: CoreCourseWSModule;
    courseId?: number;

    /**
     * @inheritDoc
     */
    ngOnInit(): void {
        this.module = CoreNavigator.getRouteParam('module');
        this.courseId = CoreNavigator.getRouteNumberParam('courseId');
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        CoreTextUtils.viewText(Translate.instant('core.description'), this.module!.description!, {
            filter: true,
            contextLevel: 'module',
            instanceId: this.module!.id,
            courseId: this.courseId,
        });
    }

}
