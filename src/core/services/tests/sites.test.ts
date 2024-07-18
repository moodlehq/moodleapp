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

import { CoreEvents } from '@singletons/events';
import { CoreLang, CoreLangProvider } from '@services/lang';

import { mock, mockSingleton } from '@/testing/utils';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { Http } from '@singletons';
import { of } from 'rxjs';
import { CoreSite } from '@classes/sites/site';
import { CoreHTMLClasses } from '@singletons/html-classes';
import { CoreUtils } from '@services/utils/utils';

describe('CoreSitesProvider', () => {

    let langProvider: CoreLangProvider;
    beforeEach(() => {
        langProvider = mockSingleton(CoreLang, mock({ getCurrentLanguage: async () => 'en' , clearCustomStrings: () => null }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSingleton(Http, { get: () => of(null as any) });
    });

    it('cleans up on logout', async () => {
        const navigator: CoreNavigatorService = mockSingleton(CoreNavigator, ['navigate']);

        CoreSites.initialize();
        CoreEvents.trigger(CoreEvents.LOGOUT);

        expect(langProvider.clearCustomStrings).toHaveBeenCalled();
        expect(navigator.navigate).toHaveBeenCalledWith('/login/sites', { reset: true });
    });

    it('adds ionic platform and theme classes', async () => {
        const siteUrl = 'https://campus.example.edu';
        const themeName = 'mytheme';
        const themeName2 = 'anothertheme';

        CoreHTMLClasses.initialize();
        CoreSites.initialize();

        expect(document.documentElement.classList.contains('ionic8')).toBe(true);

        const site = mock(new CoreSite('42', siteUrl, 'token', { info: {
                sitename: 'Example Campus',
                username: 'admin',
                firstname: 'Admin',
                lastname: 'User',
                fullname: 'Admin User',
                lang: 'en',
                userid: 1,
                siteurl: siteUrl,
                userpictureurl: '',
                theme: themeName,
                functions: [],
        } }));

        mockSingleton(CoreSites, {
            getSite: () => Promise.resolve(site),
            getCurrentSiteId: () => '42',
        });

        CoreEvents.trigger(CoreEvents.LOGIN, {}, '42');
        // Wait the event to be processed.
        await CoreUtils.nextTick();

        expect(document.documentElement.classList.contains('theme-site-'+themeName)).toBe(true);
        expect(document.documentElement.classList.contains('theme-site-'+themeName2)).toBe(false);

        if (site.infos) {
            site.infos.theme = themeName2;
        }

        CoreEvents.trigger(CoreEvents.SITE_UPDATED, site.infos , '42');

        // Wait the event to be processed.
        await CoreUtils.nextTick();

        expect(document.documentElement.classList.contains('theme-site-'+themeName2)).toBe(true);
        expect(document.documentElement.classList.contains('theme-site-'+themeName)).toBe(false);

        CoreEvents.trigger(CoreEvents.LOGOUT);

        expect(document.documentElement.classList.contains('theme-site-'+themeName)).toBe(false);
        expect(document.documentElement.classList.contains('theme-site-'+themeName2)).toBe(false);

        CoreEvents.trigger(CoreEvents.SITE_ADDED, site.infos , '42');

        // Wait the event to be processed.
        await CoreUtils.nextTick();

        expect(document.documentElement.classList.contains('theme-site-'+themeName2)).toBe(true);
        expect(document.documentElement.classList.contains('theme-site-'+themeName)).toBe(false);
    });

});
