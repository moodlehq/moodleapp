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

import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CoreUserSupportConfig } from './support-config';
import { CoreSiteConfigSupportAvailability } from '@classes/sites/unauthenticated-site';
import { CoreAuthenticatedSite } from '@classes/sites/authenticated-site';

/**
 * Support config for an authenticated user.
 */
export class CoreUserAuthenticatedSupportConfig extends CoreUserSupportConfig {

    /**
     * Get config for the current site.
     *
     * @returns Support config.
     */
    static forCurrentSite(): CoreUserAuthenticatedSupportConfig {
        return new CoreUserAuthenticatedSupportConfig(CoreSites.getRequiredCurrentSite());
    }

    private site: CoreSite | CoreAuthenticatedSite;

    constructor(site: CoreSite | CoreAuthenticatedSite) {
        super();

        this.site = site;
    }

    /**
     * @inheritdoc
     */
    canContactSupport(): boolean {
        if (this.site.isFeatureDisabled('NoDelegate_CoreUserSupport')) {
            return false;
        }

        if (this.site.isVersionGreaterEqualThan('4.1')) {
            if (!('config' in this.site) || !this.site.config || !('supportavailability' in this.site.config)) {
                return false;
            }

            const supportAvailability = Number(this.site.config.supportavailability);

            return supportAvailability === CoreSiteConfigSupportAvailability.Authenticated
                || supportAvailability === CoreSiteConfigSupportAvailability.Anyone;
        }

        if (this.site.isVersionGreaterEqualThan('4.0')) {
            // This feature was always available in 4.0.
            return true;
        }

        // This feature wasn't available before 4.0.
        return false;
    }

    /**
     * @inheritdoc
     */
    getSupportPageLang(): string | null {
        return this.site.infos?.lang ?? null;
    }

    /**
     * @inheritdoc
     */
    protected buildSupportPageUrl(): string {
        const config = 'config' in this.site ? this.site.config : undefined;

        return config?.supportpage?.trim()
            || `${config?.httpswwwroot ?? config?.wwwroot ?? this.site.siteUrl}/user/contactsitesupport.php`;
    }

}
