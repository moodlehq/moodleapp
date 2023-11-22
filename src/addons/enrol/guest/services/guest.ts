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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreEnrolEnrolmentInfo } from '@features/enrol/services/enrol';
import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';

/**
 * Service that provides some features to manage guest enrolment.
 */
@Injectable({ providedIn: 'root' })
export class AddonEnrolGuestService {

    protected static readonly ROOT_CACHE_KEY = 'AddonEnrolGuest:';

    /**
     * Get info from a course guest enrolment method.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<AddonEnrolGuestInfo> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonEnrolGuestGetInstanceInfoWSParams = {
            instanceid: instanceId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getGuestEnrolmentInfoCacheKey(instanceId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        const response =
            await site.read<AddonEnrolGuestGetInstanceInfoWSResponse>('enrol_guest_get_instance_info', params, preSets);

        return response.instanceinfo;
    }

    /**
     * Get cache key for get course guest enrolment methods WS call.
     *
     * @param instanceId Guest instance ID.
     * @returns Cache key.
     */
    protected getGuestEnrolmentInfoCacheKey(instanceId: number): string {
        return AddonEnrolGuestService.ROOT_CACHE_KEY + instanceId;
    }

    /**
     * Invalidates get course guest enrolment info WS call.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await Promise.all([
            site.invalidateWsCacheForKey(this.getGuestEnrolmentInfoCacheKey(instanceId)),
            site.invalidateWsCacheForKey(`mmCourses:guestinfo:${instanceId}`), // @todo Remove after 4.3 release.
        ]);
    }

    /**
     * Check if guest password validation WS is available on the current site.
     *
     * @returns Whether guest password validation WS is available.
     */
    isValidateGuestAccessPasswordAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('enrol_guest_validate_password');
    }

    /**
     * Perform password validation of guess access.
     *
     * @param enrolmentInstanceId Instance id of guest enrolment plugin.
     * @param password Course Password.
     * @returns Wether the password is valid.
     */
    async validateGuestAccessPassword(
        enrolmentInstanceId: number,
        password: string,
    ): Promise<AddonEnrolGuestValidatePasswordWSResponse> {
        const site = CoreSites.getCurrentSite();

        if (!site) {
            return {
                validated: false,
            };
        }

        const params: AddonEnrolGuestValidatePasswordWSParams = {
            instanceid: enrolmentInstanceId,
            password,
        };

        return await site.write<AddonEnrolGuestValidatePasswordWSResponse>('enrol_guest_validate_password', params);
    }

}
export const AddonEnrolGuest = makeSingleton(AddonEnrolGuestService);

/**
 * Params of enrol_guest_get_instance_info WS.
 */
type AddonEnrolGuestGetInstanceInfoWSParams = {
    instanceid: number; // Instance id of guest enrolment plugin.
};

/**
 * Data returned by enrol_guest_get_instance_info WS.
 */
export type AddonEnrolGuestGetInstanceInfoWSResponse = {
    instanceinfo: AddonEnrolGuestInfo;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Course guest enrolment method.
 */
export type AddonEnrolGuestInfo = CoreEnrolEnrolmentInfo & {
    passwordrequired: boolean; // Is a password required?
    status: boolean; // Is the enrolment enabled?
};

/**
 * Params of enrol_guest_validate_password WS.
 */
type AddonEnrolGuestValidatePasswordWSParams = {
    instanceid: number; // instance id of guest enrolment plugin
    password: string; // the course password
};

/**
 * Data returned by enrol_guest_get_instance_info WS.
 */
export type AddonEnrolGuestValidatePasswordWSResponse = {
    validated: boolean; // Whether the password was successfully validated
    hint?: string; // Password hint (if enabled)
    warnings?: CoreWSExternalWarning[];
};
