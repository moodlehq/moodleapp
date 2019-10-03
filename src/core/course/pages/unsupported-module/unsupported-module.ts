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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Page that displays info about an unsupported module.
 */
@IonicPage({ segment: 'core-course-unsupported-module' })
@Component({
    selector: 'page-core-course-unsupported-module',
    templateUrl: 'unsupported-module.html',
})
export class CoreCourseUnsupportedModulePage {
    module: any;
    courseId: number;

    constructor(navParams: NavParams, private translate: TranslateService, private textUtils: CoreTextUtilsProvider) {
        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.expandText(this.translate.instant('core.description'), this.module.description, undefined, undefined,
                [], true, 'module', this.module.id, this.courseId);
    }
}
