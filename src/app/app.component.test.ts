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

import { AppComponent } from '@/app/app.component';
import { CoreEvents } from '@singletons/events';
import { CoreLang, CoreLangProvider } from '@services/lang';

import { mockSingleton, renderComponent } from '@/testing/utils';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';

describe('AppComponent', () => {

    let langProvider: CoreLangProvider;
    let navigator: CoreNavigatorService;

    beforeEach(() => {
        navigator = mockSingleton(CoreNavigator, ['navigate']);
        langProvider = mockSingleton(CoreLang, ['clearCustomStrings']);
    });

    it('should render', async () => {
        const fixture = await renderComponent(AppComponent);

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBeTruthy();
    });

    it('cleans up on logout', async () => {
        const fixture = await renderComponent(AppComponent);

        fixture.componentInstance.ngOnInit();
        CoreEvents.trigger(CoreEvents.LOGOUT);

        expect(langProvider.clearCustomStrings).toHaveBeenCalled();
        expect(navigator.navigate).toHaveBeenCalledWith('/login/sites', { reset: true });
    });

});
