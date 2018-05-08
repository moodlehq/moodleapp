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
import { CoreSitesProvider } from '@providers/sites';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';
import { AddonModDataFieldsDelegate } from './fields-delegate';
import { AddonModDataOfflineProvider } from './offline';
import { AddonModDataProvider } from './data';

/**
 * Service that provides helper functions for datas.
 */
@Injectable()
export class AddonModDataHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
        private translate: TranslateService, private fieldsDelegate: AddonModDataFieldsDelegate,
        private dataOffline: AddonModDataOfflineProvider, private fileUploaderProvider: CoreFileUploaderProvider) { }

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
                            offlineContents[offlineContent.fieldid][offlineContent.subfield] = JSON.parse(offlineContent.value);
                        } else {
                            offlineContents[offlineContent.fieldid][''] = JSON.parse(offlineContent.value);
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
     * Displays Advanced Search Fields.
     *
     * @param {string} template Template HMTL.
     * @param {any[]}  fields   Fields that defines every content in the entry.
     * @return {string}         Generated HTML.
     */
    displayAdvancedSearchFields(template: string, fields: any[]): string {
        if (!template) {
            return '';
        }

        let replace;

        // Replace the fields found on template.
        fields.forEach((field) => {
            replace = '[[' + field.name + ']]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            const render = '<addon-mod-data-field-plugin mode="search" [field]="fields[' + field.id +
                ']"></addon-mod-data-field-plugin>';
            template = template.replace(replace, render);
        });

        // Not pluginable other search elements.
        // Replace firstname field by the text input.
        replace = new RegExp('##fn##', 'gi');
        let render = '<input type="text" name="firstname" placeholder="{{ \'addon.mod_data.authorfirstname\' | translate }}">';
        template = template.replace(replace, render);

        // Replace lastname field by the text input.
        replace = new RegExp('##ln##', 'gi');
        render = '<input type="text" name="lastname" placeholder="{{ \'addon.mod_data.authorlastname\' | translate }}">';
        template = template.replace(replace, render);

        return template;
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
                    '].contents[' + field.id + ']" mode="' + mode + '" [database]="data" (viewAction)="gotoEntry(' + entry.id +
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
     * Retrieve the entered data in search in a form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @param  {any}   form     Form (DOM element).
     * @param  {any[]} fields   Fields that defines every content in the entry.
     * @return {any[]}          Array with the answers.
     */
    getSearchDataFromForm(form: any, fields: any[]): any[] {
        if (!form || !form.elements) {
            return [];
        }

        const searchedData = this.domUtils.getDataFromForm(form);

        // Filter and translate fields to each field plugin.
        const advancedSearch = [];
        fields.forEach((field) => {
            const fieldData = this.fieldsDelegate.getFieldSearchData(field, searchedData);

            if (fieldData) {
                fieldData.forEach((data) => {
                    data.value = JSON.stringify(data.value);
                    // WS wants values in Json format.
                    advancedSearch.push(data);
                });
            }
        });

        // Not pluginable other search elements.
        if (searchedData['firstname']) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'firstname',
                value: JSON.stringify(searchedData['firstname'])
            });
        }

        if (searchedData['lastname']) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'lastname',
                value: JSON.stringify(searchedData['lastname'])
            });
        }

        return advancedSearch;
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
