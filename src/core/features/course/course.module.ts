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

import { NgModule } from '@angular/core';

import { CORE_SITE_SCHEMAS } from '@/core/services/sites';

import {
    SITE_SCHEMA as COURSE_SITE_SCHEMA,
    OFFLINE_SITE_SCHEMA as COURSE_OFFLINE_SITE_SCHEMA,
} from './services/course-db';

@NgModule({
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [
                COURSE_SITE_SCHEMA,
                COURSE_OFFLINE_SITE_SCHEMA,
            ],
            multi: true,
        },
    ],
})
export class CoreCourseModule {
}
