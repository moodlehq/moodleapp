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

import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';
import { CoreSite, CoreSiteConfigResponse } from '@classes/sites/site';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { of } from 'rxjs';

export interface CoreSiteFixture {
    id: string;
    info: CoreSiteInfo;
}

export class CoreSiteStub extends CoreSite {

    protected wsStubs: Record<string, unknown> = {};

    constructor (fixture: CoreSiteFixture) {
        super(fixture.id, fixture.info.siteurl, '', { info: fixture.info });

        this.stubWSResponse<CoreSiteConfigResponse>('tool_mobile_get_config', {
            settings: [],
            warnings: [],
        });
    }

    /**
     * @inheritdoc
     */
    readObservable<T = unknown>(wsFunction: string, data: unknown, preSets?: CoreSiteWSPreSets): WSObservable<T> {
        if (wsFunction in this.wsStubs) {
            return of(this.wsStubs[wsFunction] as T);
        }

        return super.readObservable<T>(wsFunction, data, preSets);
    }

    /**
     * Prepare as stubbed response for a given WS.
     *
     * @param wsFunction WS function.
     * @param response Response.
     */
    stubWSResponse<T=unknown>(wsFunction: string, response: T): void {
        this.wsStubs[wsFunction] = response;
    }

}
