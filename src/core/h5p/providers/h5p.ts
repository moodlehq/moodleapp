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
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreH5PUtilsProvider } from './utils';
import { CoreH5PContentValidator } from '../classes/content-validator';
import { TranslateService } from '@ngx-translate/core';
import { FileEntry } from '@ionic-native/file';

/**
 * Service to provide H5P functionalities.
 */
@Injectable()
export class CoreH5PProvider {

    static STYLES = [
        'styles/h5p.css',
        'styles/h5p-confirmation-dialog.css',
        'styles/h5p-core-button.css'
    ];
    static SCRIPTS = [
        'js/jquery.js',
        'js/h5p.js',
        'js/h5p-event-dispatcher.js',
        'js/h5p-x-api-event.js',
        'js/h5p-x-api.js',
        'js/h5p-content-type.js',
        'js/h5p-confirmation-dialog.js',
        'js/h5p-action-bar.js',
        'js/request-queue.js',
    ];
    static ADMIN_SCRIPTS = [
        'js/jquery.js',
        'js/h5p-utils.js',
    ];

    // Disable flags
    static DISABLE_NONE = 0;
    static DISABLE_FRAME = 1;
    static DISABLE_DOWNLOAD = 2;
    static DISABLE_EMBED = 4;
    static DISABLE_COPYRIGHT = 8;
    static DISABLE_ABOUT = 16;

    static DISPLAY_OPTION_FRAME = 'frame';
    static DISPLAY_OPTION_DOWNLOAD = 'export';
    static DISPLAY_OPTION_EMBED = 'embed';
    static DISPLAY_OPTION_COPYRIGHT = 'copyright';
    static DISPLAY_OPTION_ABOUT = 'icon';
    static DISPLAY_OPTION_COPY = 'copy';

    protected CONTENT_TABLE = 'h5p_content'; // H5P content.
    protected LIBRARIES_TABLE = 'h5p_libraries'; // Installed libraries.
    protected LIBRARY_DEPENDENCIES_TABLE = 'h5p_library_dependencies'; // Library dependencies.
    protected CONTENTS_LIBRARIES_TABLE = 'h5p_contents_libraries'; // Which library is used in which content.
    protected LIBRARIES_CACHEDASSETS_TABLE = 'h5p_libraries_cachedassets'; // H5P cached library assets.
    protected aggregateAssets = true; // Save all the assets from one package into a single file.

    protected siteSchema: CoreSiteSchema = {
        name: 'CoreH5PProvider',
        version: 1,
        canBeCleared: [
            this.CONTENT_TABLE, this.LIBRARIES_TABLE, this.LIBRARY_DEPENDENCIES_TABLE, this.CONTENTS_LIBRARIES_TABLE,
            this.LIBRARIES_CACHEDASSETS_TABLE
        ],
        tables: [
            {
                name: this.CONTENT_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'jsoncontent',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'mainlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'foldername',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'fileurl',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'filtered',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            },
            {
                name: this.LIBRARIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'machinename',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'title',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'majorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'minorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'patchversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'runnable',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'fullscreen',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'embedtypes',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'preloadedjs',
                        type: 'TEXT'
                    },
                    {
                        name: 'preloadedcss',
                        type: 'TEXT'
                    },
                    {
                        name: 'droplibrarycss',
                        type: 'TEXT'
                    },
                    {
                        name: 'semantics',
                        type: 'TEXT'
                    },
                    {
                        name: 'addto',
                        type: 'TEXT'
                    }
                ]
            },
            {
                name: this.LIBRARY_DEPENDENCIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'requiredlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'dependencytype',
                        type: 'TEXT',
                        notNull: true
                    }
                ]
            },
            {
                name: this.CONTENTS_LIBRARIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'h5pid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'dependencytype',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'dropcss',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'weight',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            },
            {
                name: this.LIBRARIES_CACHEDASSETS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'hash',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'foldername',
                        type: 'TEXT',
                        notNull: true
                    }
                ]
            }
        ]
    };

    protected ROOT_CACHE_KEY = 'CoreH5P:';

    protected logger;

    constructor(logger: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private fileProvider: CoreFileProvider,
            private mimeUtils: CoreMimetypeUtilsProvider,
            private h5pUtils: CoreH5PUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private utils: CoreUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private translate: TranslateService) {

        this.logger = logger.getInstance('CoreH5PProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Will concatenate all JavaScrips and Stylesheets into two files in order to improve page performance.
     *
     * @param files A set of all the assets required for content to display.
     * @param key Hashed key for cached asset.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Promise resolved when done.
     */
    protected cacheAssets(files: {scripts: CoreH5PDependencyAsset[], styles: CoreH5PDependencyAsset[]}, key: string,
            folderName: string, siteId: string): Promise<any> {

        const promises = [];

        for (const type in files) {
            const assets: CoreH5PDependencyAsset[] = files[type];

            if (!assets || !assets.length) {
                continue;
            }

            // Create new file for cached assets.
            const fileName = key + '.' + (type == 'scripts' ? 'js' : 'css'),
                path = this.textUtils.concatenatePaths(this.getCachedAssetsFolderPath(folderName, siteId), fileName);

            // Store concatenated content.
            promises.push(this.concatenateFiles(assets, type).then((content) => {
                return this.fileProvider.writeFile(path, content);
            }).then(() => {
                // Now update the files data.
                files[type] = [
                    {
                        path: this.textUtils.concatenatePaths(this.getCachedAssetsFolderName(), fileName),
                        version: ''
                    }
                ];
            }));
        }

        return Promise.all(promises);
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFile(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canGetTrustedH5PFileInSite(site);
        });
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFileInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_h5p_get_trusted_h5p_file');
    }

    /**
     * Will clear filtered params for all the content that uses the specified libraries.
     * This means that the content dependencies will have to be rebuilt and the parameters re-filtered.
     *
     * @param libraryIds Array of library ids.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected clearFilteredParameters(libraryIds: number[], siteId?: string): Promise<any> {

        if (!libraryIds || !libraryIds.length) {
            return Promise.resolve();
        }

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const whereAndParams = db.getInOrEqual(libraryIds);
            whereAndParams[0] = 'mainlibraryid ' + whereAndParams[0];

            return db.updateRecordsWhere(this.CONTENT_TABLE, { filtered: null }, whereAndParams[0], whereAndParams[1]);
        });
    }

    /**
     * Adds all files of a type into one file.
     *
     * @param assets A list of files.
     * @param type The type of files in assets. Either 'scripts' or 'styles'
     * @return Promise resolved with all of the files content in one string.
     */
    protected concatenateFiles(assets: CoreH5PDependencyAsset[], type: string): Promise<string> {
        const basePath = this.fileProvider.getBasePathInstant();
        let content = '',
            promise = Promise.resolve(); // Use a chain of promises so the order is kept.

        assets.forEach((asset) => {

            promise = promise.then(() => {
                return this.fileProvider.readFile(asset.path);
            }).then((fileContent: string) => {
                if (type == 'scripts') {
                    content += fileContent + ';\n';
                } else {
                    // Rewrite relative URLs used inside stylesheets.
                    const matches = fileContent.match(/url\([\'"]?([^"\')]+)[\'"]?\)/ig),
                        assetPath = asset.path.replace(/(^\/|\/$)/g, ''), // Path without start/end slashes.
                        treated = {};

                    if (matches && matches.length) {
                        matches.forEach((match) => {
                            let url = match.replace(/(url\(['"]?|['"]?\)$)/ig, '');

                            if (treated[url] || url.match(/^(data:|([a-z0-9]+:)?\/)/i)) {
                                return; // Not relative or already treated, skip.
                            }

                            const pathSplit = assetPath.split('/');
                            treated[url] = url;

                            /* Find "../" in the URL. If it exists, we have to remove "../" and switch the last folder in the
                               filepath for the first folder in the url. */
                            if (url.match(/^\.\.\//)) {
                                const urlSplit = url.split('/').filter((i) => {
                                        return i; // Remove empty values.
                                    });

                                // Remove the file name from the asset path.
                                pathSplit.pop();

                                // Remove the first element from the file URL: ../ .
                                urlSplit.shift();

                                // Put the url's first folder into the asset path.
                                pathSplit[pathSplit.length - 1] = urlSplit[0];
                                urlSplit.shift();

                                // Create the new URL and replace it in the file contents.
                                url = pathSplit.join('/') + '/' + urlSplit.join('/');

                            } else {
                                pathSplit[pathSplit.length - 1] = url; // Put the whole path to the end of the asset path.
                                url = pathSplit.join('/');
                            }

                            fileContent = fileContent.replace(new RegExp(this.textUtils.escapeForRegex(match), 'g'),
                                        'url("' + this.textUtils.concatenatePaths(basePath, url) + '")');
                        });
                    }

                    content += fileContent + '\n';
                }
            });
        });

        return promise.then(() => {
            return content;
        });
    }

    /**
     * Create the index.html to render an H5P package.
     *
     * @param id Content ID.
     * @param h5pUrl The URL of the H5P file.
     * @param content Content data.
     * @param embedType Embed type. The app will always use 'iframe'.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the URL of the index file.
     */
    createContentIndex(id: number, h5pUrl: string, content: CoreH5PContentData, embedType: string, siteId?: string)
            : Promise<string> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const contentId = this.getContentId(id),
                basePath = this.fileProvider.getBasePathInstant(),
                contentUrl = this.textUtils.concatenatePaths(basePath, this.getContentFolderPath(content.folderName, site.getId()));

            // Create the settings needed for the content.
            const contentSettings = {
                library: this.libraryToString(content.library),
                fullScreen: content.library.fullscreen,
                exportUrl: '', // We'll never display the download button, so we don't need the exportUrl.
                embedCode: this.getEmbedCode(site.getURL(), h5pUrl, true),
                resizeCode: this.getResizeCode(),
                title: content.slug,
                displayOptions: {},
                url: this.getEmbedUrl(site.getURL(), h5pUrl),
                contentUrl: contentUrl,
                metadata: content.metadata,
                contentUserData: [
                    {
                        state: '{}'
                    }
                ]
            };

            // Get the core H5P assets, needed by the H5P classes to render the H5P content.
            return this.getAssets(id, content, embedType, site.getId()).then((result) => {
                result.settings.contents[contentId] = Object.assign(result.settings.contents[contentId], contentSettings);

                const indexPath = this.getContentIndexPath(content.folderName, siteId);
                let html = '<html><head><title>' + content.title + '</title>' +
                        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';

                // Include the required CSS.
                result.cssRequires.forEach((cssUrl) => {
                    html += '<link rel="stylesheet" type="text/css" href="' + cssUrl + '">';
                });

                // Add the settings.
                html += '<script type="text/javascript">var H5PIntegration = ' +
                        JSON.stringify(result.settings).replace(/\//g, '\\/') + '</script>';

                // Add our own script to handle the display options.
                html += '<script type="text/javascript" src="' +
                        this.textUtils.concatenatePaths(this.getCoreH5PPath(), 'moodle/js/displayoptions.js') + '"></script>';

                html += '</head><body>';

                // Include the required JS at the beginning of the body, like Moodle web does.
                // Load the embed.js to allow communication with the parent window.
                html += '<script type="text/javascript" src="' +
                        this.textUtils.concatenatePaths(this.getCoreH5PPath(), 'moodle/js/embed.js') + '"></script>';

                result.jsRequires.forEach((jsUrl) => {
                    html += '<script type="text/javascript" src="' + jsUrl + '"></script>';
                });

                html += '<div class="h5p-iframe-wrapper">' +
                        '<iframe id="h5p-iframe-' + id + '" class="h5p-iframe" data-content-id="' + id + '"' +
                            'style="height:1px; min-width: 100%" src="about:blank"></iframe>' +
                        '</div></body>';

                return this.fileProvider.writeFile(indexPath, html);
            }).then((fileEntry) => {
                return fileEntry.toURL();
            });
        });
    }

    /**
     * Delete cached assets from DB and filesystem.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected deleteCachedAssets(libraryId: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb();

            // Get all the hashes that use this library.
            return db.getRecords(this.LIBRARIES_CACHEDASSETS_TABLE, {libraryid: libraryId}).then((entries) => {
                // Delete the files with these hashes.
                const promises = [],
                    hashes = [];

                entries.forEach((entry) => {
                    hashes.push(entry.hash);

                    const cachedAssetsFolder = this.getCachedAssetsFolderPath(entry.foldername, site.getId());

                    ['js', 'css'].forEach((type) => {
                        const path = this.textUtils.concatenatePaths(cachedAssetsFolder, entry.hash + '.' + type);

                        promises.push(this.fileProvider.removeFile(path).catch(() => {
                            // Ignore errors, maybe there's no cached asset of this type.
                        }));
                    });
                });

                return Promise.all(promises).then(() => {
                    return db.deleteRecordsList(this.LIBRARIES_CACHEDASSETS_TABLE, 'hash', hashes);
                });
            });
        });
    }

    /**
     * Delete all package content data.
     *
     * @param fileUrl File URL.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteContentByUrl(fileUrl: string, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getContentDataByUrl(fileUrl, siteId).then((data) => {
            const promises = [];

            promises.push(this.deleteContentData(data.id, siteId));

            promises.push(this.deleteContentFolder(data.foldername, siteId));

            return this.utils.allPromises(promises);
        });
    }

    /**
     * Delete content data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteContentData(id: number, siteId?: string): Promise<any> {
        const promises = [];

        // Delete the content data.
        promises.push(this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.CONTENT_TABLE, {id: id});
        }));

        // Remove content library dependencies.
        promises.push(this.deleteLibraryUsage(id, siteId));

        return Promise.all(promises);
    }

    /**
     * Deletes a content folder from the file system.
     *
     * @param folderName Folder name of the content.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteContentFolder(folderName: string, siteId?: string): Promise<any> {
        return this.fileProvider.removeDir(this.getContentFolderPath(folderName, siteId));
    }

    /**
     * Delete content indexes from filesystem.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected deleteContentIndexesForLibrary(libraryId: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb();

            // Get the folder names of all the packages that use this library.
            const query = 'SELECT DISTINCT hc.foldername ' +
                        'FROM ' + this.CONTENTS_LIBRARIES_TABLE + ' hcl ' +
                        'JOIN ' + this.CONTENT_TABLE + ' hc ON hcl.h5pid = hc.id ' +
                        'WHERE hcl.libraryid = ?',
                queryArgs = [];

            queryArgs.push(libraryId);

            return db.execute(query, queryArgs).then((result) => {
                const promises = [];

                for (let i = 0; i < result.rows.length; i++) {
                    const entry = result.rows.item(i);

                    // Delete the index.html file.
                    promises.push(this.fileProvider.removeFile(this.getContentIndexPath(entry.foldername, site.getId()))
                            .catch(() => {
                        // Ignore errors.
                    }));
                }

                return Promise.all(promises);
            });
        });
    }

    /**
     * Delete library data from DB.
     *
     * @param id Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryData(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.LIBRARIES_TABLE, {id: id});
        });
    }

    /**
     * Delete all dependencies belonging to given library.
     *
     * @param libraryId Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryDependencies(libraryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.LIBRARY_DEPENDENCIES_TABLE, {libraryid: libraryId});
        });
    }

    /**
     * Deletes a library from the file system.
     *
     * @param libraryData The library data.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryFolder(libraryData: any, folderName?: string, siteId?: string): Promise<any> {
        return this.fileProvider.removeDir(this.getLibraryFolderPath(libraryData, siteId, folderName));
    }

    /**
     * Delete what libraries a content item is using.
     *
     * @param id Package ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryUsage(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.CONTENTS_LIBRARIES_TABLE, {h5pid: id});
        });
    }

    /**
     * Extract an H5P file. Some of this code was copied from the isValidPackage function in Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    extractH5PFile(fileUrl: string, file: FileEntry, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Unzip the file.
        const folderName = this.mimeUtils.removeExtension(file.name),
            destFolder = this.textUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);

        // Unzip the file.
        return this.fileProvider.unzipFile(file.toURL(), destFolder).then(() => {
            // Read the contents of the unzipped dir.
            return this.fileProvider.getDirectoryContents(destFolder);
        }).then((contents) => {
            return this.processH5PFiles(destFolder, contents).then((data) => {
                const content: any = {};

                // Save the libraries that were processed.
                return this.saveLibraries(data.librariesJsonData, folderName, siteId).then(() => {
                    // Now treat contents.

                    // Find main library version
                    for (const i in data.mainJsonData.preloadedDependencies) {
                        const dependency = data.mainJsonData.preloadedDependencies[i];

                        if (dependency.machineName === data.mainJsonData.mainLibrary) {
                            return this.getLibraryIdByData(dependency).then((id) => {
                                dependency.libraryId = id;
                                content.library = dependency;
                            });
                        }
                    }
                }).then(() => {
                    // Save the content data in DB.
                    content.params = JSON.stringify(data.contentJsonData);

                    return this.saveContentData(content, folderName, fileUrl, siteId);
                }).then(() => {
                    // Save the content files in their right place.
                    const contentPath = this.textUtils.concatenatePaths(destFolder, 'content');

                    return this.saveContentInFS(contentPath, folderName, siteId).catch((error) => {
                        // An error occurred, delete the DB data because the content data has been deleted.
                        return this.deleteContentData(content.id, siteId).catch(() => {
                            // Ignore errors.
                        }).then(() => {
                            return Promise.reject(error);
                        });
                    });
                }).then(() => {
                    // Create the content player.

                    return this.loadContentData(content.id, undefined, siteId).then((contentData) => {
                        const embedType = this.h5pUtils.determineEmbedType(contentData.embedType, contentData.library.embedTypes);

                        return this.createContentIndex(content.id, fileUrl, contentData, embedType, siteId);
                    });
                }).finally(() => {
                    // Remove tmp folder.
                    return this.fileProvider.removeDir(destFolder).catch(() => {
                        // Ignore errors, it will be deleted eventually.
                    });
                });
            });
        });
    }

    /**
     * Filter content run parameters and rebuild content dependency cache.
     *
     * @param content Content data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filtered params, resolved with null if error.
     */
    filterParameters(content: CoreH5PContentData, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (content.filtered) {
            return Promise.resolve(content.filtered);
        }

        if (typeof content.library == 'undefined' || typeof content.params == 'undefined') {
            return Promise.resolve(null);
        }

        const params = {
                library: this.libraryToString(content.library),
                params: this.textUtils.parseJSON(content.params, false)
            };

        if (!params.params) {
            return null;
        }

        const validator = new CoreH5PContentValidator(this, this.h5pUtils, this.textUtils, this.utils, this.translate, siteId);

        // Validate the main library and its dependencies.
        return validator.validateLibrary(params, {options: [params.library]}).then(() => {

            // Handle addons.
            return this.loadAddons(siteId);
        }).then((addons) => {
            // Validate addons. Use a chain of promises to calculate the weight properly.
            let promise = Promise.resolve();

            addons.forEach((addon) => {
                const addTo = addon.addTo;

                if (addTo && addTo.content && addTo.content.types && addTo.content.types.length) {
                    for (let i = 0; i < addTo.content.types.length; i++) {
                        const type = addTo.content.types[i];

                        if (type && type.text && type.text.regex &&
                                this.h5pUtils.textAddonMatches(params.params, type.text.regex)) {

                            promise = promise.then(() => {
                                return validator.addon(addon);
                            });

                            // An addon shall only be added once.
                            break;
                        }
                    }
                }
            });

            return promise;
        }).then(() => {
            // Update content dependencies.
            content.dependencies = validator.getDependencies();

            const paramsStr = JSON.stringify(params.params);

            // Sometimes the parameters are filtered before content has been created
            if (content.id) {
                // Update library usage.
                return this.deleteLibraryUsage(content.id, siteId).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.saveLibraryUsage(content.id, content.dependencies, siteId);
                }).then(() => {
                    if (!content.slug) {
                        content.slug = this.h5pUtils.slugify(content.title);
                    }

                    // Cache.
                    return this.updateContentFields(content.id, {filtered: paramsStr}, siteId).then(() => {
                        return paramsStr;
                    });
                });
            }

            return paramsStr;
        }).catch(() => {
            return null;
        });
    }

    /**
     * Recursive. Goes through the dependency tree for the given library and
     * adds all the dependencies to the given array in a flat format.
     *
     * @param dependencies Object where to save the dependencies.
     * @param library The library to find all dependencies for.
     * @param nextWeight An integer determining the order of the libraries when they are loaded.
     * @param editor Used internally to force all preloaded sub dependencies of an editor dependency to be editor dependencies.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the next weight.
     */
    findLibraryDependencies(dependencies: {[key: string]: CoreH5PContentDepsTreeDependency},
            library: CoreH5PLibraryData | CoreH5PLibraryAddonData, nextWeight: number = 1, editor: boolean = false,
            siteId?: string): Promise<number> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let promise = Promise.resolve(); // We need to create a chain of promises to calculate the weight properly.

        ['dynamic', 'preloaded', 'editor'].forEach((type) => {
            const property = type + 'Dependencies';

            if (!library[property]) {
                return; // Skip, no such dependencies.
            }

            if (type === 'preloaded' && editor) {
                // All preloaded dependencies of an editor library is set to editor.
                type = 'editor';
            }

            library[property].forEach((dependency: CoreH5PLibraryBasicData) => {

                promise = promise.then(() => {
                    const dependencyKey = type + '-' + dependency.machineName;
                    if (dependencies[dependencyKey]) {
                        return; // Skip, already have this.
                    }

                    // Get the dependency library data and its subdependencies.
                    return this.loadLibrary(dependency.machineName, dependency.majorVersion, dependency.minorVersion, siteId)
                        .then((dependencyLibrary) => {

                        dependencies[dependencyKey] = {
                            library: dependencyLibrary,
                            type: type
                        };

                        // Get all its subdependencies.
                        return this.findLibraryDependencies(dependencies, dependencyLibrary, nextWeight, type === 'editor', siteId);
                    }).then((weight) => {
                        nextWeight = weight;
                        dependencies[dependencyKey].weight = nextWeight++;
                    });
                });
            });
        });

        return promise.then(() => {
            return nextWeight;
        });
    }

    /**
     * Validate and fix display options, updating them if needed.
     *
     * @param displayOptions The display options to validate.
     * @param id Package ID.
     */
    fixDisplayOptions(displayOptions: CoreH5PDisplayOptions, id: number): CoreH5PDisplayOptions {

        // Never allow downloading in the app.
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_DOWNLOAD] = false;

        // Embed - force setting it if always on or always off. In web, this is done when storing in DB.
        const embed = this.getOption(CoreH5PProvider.DISPLAY_OPTION_EMBED, CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);
        if (embed == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW || embed == CoreH5PDisplayOptionBehaviour.NEVER_SHOW) {
            displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED] = (embed == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);
        }

        if (!this.getOption(CoreH5PProvider.DISPLAY_OPTION_FRAME, true)) {
            displayOptions[CoreH5PProvider.DISPLAY_OPTION_FRAME] = false;
        } else {
            displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED] = this.setDisplayOptionOverrides(
                    CoreH5PProvider.DISPLAY_OPTION_EMBED, CoreH5PPermission.EMBED_H5P, id,
                    displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED]);

            if (this.getOption(CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT, true) == false) {
                displayOptions[CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT] = false;
            }
        }

        displayOptions[CoreH5PProvider.DISPLAY_OPTION_COPY] = this.hasPermission(CoreH5PPermission.COPY_H5P, id);

        return displayOptions;
    }

    /**
     * Get the assets of a package.
     *
     * @param id Content id.
     * @param content Content data.
     * @param embedType Embed type.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the assets.
     */
    protected getAssets(id: number, content: CoreH5PContentData, embedType: string, siteId?: string)
            : Promise<{settings: any, cssRequires: string[], jsRequires: string[]}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const cssRequires = [],
              jsRequires = [],
              contentId = this.getContentId(id);
        let settings;

        return this.getCoreSettings(id, siteId).then((coreSettings) => {
            settings = coreSettings;

            settings.core = {
              styles: [],
              scripts: []
            };
            settings.loadedJs = [];
            settings.loadedCss = [];

            const libUrl = this.getCoreH5PPath(),
                relPath = this.urlUtils.removeProtocolAndWWW(libUrl);

            // Add core stylesheets.
            CoreH5PProvider.STYLES.forEach((style) => {
                settings.core.styles.push(relPath + style);
                cssRequires.push(libUrl + style);
            });

            // Add core JavaScript.
            this.getScripts().forEach((script) => {
                settings.core.scripts.push(script);
                jsRequires.push(script);
            });

            /* The filterParameters function should be called before getting the dependency files because it rebuilds content
               dependency cache. */
            return this.filterParameters(content, siteId);
        }).then((params) => {
            settings.contents = settings.contents || {};
            settings.contents[contentId] = settings.contents[contentId] || {};
            settings.contents[contentId].jsonContent = params;

            return this.getContentDependencyFiles(id, content.folderName, siteId);
        }).then((files) => {

            // H5P checks the embedType in here, but we'll always use iframe so there's no need to do it.
            // JavaScripts and stylesheets will be loaded through h5p.js.
            settings.contents[contentId].scripts = this.h5pUtils.getAssetsUrls(files.scripts);
            settings.contents[contentId].styles = this.h5pUtils.getAssetsUrls(files.styles);

            return {
                settings: settings,
                cssRequires: cssRequires,
                jsRequires: jsRequires
            };
        });
    }

    /**
     * Will check if there are cache assets available for content.
     *
     * @param key Hashed key for cached asset
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Promise resolved with the files.
     */
    getCachedAssets(key: string, folderName: string, siteId: string)
            : Promise<{scripts?: CoreH5PDependencyAsset[], styles?: CoreH5PDependencyAsset[]}> {

        const files: {scripts?: CoreH5PDependencyAsset[], styles?: CoreH5PDependencyAsset[]} = {},
            promises = [],
            cachedAssetsName = this.getCachedAssetsFolderName(),
            jsPath = this.textUtils.concatenatePaths(cachedAssetsName, key + '.js'),
            cssPath = this.textUtils.concatenatePaths(cachedAssetsName, key + '.css');
        let found = false;

        promises.push(this.fileProvider.getFileSize(jsPath).then((size) => {
            if (size > 0) {
                found = true;
                files.scripts = [
                    {
                        path: jsPath,
                        version: ''
                    }
                ];
            }
        }).catch(() => {
            // Not found.
        }));

        promises.push(this.fileProvider.getFileSize(cssPath).then((size) => {
            if (size > 0) {
                found = true;
                files.styles = [
                    {
                        path: cssPath,
                        version: ''
                    }
                ];
            }
        }).catch(() => {
            // Not found.
        }));

        return Promise.all(promises).then(() => {
            return found ? files : null;
        });
    }

    /**
     * Get folder name of the content cached assets.
     *
     * @return Name.
     */
    getCachedAssetsFolderName(): string {
        return 'cachedassets';
    }

    /**
     * Get relative path to a content cached assets.
     *
     * @param folderName Name of the folder of the content the assets belong to.
     * @param siteId Site ID.
     * @return Path.
     */
    getCachedAssetsFolderPath(folderName: string, siteId: string): string {
        return this.textUtils.concatenatePaths(this.getContentFolderPath(folderName, siteId), this.getCachedAssetsFolderName());
    }

    /**
     * Get the identifier for the H5P content. This identifier is different than the ID stored in the DB.
     *
     * @param id Package ID.
     * @return Content identifier.
     */
    protected getContentId(id: number): string {
        return 'cid-' + id;
    }

    /**
     * Get conent data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    protected getContentData(id: number, siteId?: string): Promise<CoreH5PContentDBData> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(this.CONTENT_TABLE, {id: id});
        });
    }

    /**
     * Get conent data from DB.
     *
     * @param fileUrl H5P file URL.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    protected getContentDataByUrl(fileUrl: string, siteId?: string): Promise<CoreH5PContentDBData> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb();

            // Try to use the folder name, it should be more reliable than the URL.
            return this.getContentFolderNameByUrl(fileUrl, site.getId()).then((folderName) => {

                return db.getRecord(this.CONTENT_TABLE, {foldername: folderName});
            }, () => {
                // Cannot get folder name, the h5p file was probably deleted. Just use the URL.
                return db.getRecord(this.CONTENT_TABLE, {fileurl: fileUrl});
            });
        });
    }

    /**
     * Get a package content path.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Folder path.
     */
    getContentFolderPath(folderName: string, siteId: string): string {
        return this.textUtils.concatenatePaths(this.getExternalH5PFolderPath(siteId), 'packages/' + folderName + '/content');
    }

    /**
     * Get the content index file.
     *
     * @param fileUrl URL of the H5P package.
     * @param urlParams URL params.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the file URL if exists, rejected otherwise.
     */
    getContentIndexFileUrl(fileUrl: string, urlParams?: {[name: string]: string}, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getContentFolderNameByUrl(fileUrl, siteId).then((folderName) => {
            return this.fileProvider.getFile(this.getContentIndexPath(folderName, siteId));
        }).then((file) => {
            return file.toURL();
        }).then((url) => {
            // Add display options to the URL.
            return this.getContentDataByUrl(fileUrl, siteId).then((data) => {
                const options = this.fixDisplayOptions(this.getDisplayOptionsFromUrlParams(urlParams), data.id);

                return this.urlUtils.addParamsToUrl(url, options, undefined, true);
            });
        });

    }

    /**
     * Get the path to a content index.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Folder path.
     */
    getContentIndexPath(folderName: string, siteId: string): string {
        return this.textUtils.concatenatePaths(this.getContentFolderPath(folderName, siteId), 'index.html');
    }

    /**
     * Get a content folder name given the package URL.
     *
     * @param fileUrl Package URL.
     * @param siteId Site ID.
     * @return Promise resolved with the folder name.
     */
    getContentFolderNameByUrl(fileUrl: string, siteId: string): Promise<string> {
        return this.filepoolProvider.getFilePathByUrl(siteId, fileUrl).then((path) => {

            const fileAndDir = this.fileProvider.getFileAndDirectoryFromPath(path);

            return this.mimeUtils.removeExtension(fileAndDir.name);
        });
    }

    /**
     * Get the path to the folder that contains the H5P core libraries.
     *
     * @return Folder path.
     */
    getCoreH5PPath(): string {
        return this.textUtils.concatenatePaths(this.fileProvider.getWWWPath(), '/h5p/');
    }

    /**
     * Get the settings needed by the H5P library.
     *
     * @param id The H5P content ID.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the settings.
     */
    getCoreSettings(id: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const basePath = this.fileProvider.getBasePathInstant(),
                ajaxPaths: any = {};
            ajaxPaths.xAPIResult = '';
            ajaxPaths.contentUserData = '';

            return {
                baseUrl: this.fileProvider.getWWWPath(),
                url: this.textUtils.concatenatePaths(basePath, this.getExternalH5PFolderPath(site.getId())),
                urlLibraries: this.textUtils.concatenatePaths(basePath, this.getLibrariesFolderPath(site.getId())),
                postUserStatistics: false,
                ajax: ajaxPaths,
                saveFreq: false,
                siteUrl: site.getURL(),
                l10n: {
                    H5P: this.h5pUtils.getLocalization()
                },
                user: [],
                hubIsEnabled: false,
                reportingIsEnabled: false,
                crossorigin: null,
                libraryConfig: null,
                pluginCacheBuster: '',
                libraryUrl: this.textUtils.concatenatePaths(this.getCoreH5PPath(), 'js')
            };
        });
    }

    /**
     * Finds library dependencies files of a certain package.
     *
     * @param id Content id.
     * @param folderName Name of the folder of the content.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    protected getContentDependencyFiles(id: number, folderName: string, siteId?: string)
            : Promise<{scripts: CoreH5PDependencyAsset[], styles: CoreH5PDependencyAsset[]}> {

        return this.loadContentDependencies(id, 'preloaded', siteId).then((dependencies) => {
            return this.getDependenciesFiles(dependencies, folderName, this.getExternalH5PFolderPath(siteId), siteId);
        });
    }

    /**
     * Get all dependency assets of the given type.
     *
     * @param dependency The dependency.
     * @param type Type of assets to get.
     * @param assets Array where to store the assets.
     * @param prefix Make paths relative to another dir.
     */
    protected getDependencyAssets(dependency: CoreH5PContentDependencyData, type: string, assets: CoreH5PDependencyAsset[],
            prefix: string = ''): void {

        // Check if dependency has any files of this type
        if (!dependency[type] || dependency[type][0] === '') {
            return;
        }

        // Check if we should skip CSS.
        if (type === 'preloadedCss' && this.utils.isTrueOrOne(dependency.dropCss)) {
            return;
        }

        for (const key in dependency[type]) {
            const file = dependency[type][key];

            assets.push({
                path: prefix + '/' + dependency.path + '/' + (typeof file != 'string' ? file.path : file).trim(),
                version: dependency.version
            });
        }
    }

    /**
     * Return file paths for all dependencies files.
     *
     * @param dependencies The dependencies to get the files.
     * @param folderName Name of the folder of the content.
     * @param prefix Make paths relative to another dir.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    protected getDependenciesFiles(dependencies: {[machineName: string]: CoreH5PContentDependencyData}, folderName: string,
            prefix: string = '', siteId?: string): Promise<{scripts: CoreH5PDependencyAsset[], styles: CoreH5PDependencyAsset[]}> {

        // Build files list for assets.
        const files = {
                scripts: <CoreH5PDependencyAsset[]> [],
                styles: <CoreH5PDependencyAsset[]> []
            };

        // Avoid caching empty files.
        if (!Object.keys(dependencies).length) {
            return Promise.resolve(files);
        }

        let promise,
            cachedAssetsHash;

        if (this.aggregateAssets) {
            // Get aggregated files for assets.
            cachedAssetsHash = this.h5pUtils.getDependenciesHash(dependencies);

            promise = this.getCachedAssets(cachedAssetsHash, folderName, siteId);
        } else {
            promise = Promise.resolve(null);
        }

        return promise.then((cachedAssets) => {
            if (cachedAssets) {
                // Cached assets found, return them.
                return Object.assign(files, cachedAssets);
            }

            // No cached assets, use content dependencies.
            for (const key in dependencies) {
                const dependency = dependencies[key];

                if (!dependency.path) {
                    dependency.path = this.getDependencyPath(dependency);
                    dependency.preloadedJs = (<string> dependency.preloadedJs).split(',');
                    dependency.preloadedCss = (<string> dependency.preloadedCss).split(',');
                }

                dependency.version = '?ver=' + dependency.majorVersion + '.' + dependency.minorVersion + '.' +
                        dependency.patchVersion;

                this.getDependencyAssets(dependency, 'preloadedJs', files.scripts, prefix);
                this.getDependencyAssets(dependency, 'preloadedCss', files.styles, prefix);
            }

            if (this.aggregateAssets) {
                // Aggregate and store assets.
                return this.cacheAssets(files, cachedAssetsHash, folderName, siteId).then(() => {
                    // Keep track of which libraries have been cached in case they are updated.
                    return this.saveCachedAssets(cachedAssetsHash, dependencies, folderName, siteId);
                }).then(() => {
                    return files;
                });
            }

            return files;
        });
    }

    /**
     * Get the path to the dependency.
     *
     * @param dependency Dependency library.
     * @return The path to the dependency library
     */
    protected getDependencyPath(dependency: CoreH5PContentDependencyData): string {
        return 'libraries/' + dependency.machineName + '-' + dependency.majorVersion + '.' + dependency.minorVersion;
    }

    /**
     * Get the paths to the content dependencies.
     *
     * @param id The H5P content ID.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with an object containing the path of each content dependency.
     */
    getDependencyRoots(id: number, siteId?: string): Promise<{[libString: string]: string}> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const roots = {};

        return this.loadContentDependencies(id, undefined, siteId).then((dependencies) => {

            for (const machineName in dependencies) {
                const dependency = dependencies[machineName],
                    folderName = this.libraryToString(dependency, true);

                roots[folderName] = this.getLibraryFolderPath(dependency, siteId, folderName);
            }

            return roots;
        });
    }

    /**
     * Convert display options to an object.
     *
     * @param disable Display options as a number.
     * @return Display options as object.
     */
    getDisplayOptionsAsObject(disable: number): CoreH5PDisplayOptions {
        const displayOptions: CoreH5PDisplayOptions = {};

        // tslint:disable: no-bitwise
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_FRAME] = !(disable & CoreH5PProvider.DISABLE_FRAME);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_DOWNLOAD] = !(disable & CoreH5PProvider.DISABLE_DOWNLOAD);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED] = !(disable & CoreH5PProvider.DISABLE_EMBED);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT] = !(disable & CoreH5PProvider.DISABLE_COPYRIGHT);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_ABOUT] = !!this.getOption(CoreH5PProvider.DISPLAY_OPTION_ABOUT, true);

        return displayOptions;
    }

    /**
     * Determine display option visibility when viewing H5P
     *
     * @param disable The display options as a number.
     * @param id Package ID.
     * @return Display options as object.
     */
    getDisplayOptionsForView(disable: number, id: number): CoreH5PDisplayOptions {
        return this.fixDisplayOptions(this.getDisplayOptionsAsObject(disable), id);
    }

    /**
     * Get display options from a URL params.
     *
     * @param params URL params.
     * @return Display options as object.
     */
    getDisplayOptionsFromUrlParams(params: {[name: string]: string}): CoreH5PDisplayOptions {
        const displayOptions: CoreH5PDisplayOptions = {};

        if (!params) {
            return displayOptions;
        }

        displayOptions[CoreH5PProvider.DISPLAY_OPTION_DOWNLOAD] =
                this.utils.isTrueOrOne(params[CoreH5PProvider.DISPLAY_OPTION_DOWNLOAD]);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED] =
                this.utils.isTrueOrOne(params[CoreH5PProvider.DISPLAY_OPTION_EMBED]);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT] =
                this.utils.isTrueOrOne(params[CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT]);
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_FRAME] = displayOptions[CoreH5PProvider.DISPLAY_OPTION_DOWNLOAD] ||
                displayOptions[CoreH5PProvider.DISPLAY_OPTION_EMBED] || displayOptions[CoreH5PProvider.DISPLAY_OPTION_COPYRIGHT];
        displayOptions[CoreH5PProvider.DISPLAY_OPTION_ABOUT] = !!this.getOption(CoreH5PProvider.DISPLAY_OPTION_ABOUT, true);

        return displayOptions;
    }

    /**
     * Embed code for settings.
     *
     * @param siteUrl The site URL.
     * @param h5pUrl The URL of the .h5p file.
     * @param embedEnabled Whether the option to embed the H5P content is enabled.
     * @return The HTML code to reuse this H5P content in a different place.
     */
    protected getEmbedCode(siteUrl: string, h5pUrl: string, embedEnabled?: boolean): string {
        if (!embedEnabled) {
            return '';
        }

        return '<iframe src="' + this.getEmbedUrl(siteUrl, h5pUrl) + '" allowfullscreen="allowfullscreen"></iframe>';
    }

    /**
     * Get the encoded URL for embeding an H5P content.
     *
     * @param siteUrl The site URL.
     * @param h5pUrl The URL of the .h5p file.
     * @return The embed URL.
     */
    protected getEmbedUrl(siteUrl: string, h5pUrl: string): string {
        return this.textUtils.concatenatePaths(siteUrl, '/h5p/embed.php') + '?url=' + h5pUrl;
    }

    /**
     * Get path to the folder containing H5P files extracted from packages.
     *
     * @param siteId The site ID.
     * @return Folder path.
     */
    getExternalH5PFolderPath(siteId: string): string {
        return this.textUtils.concatenatePaths(this.fileProvider.getSiteFolder(siteId), 'h5p');
    }

    /**
     * Get library data. This code is based on the getLibraryData from Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param libDir Directory where the library files are.
     * @param libPath Path to the directory where the library files are.
     * @param h5pDir Path to the directory where this h5p files are.
     * @return Library data.
     */
    protected getLibraryData(libDir: DirectoryEntry, libPath: string, h5pDir: string): any {
        const libraryJsonPath = this.textUtils.concatenatePaths(libPath, 'library.json'),
            semanticsPath = this.textUtils.concatenatePaths(libPath, 'semantics.json'),
            langPath = this.textUtils.concatenatePaths(libPath, 'language'),
            iconPath = this.textUtils.concatenatePaths(libPath, 'icon.svg'),
            promises = [];
        let h5pData,
            semanticsData,
            langData,
            hasIcon;

        // Read the library json file.
        promises.push(this.fileProvider.readFile(libraryJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            h5pData = data;
        }));

        // Get library semantics if it exists.
        promises.push(this.fileProvider.readFile(semanticsPath, CoreFileProvider.FORMATJSON).then((data) => {
            semanticsData = data;
        }).catch(() => {
            // Probably doesn't exist, ignore.
        }));

        // Get language data if it exists.
        promises.push(this.fileProvider.getDirectoryContents(langPath).then((entries) => {
            const subPromises = [];
            langData = {};

            entries.forEach((entry) => {
                const langFilePath = this.textUtils.concatenatePaths(langPath, entry.name);

                subPromises.push(this.fileProvider.readFile(langFilePath, CoreFileProvider.FORMATJSON).then((data) => {
                    const parts = entry.name.split('.'); // The language code is in parts[0].
                    langData[parts[0]] = data;
                }));
            });
        }).catch(() => {
            // Probably doesn't exist, ignore.
        }));

        // Check if it has icon.
        promises.push(this.fileProvider.getFile(iconPath).then(() => {
            hasIcon = true;
        }).catch(() => {
            hasIcon = false;
        }));

        return Promise.all(promises).then(() => {
            h5pData.semantics = semanticsData;
            h5pData.language = langData;
            h5pData.hasIcon = hasIcon;

            return h5pData;
        });
    }

    /**
     * Get a library data stored in DB.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    protected getLibrary(machineName: string, majorVersion?: string | number, minorVersion?: string | number, siteId?: string)
            : Promise<CoreH5PLibraryDBData> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const conditions: any = {
                machinename: machineName
            };

            if (typeof majorVersion != 'undefined') {
                conditions.majorversion = majorVersion;
            }
            if (typeof minorVersion != 'undefined') {
                conditions.minorversion = minorVersion;
            }

            return db.getRecords(this.LIBRARIES_TABLE, conditions);
        }).then((libraries): any => {
            if (!libraries.length) {
                return Promise.reject(null);
            }

            return this.parseLibDBData(libraries[0]);
        });
    }

    /**
     * Get a library data stored in DB.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    protected getLibraryByData(libraryData: any, siteId?: string): Promise<CoreH5PLibraryDBData> {
        return this.getLibrary(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get a library data stored in DB by ID.
     *
     * @param id Library ID.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    protected getLibraryById(id: number, siteId?: string): Promise<CoreH5PLibraryDBData> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(this.LIBRARIES_TABLE, {id: id}).then((library) => {
                return this.parseLibDBData(library);
            });
        });
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library ID, null if not found.
     */
    protected getLibraryId(machineName: string, majorVersion?: string | number, minorVersion?: string | number, siteId?: string)
            : Promise<number> {

        return this.getLibrary(machineName, majorVersion, minorVersion, siteId).then((library) => {
            return (library && library.id) || null;
        }).catch(() => {
            return null;
        });
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library ID, null if not found.
     */
    protected getLibraryIdByData(libraryData: any, siteId?: string): Promise<number> {
        return this.getLibraryId(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get libraries folder path.
     *
     * @param siteId The site ID.
     * @return Folder path.
     */
    getLibrariesFolderPath(siteId: string): string {
        return this.textUtils.concatenatePaths(this.getExternalH5PFolderPath(siteId), 'libraries');
    }

    /**
     * Get a library's folder path.
     *
     * @param libraryData The library data.
     * @param siteId The site ID.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @return Folder path.
     */
    getLibraryFolderPath(libraryData: any, siteId: string, folderName?: string): string {
        if (!folderName) {
            folderName = this.libraryToString(libraryData, true);
        }

        return this.textUtils.concatenatePaths(this.getLibrariesFolderPath(siteId), folderName);
    }

    /**
     * Get the default behaviour for the display option defined.
     *
     * @param name Identifier for the setting.
     * @param defaultValue Optional default value if settings is not set.
     * @return Return the value for this display option.
     */
    getOption(name: string, defaultValue: any = false): any {
        // For now, all them are disabled by default, so only will be rendered when defined in the display options.
        return CoreH5PDisplayOptionBehaviour.CONTROLLED_BY_AUTHOR_DEFAULT_OFF;
    }

    /**
     * Resizing script for settings.
     *
     * @return The HTML code with the resize script.
     */
    protected getResizeCode(): string {
        return '<script src="' + this.getResizerScriptUrl() + '"></script>';
    }

    /**
     * Get the URL to the resizer script.
     *
     * @return URL.
     */
    getResizerScriptUrl(): string {
        return this.textUtils.concatenatePaths(this.getCoreH5PPath(), 'js/h5p-resizer.js');
    }

    /**
     * Get core JavaScript files.
     *
     * @return array The array containg urls of the core JavaScript files:
     */
    getScripts(): string[] {
        const libUrl = this.getCoreH5PPath(),
            urls = [];

        CoreH5PProvider.SCRIPTS.forEach((script) => {
            urls.push(libUrl + script);
        });

        return urls;
    }

    /**
     * Get a trusted H5P file.
     *
     * @param url The file URL.
     * @param options Options.
     * @param ignoreCache Whether to ignore cache.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file data.
     */
    getTrustedH5PFile(url: string, options?: CoreH5PGetTrustedFileOptions, ignoreCache?: boolean, siteId?: string)
            : Promise<CoreWSExternalFile> {

        options = options || {};

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data = {
                    url: this.treatH5PUrl(url, site.getURL()),
                    frame: options.frame ? 1 : 0,
                    export: options.export ? 1 : 0,
                    embed: options.embed ? 1 : 0,
                    copyright: options.copyright ? 1 : 0,
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getTrustedH5PFileCacheKey(url),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_h5p_get_trusted_h5p_file', data, preSets).then((result: CoreH5PGetTrustedH5PFileResult): any => {
                if (result.warnings && result.warnings.length) {
                    return Promise.reject(result.warnings[0]);
                }

                if (result.files && result.files.length) {
                    return result.files[0];
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for trusted H5P file WS calls.
     *
     * @param url The file URL.
     * @return Cache key.
     */
    protected getTrustedH5PFileCacheKey(url: string): string {
        return this.getTrustedH5PFilePrefixCacheKey() + url;
    }

    /**
     * Get prefixed cache key for trusted H5P file WS calls.
     *
     * @return Cache key.
     */
    protected getTrustedH5PFilePrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'trustedH5PFile:';
    }

    /**
     * Check whether the user has permission to execute an action.
     *
     * @param permission Permission to check.
     * @param id H5P package id.
     * @return Whether the user has permission to execute an action.
     */
    hasPermission(permission: number, id: number): boolean {
        // H5P capabilities have not been introduced.
        return null;
    }

    /**
     * Invalidates all trusted H5P file WS calls.
     *
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllGetTrustedH5PFile(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getTrustedH5PFilePrefixCacheKey());
        });
    }

    /**
     * Invalidates get trusted H5P file WS call.
     *
     * @param url The URL of the file.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContexts(url: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getTrustedH5PFileCacheKey(url));
        });
    }

    /**
     * Performs actions required when a library has been installed.
     *
     * @param libraryId ID of library that was installed.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected libraryInstalled(libraryId: number, siteId: string): Promise<any> {
        const promises = [];

        // Remove all indexes of contents that use this library.
        promises.push(this.deleteContentIndexesForLibrary(libraryId, siteId));

        if (this.aggregateAssets) {
            // Remove cached assets that use this library.
            promises.push(this.deleteCachedAssets(libraryId, siteId));
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Writes library data as string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryData Library data.
     * @param folderName Use hyphen instead of space in returned string.
     * @return String on the form {machineName} {majorVersion}.{minorVersion}.
     */
    protected libraryToString(libraryData: any, folderName?: boolean): string {
        return (libraryData.machineName ? libraryData.machineName : libraryData.name) + (folderName ? '-' : ' ') +
                libraryData.majorVersion + '.' + libraryData.minorVersion;
    }

    /**
     * Load addon libraries.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the addon libraries.
     */
    loadAddons(siteId?: string): Promise<CoreH5PLibraryAddonData[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {

            const query = 'SELECT l1.id AS libraryId, l1.machinename AS machineName, ' +
                            'l1.majorversion AS majorVersion, l1.minorversion AS minorVersion, ' +
                            'l1.patchversion AS patchVersion, l1.addto AS addTo, ' +
                            'l1.preloadedjs AS preloadedJs, l1.preloadedcss AS preloadedCss ' +
                        'FROM ' + this.LIBRARIES_TABLE + ' l1 ' +
                        'JOIN ' + this.LIBRARIES_TABLE + ' l2 ON l1.machinename = l2.machinename AND (' +
                            'l1.majorversion < l2.majorversion OR (l1.majorversion = l2.majorversion AND ' +
                            'l1.minorversion < l2.minorversion)) ' +
                        'WHERE l1.addto IS NOT NULL AND l2.machinename IS NULL';

            return db.execute(query).then((result) => {
                const addons = [];

                for (let i = 0; i < result.rows.length; i++) {
                    addons.push(this.parseLibAddonData(result.rows.item(i)));
                }

                return addons;
            });
        });
    }

    /**
     * Load content data from DB.
     *
     * @param id Content ID.
     * @param fileUrl H5P file URL. Required if id is not provided.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    protected loadContentData(id?: number, fileUrl?: string, siteId?: string): Promise<CoreH5PContentData> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let promise: Promise<CoreH5PContentDBData>;

        if (id) {
            promise = this.getContentData(id, siteId);
        } else if (fileUrl) {
            promise = this.getContentDataByUrl(fileUrl, siteId);
        } else {
            promise = Promise.reject(null);
        }

        return promise.then((contentData) => {

            // Load the main library data.
            return this.getLibraryById(contentData.mainlibraryid, siteId).then((libData) => {

                // Validate metadata.
                const validator = new CoreH5PContentValidator(this, this.h5pUtils, this.textUtils, this.utils, this.translate,
                            siteId);

                // Validate empty metadata, like Moodle web does.
                return validator.validateMetadata({}).then((metadata) => {
                    // Map the values to the names used by the H5P core (it's the same Moodle web does).
                    return {
                        id: contentData.id,
                        params: contentData.jsoncontent,
                        embedType: 'iframe', // Always use iframe.
                        disable: null,
                        folderName: contentData.foldername,
                        title: libData.title,
                        slug: this.h5pUtils.slugify(libData.title) + '-' + contentData.id,
                        filtered: contentData.filtered,
                        libraryMajorVersion: libData.majorversion,
                        libraryMinorVersion: libData.minorversion,
                        metadata: metadata,
                        library: {
                            id: libData.id,
                            name: libData.machinename,
                            majorVersion: libData.majorversion,
                            minorVersion: libData.minorversion,
                            embedTypes: libData.embedtypes,
                            fullscreen: libData.fullscreen
                        }
                    };
                });
            });
        });
    }

    /**
     * Load dependencies for the given content of the given type.
     *
     * @param id Content ID.
     * @param type The dependency type.
     * @return Content dependencies, indexed by machine name.
     */
    loadContentDependencies(id: number, type?: string, siteId?: string)
            : Promise<{[machineName: string]: CoreH5PContentDependencyData}> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            let query = 'SELECT hl.id AS libraryId, hl.machinename AS machineName, ' +
                            'hl.majorversion AS majorVersion, hl.minorversion AS minorVersion, ' +
                            'hl.patchversion AS patchVersion, hl.preloadedcss AS preloadedCss, ' +
                            'hl.preloadedjs AS preloadedJs, hcl.dropcss AS dropCss, ' +
                            'hcl.dependencytype as dependencyType ' +
                        'FROM ' + this.CONTENTS_LIBRARIES_TABLE + ' hcl ' +
                        'JOIN ' + this.LIBRARIES_TABLE + ' hl ON hcl.libraryid = hl.id ' +
                        'WHERE hcl.h5pid = ?';
            const queryArgs = [];
            queryArgs.push(id);

            if (type) {
                query += ' AND hcl.dependencytype = ?';
                queryArgs.push(type);
            }

            query += ' ORDER BY hcl.weight';

            return db.execute(query, queryArgs).then((result) => {
                const dependencies = {};

                for (let i = 0; i < result.rows.length; i++) {
                    const dependency = result.rows.item(i);

                    dependencies[dependency.machineName] = dependency;
                }

                return dependencies;
            });
        });
    }

    /**
     * Loads a library and its dependencies.
     *
     * @param machineName The library's machine name.
     * @param majorVersion The library's major version.
     * @param minorVersion The library's minor version.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data.
     */
    loadLibrary(machineName: string, majorVersion: number, minorVersion: number, siteId?: string): Promise<CoreH5PLibraryData> {

        // First get the library data from DB.
        return this.getLibrary(machineName, majorVersion, minorVersion, siteId).then((library) => {
            const libraryData: CoreH5PLibraryData = {
                libraryId: library.id,
                title: library.title,
                machineName: library.machinename,
                majorVersion: library.majorversion,
                minorVersion: library.minorversion,
                patchVersion: library.patchversion,
                runnable: library.runnable,
                fullscreen: library.fullscreen,
                embedTypes: library.embedtypes,
                preloadedJs: library.preloadedjs,
                preloadedCss: library.preloadedcss,
                dropLibraryCss: library.droplibrarycss,
                semantics: library.semantics,
                preloadedDependencies: [],
                dynamicDependencies: [],
                editorDependencies: []
            };

            // Now get the dependencies.
            const sql = 'SELECT hl.id, hl.machinename, hl.majorversion, hl.minorversion, hll.dependencytype ' +
                    'FROM ' + this.LIBRARY_DEPENDENCIES_TABLE + ' hll ' +
                    'JOIN ' + this.LIBRARIES_TABLE + ' hl ON hll.requiredlibraryid = hl.id ' +
                    'WHERE hll.libraryid = ? ' +
                    'ORDER BY hl.id ASC';

            const sqlParams = [
                library.id
            ];

            return this.sitesProvider.getSiteDb(siteId).then((db) => {
                return db.execute(sql, sqlParams).then((result) => {

                    for (let i = 0; i < result.rows.length; i++) {
                        const dependency = result.rows.item(i),
                            key = dependency.dependencytype + 'Dependencies';

                        libraryData[key].push({
                            machineName: dependency.machinename,
                            majorVersion: dependency.majorversion,
                            minorVersion: dependency.minorversion
                        });
                    }

                    return libraryData;
                });
            });
        });
    }

    /**
     * Parse library addon data.
     *
     * @param library Library addon data.
     * @return Parsed library.
     */
    parseLibAddonData(library: any): CoreH5PLibraryAddonData {
        library.addto = this.textUtils.parseJSON(library.addto, null);

        return library;
    }

    /**
     * Parse library DB data.
     *
     * @param library Library DB data.
     * @return Parsed library.
     */
    parseLibDBData(library: any): CoreH5PLibraryDBData {
        library.semantics = this.textUtils.parseJSON(library.semantics, null);
        library.addto = this.textUtils.parseJSON(library.addto, null);

        return library;
    }

    /**
     * Process libraries from an H5P library, getting the required data to save them.
     * This code was copied from the isValidPackage function in Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @return Promise resolved when done.
     */
    protected processH5PFiles(destFolder: string, entries: (DirectoryEntry | FileEntry)[])
            : Promise<{librariesJsonData: any, mainJsonData: any, contentJsonData: any}> {

        const promises = [],
            libraries: any = {};
        let contentJsonData,
            mainH5PData;

        // Read the h5p.json file.
        const h5pJsonPath = this.textUtils.concatenatePaths(destFolder, 'h5p.json');
        promises.push(this.fileProvider.readFile(h5pJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            mainH5PData = data;
        }));

        // Read the content.json file.
        const contentJsonPath = this.textUtils.concatenatePaths(destFolder, 'content/content.json');
        promises.push(this.fileProvider.readFile(contentJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            contentJsonData = data;
        }));

        // Treat libraries.
        entries.forEach((entry) => {
            if (entry.name[0] == '.' || entry.name[0] == '_' || entry.name == 'content' || entry.isFile) {
                // Skip files, the content folder and any folder starting with a . or _.
                return;
            }

            const libDirPath = this.textUtils.concatenatePaths(destFolder, entry.name);

            promises.push(this.getLibraryData(<DirectoryEntry> entry, libDirPath, destFolder).then((libraryH5PData) => {
                libraryH5PData.uploadDirectory = libDirPath;
                libraries[this.libraryToString(libraryH5PData)] = libraryH5PData;
            }));
        });

        return Promise.all(promises).then(() => {
            return {
                librariesJsonData: libraries,
                mainJsonData: mainH5PData,
                contentJsonData: contentJsonData
            };
        });
    }

    /**
     * Stores hash keys for cached assets, aggregated JavaScripts and stylesheets, and connects it to libraries so that we
     * know which cache file to delete when a library is updated.
     *
     * @param key Hash key for the given libraries.
     * @param libraries List of dependencies used to create the key.
     * @param folderName The name of the folder that contains the H5P.
     * @param siteId The site ID.
     * @return Promise resolved when done.
     */
    protected saveCachedAssets(hash: string, dependencies: {[machineName: string]: CoreH5PContentDependencyData},
            folderName: string, siteId?: string): Promise<any> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const promises = [];

            for (const key in dependencies) {
                const data = {
                        hash: key,
                        libraryid: dependencies[key].libraryId,
                        foldername: folderName
                    };

                promises.push(db.insertRecord(this.LIBRARIES_CACHEDASSETS_TABLE, data));
            }

            return Promise.all(promises);
        });
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with content ID.
     */
    protected saveContentData(content: any, folderName: string, fileUrl: string, siteId?: string): Promise<number> {
        // Save in DB.
        return this.sitesProvider.getSiteDb(siteId).then((db) => {

            const data: any = {
                jsoncontent: content.params,
                mainlibraryid: content.library.libraryId,
                timemodified: Date.now(),
                filtered: null,
                foldername: folderName,
                fileurl: fileUrl
            };

            if (typeof content.id != 'undefined') {
                data.id = content.id;
            } else {
                data.timecreated = data.timemodified;
            }

            return db.insertRecord(this.CONTENT_TABLE, data).then(() => {
                if (!data.id) {
                    // New content. Get its ID.
                    return db.getRecord(this.CONTENT_TABLE, data).then((entry) => {
                        content.id = entry.id;
                    });
                }
            });
        }).then(() => {
            // If resetContentUserData is implemented in the future, it should be called in here.
            return content.id;
        });
    }

    /**
     * Save the content in filesystem.
     *
     * @param contentPath Path to the current content folder (tmp).
     * @param folderName Name to put to the content folder.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected saveContentInFS(contentPath: string, folderName: string, siteId: string): Promise<any> {
        const folderPath = this.getContentFolderPath(folderName, siteId);

        // Delete existing content for this package.
        return this.fileProvider.removeDir(folderPath).catch(() => {
            // Ignore errors, maybe it doesn't exist.
        }).then(() => {
            // Copy the new one.
            return this.fileProvider.moveDir(contentPath, folderPath);
        });
    }

    /**
     * Save libraries. This code is based on the saveLibraries function from Moodle's H5PStorage.
     *
     * @param librariesJsonData Data about libraries.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraries(librariesJsonData: any, folderName: string, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const libraryIds = [];

        // First of all, try to create the dir where the libraries are stored. This way we don't have to do it for each lib.
        return this.fileProvider.createDir(this.getLibrariesFolderPath(siteId)).then(() => {
            const promises = [];

            // Go through libraries that came with this package.
            for (const libString in librariesJsonData) {
                const libraryData = librariesJsonData[libString];

                // Find local library identifier.
                promises.push(this.getLibraryByData(libraryData).catch(() => {
                    // Not found.
                }).then((dbData) => {
                    if (dbData) {
                        // Library already installed.
                        libraryData.libraryId = dbData.id;

                        if (libraryData.patchVersion <= dbData.patchversion) {
                            // Same or older version, no need to save.
                            libraryData.saveDependencies = false;

                            return;
                        }
                    }

                    libraryData.saveDependencies = true;

                    // Convert metadataSettings values to boolean and json_encode it before saving.
                    libraryData.metadataSettings = libraryData.metadataSettings ?
                            this.h5pUtils.boolifyAndEncodeMetadataSettings(libraryData.metadataSettings) : null;

                    // Save the library data in DB.
                    return this.saveLibraryData(libraryData, siteId).then(() => {
                        // Now save it in FS.
                        return this.saveLibraryInFS(libraryData, siteId).catch((error) => {
                            // An error occurred, delete the DB data because the lib FS data has been deleted.
                            return this.deleteLibraryData(libraryData.libraryId, siteId).catch(() => {
                                // Ignore errors.
                            }).then(() => {
                                return Promise.reject(error);
                            });
                        });
                    }).then(() => {
                        if (typeof libraryData.libraryId != 'undefined') {
                            return this.libraryInstalled(libraryData.libraryId, siteId);
                        }
                    });
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            // Go through the libraries again to save dependencies.
            const promises = [];

            for (const libString in librariesJsonData) {
                const libraryData = librariesJsonData[libString];
                if (!libraryData.saveDependencies) {
                    continue;
                }

                libraryIds.push(libraryData.libraryId);

                // Remove any old dependencies.
                promises.push(this.deleteLibraryDependencies(libraryData.libraryId).then(() => {
                    // Insert the different new ones.
                    const subPromises = [];

                    if (typeof libraryData.preloadedDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.preloadedDependencies,
                                'preloaded'));
                    }
                    if (typeof libraryData.dynamicDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.dynamicDependencies,
                                'dynamic'));
                    }
                    if (typeof libraryData.editorDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.editorDependencies,
                                'editor'));
                    }

                    return Promise.all(subPromises);
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            // Make sure dependencies, parameter filtering and export files get regenerated for content who uses these libraries.
            if (libraryIds.length) {
                return this.clearFilteredParameters(libraryIds, siteId);
            }
        });
    }

    /**
     * Save a library in filesystem.
     *
     * @param libraryData Library data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraryInFS(libraryData: any, siteId?: string): Promise<any> {
        const folderPath = this.getLibraryFolderPath(libraryData, siteId);

        // Delete existing library version.
        return this.fileProvider.removeDir(folderPath).catch(() => {
            // Ignore errors, maybe it doesn't exist.
        }).then(() => {
            // Copy the new one.
            return this.fileProvider.moveDir(libraryData.uploadDirectory, folderPath, true);
        });
    }

    /**
     * Save library data in DB.
     *
     * @param libraryData Library data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraryData(libraryData: any, siteId?: string): Promise<any> {
        // Some special properties needs some checking and converting before they can be saved.
        const preloadedJS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'preloadedJs', 'path'),
            preloadedCSS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'preloadedCss', 'path'),
            dropLibraryCSS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'dropLibraryCss', 'machineName');

        if (typeof libraryData.semantics == 'undefined') {
            libraryData.semantics = '';
        }
        if (typeof libraryData.fullscreen == 'undefined') {
            libraryData.fullscreen = 0;
        }

        let embedTypes = '';
        if (typeof libraryData.embedTypes != 'undefined') {
            embedTypes = libraryData.embedTypes.join(', ');
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                data: any = {
                    title: libraryData.title,
                    machinename: libraryData.machineName,
                    majorversion: libraryData.majorVersion,
                    minorversion: libraryData.minorVersion,
                    patchversion: libraryData.patchVersion,
                    runnable: libraryData.runnable,
                    fullscreen: libraryData.fullscreen,
                    embedtypes: embedTypes,
                    preloadedjs: preloadedJS,
                    preloadedcss: preloadedCSS,
                    droplibrarycss: dropLibraryCSS,
                    semantics: typeof libraryData.semantics != 'undefined' ? JSON.stringify(libraryData.semantics) : null,
                    addto: typeof libraryData.addTo != 'undefined' ? JSON.stringify(libraryData.addTo) : null,
                };

            if (libraryData.libraryId) {
                data.id = libraryData.libraryId;
            }

            return db.insertRecord(this.LIBRARIES_TABLE, data).then(() => {
                if (!data.id) {
                    // New library. Get its ID.
                    return db.getRecord(this.LIBRARIES_TABLE, data).then((entry) => {
                        libraryData.libraryId = entry.id;
                    });
                } else {
                    // Updated libary. Remove old dependencies.
                    return this.deleteLibraryDependencies(data.id, site.getId());
                }
            });
        });
    }

    /**
     * Save what libraries a library is depending on.
     *
     * @param libraryId Library Id for the library we're saving dependencies for.
     * @param dependencies List of dependencies as associative arrays containing machineName, majorVersion, minorVersion.
     * @param dependencytype The type of dependency.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraryDependencies(libraryId: number, dependencies: any[], dependencyType: string, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {

            const promises = [];

            dependencies.forEach((dependency) => {
                // Get the ID of the library.
                promises.push(this.getLibraryIdByData(dependency, siteId).then((dependencyId) => {
                    // Create the relation.
                    const entry = {
                        libraryid: libraryId,
                        requiredlibraryid: dependencyId,
                        dependencytype: dependencyType
                    };

                    return db.insertRecord(this.LIBRARY_DEPENDENCIES_TABLE, entry);
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Saves what libraries the content uses.
     *
     * @param id Id identifying the package.
     * @param librariesInUse List of libraries the content uses.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    saveLibraryUsage(id: number, librariesInUse: {[key: string]: CoreH5PContentDepsTreeDependency}, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            // Calculate the CSS to drop.
            const dropLibraryCssList = {},
                promises = [];

            for (const key in librariesInUse) {
                const dependency = librariesInUse[key];

                if ((<CoreH5PLibraryData> dependency.library).dropLibraryCss) {
                    const split = (<CoreH5PLibraryData> dependency.library).dropLibraryCss.split(', ');

                    split.forEach((css) => {
                        dropLibraryCssList[css] = css;
                    });
                }
            }

            for (const key in librariesInUse) {
                const dependency = librariesInUse[key],
                    data = {
                        h5pid: id,
                        libraryId: dependency.library.libraryId,
                        dependencytype: dependency.type,
                        dropcss: dropLibraryCssList[dependency.library.machineName] ? 1 : 0,
                        weight: dependency.weight
                    };

                promises.push(db.insertRecord(this.CONTENTS_LIBRARIES_TABLE, data));
            }

            return Promise.all(promises);
        });

    }

    /**
     * Helper function used to figure out embed and download behaviour.
     *
     * @param optionName The option name.
     * @param permission The permission.
     * @param id The package ID.
     * @param value Default value.
     * @return The value to use.
     */
    setDisplayOptionOverrides(optionName: string, permission: number, id: number, value: boolean): boolean {
        const behaviour = this.getOption(optionName, CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);

        // If never show globally, force hide
        if (behaviour == CoreH5PDisplayOptionBehaviour.NEVER_SHOW) {
            value = false;
        } else if (behaviour == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW) {
            // If always show or permissions say so, force show
            value = true;
        } else if (behaviour == CoreH5PDisplayOptionBehaviour.CONTROLLED_BY_PERMISSIONS) {
            value = this.hasPermission(permission, id);
        }

        return value;
    }

    /**
     * Treat an H5P url before sending it to WS.
     *
     * @param url H5P file URL.
     * @param siteUrl Site URL.
     * @return Treated url.
     */
    protected treatH5PUrl(url: string, siteUrl: string): string {
        if (url.indexOf(this.textUtils.concatenatePaths(siteUrl, '/webservice/pluginfile.php')) === 0) {
            url = url.replace('/webservice/pluginfile', '/pluginfile');
        }

        return url;
    }

    /**
     * This will update selected fields on the given content.
     *
     * @param id Content identifier.
     * @param fields Object with the fields to update.
     * @param siteId Site ID. If not defined, current site.
     */
    protected updateContentFields(id: number, fields: any, siteId?: string): Promise<any> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const data = Object.assign(fields);
            delete data.slug; // Slug isn't stored in DB.

            return db.updateRecords(this.CONTENT_TABLE, data, {id: id});
        });
    }
}

/**
 * Display options behaviour constants.
 */
export class CoreH5PDisplayOptionBehaviour {
    static NEVER_SHOW = 0;
    static CONTROLLED_BY_AUTHOR_DEFAULT_ON = 1;
    static CONTROLLED_BY_AUTHOR_DEFAULT_OFF = 2;
    static ALWAYS_SHOW = 3;
    static CONTROLLED_BY_PERMISSIONS = 4;
}

/**
 * Permission constants.
 */
export class CoreH5PPermission {
    static DOWNLOAD_H5P = 0;
    static EMBED_H5P = 1;
    static CREATE_RESTRICTED = 2;
    static UPDATE_LIBRARIES = 3;
    static INSTALL_RECOMMENDED = 4;
    static COPY_H5P = 4;
}

/**
 * Display options as object.
 */
export type CoreH5PDisplayOptions = {
    frame?: boolean;
    export?: boolean;
    embed?: boolean;
    copyright?: boolean;
    icon?: boolean;
    copy?: boolean;
};

/**
 * Options for core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedFileOptions = {
    frame?: boolean; // Whether to show the bar options below the content.
    export?: boolean; // Whether to allow to download the package.
    embed?: boolean; // Whether to allow to copy the code to your site.
    copyright?: boolean; // The copyright option.
};

/**
 * Result of core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedH5PFileResult = {
    files: CoreWSExternalFile[]; // Files.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Dependency asset.
 */
export type CoreH5PDependencyAsset = {
    path: string; // Path to the asset.
    version: string; // Dependency version.
};

/**
 * Content data stored in DB.
 */
export type CoreH5PContentDBData = {
    id: number; // The id of the content.
    jsoncontent: string; // The content in json format.
    mainlibraryid: number; // The library we first instantiate for this node.
    foldername: string; // Name of the folder that contains the contents.
    fileurl: string; // The online URL of the H5P package.
    filtered: string; // Filtered version of json_content.
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
};

/**
 * Content data, including main library data.
 */
export type CoreH5PContentData = {
    id: number; // The id of the content.
    params: string; // The content in json format.
    embedType: string; // Embed type to use.
    disable: number; // H5P Button display options.
    folderName: string; // Name of the folder that contains the contents.
    title: string; // Main library's title.
    slug: string; // Lib title and ID slugified.
    filtered: string; // Filtered version of json_content.
    libraryMajorVersion: number; // Main library's major version.
    libraryMinorVersion: number; // Main library's minor version.
    metadata: any; // Content metadata.
    library: { // Main library data.
        id: number; // The id of the library.
        name: string; // The library machine name.
        majorVersion: number; // Major version.
        minorVersion: number; // Minor version.
        embedTypes: string; // List of supported embed types.
        fullscreen: number; // Display fullscreen button.
    };
    dependencies?: {[key: string]: CoreH5PContentDepsTreeDependency}; // Dependencies. Calculated in filterParameters.
};

/**
 * Content dependency data.
 */
export type CoreH5PContentDependencyData = {
    libraryId: number; // The id of the library if it is an existing library.
    machineName: string; // The library machineName.
    majorVersion: number; // The The library's majorVersion.
    minorVersion: number; // The The library's minorVersion.
    patchVersion: number; // The The library's patchVersion.
    preloadedJs?: string | string[]; // Comma separated string with js file paths. If already parsed, list of paths.
    preloadedCss?: string | string[]; // Comma separated string with css file paths. If already parsed, list of paths.
    dropCss?: string; // CSV of machine names.
    dependencyType: string; // The dependency type.
    path?: string; // Path to the dependency. Calculated in getDependenciesFiles.
    version?: string; // Version of the dependency. Calculated in getDependenciesFiles.
};

/**
 * Data for each content dependency in the dependency tree.
 */
export type CoreH5PContentDepsTreeDependency = {
    library: CoreH5PLibraryData | CoreH5PLibraryAddonData; // Library data.
    type: string; // Dependency type.
    weight?: number; // An integer determining the order of the libraries when they are loaded.
};

/**
 * Library data.
 */
export type CoreH5PLibraryData = {
    libraryId: number; // The id of the library.
    title: string; // The human readable name of this library.
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    patchVersion: number; // Patch version.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedTypes: string; // List of supported embed types.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    dropLibraryCss?: string; // List of libraries that should not have CSS included if this library is used. Comma separated list.
    semantics?: any; // The semantics definition. If it's a string, it's in json format.
    preloadedDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
    dynamicDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
    editorDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
};

/**
 * Library basic data.
 */
export type CoreH5PLibraryBasicData = {
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
};

/**
 * "Addon" data (library).
 */
export type CoreH5PLibraryAddonData = {
    libraryId: number; // The id of the library.
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    patchVersion: number; // Patch version.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    addTo?: any; // Plugin configuration data.
};

/**
 * Library data stored in DB.
 */
export type CoreH5PLibraryDBData = {
    id: number; // The id of the library.
    machinename: string; // The library machine name.
    title: string; // The human readable name of this library.
    majorversion: number; // Major version.
    minorversion: number; // Minor version.
    patchversion: number; // Patch version.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedtypes: string; // List of supported embed types.
    preloadedjs?: string; // Comma separated list of scripts to load.
    preloadedcss?: string; // Comma separated list of stylesheets to load.
    droplibrarycss?: string; // List of libraries that should not have CSS included if this library is used. Comma separated list.
    semantics?: any; // The semantics definition.
    addto?: any; // Plugin configuration data.
};

/**
 * Library dependencies stored in DB.
 */
export type CoreH5PLibraryDependenciesDBData = {
    id: number; // Id.
    libraryid: number; // The id of an H5P library.
    requiredlibraryid: number; // The dependent library to load.
    dependencytype: string; // Type: preloaded, dynamic, or editor.
};
