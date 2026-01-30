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

import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule } from '@/app/app-routing.module';
import { CoreLoginHelper } from './services/login-helper';
import { redirectGuard } from '@guards/redirect';
import { CoreLoginCronHandler } from './services/handlers/cron';
import { CoreCronDelegate } from '@services/cron';
import { CoreEvents } from '@static/events';
import { hasSitesGuard } from './guards/has-sites';

/**
 * Get login services.
 *
 * @returns Returns login services.
 */
export async function getLoginServices(): Promise<Type<unknown>[]> {
    const { CoreLoginHelperProvider } = await import('@features/login/services/login-helper');

    return [
        CoreLoginHelperProvider,
    ];
}

const appRoutes: Routes = [
    {
        path: 'login',
        loadChildren: () => [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'sites',
            },
            {
                path: 'site',
                loadComponent: () => import('@features/login/pages/site/site'),
            },
            {
                path: 'credentials',
                loadComponent: () => CoreLoginHelper.getCredentialsPage(),
            },
            {
                path: 'sites',
                loadComponent: () => import('@features/login/pages/sites/sites'),
                canActivate: [hasSitesGuard],
            },
            {
                path: 'forgottenpassword',
                loadComponent: () => import('@features/login/pages/forgotten-password/forgotten-password'),
            },
            {
                path: 'changepassword',
                loadComponent: () => import('@features/login/pages/change-password/change-password'),
            },
            {
                path: 'emailsignup',
                loadComponent: () => import('@features/login/pages/email-signup/email-signup'),
            },
            {
                path: 'reconnect',
                loadComponent: () => CoreLoginHelper.getReconnectPage(),
            },
        ],
        canActivate: [redirectGuard],
    },
    {
        path: 'logout',
        loadComponent: () => import('@features/login/pages/logout/logout'),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(appRoutes),
    ],
    providers: [
        provideAppInitializer(async () => {
            CoreCronDelegate.register(CoreLoginCronHandler.instance);

            CoreEvents.on(CoreEvents.SESSION_EXPIRED, (data) => {
                CoreLoginHelper.sessionExpired(data);
            });

            CoreEvents.on(CoreEvents.PASSWORD_CHANGE_FORCED, (data) => {
                CoreLoginHelper.passwordChangeForced(data.siteId);
            });

            await CoreLoginHelper.initialize();
        }),
    ],
})
export class CoreLoginModule {}
