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
import { CoreEmptyBoxPageComponent } from './empty-box-page/empty-box-page';
import { CoreEmptyBoxWrapperComponent } from './empty-box-wrapper/empty-box-wrapper';
import { StorybookModule } from '@/storybook/storybook.module';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';
import { CoreComponentsModule } from '@components/components.module';
import { CommonModule } from '@angular/common';
import { CoreCourseImageCardsPageComponent } from '@components/stories/components/course-image-cards-page/course-image-cards-page';
import { CoreCourseImageListPageComponent } from '@components/stories/components/course-image-list-page/course-image-list-page';
import { CoreSitesListWrapperComponent } from './sites-list-wrapper/sites-list-wrapper';
import { CoreDirectivesModule } from '@directives/directives.module';

@NgModule({
    declarations: [
        CoreCourseImageCardsPageComponent,
        CoreCourseImageListPageComponent,
        CoreEmptyBoxPageComponent,
        CoreEmptyBoxWrapperComponent,
        CoreSitesListWrapperComponent,
    ],
    imports: [
        CommonModule,
        StorybookModule,
        CoreDirectivesModule,
        CoreComponentsModule,
        CoreSearchComponentsModule,
    ],
})
export class CoreComponentsStorybookModule {}
