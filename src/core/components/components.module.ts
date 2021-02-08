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
import { FormsModule } from '@angular/forms';

import { CoreChronoComponent } from './chrono/chrono';
import { CoreDownloadRefreshComponent } from './download-refresh/download-refresh';
import { CoreFileComponent } from './file/file';
import { CoreIconComponent } from './icon/icon';
import { CoreIframeComponent } from './iframe/iframe';
import { CoreInputErrorsComponent } from './input-errors/input-errors';
import { CoreLoadingComponent } from './loading/loading';
import { CoreMarkRequiredComponent } from './mark-required/mark-required';
import { CoreRecaptchaComponent } from './recaptcha/recaptcha';
import { CoreRecaptchaModalComponent } from './recaptcha/recaptcha-modal';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreSplitViewComponent } from './split-view/split-view';
import { CoreEmptyBoxComponent } from './empty-box/empty-box';
import { CoreTabsComponent } from './tabs/tabs';
import { CoreTabComponent } from './tabs/tab';
import { CoreTabsOutletComponent } from './tabs-outlet/tabs-outlet';
import { CoreInfiniteLoadingComponent } from './infinite-loading/infinite-loading';
import { CoreProgressBarComponent } from './progress-bar/progress-bar';
import { CoreContextMenuComponent } from './context-menu/context-menu';
import { CoreContextMenuItemComponent } from './context-menu/context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu/context-menu-popover';
import { CoreUserAvatarComponent } from './user-avatar/user-avatar';
import { CoreDynamicComponent } from './dynamic-component/dynamic-component';
import { CoreNavBarButtonsComponent } from './navbar-buttons/navbar-buttons';
import { CoreSendMessageFormComponent } from './send-message-form/send-message-form';
import { CoreTimerComponent } from './timer/timer';
import { CoreNavigationBarComponent } from './navigation-bar/navigation-bar';

import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';

@NgModule({
    declarations: [
        CoreChronoComponent,
        CoreDownloadRefreshComponent,
        CoreFileComponent,
        CoreIconComponent,
        CoreIframeComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreMarkRequiredComponent,
        CoreRecaptchaComponent,
        CoreRecaptchaModalComponent,
        CoreShowPasswordComponent,
        CoreSplitViewComponent,
        CoreEmptyBoxComponent,
        CoreTabsComponent,
        CoreTabComponent,
        CoreTabsOutletComponent,
        CoreInfiniteLoadingComponent,
        CoreProgressBarComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreNavBarButtonsComponent,
        CoreUserAvatarComponent,
        CoreDynamicComponent,
        CoreSendMessageFormComponent,
        CoreTimerComponent,
        CoreNavigationBarComponent,
    ],
    imports: [
        CommonModule,
        IonicModule.forRoot(),
        FormsModule,
        TranslateModule.forChild(),
        CoreDirectivesModule,
        CorePipesModule,
    ],
    exports: [
        CoreChronoComponent,
        CoreDownloadRefreshComponent,
        CoreFileComponent,
        CoreIconComponent,
        CoreIframeComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreMarkRequiredComponent,
        CoreRecaptchaComponent,
        CoreRecaptchaModalComponent,
        CoreShowPasswordComponent,
        CoreSplitViewComponent,
        CoreEmptyBoxComponent,
        CoreTabsComponent,
        CoreTabComponent,
        CoreTabsOutletComponent,
        CoreInfiniteLoadingComponent,
        CoreProgressBarComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreNavBarButtonsComponent,
        CoreUserAvatarComponent,
        CoreDynamicComponent,
        CoreSendMessageFormComponent,
        CoreTimerComponent,
        CoreNavigationBarComponent,
    ],
})
export class CoreComponentsModule {}
