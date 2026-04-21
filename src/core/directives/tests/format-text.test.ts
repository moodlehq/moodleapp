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
import { faker } from '@faker-js/faker';

import { CoreConfig } from '@services/config';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';

import { mock, mockSingleton, RenderConfig, renderTemplate, renderWrapperComponent } from '@/testing/utils';
import { ContextLevel } from '@/core/constants';

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
        const sentence = faker.lorem.sentence();

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
            '',
        );
    });

    it('should get filters from server and format text', async () => {
        // Arrange
        const site = mock(new CoreSite('25', 'https://mysite.com', 'token'), {
            getId: () => site.id,
        });

        mockSingleton(CoreSites, {
            getSite: () => Promise.resolve(site),
            getCurrentSite: () => site,
            getCurrentSiteId: () => site.id,
        });

        // Arrange
        mockSingleton(CoreFilterHelper, {
            getFiltersAndFormatText: () => Promise.resolve({
                text: 'Formatted text',
                filters: [],
            }),
        });

        // Act
        const { nativeElement } = await renderTemplate(
            CoreFormatTextDirective,
            `<core-format-text
                text="Lorem ipsum dolor"
                contextLevel="course"
                [contextInstanceId]="42"
            ></core-format-text>`,
        );

        // Assert
        const text = nativeElement.querySelector('core-format-text');
        expect(text).not.toBeNull();
        expect(text?.textContent).toEqual('Formatted text');

        expect(CoreFilterHelper.getFiltersAndFormatText).toHaveBeenCalledTimes(1);
        expect(CoreFilterHelper.getFiltersAndFormatText).toHaveBeenCalledWith(
            'Lorem ipsum dolor',
            ContextLevel.COURSE,
            42,
            expect.anything(),
            '25',
        );
    });

    it('should use external-content directive on images', async () => {
        // Arrange
        const site = mock(new CoreSite('42', 'https://mysite.com', 'token'), {
            canDownloadFiles: () => true,
        });

        // @todo this is done because we cannot mock image being loaded, we should find an alternative...
        CorePromiseUtils.timeoutPromise = <T>() => Promise.resolve(null as unknown as T);

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

    describe('script handling', () => {

        const allowedBaseUrl = 'https://allowed.example.com';
        const allowedScriptUrl = 'https://allowed.example.com/script.js';
        const disallowedScriptUrl = 'https://other.example.com/script.js';

        let allowedScriptUrls: string[];

        beforeEach(() => {
            allowedScriptUrls = [allowedBaseUrl];

            const site = mock(new CoreSite('42', 'https://mysite.com', 'token'), {
                getId: () => site.id,
                getContentAllowedScriptUrls: () => allowedScriptUrls,
            });

            mockSingleton(CoreSites, {
                getSite: () => Promise.resolve(site),
                getCurrentSite: () => site,
                getCurrentSiteId: () => site.id,
            });
        });

        it('should activate allowed scripts in their original DOM position after render', async () => {
            // Act
            const { nativeElement } = await renderWrapperComponent(
                CoreFormatTextDirective,
                'core-format-text',
                { text: `<p>Before</p><script src="${allowedScriptUrl}"></script><p>After</p>` },
                config,
            );

            // Assert
            const formatText = nativeElement.querySelector('core-format-text');
            const script = formatText?.querySelector<HTMLScriptElement>('script');
            expect(script).not.toBeNull();
            expect(script?.src).toEqual(allowedScriptUrl);
            expect(script?.dataset['originalSrc']).toBeUndefined();

            // Verify the script is between the two paragraphs (original position preserved).
            const children = Array.from(formatText?.childNodes ?? []).filter(
                (n): n is Element => n.nodeType === Node.ELEMENT_NODE,
            );
            const scriptIndex = children.findIndex(el => el.tagName === 'SCRIPT');
            expect(children[scriptIndex - 1]?.textContent).toEqual('Before');
            expect(children[scriptIndex + 1]?.textContent).toEqual('After');
        });

        it('should remove disallowed scripts after render', async () => {
            // Act
            const { nativeElement } = await renderWrapperComponent(
                CoreFormatTextDirective,
                'core-format-text',
                { text: `<script src="${disallowedScriptUrl}"></script><p>Content</p>` },
                config,
            );

            // Assert
            const formatText = nativeElement.querySelector('core-format-text');
            expect(formatText?.querySelector('script')).toBeNull();
            expect(formatText?.querySelector('p')?.textContent).toEqual('Content');
        });

        it('should remove all scripts when the site has no allowed script URLs configured', async () => {
            // Arrange
            allowedScriptUrls = [];

            // Act
            const { nativeElement } = await renderWrapperComponent(
                CoreFormatTextDirective,
                'core-format-text',
                { text: `<script src="${allowedScriptUrl}"></script>` },
                config,
            );

            // Assert
            const formatText = nativeElement.querySelector('core-format-text');
            expect(formatText?.querySelector('script')).toBeNull();
        });

        it('should preserve data attributes on activated scripts', async () => {
            // Act
            const { nativeElement } = await renderWrapperComponent(
                CoreFormatTextDirective,
                'core-format-text',
                { text: `<script src="${allowedScriptUrl}" data-custom="value" data-other="123" defer></script>` },
                config,
            );

            // Assert
            const script = nativeElement.querySelector<HTMLScriptElement>('script');
            expect(script).not.toBeNull();
            expect(script?.src).toEqual(allowedScriptUrl);
            expect(script?.dataset['custom']).toEqual('value');
            expect(script?.dataset['other']).toEqual('123');
            expect(script?.hasAttribute('defer')).toBe(true);
            expect(script?.dataset['originalSrc']).toBeUndefined();
        });

        it('should activate allowed scripts and remove disallowed ones when both are present', async () => {
            // Act
            const { nativeElement } = await renderWrapperComponent(
                CoreFormatTextDirective,
                'core-format-text',
                {
                    text: `<script src="${allowedScriptUrl}"></script>` +
                          `<script src="${disallowedScriptUrl}"></script>`,
                },
                config,
            );

            // Assert
            const formatText = nativeElement.querySelector('core-format-text');
            const scripts = formatText?.querySelectorAll('script');
            expect(scripts?.length).toEqual(1);
            expect(scripts?.[0].src).toEqual(allowedScriptUrl);
        });

    });

});
