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
import { RouterModule, Routes } from '@angular/router';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModWikiComponentsModule } from './components/components.module';
import { AddonModWikiIndexPage } from './pages/index/index';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { canLeaveGuard } from '@guards/can-leave';
import { AddonModWikiEditPage } from './pages/edit/edit';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        redirectTo: ':courseId/:cmId/page/root',
    },
    {
        path: ':courseId/:cmId/page/:hash',
        component: AddonModWikiIndexPage,
    },
    {
        path: ':courseId/:cmId/edit',
        component: AddonModWikiEditPage,
        canDeactivate: [canLeaveGuard],
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModWikiComponentsModule,
        CoreEditorComponentsModule,
    ],
    declarations: [
        AddonModWikiIndexPage,
        AddonModWikiEditPage,
    ],
})
export default class AddonModWikiLazyModule {}
