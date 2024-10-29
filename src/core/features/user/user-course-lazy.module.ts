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

import { CoreUserParticipantsPage } from './pages/participants/participants.page';
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { CoreUserParticipantsPageModule } from '@features/user/pages/participants/participants.module';

const routes: Routes = [
    {
        path: '',
        component: CoreUserParticipantsPage,
        children: conditionalRoutes([
            {
                path: ':userId',
                loadChildren: () => import('@features/user/user-profile-lazy.module'),
                data: { swipeManagerSource: 'participants' },
            },
        ], () => CoreScreen.isTablet),
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreUserParticipantsPageModule,
    ],
})
export default class CoreUserCourseLazyModule {}
