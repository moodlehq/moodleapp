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

import { hasSitesGuard } from './guards/has-sites';
import { CoreLoginHelper } from './services/login-helper';
import { CoreLoginForgottenPasswordPage } from '@features/login/pages/forgotten-password/forgotten-password';
import { CoreLoginEmailSignupPage } from '@features/login/pages/email-signup/email-signup';
import { CoreLoginSitePage } from '@features/login/pages/site/site';
import { CoreLoginSitesPage } from '@features/login/pages/sites/sites';
import { CoreLoginChangePasswordPage } from '@features/login/pages/change-password/change-password';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sites',
    },
    {
        path: 'site',
        component: CoreLoginSitePage,
    },
    {
        path: 'credentials',
        loadChildren: () => CoreLoginHelper.getCredentialsRouteModule(),
    },
    {
        path: 'sites',
        component: CoreLoginSitesPage,
        canActivate: [hasSitesGuard],
    },
    {
        path: 'forgottenpassword',
        component: CoreLoginForgottenPasswordPage,
    },
    {
        path: 'changepassword',
        component: CoreLoginChangePasswordPage,
    },
    {
        path: 'emailsignup',
        component: CoreLoginEmailSignupPage,
    },
    {
        path: 'reconnect',
        loadChildren: () => CoreLoginHelper.getReconnectRouteModule(),
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export default class CoreLoginLazyModule {}
