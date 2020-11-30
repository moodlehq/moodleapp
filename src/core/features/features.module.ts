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

import { CoreCourseModule } from './course/course.module';
import { CoreCoursesModule } from './courses/courses.module';
import { CoreEmulatorModule } from './emulator/emulator.module';
import { CoreFileUploaderModule } from './fileuploader/fileuploader.module';
import { CoreLoginModule } from './login/login.module';
import { CoreMainMenuModule } from './mainmenu/mainmenu.module';
import { CoreSettingsModule } from './settings/settings.module';
import { CoreSiteHomeModule } from './sitehome/sitehome.module';

@NgModule({
    imports: [
        CoreCourseModule,
        CoreCoursesModule,
        CoreEmulatorModule,
        CoreFileUploaderModule,
        CoreLoginModule,
        CoreMainMenuModule,
        CoreSettingsModule,
        CoreSiteHomeModule,
    ],
})
export class CoreFeaturesModule {}
