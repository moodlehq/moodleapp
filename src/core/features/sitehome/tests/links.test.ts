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

import { mockSingleton } from '@/testing/utils';
import { CoreSite } from '@classes/sites/site';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSiteHomeIndexLinkHandlerService } from '@features/sitehome/services/handlers/index-link';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreCustomURLSchemes } from '@services/urlschemes';

describe('Site Home link handlers', () => {

    it('Handles links ending with /?redirect=0', async () => {
        // Arrange.
        const siteUrl = 'https://school.moodledemo.net';
        const siteId = CoreSites.createSiteID(siteUrl, 'student');

        mockSingleton(CoreSites, {
            isStoredRootURL: () => Promise.resolve({ siteIds: [siteId] }),
            getSite: () => Promise.resolve(new CoreSite(siteId, siteUrl, '')),
            getSiteIdsFromUrl: () => Promise.resolve([siteId]),
            getCurrentSiteId: () => siteId,
            isLoggedIn: () => true,
        });

        mockSingleton(CoreLoginHelper, { getAvailableSites: async () => [{ url: siteUrl, name: 'Example Campus' }] });

        CoreContentLinksDelegate.registerHandler(new CoreSiteHomeIndexLinkHandlerService());

        // Act.
        await CoreCustomURLSchemes.handleCustomURL(`moodlemobile://link=${siteUrl}/?redirect=0`);

        // Assert.
        expect(CoreNavigator.navigateToSitePath).toHaveBeenCalledWith('/home/site', {
            siteId,
            preferCurrentTab: false,
            params: {},
        });
    });

});
