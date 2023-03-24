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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreXAPIOffline, CoreXAPIOfflineSaveStatementsOptions } from './offline';
import { makeSingleton } from '@singletons';
import { CoreXAPIItemAgent } from '../classes/item-agent';
import { CoreXAPIIRI } from '../classes/iri';

/**
 * Service to provide XAPI functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreXAPIProvider {

    static readonly ROOT_CACHE_KEY = 'CoreXAPI:';

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
     * Delete state. It will fail if offline or cannot connect.
     *
     * @param component Component.
     * @param activityIRI XAPI activity ID IRI.
     * @param agent The xAPI agent json.
     * @param stateId The xAPI state ID.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async deleteStateOnline(
        component: string,
        activityIRI: string,
        agent: string,
        stateId: string,
        options: CoreXAPIStateOptions = {},
    ): Promise<boolean> {
        const site = await CoreSites.getSite(options.siteId);

        const data: CoreXAPIDeleteStateWSParams = {
            component,
            activityId: activityIRI,
            agent,
            stateId,
            registration: options.registration,
        };

        return site.write('core_xapi_delete_state', data, { typeExpected: 'boolean' });
    }

    /**
     * Get cache key for H5P activity data WS calls.
     *
     * @param siteUrl Site URL.
     * @param component Component.
     * @param activityId Activity ID.
     * @param stateId The xAPI state ID.
     * @param registration Registration ID.
     * @returns Cache key.
     */
    protected getStateCacheKey(
        siteUrl: string,
        component: string,
        activityId: number,
        stateId: string,
        registration?: string,
    ): string {
        return `${CoreXAPIProvider.ROOT_CACHE_KEY}state:${component}:${activityId}:${stateId}:${registration ?? ''}`;
    }

    /**
     * Get state from WS.
     *
     * @param component Component.
     * @param activityId Activity ID.
     * @param stateId The xAPI state ID.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async getStateOnline(
        component: string,
        activityId: number,
        stateId: string,
        options: CoreXAPIGetStateOptions = {},
    ): Promise<string | null> {
        const [site, activityIRI] = await Promise.all([
            CoreSites.getSite(options.siteId),
            CoreXAPIIRI.generate(activityId, 'activity'),
        ]);

        const data: CoreXAPIGetStateWSParams = {
            component,
            activityId: activityIRI,
            agent: JSON.stringify(CoreXAPIItemAgent.createFromSite(site).getData()),
            stateId,
            registration: options.registration,
        };
        const preSets: CoreSiteWSPreSets = {
            typeExpected: 'jsonstring',
            cacheKey: this.getStateCacheKey(
                site.getURL(),
                component,
                activityId,
                stateId,
                options.registration,
            ),
            component: options.appComponent,
            componentId: options.appComponentId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('core_xapi_get_state', data, preSets);
    }

    /**
     * Get URL for XAPI events.
     *
     * @param contextId Context ID.
     * @param type Type (e.g. 'activity').
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 4.2. Use CoreXAPIIRI.generate instead.
     */
    async getUrl(contextId: number, type: string, siteId?: string): Promise<string> {
        return CoreXAPIIRI.generate(contextId, type, siteId);
    }

    /**
     * Invalidates a state.
     *
     * @param component Component.
     * @param activityId Activity ID.
     * @param stateId The xAPI state ID.
     * @param options Options.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateState(
        component: string,
        activityId: number,
        stateId: string,
        options: CoreXAPIStateOptions = {},
    ): Promise<void> {
        const site = await CoreSites.getSite(options.siteId);

        await site.invalidateWsCacheForKey(this.getStateCacheKey(
            site.getURL(),
            component,
            activityId,
            stateId,
            options.registration,
        ));
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
    async postStatementsOnline(component: string, json: string, siteId?: string): Promise<boolean[]> {

        const site = await CoreSites.getSite(siteId);

        const data: CoreXAPIStatementPostWSParams = {
            component: component,
            requestjson: json,
        };

        return site.write('core_xapi_statement_post', data);
    }

    /**
     * Post state. It will fail if offline or cannot connect.
     *
     * @param component Component.
     * @param activityIRI XAPI activity ID IRI.
     * @param agent The xAPI agent json.
     * @param stateId The xAPI state ID.
     * @param stateData JSON object with the state data.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async postStateOnline(
        component: string,
        activityIRI: string,
        agent: string,
        stateId: string,
        stateData: string,
        options: CoreXAPIPostStateOptions = {},
    ): Promise<boolean> {
        const site = await CoreSites.getSite(options.siteId);

        const data: CoreXAPIPostStateWSParams = {
            component,
            activityId: activityIRI,
            agent,
            stateId,
            stateData,
            registration: options.registration,
        };

        return site.write('core_xapi_post_state', data, { typeExpected: 'boolean' });
    }

}

export const CoreXAPI = makeSingleton(CoreXAPIProvider);

/**
 * Options to pass to postStatements function.
 */
export type CoreXAPIPostStatementsOptions = CoreXAPIOfflineSaveStatementsOptions & {
    offline?: boolean; // Whether to force storing it in offline.
};

/**
 * Params of core_xapi_statement_post WS.
 */
export type CoreXAPIStatementPostWSParams = {
    component: string; // Component name.
    requestjson: string; // Json object with all the statements to post.
};

/**
 * Options to pass to state functions.
 */
export type CoreXAPIStateOptions = {
    registration?: string; // The xAPI registration UUID.
    siteId?: string;
};

/**
 * Options to pass to getState function.
 */
export type CoreXAPIGetStateOptions = CoreXAPIStateOptions & CoreSitesCommonWSOptions & {
    appComponent?: string; // The app component to link the WS call to.
    appComponentId?: number; // The app component ID to link the WS call to.
};

/**
 * Options to pass to postState function.
 */
export type CoreXAPIPostStateOptions = CoreXAPIStateOptions & {
    offline?: boolean; // Whether to force storing it in offline.
};

/**
 * Params of core_xapi_post_state WS.
 */
export type CoreXAPIPostStateWSParams = {
    component: string; // Component name.
    activityId: string; // XAPI activity ID IRI.
    agent: string; // The xAPI agent json.
    stateId: string; // The xAPI state ID.
    stateData: string; // JSON object with the state data.
    registration?: string; // The xAPI registration UUID.
};

/**
 * Params of core_xapi_delete_state WS.
 */
export type CoreXAPIDeleteStateWSParams = {
    component: string; // Component name.
    activityId: string; // XAPI activity ID IRI.
    agent: string; // The xAPI agent json.
    stateId: string; // The xAPI state ID.
    registration?: string; // The xAPI registration UUID.
};

/**
 * Params of core_xapi_get_state WS.
 */
export type CoreXAPIGetStateWSParams = {
    component: string; // Component name.
    activityId: string; // XAPI activity ID IRI.
    agent: string; // The xAPI agent json.
    stateId: string; // The xAPI state ID.
    registration?: string; // The xAPI registration UUID.
};
