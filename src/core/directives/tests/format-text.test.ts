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
import { NgZone } from '@angular/core';
import Faker from 'faker';

import { CoreConfig } from '@services/config';
import { CoreDomUtils, CoreDomUtilsProvider } from '@services/utils/dom';
import { CoreFilepool } from '@services/filepool';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreSite } from '@classes/site';
import { CoreSites } from '@services/sites';
import { CoreUrlUtils, CoreUrlUtilsProvider } from '@services/utils/url';
import { CoreUtils, CoreUtilsProvider } from '@services/utils/utils';
import { Platform } from '@singletons';

import { mock, mockSingleton, RenderConfig, renderWrapperComponent } from '@/testing/utils';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreApp } from '@services/app';

describe('CoreFormatTextDirective', () => {

    let config: Partial<RenderConfig>;

    beforeEach(() => {
        mockSingleton(Platform, { ready: () => Promise.resolve() });
        mockSingleton(CoreConfig, { get: (_, defaultValue) => defaultValue });

        CoreDomUtils.setInstance(new CoreDomUtilsProvider());
        CoreUrlUtils.setInstance(new CoreUrlUtilsProvider());
        CoreUtils.setInstance(new CoreUtilsProvider(mock<NgZone>()));

        config = {
            providers: [
                { provide: IonContent, useValue: null },
            ],
        };
    });

    it('should render', async () => {
        // Arrange
        const sentence = Faker.lorem.sentence();

        mockSingleton(CoreSites, { getSite: () => Promise.reject() });
        mockSingleton(CoreFilter, { formatText: (text) => Promise.resolve(text) });

        // Act
        const fixture = await renderWrapperComponent(
            CoreFormatTextDirective,
            'core-format-text',
            { text: sentence },
            config,
        );

        // Assert
        const text = fixture.nativeElement.querySelector('core-format-text .core-format-text-content');
        expect(text).not.toBeNull();
        expect(text.innerHTML).toEqual(sentence);
    });

    it('should use external-content directive on images', async () => {
        // Arrange
        const site = mock<CoreSite>({
            getId: () => '42',
            canDownloadFiles: () => true,
            isVersionGreaterEqualThan: () => true,
        });

        // @todo this is done because we cannot mock image being loaded, we should find an alternative...
        CoreUtils.instance.timeoutPromise = <T>() => Promise.resolve(null as unknown as T);

        mockSingleton(CoreFilepool, { getSrcByUrl: () => Promise.resolve('file://local-path') });
        mockSingleton(CoreSites, {
            getSite: () => Promise.resolve(site),
            getCurrentSite: () => Promise.resolve(site),
        });
        mockSingleton(CoreFilter, { formatText: (text) => Promise.resolve(text) });
        mockSingleton(CoreApp, { isMobile: () => false });

        // Act
        const fixture = await renderWrapperComponent(
            CoreFormatTextDirective,
            'core-format-text',
            { text: '<img src="https://image-url">', siteId: site.getId() },
            config,
        );

        // Assert
        const image = fixture.nativeElement.querySelector('img');
        expect(image).not.toBeNull();
        expect(image.src).toEqual('file://local-path/');

        expect(CoreSites.getSite).toHaveBeenCalledWith(site.getId());
        expect(CoreFilepool.getSrcByUrl).toHaveBeenCalledTimes(1);
    });

    it.todo('should format text');

    it.todo('should get filters from server and format text');

    it.todo('should use link directive on anchors');

});
