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

import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreSite } from '@classes/site';
import { CoreXAPIOffline, CoreXAPIOfflineSaveStatementsOptions } from './offline';
import { makeSingleton } from '@singletons';
import { CorePath } from '@singletons/path';

/**
 * Service to provide XAPI functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreXAPIProvider {

    /**
     * Returns whether or not WS to post XAPI statement is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if ws is available, false otherwise.
     * @since 3.9
     */
    async canPostStatements(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canPostStatementsInSite(site);
    }

    /**
     * Returns whether or not WS to post XAPI statement is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @returns Promise resolved with true if ws is available, false otherwise.
     * @since 3.9
     */
    canPostStatementsInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site && site.wsAvailable('core_xapi_statement_post'));
    }

    /**
     * Get URL for XAPI events.
     *
     * @param contextId Context ID.
     * @param type Type (e.g. 'activity').
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async getUrl(contextId: number, type: string, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        return CorePath.concatenatePaths(site.getURL(), `xapi/${type}/${contextId}`);
    }

    /**
     * Post statements.
     *
     * @param contextId Context ID.
     * @param component Component.
     * @param json JSON string to send.
     * @param options Options.
     * @returns Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    async postStatements(
        contextId: number,
        component: string,
        json: string,
        options?: CoreXAPIPostStatementsOptions,
    ): Promise<boolean> {

        options = options || {};
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await CoreXAPIOffline.saveStatements(contextId, component, json, options);

            return false;
        };

        if (!CoreNetwork.isOnline() || options.offline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await this.postStatementsOnline(component, json, options.siteId);

            return true;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            } else {
                // Couldn't connect to server, store it offline.
                return storeOffline();
            }
        }
    }

    /**
     * Post statements. It will fail if offline or cannot connect.
     *
     * @param component Component.
     * @param json JSON string to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async postStatementsOnline(component: string, json: string, siteId?: string): Promise<number[]> {

        const site = await CoreSites.getSite(siteId);

        const data = {
            component: component,
            requestjson: json,
        };

        return site.write('core_xapi_statement_post', data);
    }

}

export const CoreXAPI = makeSingleton(CoreXAPIProvider);

/**
 * Options to pass to postStatements function.
 */
export type CoreXAPIPostStatementsOptions = CoreXAPIOfflineSaveStatementsOptions & {
    offline?: boolean; // Whether to force storing it in offline.
};
