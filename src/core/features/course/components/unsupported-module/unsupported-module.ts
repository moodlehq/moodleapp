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

import { Component, Input, OnInit } from '@angular/core';

import { CoreCourse, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';

/**
 * Component that displays info about an unsupported module.
 */
@Component({
    selector: 'core-course-unsupported-module',
    templateUrl: 'core-course-unsupported-module.html',
})
export class CoreCourseUnsupportedModuleComponent implements OnInit {

    @Input() courseId?: number; // The course to module belongs to.
    @Input() module?: CoreCourseWSModule; // The module to render.

    isDisabledInSite?: boolean;
    isSupportedByTheApp?: boolean;
    moduleName?: string;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.module) {
            return;
        }

        this.isDisabledInSite = CoreCourseModuleDelegate.isModuleDisabledInSite(this.module.modname);
        this.isSupportedByTheApp = CoreCourseModuleDelegate.hasHandler(this.module.modname);
        this.moduleName = CoreCourse.translateModuleName(this.module.modname);
    }

}
