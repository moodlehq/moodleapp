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

import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Type } from '@angular/core';
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
import { CoreDownloadRefreshComponent } from './download-refresh/download-refresh';
import { CoreDynamicComponent } from './dynamic-component/dynamic-component';
import { CoreEmptyBoxComponent } from './empty-box/empty-box';
import { CoreFileComponent } from './file/file';
import { CoreFilesComponent } from './files/files';
import { CoreIframeComponent } from './iframe/iframe';
import { CoreInfiniteLoadingComponent } from './infinite-loading/infinite-loading';
import { CoreInputErrorsComponent } from './input-errors/input-errors';
import { CoreLoadingComponent } from './loading/loading';
import { CoreLocalFileComponent } from './local-file/local-file';
import { CoreMarkRequiredComponent } from './mark-required/mark-required';
import { CoreModIconComponent } from './mod-icon/mod-icon';
import { CoreNavBarButtonsComponent } from './navbar-buttons/navbar-buttons';
import { CoreNavigationBarComponent } from './navigation-bar/navigation-bar';
import { CoreProgressBarComponent } from './progress-bar/progress-bar';
import { CoreRecaptchaComponent } from './recaptcha/recaptcha';
import { CoreSendMessageFormComponent } from './send-message-form/send-message-form';
import { CoreShowPasswordComponent } from './show-password/show-password';
import { CoreSitePickerComponent } from './site-picker/site-picker';
import { CoreSplitViewComponent } from './split-view/split-view';
import { CoreTabComponent } from './tabs/tab';
import { CoreTabsComponent } from './tabs/tabs';
import { CoreTabsOutletComponent } from './tabs-outlet/tabs-outlet';
import { CoreTimerComponent } from './timer/timer';
import { CoreUserAvatarComponent } from './user-avatar/user-avatar';
import { CoreComboboxComponent } from './combobox/combobox';
import { CoreSpacerComponent } from './spacer/spacer';
import { CoreHorizontalScrollControlsComponent } from './horizontal-scroll-controls/horizontal-scroll-controls';
import { CoreButtonWithSpinnerComponent } from './button-with-spinner/button-with-spinner';
import { CoreSwipeSlidesComponent } from './swipe-slides/swipe-slides';
import { CoreSwipeNavigationTourComponent } from './swipe-navigation-tour/swipe-navigation-tour';
import { CoreMessageComponent } from './message/message';
import { CoreGroupSelectorComponent } from './group-selector/group-selector';
import { CoreSheetModalComponent } from '@components/sheet-modal/sheet-modal';
import { CoreCourseImageComponent } from '@components/course-image/course-image';
import { CoreSitesListComponent } from './sites-list/sites-list';

/**
 * Get standalone components for site plugins.
 *
 * @returns Returns core standalone components.
 */
export async function getCoreStandaloneComponents(): Promise<Type<unknown>[]> {
    // eslint-disable-next-line deprecation/deprecation
    const { CoreStyleComponent } = await import('@components/style/style');

    return [
        CoreStyleComponent,
    ];
}

@NgModule({
    declarations: [
        CoreAttachmentsComponent,
        CoreBSTooltipComponent,
        CoreButtonWithSpinnerComponent,
        CoreChartComponent,
        CoreChronoComponent,
        CoreContextMenuComponent,
        CoreContextMenuItemComponent,
        CoreCourseImageComponent,
        CoreDownloadRefreshComponent,
        CoreDynamicComponent,
        CoreEmptyBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreGroupSelectorComponent,
        CoreIframeComponent,
        CoreInfiniteLoadingComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreLocalFileComponent,
        CoreMarkRequiredComponent,
        CoreMessageComponent,
        CoreModIconComponent,
        CoreNavBarButtonsComponent,
        CoreNavigationBarComponent,
        CoreProgressBarComponent,
        CoreRecaptchaComponent,
        CoreSendMessageFormComponent,
        CoreShowPasswordComponent, // eslint-disable-line deprecation/deprecation
        CoreSitePickerComponent,
        CoreSplitViewComponent,
        CoreSwipeSlidesComponent,
        CoreTabComponent,
        CoreTabsComponent,
        CoreTabsOutletComponent,
        CoreTimerComponent,
        CoreUserAvatarComponent,
        CoreComboboxComponent,
        CoreSpacerComponent,
        CoreHorizontalScrollControlsComponent,
        CoreSwipeNavigationTourComponent,
        CoreSheetModalComponent,
        CoreSitesListComponent,
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
        CoreCourseImageComponent,
        CoreDownloadRefreshComponent,
        CoreDynamicComponent,
        CoreEmptyBoxComponent,
        CoreFileComponent,
        CoreFilesComponent,
        CoreGroupSelectorComponent,
        CoreIframeComponent,
        CoreInfiniteLoadingComponent,
        CoreInputErrorsComponent,
        CoreLoadingComponent,
        CoreLocalFileComponent,
        CoreMarkRequiredComponent,
        CoreMessageComponent,
        CoreModIconComponent,
        CoreNavBarButtonsComponent,
        CoreNavigationBarComponent,
        CoreProgressBarComponent,
        CoreRecaptchaComponent,
        CoreSendMessageFormComponent,
        CoreShowPasswordComponent, // eslint-disable-line deprecation/deprecation
        CoreSitePickerComponent,
        CoreSplitViewComponent,
        CoreSwipeSlidesComponent,
        CoreTabComponent,
        CoreTabsComponent,
        CoreTabsOutletComponent,
        CoreTimerComponent,
        CoreUserAvatarComponent,
        CoreComboboxComponent,
        CoreSpacerComponent,
        CoreHorizontalScrollControlsComponent,
        CoreSwipeNavigationTourComponent,
        CoreSheetModalComponent,
        CoreSitesListComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreComponentsModule {}
