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

import { AddonBlockActivityModulesModule } from './activitymodules/activitymodules.module';
import { AddonBlockActivityResultsModule } from './activityresults/activityresults.module';
import { AddonBlockBadgesModule } from './badges/badges.module';
import { AddonBlockBlogMenuModule } from './blogmenu/blogmenu.module';
import { AddonBlockBlogRecentModule } from './blogrecent/blogrecent.module';
import { AddonBlockBlogTagsModule } from './blogtags/blogtags.module';
import { AddonBlockCalendarMonthModule } from './calendarmonth/calendarmonth.module';
import { AddonBlockCalendarUpcomingModule } from './calendarupcoming/calendarupcoming.module';
import { AddonBlockCommentsModule } from './comments/comments.module';
import { AddonBlockCompletionStatusModule } from './completionstatus/completionstatus.module';
import { AddonBlockGlossaryRandomModule } from './glossaryrandom/glossaryrandom.module';
import { AddonBlockHtmlModule } from './html/html.module';
import { AddonBlockLearningPlansModule } from './learningplans/learningplans.module';
import { AddonBlockMyOverviewModule } from './myoverview/myoverview.module';
import { AddonBlockNewsItemsModule } from './newsitems/newsitems.module';
import { AddonBlockOnlineUsersModule } from './onlineusers/onlineusers.module';
import { AddonBlockPrivateFilesModule } from './privatefiles/privatefiles.module';
import { AddonBlockRecentActivityModule } from './recentactivity/recentactivity.module';
import { AddonBlockRecentlyAccessedCoursesModule } from './recentlyaccessedcourses/recentlyaccessedcourses.module';
import { AddonBlockRecentlyAccessedItemsModule } from './recentlyaccesseditems/recentlyaccesseditems.module';
import { AddonBlockRssClientModule } from './rssclient/rssclient.module';
import { AddonBlockSelfCompletionModule } from './selfcompletion/selfcompletion.module';
import { AddonBlockSiteMainMenuModule } from './sitemainmenu/sitemainmenu.module';
import { AddonBlockStarredCoursesModule } from './starredcourses/starredcourses.module';
import { AddonBlockTagsModule } from './tags/tags.module';
import { AddonBlockTimelineModule } from './timeline/timeline.module';

@NgModule({
    imports: [
        AddonBlockActivityModulesModule,
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
        AddonBlockLearningPlansModule,
        AddonBlockMyOverviewModule,
        AddonBlockNewsItemsModule,
        AddonBlockOnlineUsersModule,
        AddonBlockPrivateFilesModule,
        AddonBlockRecentActivityModule,
        AddonBlockRecentlyAccessedCoursesModule,
        AddonBlockRecentlyAccessedItemsModule,
        AddonBlockRssClientModule,
        AddonBlockSelfCompletionModule,
        AddonBlockSiteMainMenuModule,
        AddonBlockStarredCoursesModule,
        AddonBlockTagsModule,
        AddonBlockTimelineModule,
    ],
})
export class AddonBlockModule { }
