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
import { CoreAuthenticatedSite, CoreAuthenticatedSiteOptionalData } from '@classes/sites/authenticated-site';

import { CoreSite, CoreSiteOptionalData } from '@classes/sites/site';
import { CoreUnauthenticatedSite, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { makeSingleton } from '@singletons';

/*
 * Provider to create sites instances.
*/
@Injectable({ providedIn: 'root' })
export class CoreSitesFactoryService {

    /**
     * Create a site instance.
     *
     * @param id Site ID.
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param otherData Other data.
     * @returns Site instance.
     */
    makeSite(
        id: string,
        siteUrl: string,
        token: string,
        otherData: CoreSiteOptionalData = {},
    ): CoreSite {
        return new CoreSite(id, siteUrl, token, otherData);
    }

    /**
     * Create an authenticated site instance.
     *
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param options Other options.
     * @returns Authenticated site instance.
     */
    makeAuthenticatedSite(siteUrl: string, token: string, options: CoreAuthenticatedSiteOptionalData = {}): CoreAuthenticatedSite {
        return new CoreAuthenticatedSite(siteUrl, token, options);
    }

    /**
     * Create an unauthenticated site instance.
     *
     * @param siteUrl Site URL.
     * @param publicConfig Site public config.
     * @returns Unauthenticated site instance.
     */
    makeUnauthenticatedSite(siteUrl: string, publicConfig?: CoreSitePublicConfigResponse): CoreUnauthenticatedSite {
        return new CoreUnauthenticatedSite(siteUrl, publicConfig);
    }

}

export const CoreSitesFactory = makeSingleton(CoreSitesFactoryService);
