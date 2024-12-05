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

import { SQLiteDB } from '@classes/sqlitedb';
import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CoreH5PProvider service.
 */
// DB table names.
export const CONTENT_TABLE_NAME = 'h5p_content'; // H5P content.
export const LIBRARIES_TABLE_NAME = 'h5p_libraries'; // Installed libraries.
export const LIBRARY_DEPENDENCIES_TABLE_NAME = 'h5p_library_dependencies'; // Library dependencies.
export const CONTENTS_LIBRARIES_TABLE_NAME = 'h5p_contents_libraries'; // Which library is used in which content.
export const LIBRARIES_CACHEDASSETS_TABLE_NAME = 'h5p_libraries_cachedassets'; // H5P cached library assets.
export const MISSING_DEPENDENCIES_TABLE_NAME = 'h5p_missing_dependencies'; // Information about missing dependencies.
export const MISSING_DEPENDENCIES_PRIMARY_KEYS = ['fileid', 'machinename', 'majorversion', 'minorversion'] as const;

export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreH5PProvider',
    version: 3,
    canBeCleared: [
        CONTENT_TABLE_NAME,
        LIBRARIES_TABLE_NAME,
        LIBRARY_DEPENDENCIES_TABLE_NAME,
        CONTENTS_LIBRARIES_TABLE_NAME,
        LIBRARIES_CACHEDASSETS_TABLE_NAME,
        MISSING_DEPENDENCIES_TABLE_NAME,
    ],
    tables: [
        {
            name: CONTENT_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'jsoncontent',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'mainlibraryid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'foldername',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'fileurl',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'filtered',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
        {
            name: LIBRARIES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'machinename',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'title',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'majorversion',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'minorversion',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'patchversion',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'runnable',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'fullscreen',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'embedtypes',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'preloadedjs',
                    type: 'TEXT',
                },
                {
                    name: 'preloadedcss',
                    type: 'TEXT',
                },
                {
                    name: 'droplibrarycss',
                    type: 'TEXT',
                },
                {
                    name: 'semantics',
                    type: 'TEXT',
                },
                {
                    name: 'addto',
                    type: 'TEXT',
                },
                {
                    name: 'metadatasettings',
                    type: 'TEXT',
                },
            ],
        },
        {
            name: LIBRARY_DEPENDENCIES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'libraryid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'requiredlibraryid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'dependencytype',
                    type: 'TEXT',
                    notNull: true,
                },
            ],
        },
        {
            name: CONTENTS_LIBRARIES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'h5pid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'libraryid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'dependencytype',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'dropcss',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'weight',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
        {
            name: LIBRARIES_CACHEDASSETS_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'libraryid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'hash',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'foldername',
                    type: 'TEXT',
                    notNull: true,
                },
            ],
        },
        {
            name: MISSING_DEPENDENCIES_TABLE_NAME,
            columns: [
                {
                    name: 'fileid',
                    type: 'TEXT',
                },
                {
                    name: 'machinename',
                    type: 'TEXT',
                },
                {
                    name: 'majorversion',
                    type: 'INTEGER',
                },
                {
                    name: 'minorversion',
                    type: 'INTEGER',
                },
                {
                    name: 'requiredby',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'filetimemodified',
                    type: 'INTEGER',
                    notNull: true,
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
            primaryKeys: [...MISSING_DEPENDENCIES_PRIMARY_KEYS],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion >= 2) {
            return;
        }

        // Add the metadata column to the table.
        await db.addColumn(LIBRARIES_TABLE_NAME, 'metadatasettings', 'TEXT');
    },
};

/**
 * Structure of content data stored in DB.
 */
export type CoreH5PContentDBRecord = {
    id: number; // The id of the content.
    jsoncontent: string; // The content in json format.
    mainlibraryid: number; // The library we first instantiate for this node.
    foldername: string; // Name of the folder that contains the contents.
    fileurl: string; // The online URL of the H5P package.
    filtered: string | null; // Filtered version of json_content.
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
};

/**
 * Structure of library data stored in DB.
 */
export type CoreH5PLibraryDBRecord = {
    id: number; // The id of the library.
    machinename: string; // The library machine name.
    title: string; // The human readable name of this library.
    majorversion: number; // Major version.
    minorversion: number; // Minor version.
    patchversion: number; // Patch version.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedtypes: string; // List of supported embed types.
    preloadedjs?: string | null; // Comma separated list of scripts to load.
    preloadedcss?: string | null; // Comma separated list of stylesheets to load.
    droplibrarycss?: string | null; // Libraries that should not have CSS included if this lib is used. Comma separated list.
    semantics?: string | null; // The semantics definition.
    addto?: string | null; // Plugin configuration data.
    metadatasettings?: string | null; // Metadata settings.
};

/**
 * Structure of library dependencies stored in DB.
 */
export type CoreH5PLibraryDependencyDBRecord = {
    id: number; // Id.
    libraryid: number; // The id of an H5P library.
    requiredlibraryid: number; // The dependent library to load.
    dependencytype: string; // Type: preloaded, dynamic, or editor.
};

/**
 * Structure of library used by a content stored in DB.
 */
export type CoreH5PContentsLibraryDBRecord = {
    id: number;
    h5pid: number;
    libraryid: number;
    dependencytype: string;
    dropcss: number;
    weight: number;
};

/**
 * Structure of library cached assets stored in DB.
 */
export type CoreH5PLibraryCachedAssetsDBRecord = {
    id: number; // Id.
    libraryid: number; // The id of an H5P library.
    hash: string; // The hash to identify the cached asset.
    foldername: string; // Name of the folder that contains the contents.
};

/**
 * Structure of missing dependency data stored in DB.
 */
export type CoreH5PMissingDependencyDBRecord = {
    fileid: string; // Identifier of the package that has a missing dependency. It will be part of the file url.
    filetimemodified: number; // Time when the file was last modified.
    machinename: string; // Machine name of the missing dependency.
    majorversion: number; // Major version of the missing dependency.
    minorversion: number; // Minor version of the missing dependency.
    requiredby: string; // LibString of the library that requires the missing dependency.
    component?: string; // Component related to the package.
    componentId?: string | number; // Component ID related to the package.
};

export type CoreH5PMissingDependencyDBPrimaryKeys = typeof MISSING_DEPENDENCIES_PRIMARY_KEYS[number];
