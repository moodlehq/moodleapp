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
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreComponentsModule } from '@components/components.module';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';
import { CoreCourseComponentsModule } from '@core/course/components/components.module';
import { CoreRatingComponentsModule } from '@core/rating/components/components.module';
import { CoreTagComponentsModule } from '@core/tag/components/components.module';
import { AddonModForumIndexComponent } from './index/index';
import { AddonModForumPostComponent } from './post/post';
import { AddonForumDiscussionOptionsMenuComponent } from './discussion-options-menu/discussion-options-menu';
import { AddonForumPostOptionsMenuComponent } from './post-options-menu/post-options-menu';

@NgModule({
    declarations: [
        AddonModForumIndexComponent,
        AddonModForumPostComponent,
        AddonForumDiscussionOptionsMenuComponent,
        AddonForumPostOptionsMenuComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        CoreComponentsModule,
        CoreDirectivesModule,
        CorePipesModule,
        CoreCourseComponentsModule,
        CoreRatingComponentsModule,
        CoreTagComponentsModule
    ],
    providers: [
    ],
    exports: [
        AddonModForumIndexComponent,
        AddonModForumPostComponent,
        AddonForumDiscussionOptionsMenuComponent,
        AddonForumPostOptionsMenuComponent
    ],
    entryComponents: [
        AddonModForumIndexComponent,
        AddonForumDiscussionOptionsMenuComponent,
        AddonForumPostOptionsMenuComponent
    ]
})
export class AddonModForumComponentsModule {}
