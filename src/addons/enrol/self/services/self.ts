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

import { CoreCacheUpdateFrequency } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CORE_COURSES_ENROL_INVALID_KEY } from '@features/courses/constants';
import { CoreSites } from '@services/sites';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { makeSingleton } from '@singletons';

/**
 * Service that provides some features to manage self enrolment.
 */
@Injectable({ providedIn: 'root' })
export class AddonEnrolSelfService {

    protected static readonly ROOT_CACHE_KEY = 'AddonEnrolSelf:';

    /**
     * Get info from a course self enrolment method.
     *
     * @param instanceId Self instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getSelfEnrolmentInfo(instanceId: number, siteId?: string): Promise<AddonEnrolSelfGetInstanceInfoWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonEnrolSelfGetInstanceInfoWSParams = {
            instanceid: instanceId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSelfEnrolmentInfoCacheKey(instanceId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        return await site.read<AddonEnrolSelfGetInstanceInfoWSResponse>('enrol_self_get_instance_info', params, preSets);
    }

    /**
     * Get cache key for get course self enrolment methods WS call.
     *
     * @param instanceId Self instance ID.
     * @returns Cache key.
     */
    protected getSelfEnrolmentInfoCacheKey(instanceId: number): string {
        return AddonEnrolSelfService.ROOT_CACHE_KEY + instanceId;
    }

    /**
     * Invalidates get course self enrolment info WS call.
     *
     * @param instanceId Self instance ID.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateSelfEnrolmentInfo(instanceId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSelfEnrolmentInfoCacheKey(instanceId));
    }

    /**
     * Self enrol current user in a certain course.
     *
     * @param courseId Course ID.
     * @param password Password to use.
     * @param instanceId Enrol instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved if the user is enrolled. If the password is invalid, the promise is rejected
     *         with an object with errorcode = CORE_COURSES_ENROL_INVALID_KEY.
     */
    async selfEnrol(courseId: number, password = '', instanceId?: number, siteId?: string): Promise<boolean> {

        const site = await CoreSites.getSite(siteId);

        const params: AddonEnrolSelfEnrolUserWSParams = {
            courseid: courseId,
            password: password,
        };
        if (instanceId) {
            params.instanceid = instanceId;
        }

        const response = await site.write<CoreStatusWithWarningsWSResponse>('enrol_self_enrol_user', params);

        if (!response) {
            throw Error('WS enrol_self_enrol_user failed');
        }

        if (response.status) {
            return true;
        }

        if (response.warnings && response.warnings.length) {
            // Invalid password warnings.
            const warning = response.warnings.find((warning) =>
                warning.warningcode == '2' || warning.warningcode == '3' || warning.warningcode == '4');

            if (warning) {
                throw new CoreWSError({ errorcode: CORE_COURSES_ENROL_INVALID_KEY, message: warning.message });
            } else {
                throw new CoreWSError(response.warnings[0]);
            }
        }

        throw Error('WS enrol_self_enrol_user failed without warnings');
    }

}
export const AddonEnrolSelf = makeSingleton(AddonEnrolSelfService);

/**
 * Params of enrol_self_get_instance_info WS.
 */
type AddonEnrolSelfGetInstanceInfoWSParams = {
    instanceid: number; // Instance id of self enrolment plugin.
};

/**
 * Data returned by enrol_self_get_instance_info WS.
 */
export type AddonEnrolSelfGetInstanceInfoWSResponse = {
    id: number; // Id of course enrolment instance.
    courseid: number; // Id of course.
    type: string; // Type of enrolment plugin.
    name: string; // Name of enrolment plugin.
    status: string; // Status of enrolment plugin.
    enrolpassword?: string; // Password required for enrolment.
};

/**
 * Params of enrol_self_enrol_user WS.
 */
type AddonEnrolSelfEnrolUserWSParams = {
    courseid: number; // Id of the course.
    password?: string; // Enrolment key.
    instanceid?: number; // Instance id of self enrolment plugin.
};
