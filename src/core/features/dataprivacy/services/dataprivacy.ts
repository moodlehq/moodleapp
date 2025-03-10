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
import { CoreWSError } from '@classes/errors/wserror';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreUserSummary } from '@features/user/services/user';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreTextFormat } from '@singletons/text';

/**
 * Service to handle data privacy.
 */
@Injectable({ providedIn: 'root' })
export class CoreDataPrivacyService {

    static readonly ROOT_CACHE_KEY = 'CoreDataPrivacy:';

    /**
     * Check if data privacy is enabled on current site.
     *
     * @returns Whether data privacy is enabled.
     */
    async isEnabled(): Promise<boolean> {
        const site = CoreSites.getCurrentSite();

        // Check if the privacy data WS are available in the site.
        if (!site?.wsAvailable('tool_dataprivacy_get_data_requests')) {
            return false;
        }

        // If the user can contact the DPO, then data privacy is enabled.
        const accessInformation = await this.getAccessInformation();

        return accessInformation.cancontactdpo;
    }

    /**
     * Get cache key for data privacy access information WS calls.
     *
     * @returns Cache key.
     */
    protected getAccessInformationCacheKey(): string {
        return CoreDataPrivacyService.ROOT_CACHE_KEY + 'accessInformation';
    }

    /**
     * Retrieving privacy API access (permissions) information for the current user.
     *
     * @param options Request options.
     * @returns Promise resolved with object with access information.
     * @since 4.4
     */
    async getAccessInformation(
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreDataPrivacyGetAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAccessInformationCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('tool_dataprivacy_get_access_information', undefined, preSets);
    }

    /**
     * Invalidates access information.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    protected async invalidateAccessInformation(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey());
    }

    /**
     * Contact the site Data Protection Officer(s).
     *
     * @param message Message to send to the DPO.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether the message was sent.
     * @since 4.4
     */
    async contactDPO(message: string, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreDataPrivacyContactDPOWSParams = { message };

        const response = await site.write<CoreDataPrivacyContactDPOWSResponse>('tool_dataprivacy_contact_dpo', params);

        if (response.warnings && response.warnings.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.result;
    }

    /**
     * Get cache key for data requests WS calls.
     *
     * @returns Cache key.
     */
    protected getDataRequestsCacheKey(): string {
        return CoreDataPrivacyService.ROOT_CACHE_KEY + 'datarequests';
    }

    /**
     * Fetch the details of a user's data request.
     *
     * @param options Request options.
     * @returns Promise resolved with the data requests.
     * @since 4.4
     */
    async getDataRequests(
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreDataPrivacyRequest[]> {
        const site = await CoreSites.getSite(options.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getDataRequestsCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const params: CoreDataPrivacyGetDataRequestsWSParams = {
            userid: site.getUserId(),
        };

        const response =
            await site.read<CoreDataPrivacyGetDataRequestsWSResponse>('tool_dataprivacy_get_data_requests', params, preSets);

        return response.requests;
    }

    /**
     * Invalidate data requests.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDataRequests(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getDataRequestsCacheKey());
    }

    /**
     * Creates a data request.
     *
     * @param type Type of the request.
     * @param comments Comments for the data request.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the request is created.
     * @since 4.4
     */
    async createDataRequest(type: CoreDataPrivacyDataRequestType, comments: string, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreDataPrivacyCreateDataRequestWSParams = {
            type,
            comments,
        };

        const response =
            await site.write<CoreDataPrivacyCreateDataRequestWSResponse>('tool_dataprivacy_create_data_request', params);

        if (response.warnings && response.warnings.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.datarequestid;
    }

    /**
     * Cancel the data request made by the user.
     *
     * @param requestid ID of the request to cancel.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether the request was canceled.
     * @since 4.4
     */
    async cancelDataRequest(requestid: number, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreDataPrivacyCancelDataRequestWSParams = { requestid };

        const response =
            await site.write<CoreDataPrivacyCancelDataRequestWSResponse>('tool_dataprivacy_cancel_data_request', params);

        if (response.warnings && response.warnings.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.result;
    }

    /**
     * Invalidate all the data related to data privacy.
     */
    async invalidateAll(): Promise<void> {
        await Promise.all([
            this.invalidateAccessInformation(),
            this.invalidateDataRequests(),
        ]);
    }

    /**
     * Check if the user can cancel a request.
     *
     * @param request The request to check.
     * @returns Whether the user can cancel the request.
     */
    canCancelRequest(request: CoreDataPrivacyRequest): boolean {
        const cannotCancelStatuses = [
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_COMPLETE,
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_DOWNLOAD_READY,
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_DELETED,
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_EXPIRED,
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_CANCELLED,
            CoreDataPrivacyDataRequestStatus.DATAREQUEST_STATUS_REJECTED,
        ];

        return !cannotCancelStatuses.includes(request.status);
    }

}

export const CoreDataPrivacy = makeSingleton(CoreDataPrivacyService);

export enum CoreDataPrivacyDataRequestType {
    DATAREQUEST_TYPE_EXPORT = 1, // Data export request type.
    DATAREQUEST_TYPE_DELETE = 2, // Data deletion request type.
    DATAREQUEST_TYPE_OTHERS = 3, // Other request type. Usually of enquiries to the DPO.
}

export enum CoreDataPrivacyDataRequestStatus {
    DATAREQUEST_STATUS_PENDING = 0, // Newly submitted and we haven't yet started finding out where they have data.
    DATAREQUEST_STATUS_PREPROCESSING = 1, // Newly submitted and we have started to find the location of data.
    DATAREQUEST_STATUS_AWAITING_APPROVAL = 2, // Metadata ready and awaiting review and approval by the Data Protection officer.
    DATAREQUEST_STATUS_APPROVED = 3, // Request approved and will be processed soon.
    DATAREQUEST_STATUS_PROCESSING = 4, // The request is now being processed.
    DATAREQUEST_STATUS_COMPLETE = 5, // Information/other request completed.
    DATAREQUEST_STATUS_CANCELLED = 6, // Data request cancelled by the user.
    DATAREQUEST_STATUS_REJECTED = 7, // Data request rejected by the DPO.
    DATAREQUEST_STATUS_DOWNLOAD_READY = 8, // Data request download ready.
    DATAREQUEST_STATUS_EXPIRED = 9, // Data request expired.
    DATAREQUEST_STATUS_DELETED = 10, // Data delete request completed, account is removed.
}

/**
 * Data returned by tool_dataprivacy_get_access_information WS.
 */
export type CoreDataPrivacyGetAccessInformationWSResponse = {
    cancontactdpo: boolean; // Can contact dpo.
    canmanagedatarequests: boolean; // Can manage data requests.
    cancreatedatadownloadrequest: boolean; // Can create data download request for self.
    cancreatedatadeletionrequest: boolean; // Can create data deletion request for self.
    hasongoingdatadownloadrequest: boolean; // Has ongoing data download request.
    hasongoingdatadeletionrequest: boolean; // Has ongoing data deletion request.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of tool_dataprivacy_contact_dpo WS.
 */
type CoreDataPrivacyContactDPOWSParams = {
    message: string; // The user's message to the Data Protection Officer(s).
};

/**
 * Data returned by tool_dataprivacy_contact_dpo WS.
 */
type CoreDataPrivacyContactDPOWSResponse = {
    result: boolean; // The processing result
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of tool_dataprivacy_create_data_request WS.
 */
type CoreDataPrivacyCreateDataRequestWSParams = {
    type: CoreDataPrivacyDataRequestType; // The type of data request to create. 1 for export, 2 for data deletion.
    comments?: string; // Comments for the data request.
    foruserid?: number; // The id of the user to create the data request for. Empty for current user.
};

/**
 * Data returned by tool_dataprivacy_create_data_request WS.
 */
type CoreDataPrivacyCreateDataRequestWSResponse = {
    datarequestid: number; // The id of the created data request.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of tool_dataprivacy_cancel_data_request WS.
 */
type CoreDataPrivacyCancelDataRequestWSParams = {
    requestid: number; // The request ID
};

/**
 * Data returned by tool_dataprivacy_cancel_data_request WS.
 */
type CoreDataPrivacyCancelDataRequestWSResponse = {
    result: boolean; // The processing result
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of tool_dataprivacy_get_data_requests WS.
 */
type CoreDataPrivacyGetDataRequestsWSParams = {
    userid?: number; // The id of the user to get the data requests for. Empty for all users.
    statuses?: CoreDataPrivacyDataRequestStatus[]; // The statuses of the data requests to get.
                        // 0 for pending 1 preprocessing, 2 awaiting approval, 3 approved,
                        // 4 processed, 5 completed, 6 cancelled, 7 rejected.
    types?: number[]; // The types of the data requests to get. 1 for export, 2 for data deletion.
    creationmethods?: number[]; // The creation methods of the data requests to get. 0 for manual, 1 for automatic.
    sort?: string; // The field to sort the data requests by.
    limitfrom?: number; // The number to start getting the data requests from.
    limitnum?: number; // The number of data requests to get.
};

/**
 * Data returned by tool_dataprivacy_get_data_requests WS.
 */
type CoreDataPrivacyGetDataRequestsWSResponse = {
    requests: CoreDataPrivacyRequest[]; // The data requests.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data for the dataprivacy request.
 */
export type CoreDataPrivacyRequest = {
    type: CoreDataPrivacyDataRequestType; // Type.
    comments: string; // Comments.
    commentsformat: CoreTextFormat; // Commentsformat.
    userid: number; // Userid.
    requestedby: number; // Requestedby.
    status: CoreDataPrivacyDataRequestStatus; // Status.
    dpo: number; // Dpo.
    dpocomment: string; // Dpocomment.
    dpocommentformat: CoreTextFormat; // Dpocommentformat.
    systemapproved: boolean; // Systemapproved.
    creationmethod: number; // Creationmethod.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    foruser: CoreUserSummary; // The user the request is for.
    requestedbyuser: CoreUserSummary; // The user who requested the data.
    dpouser?: CoreUserSummary; // The user who processed the request.
    messagehtml?: string; // Messagehtml.
    typename: string; // Typename.
    typenameshort: string; // Typenameshort.
    statuslabel: string; // Statuslabel.
    statuslabelclass: string; // Statuslabelclass.
    canreview?: boolean; // Canreview.
    approvedeny?: boolean; // Approvedeny.
    allowfiltering?: boolean; // Allowfiltering.
    canmarkcomplete?: boolean; // Canmarkcomplete.
    downloadlink?: string; // Downloadlink.
};
