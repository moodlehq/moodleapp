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
import { CoreCourseFormatSingleActivityComponent } from './components/singleactivity';
import { CoreCourseFormatSingleActivityHandler } from './providers/handler';
import { CoreCourseFormatDelegate } from '../../providers/format-delegate';
import { CoreComponentsModule } from '@components/components.module';

@NgModule({
    declarations: [
        CoreCourseFormatSingleActivityComponent
    ],
    imports: [
        CoreComponentsModule
    ],
    providers: [
        CoreCourseFormatSingleActivityHandler
    ],
    exports: [
        CoreCourseFormatSingleActivityComponent
    ],
    entryComponents: [
        CoreCourseFormatSingleActivityComponent
    ]
})
export class CoreCourseFormatSingleActivityModule {
    constructor(formatDelegate: CoreCourseFormatDelegate, handler: CoreCourseFormatSingleActivityHandler) {
        formatDelegate.registerHandler(handler);
    }
}
