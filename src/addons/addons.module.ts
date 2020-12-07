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
import { AddonBlockGlossaryRandomModule } from './block/glossaryrandom/glossaryrandom.module';
import { AddonBlockHtmlModule } from './block/html/html.module';
import { AddonBlockNewsItemsModule } from './block/newsitems/newsitems.module';
import { AddonBlockOnlineUsersModule } from './block/onlineusers/onlineusers.module';
import { AddonBlockRssClientModule } from './block/rssclient/rssclient.module';
import { AddonBlockTagsModule } from './block/tags/tags.module';
import { AddonPrivateFilesModule } from './privatefiles/privatefiles.module';
import { AddonFilterModule } from './filter/filter.module';
import { AddonUserProfileFieldModule } from './userprofilefield/userprofilefield.module';

@NgModule({
    imports: [
        AddonPrivateFilesModule,
        AddonFilterModule,
        AddonBlockActivityResultsModule,
        AddonBlockBadgesModule,
        AddonBlockBlogMenuModule,
        AddonBlockBlogRecentModule,
        AddonBlockBlogTagsModule,
        AddonBlockGlossaryRandomModule,
        AddonBlockHtmlModule,
        AddonBlockNewsItemsModule,
        AddonBlockOnlineUsersModule,
        AddonBlockRssClientModule,
        AddonBlockTagsModule,
        AddonUserProfileFieldModule,
    ],
})
export class AddonsModule {}
