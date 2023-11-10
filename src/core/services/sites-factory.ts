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

import { Injectable } from '@angular/core';
import { CoreCandidateSite } from '@classes/sites/candidate-site';

import { CoreSite, CoreSiteConfig } from '@classes/sites/site';
import { CoreUnauthenticatedSite, CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { makeSingleton } from '@singletons';

/*
 * Provider to create sites instances.
*/
@Injectable({ providedIn: 'root' })
export class CoreSitesFactoryService {

    /**
     * Make a site object.
     *
     * @param id Site ID.
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param info Site info.
     * @param privateToken Private token.
     * @param config Site public config.
     * @param loggedOut Whether user is logged out.
     * @returns Site instance.
     */
    makeSite(
        id: string,
        siteUrl: string,
        token: string,
        info?: CoreSiteInfo,
        privateToken?: string,
        config?: CoreSiteConfig,
        loggedOut?: boolean,
    ): CoreSite {
        return new CoreSite(id, siteUrl, token, info, privateToken, config, loggedOut);
    }

    /**
     * Create a candidate site instance.
     *
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param privateToken Private token.
     * @returns Candidate site instance.
     */
    makeCandidateSite(siteUrl: string, token: string, privateToken?: string): CoreCandidateSite {
        return new CoreCandidateSite(siteUrl, token, privateToken);
    }

    /**
     * Create an unauthenticated site instance.
     *
     * @param siteUrl Site URL.
     * @returns Unauthenticated site instance.
     */
    makeUnauthenticatedSite(siteUrl: string): CoreUnauthenticatedSite {
        return new CoreUnauthenticatedSite(siteUrl);
    }

}

export const CoreSitesFactory = makeSingleton(CoreSitesFactoryService);
