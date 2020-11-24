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

import { NavController } from '@ionic/angular';

import { CoreApp } from '@services/app';
import { CoreInit } from '@services/init';
import { CoreLoginInitPage } from '@features/login/pages/init/init';
import { CoreSites } from '@services/sites';
import { SplashScreen } from '@singletons';

import { mock, mockSingleton, renderComponent, RenderConfig } from '@/testing/utils';

describe('CoreLoginInitPage', () => {

    let navController: NavController;
    let config: Partial<RenderConfig>;

    beforeEach(() => {
        mockSingleton(CoreApp, { getRedirect: () => ({}) });
        mockSingleton(CoreInit, { ready: () => Promise.resolve() });
        mockSingleton(CoreSites, { isLoggedIn: () => false });
        mockSingleton(SplashScreen, ['hide']);

        navController = mock<NavController>(['navigateRoot']);
        config = {
            providers: [
                { provide: NavController, useValue: navController },
            ],
        };
    });

    it('should render', async () => {
        const fixture = await renderComponent(CoreLoginInitPage, config);

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    });

    it('navigates to sites page after loading', async () => {
        const fixture = await renderComponent(CoreLoginInitPage, config);

        fixture.componentInstance.ngOnInit();
        await CoreInit.instance.ready();

        expect(navController.navigateRoot).toHaveBeenCalledWith('/login/sites');
    });

});
