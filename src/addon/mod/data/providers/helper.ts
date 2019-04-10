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
import { AddonModDataOfflineProvider, AddonModDataOfflineAction } from './offline';
import { AddonModDataProvider, AddonModDataEntry, AddonModDataEntryFields } from './data';

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
     * @param {AddonModDataEntry} record Entry to modify.
     * @param {AddonModDataOfflineAction[]} offlineActions Offline data with the actions done.
     * @param {any[]} fields Entry defined fields indexed by fieldid.
     * @return {Promise<AddonModDataEntry>} Promise resolved when done.
     */
    applyOfflineActions(record: AddonModDataEntry, offlineActions: AddonModDataOfflineAction[], fields: any[]):
            Promise<AddonModDataEntry> {
        const promises  = [];

        offlineActions.forEach((action) => {
            record.timemodified = action.timemodified;
            record.hasOffline = true;

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
                    record.groupid = action.groupid;

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
                                record.contents[field.id].fieldid = field.id;
                            }));
                        } else {
                            record.contents[field.id] = this.fieldsDelegate.overrideData(field, record.contents[field.id],
                                    offlineContents[field.id]);
                            record.contents[field.id].fieldid = field.id;
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
     * @param {string} template Template HMTL.
     * @param {any[]} fields Fields that defines every content in the entry.
     * @param {any} entry Entry.
     * @param {number} offset Entry offset.
     * @param {string} mode Mode list or show.
     * @param {AddonModDataOfflineAction[]} actions Actions that can be performed to the record.
     * @return {string} Generated HTML.
     */
    displayShowFields(template: string, fields: any[], entry: any, offset: number, mode: string,
            actions: AddonModDataOfflineAction[]): string {
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
                                ']" mode="' + mode + '" [database]="data" [offset]="' + offset + '"></addon-mod-data-action>';
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
            tags: false,
            delcheck: false,
            export: false
        };
    }

    /**
     * Returns the default template of a certain type.
     *
     * Based on Moodle function data_generate_default_template.
     *
     * @param {string} type Type of template.
     * @param {any[]} fields List of database fields.
     * @return {string} Template HTML.
     */
    getDefaultTemplate( type: 'add' | 'list' | 'single' | 'asearch', fields: any[]): string {
        const html = [];

        if (type == 'list') {
            html.push('##delcheck##<br />');
        }

        html.push(
            '<div class="defaulttemplate">',
            '<table class="mod-data-default-template ##approvalstatus##">',
            '<tbody>'
        );

        fields.forEach((field) => {
            html.push(
                '<tr class="">',
                '<td class="template-field cell c0" style="">', field.name, ': </td>',
                '<td class="template-token cell c1 lastcol" style="">[[', field.name, ']]</td>',
                '</tr>'
            );
        });

        if (type == 'list') {
            html.push(
                '<tr class="lastrow">',
                '<td class="controls template-field cell c0 lastcol" style="" colspan="2">',
                '##edit##  ##more##  ##delete##  ##approve##  ##disapprove##  ##export##',
                '</td>',
                '</tr>'
            );
        } else if (type == 'single') {
            html.push(
                '<tr class="lastrow">',
                '<td class="controls template-field cell c0 lastcol" style="" colspan="2">',
                '##edit##  ##delete##  ##approve##  ##disapprove##  ##export##',
                '</td>',
                '</tr>'
            );
        } else if (type == 'asearch') {
            html.push(
                '<tr class="searchcontrols">',
                '<td class="template-field cell c0" style="">Author first name: </td>',
                '<td class="template-token cell c1 lastcol" style="">##firstname##</td>',
                '</tr>',
                '<tr class="searchcontrols lastrow">',
                '<td class="template-field cell c0" style="">Author surname: </td>',
                '<td class="template-token cell c1 lastcol" style="">##lastname##</td>',
                '</tr>'
            );
        }

        html.push(
            '</tbody>',
            '</table>',
            '</div>'
        );

        if (type == 'list') {
            html.push('<hr />');
        }

        return html.join('');
    }

    /**
     * Retrieve the entered data in the edit form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @param {any} inputData Array with the entered form values.
     * @param {Array} fields Fields that defines every content in the entry.
     * @param {number} [dataId] Database Id. If set, files will be uploaded and itemId set.
     * @param {number} entryId Entry Id.
     * @param {AddonModDataEntryFields} entryContents Original entry contents.
     * @param {boolean} offline True to prepare the data for an offline uploading, false otherwise.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} That contains object with the answers.
     */
    getEditDataFromForm(inputData: any, fields: any, dataId: number, entryId: number, entryContents: AddonModDataEntryFields,
            offline: boolean = false, siteId?: string): Promise<any> {
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
     * @param {any} inputData Array with the entered form values.
     * @param {any[]} fields Fields that defines every content in the entry.
     * @param {number} [dataId] Database Id. If set, fils will be uploaded and itemId set.
     * @param {AddonModDataEntryFields} entryContents Original entry contents indexed by field id.
     * @return {Promise<any>} That contains object with the files.
     */
    getEditTmpFiles(inputData: any, fields: any[], dataId: number, entryContents: AddonModDataEntryFields): Promise<any> {
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
            return this.dataProvider.getEntry(data.id, entryId, false, siteId);
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
     * @param {any} inputData Object with the entered form values.
     * @param {any[]} fields Fields that defines every content in the entry.
     * @param {number} [dataId] Database Id. If set, fils will be uploaded and itemId set.
     * @param {AddonModDataEntryFields} entryContents Original entry contents indexed by field id.
     * @return {Promise<boolean>} True if changed, false if not.
     */
    hasEditDataChanged(inputData: any, fields: any[], dataId: number, entryContents: AddonModDataEntryFields): Promise<boolean> {
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
