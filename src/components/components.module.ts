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
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';
import { CoreLoadingComponent } from './loading/loading';
import { CoreMarkRequiredComponent } from './mark-required/mark-required';
import { CoreInputErrorsComponent } from './input-errors/input-errors';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreSplitViewComponent } from './split-view/split-view';
import { CoreIframeComponent } from './iframe/iframe';
import { CoreProgressBarComponent } from './progress-bar/progress-bar';
import { CoreEmptyBoxComponent } from './empty-box/empty-box';
import { CoreSearchBoxComponent } from './search-box/search-box';
import { CoreFileComponent } from './file/file';
import { CoreFilesComponent } from './files/files';
import { CoreIconComponent } from './icon/icon';
import { CoreContextMenuComponent } from './context-menu/context-menu';
import { CoreContextMenuItemComponent } from './context-menu/context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu/context-menu-popover';
import { CoreCoursePickerMenuPopoverComponent } from './course-picker-menu/course-picker-menu-popover';
import { CoreChartComponent } from './chart/chart';
import { CoreChronoComponent } from './chrono/chrono';
import { CoreDownloadRefreshComponent } from './download-refresh/download-refresh';
import { CoreLocalFileComponent } from './local-file/local-file';
import { CoreSitePickerComponent } from './site-picker/site-picker';
import { CoreTabsComponent } from './tabs/tabs';
import { CoreTabComponent } from './tabs/tab';
import { CoreRichTextEditorComponent } from './rich-text-editor/rich-text-editor';
import { CoreNavBarButtonsComponent } from './navbar-buttons/navbar-buttons';
import { CoreDynamicComponent } from './dynamic-component/dynamic-component';
import { CoreSendMessageFormComponent } from './send-message-form/send-message-form';
import { CoreTimerComponent } from './timer/timer';
import { CoreRecaptchaComponent } from './recaptcha/recaptcha';
import { CoreRecaptchaModalComponent } from './recaptcha/recaptchamodal';
import { CoreNavigationBarComponent } from './navigation-bar/navigation-bar';
import { CoreAttachmentsComponent } from './attachments/attachments';
import { CoreIonTabsComponent } from './ion-tabs/ion-tabs';
import { CoreIonTabComponent } from './ion-tabs/ion-tab';
import { CoreInfiniteLoadingComponent } from './infinite-loading/infinite-loading';
import { CoreUserAvatarComponent } from './user-avatar/user-avatar';
import { CoreStyleComponent } from './style/style';
import { CoreBSTooltipComponent } from './bs-tooltip/bs-tooltip';

@NgModule({
    declarations: [
        CoreLoadingComponent,
        CoreMarkRequiredComponent,
        CoreInputErrorsComponent,
        CoreShowPasswordComponent,
        CoreSplitViewComponent,
        CoreIframeComponent,
        CoreProgressBarComponent,
        CoreEmptyBoxComponent,
        CoreSearchBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreIconComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreContextMenuPopoverComponent,
        CoreCoursePickerMenuPopoverComponent,
        CoreChartComponent,
        CoreChronoComponent,
        CoreDownloadRefreshComponent,
        CoreLocalFileComponent,
        CoreSitePickerComponent,
        CoreTabsComponent,
        CoreTabComponent,
        CoreRichTextEditorComponent,
        CoreNavBarButtonsComponent,
        CoreDynamicComponent,
        CoreSendMessageFormComponent,
        CoreTimerComponent,
        CoreRecaptchaComponent,
        CoreRecaptchaModalComponent,
        CoreNavigationBarComponent,
        CoreAttachmentsComponent,
        CoreIonTabsComponent,
        CoreIonTabComponent,
        CoreInfiniteLoadingComponent,
        CoreUserAvatarComponent,
        CoreStyleComponent,
        CoreBSTooltipComponent
    ],
    entryComponents: [
        CoreContextMenuPopoverComponent,
        CoreCoursePickerMenuPopoverComponent,
        CoreRecaptchaModalComponent,
        CoreBSTooltipComponent
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
        CoreSplitViewComponent,
        CoreIframeComponent,
        CoreProgressBarComponent,
        CoreEmptyBoxComponent,
        CoreSearchBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreIconComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreChartComponent,
        CoreChronoComponent,
        CoreDownloadRefreshComponent,
        CoreLocalFileComponent,
        CoreSitePickerComponent,
        CoreTabsComponent,
        CoreTabComponent,
        CoreRichTextEditorComponent,
        CoreNavBarButtonsComponent,
        CoreDynamicComponent,
        CoreSendMessageFormComponent,
        CoreTimerComponent,
        CoreRecaptchaComponent,
        CoreNavigationBarComponent,
        CoreAttachmentsComponent,
        CoreIonTabsComponent,
        CoreIonTabComponent,
        CoreInfiniteLoadingComponent,
        CoreUserAvatarComponent,
        CoreStyleComponent,
        CoreBSTooltipComponent
    ]
})
export class CoreComponentsModule {}
