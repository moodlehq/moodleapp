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

/**
 * Statement agent (user) object for xAPI structure checking and usage.
 */
export class CoreXAPIItemAgent {

    protected constructor(protected data: Record<string, unknown>, protected user: CoreXAPIItemAgentUser) { }

    /**
     * Get agent's user.
     *
     * @returns User.
     */
    getUser(): CoreXAPIItemAgentUser {
        return this.user;
    }

    /**
     * Get agent's data.
     *
     * @returns Data.
     */
    getData(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Create an item agent based on a certain's site user.
     *
     * @param site Site to use.
     * @returns Item agent instance.
     */
    static createFromSite(site: CoreSite): CoreXAPIItemAgent {
        const username = site.getInfo()?.username ?? '';
        const data = {
            name: username,
            objectType: 'Agent',
            account: {
                name: site.getUserId(),
                homePage: site.getURL(),
            },
        };

        return new CoreXAPIItemAgent(data, {
            id: site.getUserId(),
            username,
        });
    }

}

type CoreXAPIItemAgentUser = {
    id: number;
    username: string;
};
