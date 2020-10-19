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
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { CoreIconComponent } from './icon/icon';
import { CoreLoadingComponent } from './loading/loading';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreDirectivesModule } from '@app/directives/directives.module';
import { CorePipesModule } from '@app/pipes/pipes.module';

@NgModule({
    declarations: [
        CoreIconComponent,
        CoreLoadingComponent,
        CoreShowPasswordComponent,
    ],
    imports: [
        CommonModule,
        IonicModule.forRoot(),
        TranslateModule.forChild(),
        CoreDirectivesModule,
        CorePipesModule,
    ],
    exports: [
        CoreIconComponent,
        CoreLoadingComponent,
        CoreShowPasswordComponent,
    ],
})
export class CoreComponentsModule {}
