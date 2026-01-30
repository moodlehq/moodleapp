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

import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { asyncInstance, AsyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { CoreCourseStatusDBRecord, COURSE_STATUS_TABLE } from './database/course';
import { CoreLogger } from '@static/logger';
import { DownloadStatus } from '@/core/constants';
import { CoreEvents } from '@static/events';
import { CoreTime } from '@static/time';
import { CORE_COURSE_ALL_COURSES_CLEARED, COURSE_STATUS_CHANGED_EVENT } from '../constants';

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [COURSE_STATUS_CHANGED_EVENT]: CoreEventCourseStatusChanged;
    }

}

/**
 * Service that contains course status features.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseDownloadStatusHelperService {

    protected tables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreCourseStatusDBRecord>>>;

    protected logger = CoreLogger.getInstance('CoreCourseStatusHelper');

    constructor() {
        this.tables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(COURSE_STATUS_TABLE, {
                    siteId,
                    config: { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
                    onDestroy: () => delete this.tables[siteId],
                }),
            ),
        );
    }

    /**
     * Clear all courses status in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when all status are cleared.
     */
    async clearAllCoursesStatus(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        this.logger.debug(`Clear all download course status for site ${site.id}`);

        await this.tables[site.getId()].delete();
        this.triggerCourseStatusChanged(
            CORE_COURSE_ALL_COURSES_CLEARED,
            DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
            site.id,
        );
    }

    /**
     * Get the data stored for a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     */
    async getCourseStatusData(courseId: number, siteId?: string): Promise<CoreCourseStatusDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const entry = await this.tables[site.getId()].getOneByPrimaryKey({ id: courseId });
        if (!entry) {
            throw Error('No entry found on course download status table');
        }

        return entry;
    }

    /**
     * Get a course status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the status.
     */
    async getCourseStatus(courseId: number, siteId?: string): Promise<DownloadStatus> {
        try {
            const entry = await this.getCourseStatusData(courseId, siteId);

            return entry.status || DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
        } catch {
            return DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
        }
    }

    /**
     * Obtain ids of downloaded courses.
     *
     * @param siteId Site id.
     * @returns Resolves with an array containing downloaded course ids.
     */
    async getDownloadedCourseIds(siteId?: string): Promise<number[]> {
        const downloadedStatuses: DownloadStatus[] =
            [DownloadStatus.DOWNLOADED, DownloadStatus.DOWNLOADING, DownloadStatus.OUTDATED];
        const site = await CoreSites.getSite(siteId);
        const entries = await this.tables[site.getId()].getManyWhere({
            sql: 'status IN (?,?,?)',
            sqlParams: downloadedStatuses,
            js: ({ status }) => downloadedStatuses.includes(status),
        });

        return entries.map((entry) => entry.id);
    }

    /**
     * Change the course status, setting it to the previous status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the status is changed. Resolve param: new status.
     */
    async setCoursePreviousStatus(courseId: number, siteId?: string): Promise<DownloadStatus> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.logger.debug(`Set previous download status for course ${courseId} in site ${siteId}`);

        const site = await CoreSites.getSite(siteId);
        const entry = await this.getCourseStatusData(courseId, siteId);

        this.logger.debug(`Set previous download status '${entry.status}' for course ${courseId}`);

        const newData = {
            id: courseId,
            status: entry.previous || DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
            updated: Date.now(),
            // Going back from downloading to previous status, restore previous download time.
            downloadTime: entry.status == DownloadStatus.DOWNLOADING ? entry.previousDownloadTime : entry.downloadTime,
        };

        await this.tables[site.getId()].update(newData, { id: courseId });
        // Success updating, trigger event.
        this.triggerCourseStatusChanged(courseId, newData.status, siteId);

        return newData.status;
    }

    /**
     * Store course status.
     *
     * @param courseId Course ID.
     * @param status New course status.
     * @param siteId Site ID. If not defined, current site.
     */
    async setCourseStatus(courseId: number, status: DownloadStatus, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.logger.debug(`Set download status '${status}' for course ${courseId} in site ${siteId}`);

        const site = await CoreSites.getSite(siteId);
        let downloadTime = 0;
        let previousDownloadTime = 0;
        let previousStatus: DownloadStatus | undefined;

        if (status === DownloadStatus.DOWNLOADING) {
            // Set download time if course is now downloading.
            downloadTime = CoreTime.timestamp();
        }

        try {
            const entry = await this.getCourseStatusData(courseId, siteId);
            if (downloadTime === undefined) {
                // Keep previous download time.
                downloadTime = entry.downloadTime;
                previousDownloadTime = entry.previousDownloadTime;
            } else {
                // The downloadTime will be updated, store current time as previous.
                previousDownloadTime = entry.downloadTime;
            }
            previousStatus = entry.status;
        } catch {
            // New entry.
        }

        if (previousStatus !== status) {
            // Status has changed, update it.
            await this.tables[site.getId()].insert({
                id: courseId,
                status: status,
                previous: previousStatus,
                updated: Date.now(),
                downloadTime: downloadTime,
                previousDownloadTime: previousDownloadTime,
            });
        }

        // Success inserting, trigger event.
        this.triggerCourseStatusChanged(courseId, status, siteId);
    }

    /**
     * Trigger COURSE_STATUS_CHANGED_EVENT with the right data.
     *
     * @param courseId Course ID.
     * @param status New course status.
     * @param siteId Site ID. If not defined, current site.
     */
    protected triggerCourseStatusChanged(courseId: number, status: DownloadStatus, siteId?: string): void {
        CoreEvents.trigger(COURSE_STATUS_CHANGED_EVENT, {
            courseId: courseId,
            status: status,
        }, siteId);
    }

}
export const CoreCourseDownloadStatusHelper = makeSingleton(CoreCourseDownloadStatusHelperService);

/**
 * Data passed to COURSE_STATUS_CHANGED_EVENT event.
 */
export type CoreEventCourseStatusChanged = {
    courseId: number; // Course Id.
    status: DownloadStatus;
};
