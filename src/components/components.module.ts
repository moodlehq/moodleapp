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
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreDirectivesModule } from '../directives/directives.module';
import { CorePipesModule } from '../pipes/pipes.module';
import { CoreLoadingComponent } from './loading/loading';
import { CoreMarkRequiredComponent } from './mark-required/mark-required';
import { CoreInputErrorsComponent } from './input-errors/input-errors';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreIframeComponent } from './iframe/iframe';
import { CoreProgressBarComponent } from './progress-bar/progress-bar';
import { CoreEmptyBoxComponent } from './empty-box/empty-box';
import { CoreSearchBoxComponent } from './search-box/search-box';
import { CoreFileComponent } from './file/file';
import { CoreContextMenuComponent } from './context-menu/context-menu';
import { CoreContextMenuItemComponent } from './context-menu/context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu/context-menu-popover';
import { CoreChronoComponent } from './chrono/chrono';

@NgModule({
    declarations: [
        CoreLoadingComponent,
        CoreMarkRequiredComponent,
        CoreInputErrorsComponent,
        CoreShowPasswordComponent,
        CoreIframeComponent,
        CoreProgressBarComponent,
        CoreEmptyBoxComponent,
        CoreSearchBoxComponent,
        CoreFileComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreChronoComponent
    ],
    entryComponents: [
        CoreContextMenuPopoverComponent
    ],
    imports: [
        IonicModule,
        TranslateModule.forChild(),
        CoreDirectivesModule,
        CorePipesModule
    ],
    exports: [
        CoreLoadingComponent,
        CoreMarkRequiredComponent,
        CoreInputErrorsComponent,
        CoreShowPasswordComponent,
        CoreIframeComponent,
        CoreProgressBarComponent,
        CoreEmptyBoxComponent,
        CoreSearchBoxComponent,
        CoreFileComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreChronoComponent
    ]
})
export class CoreComponentsModule {}
