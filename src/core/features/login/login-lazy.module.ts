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
import { CoreLoginSiteHelpComponent } from './components/site-help/site-help';
import { CoreLoginSiteOnboardingComponent } from './components/site-onboarding/site-onboarding';
import { CoreLoginHasSitesGuard } from './guards/has-sites';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sites',
    },
    {
        path: 'site',
        loadChildren: () => import('./pages/site/site.module').then( m => m.CoreLoginSitePageModule),
    },
    {
        path: 'credentials',
        loadChildren: () => import('./pages/credentials/credentials.module').then( m => m.CoreLoginCredentialsPageModule),
    },
    {
        path: 'sites',
        loadChildren: () => import('./pages/sites/sites.module').then( m => m.CoreLoginSitesPageModule),
        canLoad: [CoreLoginHasSitesGuard],
        canActivate: [CoreLoginHasSitesGuard],
    },
    {
        path: 'forgottenpassword',
        loadChildren: () => import('./pages/forgotten-password/forgotten-password.module')
            .then( m => m.CoreLoginForgottenPasswordPageModule),
    },
    {
        path: 'changepassword',
        loadChildren: () => import('./pages/change-password/change-password.module')
            .then( m => m.CoreLoginChangePasswordPageModule),
    },
    {
        path: 'sitepolicy',
        loadChildren: () => import('./pages/site-policy/site-policy.module').then( m => m.CoreLoginSitePolicyPageModule),
    },
    {
        path: 'emailsignup',
        loadChildren: () => import('./pages/email-signup/email-signup.module').then( m => m.CoreLoginEmailSignupPageModule),
    },
    {
        path: 'reconnect',
        loadChildren: () => import('./pages/reconnect/reconnect.module').then( m => m.CoreLoginReconnectPageModule),
    },
];

@NgModule({
    imports: [
        CoreSharedModule,
        RouterModule.forChild(routes),
    ],
    declarations: [
        CoreLoginSiteHelpComponent,
        CoreLoginSiteOnboardingComponent,
    ],
})
export class CoreLoginLazyModule {}
