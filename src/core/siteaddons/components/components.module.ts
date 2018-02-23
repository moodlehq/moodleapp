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
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreComponentsModule } from '../../../components/components.module';
import { CoreCompileHtmlComponentModule } from '../../compile/components/compile-html/compile-html.module';
import { CoreSiteAddonsAddonContentComponent } from './addon-content/addon-content';
import { CoreSiteAddonsModuleIndexComponent } from './module-index/module-index';
import { CoreSiteAddonsCourseOptionComponent } from './course-option/course-option';

@NgModule({
    declarations: [
        CoreSiteAddonsAddonContentComponent,
        CoreSiteAddonsModuleIndexComponent,
        CoreSiteAddonsCourseOptionComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        CoreComponentsModule,
        CoreCompileHtmlComponentModule,
        TranslateModule.forChild()
    ],
    providers: [
    ],
    exports: [
        CoreSiteAddonsAddonContentComponent,
        CoreSiteAddonsModuleIndexComponent,
        CoreSiteAddonsCourseOptionComponent
    ],
    entryComponents: [
        CoreSiteAddonsModuleIndexComponent,
        CoreSiteAddonsCourseOptionComponent
    ]
})
export class CoreSiteAddonsComponentsModule {}
