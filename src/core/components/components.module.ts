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

import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';

import { CoreAttachmentsComponent } from './attachments/attachments';
import { CoreBSTooltipComponent } from './bs-tooltip/bs-tooltip';
import { CoreChartComponent } from './chart/chart';
import { CoreChronoComponent } from './chrono/chrono';
import { CoreContextMenuComponent } from './context-menu/context-menu';
import { CoreContextMenuItemComponent } from './context-menu/context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu/context-menu-popover';
import { CoreDownloadRefreshComponent } from './download-refresh/download-refresh';
import { CoreDynamicComponent } from './dynamic-component/dynamic-component';
import { CoreEmptyBoxComponent } from './empty-box/empty-box';
import { CoreFileComponent } from './file/file';
import { CoreFilesComponent } from './files/files';
import { CoreIconComponent } from './icon/icon';
import { CoreIframeComponent } from './iframe/iframe';
import { CoreInfiniteLoadingComponent } from './infinite-loading/infinite-loading';
import { CoreInputErrorsComponent } from './input-errors/input-errors';
import { CoreLoadingComponent } from './loading/loading';
import { CoreLocalFileComponent } from './local-file/local-file';
import { CoreMarkRequiredComponent } from './mark-required/mark-required';
import { CoreNavBarButtonsComponent } from './navbar-buttons/navbar-buttons';
import { CoreNavigationBarComponent } from './navigation-bar/navigation-bar';
import { CoreProgressBarComponent } from './progress-bar/progress-bar';
import { CoreRecaptchaComponent } from './recaptcha/recaptcha';
import { CoreSendMessageFormComponent } from './send-message-form/send-message-form';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreSitePickerComponent } from './site-picker/site-picker';
import { CoreSplitViewComponent } from './split-view/split-view';
import { CoreStyleComponent } from './style/style';
import { CoreTabComponent } from './tabs/tab';
import { CoreTabsComponent } from './tabs/tabs';
import { CoreTabsOutletComponent } from './tabs-outlet/tabs-outlet';
import { CoreTimerComponent } from './timer/timer';
import { CoreUserAvatarComponent } from './user-avatar/user-avatar';
import { CoreComboboxComponent } from './combobox/combobox';
import { CoreSpacerComponent } from './spacer/spacer';
import { CoreHorizontalScrollControlsComponent } from './horizontal-scroll-controls/horizontal-scroll-controls';
import { CoreButtonWithSpinnerComponent } from './button-with-spinner/button-with-spinner';

@NgModule({
    declarations: [
        CoreAttachmentsComponent,
        CoreBSTooltipComponent,
        CoreButtonWithSpinnerComponent,
        CoreChartComponent,
        CoreChronoComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreDownloadRefreshComponent,
        CoreDynamicComponent,
        CoreEmptyBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreIconComponent,
        CoreIframeComponent,
        CoreInfiniteLoadingComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreLocalFileComponent,
        CoreMarkRequiredComponent,
        CoreNavBarButtonsComponent,
        CoreNavigationBarComponent,
        CoreProgressBarComponent,
        CoreRecaptchaComponent,
        CoreSendMessageFormComponent,
        CoreShowPasswordComponent,
        CoreSitePickerComponent,
        CoreSplitViewComponent,
        CoreStyleComponent,
        CoreTabComponent,
        CoreTabsComponent,
        CoreTabsOutletComponent,
        CoreTimerComponent,
        CoreUserAvatarComponent,
        CoreComboboxComponent,
        CoreSpacerComponent,
        CoreHorizontalScrollControlsComponent,
    ],
    imports: [
        CommonModule,
        IonicModule,
        FormsModule,
        TranslateModule.forChild(),
        CoreDirectivesModule,
        CorePipesModule,
    ],
    exports: [
        CoreAttachmentsComponent,
        CoreBSTooltipComponent,
        CoreButtonWithSpinnerComponent,
        CoreChartComponent,
        CoreChronoComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreDownloadRefreshComponent,
        CoreDynamicComponent,
        CoreEmptyBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreIconComponent,
        CoreIframeComponent,
        CoreInfiniteLoadingComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreLocalFileComponent,
        CoreMarkRequiredComponent,
        CoreNavBarButtonsComponent,
        CoreNavigationBarComponent,
        CoreProgressBarComponent,
        CoreRecaptchaComponent,
        CoreSendMessageFormComponent,
        CoreShowPasswordComponent,
        CoreSitePickerComponent,
        CoreSplitViewComponent,
        CoreStyleComponent,
        CoreTabComponent,
        CoreTabsComponent,
        CoreTabsOutletComponent,
        CoreTimerComponent,
        CoreUserAvatarComponent,
        CoreComboboxComponent,
        CoreSpacerComponent,
        CoreHorizontalScrollControlsComponent,
    ],
})
export class CoreComponentsModule {}
