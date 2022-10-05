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

import { CoreSharedModule } from '@/core/shared.module';
import { findElement, mockSingleton, renderPageComponent, requireElement } from '@/testing/utils';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreLoginComponentsModule } from '@features/login/components/components.module';
import { CoreLoginCredentialsPage } from '@features/login/pages/credentials/credentials';
import { CoreSites } from '@services/sites';

describe('Credentials page', () => {

    it('renders', async () => {
        // Arrange.
        const siteUrl = 'https://campus.example.edu';

        // Act.
        const fixture = await renderPageComponent(CoreLoginCredentialsPage, {
            routeParams: { siteUrl },
            imports: [
                CoreSharedModule,
                CoreLoginComponentsModule,
            ],
        });

        // Assert.
        expect(findElement(fixture, '.core-siteurl', siteUrl)).not.toBeNull();
    });

    it('suggests contacting support after multiple failed attempts', async () => {
        // Arrange.
        mockSingleton(CoreSites, {
            getUserToken: () => {
                throw new CoreSiteError({
                    message: '',
                    errorcode: 'invalidlogin',
                });
            },
        });

        const fixture = await renderPageComponent(CoreLoginCredentialsPage, {
            routeParams: {
                siteUrl: 'https://campus.example.edu',
                siteConfig: { supportpage: '' },
            },
            imports: [
                CoreSharedModule,
                CoreLoginComponentsModule,
            ],
        });

        // Act.
        const form = requireElement<HTMLFormElement>(fixture, 'form');
        const formControls = fixture.componentInstance.credForm.controls;

        formControls['username'].setValue('student');
        formControls['password'].setValue('secret');

        for (let i = 0; i < 3; i++) {
            form.submit();

            await fixture.whenRenderingDone();
            await fixture.whenStable();
        }

        // Assert.
        expect(findElement(fixture, 'ion-label', 'core.login.exceededloginattempts')).not.toBeNull();
    });

});
