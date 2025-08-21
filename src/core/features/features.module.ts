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

import { CoreBlockModule } from './block/block.module';
import { CoreCommentsModule } from './comments/comments.module';
import { CoreContentLinksModule } from './contentlinks/contentlinks.module';
import { CoreCourseModule } from './course/course.module';
import { CoreCoursesModule } from './courses/courses.module';
import { CoreDataPrivacyModule } from './dataprivacy/dataprivacy.module';
import { CoreEditorModule } from './editor/editor.module';
import { CoreEmulatorModule } from './emulator/emulator.module';
import { CoreEnrolModule } from './enrol/enrol.module';
import { CoreFileUploaderModule } from './fileuploader/fileuploader.module';
import { CoreFilterModule } from './filter/filter.module';
import { CoreFinancialModule } from './financial/financial.module';
import { CoreGradesModule } from './grades/grades.module';
import { CoreH5PModule } from './h5p/h5p.module';
import { CoreLoginModule } from './login/login.module';
import { CoreMainMenuModule } from './mainmenu/mainmenu.module';
import { CoreNativeModule } from '@features/native/native.module';
import { CoreNewsModule } from './news/news.module';
import { CorePushNotificationsModule } from './pushnotifications/pushnotifications.module';
import { CoreQuestionModule } from './question/question.module';
import { CoreRatingModule } from './rating/rating.module';
import { CoreRemindersModule } from './reminders/reminders.module';
import { CoreSearchModule } from './search/search.module';
import { CoreSettingsModule } from './settings/settings.module';
import { CoreSharedFilesModule } from './sharedfiles/sharedfiles.module';
import { CoreSiteHomeModule } from './sitehome/sitehome.module';
import { CoreSitePluginsModule } from './siteplugins/siteplugins.module';
import { CoreStylesModule } from './styles/styles.module';
import { CoreTagModule } from './tag/tag.module';
import { CoreUserModule } from './user/user.module';
import { CoreUserToursModule } from './usertours/user-tours.module';
import { CoreViewerModule } from './viewer/viewer.module';
import { CoreXAPIModule } from './xapi/xapi.module';
import { CoreReportBuilderModule } from './reportbuilder/reportbuilder.module';
import { CorePolicyModule } from './policy/policy.module';

@NgModule({
    imports: [
        CoreBlockModule,
        CoreCommentsModule,
        CoreContentLinksModule,
        CoreCourseModule,
        CoreCoursesModule,
        CoreDataPrivacyModule,
        CoreEditorModule,
        CoreEnrolModule,
        CoreFileUploaderModule,
        CoreFilterModule,
        CoreFinancialModule,
        CoreGradesModule,
        CoreH5PModule,
        CoreLoginModule,
        CoreMainMenuModule,
        CoreNativeModule,
        CoreNewsModule,
        CorePushNotificationsModule,
        CoreQuestionModule,
        CoreRatingModule,
        CoreRemindersModule,
        CoreSearchModule,
        CoreSettingsModule,
        CoreSharedFilesModule,
        CoreSiteHomeModule,
        CoreSitePluginsModule,
        CoreStylesModule,
        CoreTagModule,
        CoreUserModule,
        CoreUserToursModule,
        CoreViewerModule,
        CoreXAPIModule,
        CoreReportBuilderModule,
        CorePolicyModule,

        // Import last to allow overrides.
        CoreEmulatorModule,
    ],
})
export class CoreFeaturesModule {}
