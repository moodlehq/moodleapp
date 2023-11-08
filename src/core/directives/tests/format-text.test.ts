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

import { IonContent } from '@ionic/angular';
import Faker from 'faker';

import { CoreConfig } from '@services/config';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';

import { mock, mockSingleton, RenderConfig, renderTemplate, renderWrapperComponent } from '@/testing/utils';

describe('CoreFormatTextDirective', () => {

    let config: Partial<RenderConfig>;

    beforeEach(() => {
        mockSingleton(CoreSites, { getSite: () => Promise.reject() });
        mockSingleton(CoreConfig, {
            get(name, defaultValue) {
                if (defaultValue === undefined) {
                    throw Error(`Default value not provided for '${name}'`);
                }

                return Promise.resolve(defaultValue);
            },
        });
        mockSingleton(CoreFilter, { formatText: text => Promise.resolve(text) });
        mockSingleton(CoreFilterHelper, { getFiltersAndFormatText: text => Promise.resolve({ text, filters: [] }) });

        config = {
            providers: [
                { provide: IonContent, useValue: null },
            ],
        };
    });

    it('should render', async () => {
        // Arrange
        const sentence = Faker.lorem.sentence();

        // Act
        const fixture = await renderWrapperComponent(
            CoreFormatTextDirective,
            'core-format-text',
            { text: sentence },
            config,
        );

        // Assert
        const text = fixture.nativeElement.querySelector('core-format-text');
        expect(text).not.toBeNull();
        expect(text?.innerHTML).toEqual(sentence);
    });

    it('should format text', async () => {
        // Arrange
        mockSingleton(CoreFilter, { formatText: () => Promise.resolve('Formatted text') });

        // Act
        const { nativeElement } = await renderTemplate(
            CoreFormatTextDirective,
            '<core-format-text text="Lorem ipsum dolor"></core-format-text>',
        );

        // Assert
        const text = nativeElement.querySelector('core-format-text');
        expect(text).not.toBeNull();
        expect(text?.textContent).toEqual('Formatted text');

        expect(CoreFilter.formatText).toHaveBeenCalledTimes(1);
        expect(CoreFilter.formatText).toHaveBeenCalledWith(
            'Lorem ipsum dolor',
            expect.anything(),
            expect.anything(),
            undefined,
        );
    });

    it('should get filters from server and format text', async () => {
        // Arrange
        mockSingleton(CoreFilterHelper, {
            getFiltersAndFormatText: () => Promise.resolve({
                text: 'Formatted text',
                filters: [],
            }),
        });

        // Act
        const { nativeElement } = await renderTemplate(CoreFormatTextDirective, `
            <core-format-text
                text="Lorem ipsum dolor"
                contextLevel="course"
                [contextInstanceId]="42"
            ></core-format-text>
        `);

        // Assert
        const text = nativeElement.querySelector('core-format-text');
        expect(text).not.toBeNull();
        expect(text?.textContent).toEqual('Formatted text');

        expect(CoreFilterHelper.getFiltersAndFormatText).toHaveBeenCalledTimes(1);
        expect(CoreFilterHelper.getFiltersAndFormatText).toHaveBeenCalledWith(
            'Lorem ipsum dolor',
            'course',
            42,
            expect.anything(),
            undefined,
        );
    });

    it('should use external-content directive on images', async () => {
        // Arrange
        const site = mock(new CoreSite('42', 'https://mysite.com', 'token'), {
            canDownloadFiles: () => true,
        });

        // @todo this is done because we cannot mock image being loaded, we should find an alternative...
        CoreUtils.instance.timeoutPromise = <T>() => Promise.resolve(null as unknown as T);

        mockSingleton(CoreFilepool, { getSrcByUrl: () => Promise.resolve('file://local-path') });
        mockSingleton(CoreSites, {
            getSite: () => Promise.resolve(site),
            getCurrentSite: () => site,
        });

        // Act
        const { nativeElement } = await renderWrapperComponent(
            CoreFormatTextDirective,
            'core-format-text',
            { text: '<img src="https://image-url">', siteId: site.getId() },
            config,
        );

        // Assert
        const image = nativeElement.querySelector('img');
        expect(image).not.toBeNull();
        expect(image?.src).toEqual('file://local-path/');

        expect(CoreSites.getSite).toHaveBeenCalledWith(site.getId());
        expect(CoreFilepool.getSrcByUrl).toHaveBeenCalledTimes(1);
    });

    it('should use link directive on anchors', async () => {
        // Arrange
        mockSingleton(CoreContentLinksHelper, { handleLink: () => Promise.resolve(true) });

        // Act
        const { nativeElement } = await renderWrapperComponent(
            CoreFormatTextDirective,
            'core-format-text',
            { text: '<a href="https://anchor-url/">Link</a>' },
        );
        const anchor = nativeElement.querySelector('a');

        anchor?.click();

        // Assert
        expect(CoreContentLinksHelper.handleLink).toHaveBeenCalledTimes(1);
        expect(CoreContentLinksHelper.handleLink).toHaveBeenCalledWith(
            'https://anchor-url/',
            undefined,
            expect.anything(),
            expect.anything(),
        );
    });

});
