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

import { CoreInit } from '@services/init';
import { CoreLoginInitPage } from '@core/login/pages/init/init.page';
import { CoreApp } from '@/app/services/app';

import { createComponent, preparePageTest, PageTestMocks, mockSingleton } from '@/tests/utils';

describe('CoreLogin Init Page', () => {

    let mocks: PageTestMocks;

    beforeEach(async () => {
        const initPromise = Promise.resolve();

        mockSingleton(CoreInit, [], { ready: () => initPromise });
        mockSingleton(CoreApp, [], { getRedirect: () => ({}) });

        mocks = await preparePageTest(CoreLoginInitPage);
    });

    it('should render', () => {
        const fixture = createComponent(CoreLoginInitPage);

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    });

    it('navigates to site page after loading', async () => {
        const fixture = createComponent(CoreLoginInitPage);

        fixture.componentInstance.ngOnInit();
        await CoreInit.instance.ready();

        expect(mocks.router.navigate).toHaveBeenCalledWith(['/login/site']);
    });

});
