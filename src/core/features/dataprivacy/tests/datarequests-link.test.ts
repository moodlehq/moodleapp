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

import { CoreDataPrivacyDataRequestsLinkHandler } from '@features/dataprivacy/services/handlers/datarequests-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { mockSingleton } from '@/testing/utils';
import { CoreSites } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreNavigator } from '@services/navigator';
import { CORE_DATAPRIVACY_PAGE_NAME } from '@features/dataprivacy/constants';
import { CoreDataPrivacyCreateDataRequestLinkHandler } from '../services/handlers/createdatarequest-link';
import { CoreDataPrivacy } from '../services/dataprivacy';

describe('CoreDataPrivacyDataRequestsLinkHandlerService', () => {

    let site: CoreSite;

    beforeAll(() => {
        site = new CoreSite('siteId', 'https://school.edu', '');

        mockSingleton(CoreDataPrivacy, {
            isEnabled: () => Promise.resolve(true),
        });

        CoreContentLinksDelegate.registerHandler(CoreDataPrivacyDataRequestsLinkHandler.instance);
        CoreContentLinksDelegate.registerHandler(CoreDataPrivacyCreateDataRequestLinkHandler.instance);

        mockSingleton(CoreNavigator, ['navigateToSitePath']);
        mockSingleton(CoreSites, {
            isLoggedIn: () => true,
            getCurrentSiteId: () => site.id,
            getSiteIdsFromUrl: () => Promise.resolve([site.id]),
            getSite: () => Promise.resolve(site),
        });
    });

    it('opens data privacy page', async () => {
        await CoreContentLinksHelper.handleLink('https://school.edu/admin/tool/dataprivacy/mydatarequests.php');

        expect(CoreNavigator.navigateToSitePath).toHaveBeenCalledWith(CORE_DATAPRIVACY_PAGE_NAME, { siteId: site.id });
    });

    it('opens data request modal', async () => {
        await CoreContentLinksHelper.handleLink('https://school.edu/admin/tool/dataprivacy/createdatarequest.php?type=1');

        expect(CoreNavigator.navigateToSitePath).toHaveBeenCalledWith(
            CORE_DATAPRIVACY_PAGE_NAME,
            { params: { createType: 1 }, siteId: site.id },
        );

        await CoreContentLinksHelper.handleLink('https://school.edu/admin/tool/dataprivacy/createdatarequest.php?type=3');

        expect(CoreNavigator.navigateToSitePath).toHaveBeenCalledWith(
            CORE_DATAPRIVACY_PAGE_NAME,
            { params: { createType: 3 }, siteId: site.id },
        );
    });

});
