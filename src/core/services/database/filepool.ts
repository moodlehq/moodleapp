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

import { CoreAppSchema } from '@services/app';
import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CoreFilepool service.
 */
export const QUEUE_TABLE_NAME = 'filepool_files_queue'; // Queue of files to download.
export const FILES_TABLE_NAME = 'filepool_files'; // Downloaded files.
export const LINKS_TABLE_NAME = 'filepool_files_links'; // Links between downloaded files and components.
export const PACKAGES_TABLE_NAME = 'filepool_packages'; // Downloaded packages (sets of files).
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreFilepoolProvider',
    version: 1,
    tables: [
        {
            name: QUEUE_TABLE_NAME,
            columns: [
                {
                    name: 'siteId',
                    type: 'TEXT',
                },
                {
                    name: 'fileId',
                    type: 'TEXT',
                },
                {
                    name: 'added',
                    type: 'INTEGER',
                },
                {
                    name: 'priority',
                    type: 'INTEGER',
                },
                {
                    name: 'url',
                    type: 'TEXT',
                },
                {
                    name: 'revision',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'isexternalfile',
                    type: 'INTEGER',
                },
                {
                    name: 'repositorytype',
                    type: 'TEXT',
                },
                {
                    name: 'path',
                    type: 'TEXT',
                },
                {
                    name: 'links',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['siteId', 'fileId'],
        },
    ],
};

export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreFilepoolProvider',
    version: 1,
    tables: [
        {
            name: FILES_TABLE_NAME,
            columns: [
                {
                    name: 'fileId',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'url',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'revision',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'stale',
                    type: 'INTEGER',
                },
                {
                    name: 'downloadTime',
                    type: 'INTEGER',
                },
                {
                    name: 'isexternalfile',
                    type: 'INTEGER',
                },
                {
                    name: 'repositorytype',
                    type: 'TEXT',
                },
                {
                    name: 'path',
                    type: 'TEXT',
                },
                {
                    name: 'extension',
                    type: 'TEXT',
                },
            ],
        },
        {
            name: LINKS_TABLE_NAME,
            columns: [
                {
                    name: 'fileId',
                    type: 'TEXT',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'componentId',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['fileId', 'component', 'componentId'],
        },
        {
            name: PACKAGES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'componentId',
                    type: 'TEXT',
                },
                {
                    name: 'status',
                    type: 'TEXT',
                },
                {
                    name: 'previous',
                    type: 'TEXT',
                },
                {
                    name: 'updated',
                    type: 'INTEGER',
                },
                {
                    name: 'downloadTime',
                    type: 'INTEGER',
                },
                {
                    name: 'previousDownloadTime',
                    type: 'INTEGER',
                },
                {
                    name: 'extra',
                    type: 'TEXT',
                },
            ],
        },
    ],
};

/**
 * File options.
 */
export type CoreFilepoolFileOptions = {
    revision?: number; // File's revision.
    timemodified?: number; // File's timemodified.
    isexternalfile?: number; // 1 if it's a external file (from an external repository), 0 otherwise.
    repositorytype?: string; // Type of the repository this file belongs to.
};

/**
 * Entry from filepool.
 */
export type CoreFilepoolFileEntry = CoreFilepoolFileOptions & {
    /**
     * The fileId to identify the file.
     */
    fileId: string;

    /**
     * File's URL.
     */
    url: string;

    /**
     * 1 if file is stale (needs to be updated), 0 otherwise.
     */
    stale: number;

    /**
     * Timestamp when this file was downloaded.
     */
    downloadTime: number;

    /**
     * File's path.
     */
    path: string;

    /**
     * File's extension.
     */
    extension: string;
};

/**
 * DB data for entry from file's queue.
 */
export type CoreFilepoolQueueDBEntry = CoreFilepoolFileOptions & {
    /**
     * The site the file belongs to.
     */
    siteId: string;

    /**
     * The fileId to identify the file.
     */
    fileId: string;

    /**
     * Timestamp when the file was added to the queue.
     */
    added: number;

    /**
     * The priority of the file.
     */
    priority: number;

    /**
     * File's URL.
     */
    url: string;

    /**
     * File's path.
     */
    path?: string;

    /**
     * File links (to link the file to components and componentIds). Serialized to store on DB.
     */
    links: string;
};

/**
 * Entry from the file's queue.
 */
export type CoreFilepoolQueueEntry = CoreFilepoolQueueDBEntry & {
    /**
     * File links (to link the file to components and componentIds).
     */
    linksUnserialized?: CoreFilepoolComponentLink[];
};

/**
 * Entry from packages table.
 */
export type CoreFilepoolPackageEntry = {
    /**
     * Package id.
     */
    id?: string;

    /**
     * The component to link the files to.
     */
    component?: string;

    /**
     * An ID to use in conjunction with the component.
     */
    componentId?: string | number;

    /**
     * Package status.
     */
    status?: string;

    /**
     * Package previous status.
     */
    previous?: string;

    /**
     * Timestamp when this package was updated.
     */
    updated?: number;

    /**
     * Timestamp when this package was downloaded.
     */
    downloadTime?: number;

    /**
     * Previous download time.
     */
    previousDownloadTime?: number;

    /**
     * Extra data stored by the package.
     */
    extra?: string;
};

/**
 * A component link.
 */
export type CoreFilepoolComponentLink = {
    /**
     * Link's component.
     */
    component: string;

    /**
     * Link's componentId.
     */
    componentId?: string | number;
};

/**
 * Links table record type.
 */
export type CoreFilepoolLinksRecord = {
    fileId: string; // File Id.
    component: string; // Component name.
    componentId: number | string; // Component Id.
};
