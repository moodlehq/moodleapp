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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreComments, CoreCommentsProvider } from './comments';
import { CoreEvents } from '@singletons/events';
import { makeSingleton, Translate } from '@singletons';
import { CoreCommentsOffline } from './comments-offline';
import { CoreSites } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { CoreUtils } from '@services/utils/utils';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCommentsDBRecord, CoreCommentsDeletedDBRecord } from './database/comments';
import { CoreSyncResult } from '@services/sync';
import { ContextLevel } from '@/core/constants';
import { CORE_COMMENTS_AUTO_SYNCED } from '../constants';

/**
 * Service to sync omments.
 */
@Injectable( { providedIn: 'root' })
export class CoreCommentsSyncProvider extends CoreSyncBaseProvider<CoreCommentsSyncResult> {

    constructor() {
        super('CoreCommentsSync');
    }

    /**
     * Try to synchronize all the comments in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllComments(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all comments', (siteId) => this.syncAllCommentsFunc(!!force, siteId), siteId);
    }

    /**
     * Synchronize all the comments in a certain site
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    private async syncAllCommentsFunc(force: boolean, siteId: string): Promise<void> {
        const comments = await CoreCommentsOffline.getAllComments(siteId);

        const commentsUnique: { [syncId: string]: (CoreCommentsDBRecord | CoreCommentsDeletedDBRecord) } = {};
        // Get Unique array.
        comments.forEach((comment) => {
            const syncId = this.getSyncId(
                comment.contextlevel,
                comment.instanceid,
                comment.component,
                comment.itemid,
                comment.area,
            );
            commentsUnique[syncId] = comment;
        });

        // Sync all courses.
        const promises = Object.keys(commentsUnique).map(async (key) => {
            const comment = commentsUnique[key];

            const result = await (force
                ? this.syncComments(
                    comment.contextlevel,
                    comment.instanceid,
                    comment.component,
                    comment.itemid,
                    comment.area,
                    siteId,
                )
                : this.syncCommentsIfNeeded(
                    comment.contextlevel,
                    comment.instanceid,
                    comment.component,
                    comment.itemid,
                    comment.area,
                    siteId,
                ));

            if (result !== undefined) {
                // Sync successful, send event.
                CoreEvents.trigger(CORE_COMMENTS_AUTO_SYNCED, {
                    contextLevel: comment.contextlevel,
                    instanceId: comment.instanceid,
                    componentName: comment.component,
                    itemId: comment.itemid,
                    area: comment.area,
                    warnings: result.warnings,
                }, siteId);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Sync course comments only if a certain time has passed since the last time.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the comments are synced or if they don't need to be synced.
     */
    private async syncCommentsIfNeeded(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area: string = '',
        siteId?: string,
    ): Promise<CoreCommentsSyncResult | undefined> {
        const syncId = this.getSyncId(contextLevel, instanceId, component, itemId, area);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncComments(contextLevel, instanceId, component, itemId, area, siteId);
        }
    }

    /**
     * Synchronize comments in a particular area.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area: string = '',
        siteId?: string,
    ): Promise<CoreCommentsSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getSyncId(contextLevel, instanceId, component, itemId, area);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing for comments, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug('Try to sync comments ' + syncId + ' in site ' + siteId);

        const syncPromise = this.performSyncComments(contextLevel, instanceId, component, itemId, area, siteId);

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Performs the syncronization of comments in a particular area.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    private async performSyncComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area: string = '',
        siteId: string,
    ): Promise<CoreCommentsSyncResult> {

        const result: CoreCommentsSyncResult = {
            warnings: [],
            updated: false,
        };

        // Get offline comments to be sent.
        const comments = await CoreCommentsOffline.getComments(contextLevel, instanceId, component, itemId, area, siteId);
        if (!comments.length) {
            // Nothing to sync.
            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const errors: string[] = [];
        const promises: Promise<void>[] = [];
        const deleteCommentIds: number[] = [];
        let countChange = 0;

        comments.forEach((comment) => {
            if ('deleted' in comment) {
                deleteCommentIds.push(comment.commentid);
            } else {
                promises.push(CoreComments.addCommentOnline(
                    comment.content,
                    contextLevel,
                    instanceId,
                    component,
                    itemId,
                    area,
                    siteId,
                ).then(() => {
                    countChange++;

                    return CoreCommentsOffline.removeComment(contextLevel, instanceId, component, itemId, area, siteId);
                }));
            }
        });

        if (deleteCommentIds.length > 0) {
            promises.push(CoreComments.deleteCommentsOnline(
                deleteCommentIds,
                contextLevel,
                instanceId,
                component,
                itemId,
                area,
                siteId,
            ).then(() => {
                countChange--;

                return CoreCommentsOffline.removeDeletedComments(
                    contextLevel,
                    instanceId,
                    component,
                    itemId,
                    area,
                    siteId,
                );
            }));
        }

        // Send the comments.
        try {
            await Promise.all(promises);

            result.updated = true;

            CoreEvents.trigger(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, {
                contextLevel: contextLevel,
                instanceId: instanceId,
                component,
                itemId: itemId,
                area: area,
                countChange: countChange,
            }, CoreSites.getCurrentSiteId());

            // Fetch the comments from server to be sure they're up to date.
            await CoreUtils.ignoreErrors(
                CoreComments.invalidateCommentsData(contextLevel, instanceId, component, itemId, area, siteId),
            );
            await CoreUtils.ignoreErrors(
                CoreComments.getComments(contextLevel, instanceId, component, itemId, area, 0, siteId),
            );
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
            // It's a WebService error, this means the user cannot send comments.
                errors.push(error.message);
            } else {
                // Not a WebService error, reject the synchronization to try again.
                throw error;
            }
        }

        if (errors && errors.length) {
            errors.forEach((error) => {
                result.warnings.push(Translate.instant('core.comments.warningcommentsnotsent', {
                    error: error,
                }));
            });
        }

        // All done, return the warnings.
        return result;
    }

    /**
     * Get the ID of a comments sync.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @returns Sync ID.
     */
    protected getSyncId(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area: string = '',
    ): string {
        return contextLevel + '#' + instanceId + '#' + component + '#' + itemId + '#' + area;
    }

}
export const CoreCommentsSync = makeSingleton(CoreCommentsSyncProvider);

export type CoreCommentsSyncResult = CoreSyncResult;

/**
 * Data passed to CORE_COMMENTS_AUTO_SYNCED event.
 */
export type CoreCommentsSyncAutoSyncData = {
    contextLevel: ContextLevel;
    instanceId: number;
    componentName: string;
    itemId: number;
    area: string;
    warnings: string[];
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_COMMENTS_AUTO_SYNCED]: CoreCommentsSyncAutoSyncData;
    }

}
