// (C) Copyright 2015 Martin Dougiamas
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
                        name: 'action',
                        type: 'TEXT'
                    },
                    {
                        name: 'lastmodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['contextlevel', 'instanceid', 'component', 'itemid', 'area']
            }
        ]
    };

    constructor( private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a comment.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved if deleted, rejected if failure.
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
     * Get all offline comments.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with comments.
     */
    getAllComments(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(CoreCommentsOfflineProvider.COMMENTS_TABLE);
        });
    }

    /**
     * Get an offline comment.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved with the comments.
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
     * Check if there are offline comments.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline comments, false otherwise.
     */
    hasComments(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<boolean> {
        return this.getComment(contextLevel, instanceId, component, itemId, area, siteId).then((comments) => {
            return !!comments.length;
        });
    }

    /**
     * Save a comment to be sent later.
     *
     * @param  {string} content      Comment text.
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
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
                action: 'add',
                lastmodified: now
            };

            return site.getDb().insertRecord(CoreCommentsOfflineProvider.COMMENTS_TABLE, data).then(() => {
                return data;
            });
        });
    }
}
