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

import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreTagComponentsModule } from '@features/tag/components/components.module';
import { CoreRatingComponentsModule } from '@features/rating/components/components.module';

import { AddonModForumDiscussionOptionsMenuComponent } from './discussion-options-menu/discussion-options-menu';
import { AddonModForumEditPostComponent } from './edit-post/edit-post';
import { AddonModForumIndexComponent } from './index/index';
import { AddonModForumPostComponent } from './post/post';
import { AddonModForumPostOptionsMenuComponent } from './post-options-menu/post-options-menu';
import { AddonModForumSortOrderSelectorComponent } from './sort-order-selector/sort-order-selector';

@NgModule({
    declarations: [
        AddonModForumDiscussionOptionsMenuComponent,
        AddonModForumEditPostComponent,
        AddonModForumIndexComponent,
        AddonModForumPostComponent,
        AddonModForumPostOptionsMenuComponent,
        AddonModForumSortOrderSelectorComponent,
    ],
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
        CoreTagComponentsModule,
        CoreEditorComponentsModule,
        CoreRatingComponentsModule,
    ],
    exports: [
        AddonModForumIndexComponent,
        AddonModForumPostComponent,
    ],
})
export class AddonModForumComponentsModule {}
