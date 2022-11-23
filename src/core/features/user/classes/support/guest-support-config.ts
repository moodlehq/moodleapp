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

import { CoreSiteConfigSupportAvailability, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUserNullSupportConfig } from '@features/user/classes/support/null-support-config';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUserSupportConfig } from './support-config';

/**
 * Support config for a guest user.
 */
export class CoreUserGuestSupportConfig extends CoreUserSupportConfig {

    /**
     * Get support config for a site with given url.
     *
     * @param siteUrl Site url.
     * @returns Support config.
     */
    static async forSite(siteUrl: string): Promise<CoreUserSupportConfig> {
        const siteConfig = await CoreUtils.ignoreErrors(CoreSites.getPublicSiteConfigByUrl(siteUrl));

        if (!siteConfig) {
            return new CoreUserNullSupportConfig();
        }

        return new CoreUserGuestSupportConfig(siteConfig);
    }

    private config: CoreSitePublicConfigResponse;

    constructor(config: CoreSitePublicConfigResponse) {
        super();

        this.config = config;
    }

    /**
     * @inheritdoc
     */
    canContactSupport(): boolean {
        if (CoreLoginHelper.isFeatureDisabled('NoDelegate_CoreUserSupport', this.config)) {
            return false;
        }

        // This config was introduced in 4.1, if it's missing we can assume the site is 4.0 or lower.
        if ('supportavailability' in this.config) {
            return this.config.supportavailability === CoreSiteConfigSupportAvailability.Anyone;
        }

        // This config is only available to guests since 4.0, if it's missing we can assume guests can't contact support.
        return 'supportpage' in this.config;
    }

    /**
     * @inheritdoc
     */
    getSupportPageLang(): string | null {
        return this.config.lang ?? null;
    }

    /**
     * @inheritdoc
     */
    protected buildSupportPageUrl(): string {
        return this.config.supportpage?.trim()
            || `${this.config.httpswwwroot || this.config.wwwroot}/user/contactsitesupport.php`;
    }

}
