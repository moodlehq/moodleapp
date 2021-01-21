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

import { Observable } from 'rxjs';

import { AppComponent } from '@/app/app.component';
import { CoreApp } from '@services/app';
import { CoreEvents } from '@singletons/events';
import { CoreLangProvider } from '@services/lang';
import { Network, Platform, NgZone } from '@singletons';

import { mock, mockSingleton, renderComponent, RenderConfig } from '@/testing/utils';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';

describe('AppComponent', () => {

    let langProvider: CoreLangProvider;
    let navigator: CoreNavigatorService;
    let config: Partial<RenderConfig>;

    beforeEach(() => {
        mockSingleton(CoreApp, { setStatusBarColor: jest.fn() });
        mockSingleton(Network, { onChange: () => new Observable() });
        mockSingleton(Platform, { ready: () => Promise.resolve() });
        mockSingleton(NgZone, { run: jest.fn() });

        navigator = mockSingleton(CoreNavigator, ['navigate']);
        langProvider = mock<CoreLangProvider>(['clearCustomStrings']);
        config = {
            providers: [
                { provide: CoreLangProvider, useValue: langProvider },
            ],
        };
    });

    it('should render', async () => {
        const fixture = await renderComponent(AppComponent, config);

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBeTruthy();
    });

    it('cleans up on logout', async () => {
        const fixture = await renderComponent(AppComponent, config);

        fixture.componentInstance.ngOnInit();
        CoreEvents.trigger(CoreEvents.LOGOUT);

        expect(langProvider.clearCustomStrings).toHaveBeenCalled();
        expect(navigator.navigate).toHaveBeenCalledWith('/login/sites', { reset: true });
    });

    it.todo('shows loading while app isn\'t ready');

});
