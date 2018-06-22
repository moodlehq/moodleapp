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
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModDataFieldsDelegate } from './fields-delegate';
import { AddonModDataOfflineProvider } from './offline';
import { AddonModDataProvider } from './data';

/**
 * Service that provides helper functions for datas.
 */
@Injectable()
export class AddonModDataHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, protected dataProvider: AddonModDataProvider,
        private translate: TranslateService, private fieldsDelegate: AddonModDataFieldsDelegate,
        private dataOffline: AddonModDataOfflineProvider, private fileUploaderProvider: CoreFileUploaderProvider,
        private textUtils: CoreTextUtilsProvider) { }

    /**
     * Returns the record with the offline actions applied.
     *
     * @param  {any} record         Entry to modify.
     * @param  {any} offlineActions Offline data with the actions done.
     * @param  {any} fields         Entry defined fields indexed by fieldid.
     * @return {any}                Modified entry.
     */
    applyOfflineActions(record: any, offlineActions: any[], fields: any[]): any {
        const promises  = [];

        offlineActions.forEach((action) => {
            switch (action.action) {
                case 'approve':
                    record.approved = true;
                    break;
                case 'disapprove':
                    record.approved = false;
                    break;
                case 'delete':
                    record.deleted = true;
                    break;
                case 'add':
                case 'edit':
                    const offlineContents = {};

                    action.fields.forEach((offlineContent) => {
                        if (typeof offlineContents[offlineContent.fieldid] == 'undefined') {
                            offlineContents[offlineContent.fieldid] = {};
                        }

                        if (offlineContent.subfield) {
                            offlineContents[offlineContent.fieldid][offlineContent.subfield] =
                                this.textUtils.parseJSON(offlineContent.value);
                        } else {
                            offlineContents[offlineContent.fieldid][''] = this.textUtils.parseJSON(offlineContent.value);
                        }
                    });

                    // Override field contents.
                    fields.forEach((field) => {
                        if (this.fieldsDelegate.hasFiles(field)) {
                            promises.push(this.getStoredFiles(record.dataid, record.id, field.id).then((offlineFiles) => {
                                record.contents[field.id] = this.fieldsDelegate.overrideData(field, record.contents[field.id],
                                        offlineContents[field.id], offlineFiles);
                            }));
                        } else {
                            record.contents[field.id] = this.fieldsDelegate.overrideData(field, record.contents[field.id],
                                    offlineContents[field.id]);
                        }
                    });
                    break;
                default:
                    break;
            }
        });

        return Promise.all(promises).then(() => {
            return record;
        });
    }

    /**
     * Displays fields for being shown.
     *
     * @param {string} template   Template HMTL.
     * @param {any[]}  fields     Fields that defines every content in the entry.
     * @param {any}    entry      Entry.
     * @param {string} mode       Mode list or show.
     * @param {any}    actions    Actions that can be performed to the record.
     * @return {string}           Generated HTML.
     */
    displayShowFields(template: string, fields: any[], entry: any, mode: string, actions: any): string {
        if (!template) {
            return '';
        }

        let replace, render;

        // Replace the fields found on template.
        fields.forEach((field) => {
            replace = '[[' + field.name + ']]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            render = '<addon-mod-data-field-plugin [field]="fields[' + field.id + ']" [value]="entries[' + entry.id +
                    '].contents[' + field.id + ']" mode="' + mode + '" [database]="data" (gotoEntry)="gotoEntry(' + entry.id +
                    ')"></addon-mod-data-field-plugin>';
            template = template.replace(replace, render);
        });

        for (const action in actions) {
            replace = new RegExp('##' + action + '##', 'gi');
            // Is enabled?
            if (actions[action]) {
                if (action == 'moreurl') {
                    // Render more url directly because it can be part of an HTML attribute.
                    render = this.sitesProvider.getCurrentSite().getURL() + '/mod/data/view.php?d={{data.id}}&rid=' + entry.id;
                } else if (action == 'approvalstatus') {
                    render = this.translate.instant('addon.mod_data.' + (entry.approved ? 'approved' : 'notapproved'));
                } else {
                    render = '<addon-mod-data-action action="' + action + '" [entry]="entries[' + entry.id +
                                ']" mode="' + mode + '" [database]="data"></addon-mod-data-action>';
                }
                template = template.replace(replace, render);
            } else {
                template = template.replace(replace, '');
            }
        }

        return template;
    }

    /**
     * Returns an object with all the actions that the user can do over the record.
     *
     * @param {any}  database     Database activity.
     * @param {any}  accessInfo   Access info to the activity.
     * @param {any}  record       Entry or record where the actions will be performed.
     * @return {any}              Keyed with the action names and boolean to evalute if it can or cannot be done.
     */
    getActions(database: any, accessInfo: any, record: any): any {
        return {
            more: true,
            moreurl: true,
            user: true,
            userpicture: true,
            timeadded: true,
            timemodified: true,

            edit: record.canmanageentry && !record.deleted, // This already checks capabilities and readonly period.
            delete: record.canmanageentry,
            approve: database.approval && accessInfo.canapprove && !record.approved && !record.deleted,
            disapprove: database.approval && accessInfo.canapprove && record.approved && !record.deleted,

            approvalstatus: database.approval,
            comments: database.comments,

            // Unsupported actions.
            delcheck: false,
            export: false
        };
    }

    /**
     * Fetch all entries and return it's Id
     *
     * @param  {number}    dataId          Data ID.
     * @param  {number}    groupId         Group ID.
     * @param  {boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}    [siteId]        Site ID. Current if not defined.
     * @return {Promise<any>}              Resolved with an array of entry ID.
     */
    getAllEntriesIds(dataId: number, groupId: number, forceCache: boolean = false, ignoreCache: boolean = false, siteId?: string):
            Promise<any> {
        return this.dataProvider.fetchAllEntries(dataId, groupId, undefined, undefined, undefined, forceCache, ignoreCache, siteId)
                .then((entries) => {
            return entries.map((entry) => entry.id);
        });
    }

    /**
     * Retrieve the entered data in the edit form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @param  {any}     inputData    Array with the entered form values.
     * @param  {Array}   fields       Fields that defines every content in the entry.
     * @param  {number}  [dataId]     Database Id. If set, files will be uploaded and itemId set.
     * @param  {number}  entryId      Entry Id.
     * @param  {any}  entryContents   Original entry contents indexed by field id.
     * @param  {boolean} offline      True to prepare the data for an offline uploading, false otherwise.
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         That contains object with the answers.
     */
    getEditDataFromForm(inputData: any, fields: any, dataId: number, entryId: number, entryContents: any, offline: boolean = false,
            siteId?: string): Promise<any> {
        if (!inputData) {
            return Promise.resolve({});
        }

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Filter and translate fields to each field plugin.
        const edit = [],
            promises = [];
        fields.forEach((field) => {
            promises.push(Promise.resolve(this.fieldsDelegate.getFieldEditData(field, inputData, entryContents[field.id]))
                    .then((fieldData) => {
                if (fieldData) {
                    const proms = [];

                    fieldData.forEach((data) => {
                        let dataProm;

                        // Upload Files if asked.
                        if (dataId && data.files) {
                            dataProm = this.uploadOrStoreFiles(dataId, 0, entryId, data.fieldid, data.files, offline, siteId)
                                    .then((filesResult) => {
                                delete data.files;
                                data.value = filesResult;
                            });
                        } else {
                            dataProm = Promise.resolve();
                        }

                        proms.push(dataProm.then(() => {
                            if (data.value) {
                                data.value = JSON.stringify(data.value);
                            }
                            if (typeof data.subfield == 'undefined') {
                                data.subfield = '';
                            }

                            // WS wants values in Json format.
                            edit.push(data);
                        }));
                    });

                    return Promise.all(proms);
                }
            }));
        });

        return Promise.all(promises).then(() => {
            return edit;
        });
    }

    /**
     * Retrieve the temp files to be updated.
     *
     * @param  {any}     inputData    Array with the entered form values.
     * @param  {Array}   fields       Fields that defines every content in the entry.
     * @param  {number}  [dataId]     Database Id. If set, fils will be uploaded and itemId set.
     * @param  {any}   entryContents  Original entry contents indexed by field id.
     * @return {Promise<any>}         That contains object with the files.
     */
    getEditTmpFiles(inputData: any, fields: any, dataId: number, entryContents: any): Promise<any> {
        if (!inputData) {
            return Promise.resolve([]);
        }

        // Filter and translate fields to each field plugin.
        const promises = fields.map((field) => {
            return Promise.resolve(this.fieldsDelegate.getFieldEditFiles(field, inputData, entryContents[field.id]));
        });

        return Promise.all(promises).then((fieldsFiles) => {
            return fieldsFiles.reduce((files: any[], fieldFiles: any) => files.concat(fieldFiles), []);
        });
    }

    /**
     * Get an online or offline entry.
     *
     * @param  {any} data             Database.
     * @param  {number} entryId       Entry ID.
     * @param  {any} [offlineActions] Offline data with the actions done. Required for offline entries.
     * @param  {string} [siteId]      Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved with the entry.
     */
    getEntry(data: any, entryId: number, offlineActions?: any, siteId?: string): Promise<any> {
        if (entryId > 0) {
            // It's an online entry, get it from WS.
            return this.dataProvider.getEntry(data.id, entryId, siteId);
        }

        // It's an offline entry, search it in the offline actions.
        return this.sitesProvider.getSite(siteId).then((site) => {
            const offlineEntry = offlineActions.find((offlineAction) => offlineAction.action == 'add');

            if (offlineEntry) {
                const siteInfo = site.getInfo();

                return {entry: {
                        id: offlineEntry.entryid,
                        canmanageentry: true,
                        approved: !data.approval || data.manageapproved,
                        dataid: offlineEntry.dataid,
                        groupid: offlineEntry.groupid,
                        timecreated: -offlineEntry.entryid,
                        timemodified: -offlineEntry.entryid,
                        userid: siteInfo.userid,
                        fullname: siteInfo.fullname,
                        contents: {}
                    }
                };
            }
        });
    }

    /**
     * Get page info related to an entry.
     *
     * @param  {number}    dataId          Data ID.
     * @param  {number}    entryId         Entry ID.
     * @param  {number}    groupId         Group ID.
     * @param  {boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}    [siteId]        Site ID. Current if not defined.
     * @return {Promise<any>}              Containing page number, if has next and have following page.
     */
    getPageInfoByEntry(dataId: number, entryId: number, groupId: number, forceCache: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.getAllEntriesIds(dataId, groupId, forceCache, ignoreCache, siteId).then((entries) => {
            const index = entries.findIndex((entry) => entry == entryId);

            if (index >= 0) {
                return {
                    previousId: entries[index - 1] || false,
                    nextId: entries[index + 1] || false,
                    entryId: entryId,
                    page: index + 1, // Parsed to natural language.
                    numEntries: entries.length
                };
            }

            return false;
        });
    }

    /**
     * Get page info related to an entry by page number.
     *
     * @param  {number}    dataId          Data ID.
     * @param  {number}    page            Page number.
     * @param  {number}    groupId         Group ID.
     * @param  {boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}    [siteId]        Site ID. Current if not defined.
     * @return {Promise<any>}              Containing page number, if has next and have following page.
     */
    getPageInfoByPage(dataId: number, page: number, groupId: number, forceCache: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.getAllEntriesIds(dataId, groupId, forceCache, ignoreCache, siteId).then((entries) => {
            const index = page - 1,
                entryId = entries[index];

            if (entryId) {
                return {
                    previousId: entries[index - 1] || null,
                    nextId: entries[index + 1] || null,
                    entryId: entryId,
                    page: page, // Parsed to natural language.
                    numEntries: entries.length
                };
            }

            return false;
        });
    }

    /**
     * Get a list of stored attachment files for a new entry. See $mmaModDataHelper#storeFiles.
     *
     * @param  {number} dataId     Database ID.
     * @param  {number} entryId    Entry ID or, if creating, timemodified.
     * @param  {number} fieldId    Field ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved with the files.
     */
    getStoredFiles(dataId: number, entryId: number, fieldId: number, siteId?: string): Promise<any> {
        return this.dataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId).then((folderPath) => {
            return this.fileUploaderProvider.getStoredFiles(folderPath).catch(() => {
                // Ignore not found files.
                return [];
            });
        });
    }

    /**
     * Check if data has been changed by the user.
     *
     * @param  {any}    inputData     Array with the entered form values.
     * @param  {any}  fields          Fields that defines every content in the entry.
     * @param  {number} [dataId]      Database Id. If set, fils will be uploaded and itemId set.
     * @param  {any}    entryContents Original entry contents indexed by field id.
     * @return {Promise<boolean>}     True if changed, false if not.
     */
    hasEditDataChanged(inputData: any, fields: any, dataId: number, entryContents: any): Promise<boolean> {
        const promises = fields.map((field) => {
            return this.fieldsDelegate.hasFieldDataChanged(field, inputData, entryContents[field.id]);
        });

        // Will reject on first change detected.
        return Promise.all(promises).then(() => {
            // No changes.
            return false;
        }).catch(() => {
            // Has changes.
            return true;
        });
    }

    /**
     * Add a prefix to all rules in a CSS string.
     *
     * @param {string} css      CSS code to be prefixed.
     * @param {string} prefix   Prefix css selector.
     * @return {string}         Prefixed CSS.
     */
    prefixCSS(css: string, prefix: string): string {
        if (!css) {
            return '';
        }

        // Remove comments first.
        let regExp = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
        css = css.replace(regExp, '');
        // Add prefix.
        regExp = /([^]*?)({[^]*?}|,)/g;

        return css.replace(regExp, prefix + ' $1 $2');
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param  {number}   dataId   Database ID.
     * @param  {number}   entryId  Entry ID or, if creating, timemodified.
     * @param  {number}   fieldId  Field ID.
     * @param  {any[]}    files    List of files.
     * @param  {string}   [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved if success, rejected otherwise.
     */
    storeFiles(dataId: number, entryId: number, fieldId: number, files: any[], siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.dataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId).then((folderPath) => {
            return this.fileUploaderProvider.storeFilesToUpload(folderPath, files);
        });
    }

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @param  {number}   dataId     Database ID.
     * @param  {number}   [itemId=0] Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param  {number}   entryId    Entry ID or, if creating, timemodified.
     * @param  {number}   fieldId    Field ID.
     * @param  {any[]}    files      List of files.
     * @param  {boolean}  offline    True if files sould be stored for offline, false to upload them.
     * @param  {string}   [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved if success.
     */
    uploadOrStoreFiles(dataId: number, itemId: number = 0, entryId: number, fieldId: number, files: any[], offline: boolean,
            siteId?: string): Promise<any> {
        if (files.length) {
            if (offline) {
                return this.storeFiles(dataId, entryId, fieldId, files, siteId);
            }

            return this.fileUploaderProvider.uploadOrReuploadFiles(files, AddonModDataProvider.COMPONENT, itemId, siteId);
        }

        return Promise.resolve(0);
    }
}
