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

import { makeSingleton } from '@singletons/core.singletons';
import { CoreLogger } from '@singletons/logger';

/**
 * Data stored for a redirect to another page/site.
 */
export type CoreRedirectData = {
    /**
     * ID of the site to load.
     */
    siteId?: string;

    /**
     * Name of the page to redirect to.
     */
    page?: string;

    /**
     * Params to pass to the page.
     */
    params?: any;

    /**
     * Timestamp when this redirect was last modified.
     */
    timemodified?: number;
};

/**
 * Factory to provide some global functionalities, like access to the global app database.
 * @description
 * Each service or component should be responsible of creating their own database tables. Example:
 *
 * constructor(appProvider: CoreAppProvider) {
 *     this.appDB = appProvider.getDB();
 *     this.appDB.createTableFromSchema(this.tableSchema);
 * }
 */
@Injectable()
export class CoreAppProvider {
    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreAppProvider');
    }

    /**
     * Retrieve redirect data.
     *
     * @return Object with siteid, state, params and timemodified.
     */
    getRedirect(): CoreRedirectData {
        if (localStorage && localStorage.getItem) {
            try {
                const data: CoreRedirectData = {
                    siteId: localStorage.getItem('CoreRedirectSiteId'),
                    page: localStorage.getItem('CoreRedirectState'),
                    params: localStorage.getItem('CoreRedirectParams'),
                    timemodified: parseInt(localStorage.getItem('CoreRedirectTime'), 10)
                };

                if (data.params) {
                    data.params = JSON.parse(data.params);
                }

                return data;
            } catch (ex) {
                this.logger.error('Error loading redirect data:', ex);
            }
        }

        return {};
    }

    /**
     * Store redirect params.
     *
     * @param siteId Site ID.
     * @param page Page to go.
     * @param params Page params.
     */
    storeRedirect(siteId: string, page: string, params: any): void {
        if (localStorage && localStorage.setItem) {
            try {
                localStorage.setItem('CoreRedirectSiteId', siteId);
                localStorage.setItem('CoreRedirectState', page);
                localStorage.setItem('CoreRedirectParams', JSON.stringify(params));
                localStorage.setItem('CoreRedirectTime', String(Date.now()));
            } catch (ex) {
                // Ignore errors.
            }
        }
    }
}

export class CoreApp extends makeSingleton(CoreAppProvider) {}
