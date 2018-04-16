// (C) Copyright 2015 Martin Dougiamas
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
import { CoreAutoFocusDirective } from './auto-focus';
import { CoreDownloadFileDirective } from './download-file';
import { CoreExternalContentDirective } from './external-content';
import { CoreFormatTextDirective } from './format-text';
import { CoreLinkDirective } from './link';
import { CoreKeepKeyboardDirective } from './keep-keyboard';
import { CoreUserLinkDirective } from './user-link';
import { CoreAutoRowsDirective } from './auto-rows';
import { CoreLongPressDirective } from './long-press';
import { CoreChartDirective } from './chart';

@NgModule({
    declarations: [
        CoreAutoFocusDirective,
        CoreDownloadFileDirective,
        CoreExternalContentDirective,
        CoreFormatTextDirective,
        CoreKeepKeyboardDirective,
        CoreLinkDirective,
        CoreUserLinkDirective,
        CoreAutoRowsDirective,
        CoreLongPressDirective,
        CoreChartDirective
    ],
    imports: [],
    exports: [
        CoreAutoFocusDirective,
        CoreDownloadFileDirective,
        CoreExternalContentDirective,
        CoreFormatTextDirective,
        CoreKeepKeyboardDirective,
        CoreLinkDirective,
        CoreUserLinkDirective,
        CoreAutoRowsDirective,
        CoreLongPressDirective,
        CoreChartDirective
    ]
})
export class CoreDirectivesModule {}
