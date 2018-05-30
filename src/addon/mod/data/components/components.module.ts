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
import { CoreComponentsModule } from '@components/components.module';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';
import { CoreCourseComponentsModule } from '@core/course/components/components.module';
import { AddonModDataIndexComponent } from './index/index';
import { AddonModDataFieldPluginComponent } from './field-plugin/field-plugin';
import { AddonModDataActionComponent } from './action/action';
import { CoreCompileHtmlComponentModule } from '@core/compile/components/compile-html/compile-html.module';
import { CoreCommentsComponentsModule } from '@core/comments/components/components.module';

@NgModule({
    declarations: [
        AddonModDataIndexComponent,
        AddonModDataFieldPluginComponent,
        AddonModDataActionComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        CoreComponentsModule,
        CoreDirectivesModule,
        CorePipesModule,
        CoreCourseComponentsModule,
        CoreCompileHtmlComponentModule,
        CoreCommentsComponentsModule
    ],
    providers: [
    ],
    exports: [
        AddonModDataIndexComponent,
        AddonModDataFieldPluginComponent,
        AddonModDataActionComponent
    ],
    entryComponents: [
        AddonModDataIndexComponent
    ]
})
export class AddonModDataComponentsModule {}
