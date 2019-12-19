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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Service to handle offline comments.
 */
@Injectable()
export class CoreCommentsOfflineProvider {

    // Variables for database.
    static COMMENTS_TABLE = 'core_comments_offline_comments';
    static COMMENTS_DELETED_TABLE = 'core_comments_deleted_offline_comments';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreCommentsOfflineProvider',
        version: 1,
        tables: [
            {
                name: CoreCommentsOfflineProvider.COMMENTS_TABLE,
                columns: [
                    {
                        name: 'contextlevel',
                        type: 'TEXT'
                    },
                    {
                        name: 'instanceid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'component',
                        type: 'TEXT',
                    },
                    {
                        name: 'itemid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'area',
                        type: 'TEXT'
                    },
                    {
                        name: 'content',
                        type: 'TEXT'
                    },
                    {
                        name: 'lastmodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['contextlevel', 'instanceid', 'component', 'itemid', 'area']
            },
            {
                name: CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE,
                columns: [
                    {
                        name: 'commentid',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'contextlevel',
                        type: 'TEXT'
                    },
                    {
                        name: 'instanceid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'component',
                        type: 'TEXT',
                    },
                    {
                        name: 'itemid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'area',
                        type: 'TEXT'
                    },
                    {
                        name: 'deleted',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    constructor( private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get all offline comments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with comments.
     */
    getAllComments(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return Promise.all([site.getDb().getRecords(CoreCommentsOfflineProvider.COMMENTS_TABLE),
                site.getDb().getRecords(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE)]).then((results) => {
                    return [].concat.apply([], results);
                });
        });
    }

    /**
     * Get an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the comments.
     */
    getComment(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(CoreCommentsOfflineProvider.COMMENTS_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Get all offline comments added or deleted of a special area.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the comments.
     */
    getComments(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<any> {
        let comments = [];

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getComment(contextLevel, instanceId, component, itemId, area, siteId).then((comment) => {
            comments = comment ? [comment] : [];

            return this.getDeletedComments(contextLevel, instanceId, component, itemId, area, siteId);
        }).then((deletedComments) => {
            comments = comments.concat(deletedComments);

            return comments;
        });
    }

    /**
     * Get all offline deleted comments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with comments.
     */
    getAllDeletedComments(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE);
        });
    }

    /**
     * Get an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the comments.
     */
    getDeletedComments(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Remove an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    removeComment(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(CoreCommentsOfflineProvider.COMMENTS_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area
            });
        });
    }

    /**
     * Remove an offline deleted comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    removeDeletedComments(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area
            });
        });
    }

    /**
     * Save a comment to be sent later.
     *
     * @param content Comment text.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    saveComment(content: string, contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const now = this.timeUtils.timestamp();
            const data = {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
                content: content,
                lastmodified: now
            };

            return site.getDb().insertRecord(CoreCommentsOfflineProvider.COMMENTS_TABLE, data).then(() => {
                return data;
            });
        });
    }

    /**
     * Delete a comment offline to be sent later.
     *
     * @param commentId Comment ID.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    deleteComment(commentId: number, contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const now = this.timeUtils.timestamp();
            const data = {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
                commentid: commentId,
                deleted: now
            };

            return site.getDb().insertRecord(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE, data).then(() => {
                return data;
            });
        });
    }

    /**
     * Undo delete a comment.
     *
     * @param commentId Comment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    undoDeleteComment(commentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(CoreCommentsOfflineProvider.COMMENTS_DELETED_TABLE, { commentid: commentId });
        });
    }
}
