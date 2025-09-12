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

import { CoreIframeComponent } from '@components/iframe/iframe';

import { mockSingleton, renderTemplate } from '@/testing/utils';
import { CoreScreen, CoreScreenOrientation } from '@services/screen';
import { signal } from '@angular/core';

describe('CoreIframeComponent', () => {

    beforeEach(() => {
        mockSingleton(CoreScreen, {
            orientationSignal: signal(CoreScreenOrientation.PORTRAIT).asReadonly(),
        });
    });

    it('should render', async () => {
        // Arrange.
        CoreIframeComponent.loadingTimeout = 0;

        // Act.
        const { nativeElement } = await renderTemplate(
            CoreIframeComponent,
            '<core-iframe src="https://moodle.org/"></core-iframe>',
        );

        // Assert.
        expect(nativeElement.innerHTML.trim()).not.toHaveLength(0);

        const iframe = nativeElement.querySelector('iframe');
        expect(iframe).not.toBeNull();
        expect(iframe?.src).toEqual('https://moodle.org/');
    });

});
