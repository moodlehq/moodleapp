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

import { CoreApp } from '@services/app';
import { CoreLoginInitPage } from '@features/login/pages/init/init';
import { CoreSites } from '@services/sites';
import { ApplicationInit, SplashScreen } from '@singletons';

import { mockSingleton, renderComponent } from '@/testing/utils';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';

describe('CoreLoginInitPage', () => {

    let navigator: CoreNavigatorService;

    beforeEach(() => {
        mockSingleton(CoreApp, { getRedirect: () => ({}) });
        mockSingleton(ApplicationInit, { donePromise: Promise.resolve() });
        mockSingleton(CoreSites, { isLoggedIn: () => false });
        mockSingleton(SplashScreen, ['hide']);

        navigator = mockSingleton(CoreNavigator, ['navigate']);
    });

    it('should render', async () => {
        const fixture = await renderComponent(CoreLoginInitPage, {});

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    });

    it('navigates to sites page after loading', async () => {
        const fixture = await renderComponent(CoreLoginInitPage, {});

        fixture.componentInstance.ngOnInit();
        await ApplicationInit.instance.donePromise;

        expect(navigator.navigate).toHaveBeenCalledWith('/login/sites', { reset: true });
    });

});
