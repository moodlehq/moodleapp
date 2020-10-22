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

import { createComponent, createMock, prepareComponentTest } from '@/tests/utils';

import { AppComponent } from '@app/app.component';
import { CoreLangProvider } from '@services/lang';
import { CoreEvents, CoreEventsProvider } from '@services/events';

describe('App component', () => {

    let langProvider: CoreLangProvider;

    beforeEach(() => {
        langProvider = createMock<CoreLangProvider>(['clearCustomStrings']);

        CoreEvents.setInstance(new CoreEventsProvider());
        prepareComponentTest(AppComponent, [
            { provide: CoreLangProvider, useValue: langProvider },
        ]);
    });

    it('should render', () => {
        const fixture = createComponent(AppComponent);

        expect(fixture.debugElement.componentInstance).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBeTruthy();
    });

    it('clears custom strings on logout', async () => {
        const fixture = createComponent(AppComponent);

        fixture.componentInstance.ngOnInit();
        CoreEvents.instance.trigger(CoreEventsProvider.LOGOUT);

        expect(langProvider.clearCustomStrings).toHaveBeenCalled();
    });

});
