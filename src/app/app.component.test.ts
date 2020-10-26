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

import { AppComponent } from '@app/app.component';
import { CoreEvents } from '@singletons/events';
import { CoreLangProvider } from '@services/lang';

import { mock, renderComponent, RenderConfig } from '@/tests/utils';

describe('AppComponent', () => {

    let langProvider: CoreLangProvider;
    let navController: NavController;
    let config: Partial<RenderConfig>;

    beforeEach(() => {
        langProvider = mock<CoreLangProvider>(['clearCustomStrings']);
        navController = mock<NavController>(['navigateRoot']);
        config = {
            providers: [
                { provide: CoreLangProvider, useValue: langProvider },
                { provide: NavController, useValue: navController },
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
        expect(navController.navigateRoot).toHaveBeenCalledWith('/login/sites');
    });

});
