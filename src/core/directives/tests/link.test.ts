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

import { CoreLinkDirective } from '@directives/link';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

import { mockSingleton, renderTemplate } from '@/testing/utils';

describe('CoreLinkDirective', () => {

    it('should render', async () => {
        // Act
        const fixture = await renderTemplate(
            CoreLinkDirective,
            '<a href="https://moodle.org/" core-link [capture]="true">Link</a>',
            { standalone: true },
        );

        // Assert
        expect(fixture.nativeElement.innerHTML.trim()).not.toHaveLength(0);

        const anchor = fixture.nativeElement.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor?.href).toEqual('https://moodle.org/');
    });

    it('should capture clicks', async () => {
        // Arrange
        mockSingleton(CoreContentLinksHelper, { handleLink: () => Promise.resolve(true) });

        // Act
        const { nativeElement } = await renderTemplate(
            CoreLinkDirective,
            '<a href="https://moodle.org/" core-link [capture]="true">Link</a>',
            { standalone: true },
        );

        const anchor = nativeElement.querySelector('a');

        anchor?.click();

        // Assert
        expect(CoreContentLinksHelper.handleLink).toHaveBeenCalledTimes(1);
        expect(CoreContentLinksHelper.handleLink).toHaveBeenCalledWith(
            'https://moodle.org/',
            undefined,
            expect.anything(),
            expect.anything(),
        );
    });

});
