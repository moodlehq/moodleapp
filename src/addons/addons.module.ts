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

import { AddonBlockActivityResultsModule } from './block/activityresults/activityresults.module';
import { AddonBlockBadgesModule } from './block/badges/badges.module';
import { AddonBlockBlogMenuModule } from './block/blogmenu/blogmenu.module';
import { AddonBlockBlogRecentModule } from './block/blogrecent/blogrecent.module';
import { AddonBlockBlogTagsModule } from './block/blogtags/blogtags.module';
import { AddonBlockCalendarMonthModule } from './block/calendarmonth/calendarmonth.module';
import { AddonBlockCalendarUpcomingModule } from './block/calendarupcoming/calendarupcoming.module';
import { AddonBlockCommentsModule } from './block/comments/comments.module';
import { AddonBlockCompletionStatusModule } from './block/completionstatus/completionstatus.module';
import { AddonBlockGlossaryRandomModule } from './block/glossaryrandom/glossaryrandom.module';
import { AddonBlockHtmlModule } from './block/html/html.module';
import { AddonBlockLearningPlansModule } from './block/learningplans/learningplans.module';
import { AddonBlockMyOverviewModule } from './block/myoverview/myoverview.module';
import { AddonBlockNewsItemsModule } from './block/newsitems/newsitems.module';
import { AddonBlockOnlineUsersModule } from './block/onlineusers/onlineusers.module';
import { AddonBlockPrivateFilesModule } from './block/privatefiles/privatefiles.module';
import { AddonBlockRecentlyAccessedCoursesModule } from './block/recentlyaccessedcourses/recentlyaccessedcourses.module';
import { AddonBlockRssClientModule } from './block/rssclient/rssclient.module';
import { AddonBlockSelfCompletionModule } from './block/selfcompletion/selfcompletion.module';
import { AddonBlockSiteMainMenuModule } from './block/sitemainmenu/sitemainmenu.module';
import { AddonBlockStarredCoursesModule } from './block/starredcourses/starredcourses.module';
import { AddonBlockTagsModule } from './block/tags/tags.module';
import { AddonPrivateFilesModule } from './privatefiles/privatefiles.module';
import { AddonFilterModule } from './filter/filter.module';
import { AddonUserProfileFieldModule } from './userprofilefield/userprofilefield.module';
import { AddonBadgesModule } from './badges/badges.module';
import { AddonCalendarModule } from './calendar/calendar.module';

@NgModule({
    imports: [
        AddonBadgesModule,
        AddonCalendarModule,
        AddonPrivateFilesModule,
        AddonFilterModule,
        AddonBlockActivityResultsModule,
        AddonBlockBadgesModule,
        AddonBlockBlogMenuModule,
        AddonBlockBlogRecentModule,
        AddonBlockBlogTagsModule,
        AddonBlockCalendarMonthModule,
        AddonBlockCalendarUpcomingModule,
        AddonBlockCommentsModule,
        AddonBlockCompletionStatusModule,
        AddonBlockGlossaryRandomModule,
        AddonBlockHtmlModule,
        AddonBlockMyOverviewModule,
        AddonBlockLearningPlansModule,
        AddonBlockNewsItemsModule,
        AddonBlockOnlineUsersModule,
        AddonBlockPrivateFilesModule,
        AddonBlockRecentlyAccessedCoursesModule,
        AddonBlockRssClientModule,
        AddonBlockSelfCompletionModule,
        AddonBlockSiteMainMenuModule,
        AddonBlockStarredCoursesModule,
        AddonBlockTagsModule,
        AddonUserProfileFieldModule,
    ],
})
export class AddonsModule {}
