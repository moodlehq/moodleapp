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

import { companyLisaSite } from '@/assets/storybook/sites/companylisa';
import { schoolBarbaraSite } from '@/assets/storybook/sites/schoolbarbara';
import { schoolJefferySite } from '@/assets/storybook/sites/schooljeffery';
import { CoreSiteFixture, CoreSiteStub } from '@/storybook/stubs/classes/site';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/sites/site';
import { SiteDBEntry } from '@services/database/sites';
import { CoreSiteBasicInfo, CoreSitesProvider } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Sites provider stub.
 */
export class CoreSitesProviderStub extends CoreSitesProvider {

    protected static readonly SITES_FIXTURES = [schoolBarbaraSite, schoolJefferySite, companyLisaSite];

    /**
     * @inheritdoc
     */
    getRequiredCurrentSite!: () => CoreSiteStub;

    /**
     * @inheritdoc
     */
    async getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = CoreSitesProviderStub.SITES_FIXTURES.map(site => (<SiteDBEntry> {
            id: site.id,
            siteUrl: site.info.siteurl,
            info: JSON.stringify(site.info),
            token: '',
            privateToken: '',
            loggedOut: 0,
        }));

        return this.siteDBRecordsToBasicInfo(sites, ids);
    }

    /**
     * @inheritdoc
     */
    async getSite(siteId?: string): Promise<CoreSite> {
        if (!siteId) {
            if (this.currentSite) {
                return this.currentSite;
            }

            throw new CoreError('No current site found.');
        }

        const siteFixture = CoreSitesProviderStub.SITES_FIXTURES.find(site => site.id === siteId);
        if (!siteFixture) {
            throw new CoreError('SiteId not found.');
        }

        return new CoreSiteStub(siteFixture);
    }

    /**
     * @inheritdoc
     */
    stubCurrentSite(fixture?: CoreSiteFixture): CoreSiteStub {
        if (!this.currentSite) {
            this.currentSite = new CoreSiteStub(fixture ?? schoolBarbaraSite);
        }

        return this.getRequiredCurrentSite();
    }

}

export const CoreSitesStub = makeSingleton<CoreSitesProviderStub>(CoreSitesProvider);
