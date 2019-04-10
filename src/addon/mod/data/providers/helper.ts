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
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModDataFieldsDelegate } from './fields-delegate';
import { AddonModDataOfflineProvider, AddonModDataOfflineAction } from './offline';
import { AddonModDataProvider, AddonModDataEntry, AddonModDataEntryFields, AddonModDataEntries } from './data';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { CoreRatingOfflineProvider } from '@core/rating/providers/offline';

/**
 * Service that provides helper functions for datas.
 */
@Injectable()
export class AddonModDataHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, protected dataProvider: AddonModDataProvider,
        private translate: TranslateService, private fieldsDelegate: AddonModDataFieldsDelegate,
        private dataOffline: AddonModDataOfflineProvider, private fileUploaderProvider: CoreFileUploaderProvider,
        private textUtils: CoreTextUtilsProvider, private eventsProvider: CoreEventsProvider, private utils: CoreUtilsProvider,
        private domUtils: CoreDomUtilsProvider, private courseProvider: CoreCourseProvider,
        private ratingOffline: CoreRatingOfflineProvider) {}

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
     * Approve or disapprove a database entry.
     *
     * @param {number} dataId Database ID.
     * @param {number} entryId Entry ID.
     * @param {boolaen} approve True to approve, false to disapprove.
     * @param {number} [courseId] Course ID. It not defined, it will be fetched.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    approveOrDisapproveEntry(dataId: number, entryId: number, approve: boolean, courseId?: number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.getActivityCourseIdIfNotSet(dataId, courseId, siteId).then((courseId) => {
            // Approve/disapprove entry.
            return this.dataProvider.approveEntry(dataId, entryId, approve, courseId, siteId).catch((message) => {
                this.domUtils.showErrorModalDefault(message, 'addon.mod_data.errorapproving', true);

                return Promise.reject(null);
            });
        }).then(() => {
            const promises = [];
            promises.push(this.dataProvider.invalidateEntryData(dataId, entryId, siteId));
            promises.push(this.dataProvider.invalidateEntriesData(dataId, siteId));

            return Promise.all(promises).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            this.eventsProvider.trigger(AddonModDataProvider.ENTRY_CHANGED, {dataId: dataId, entryId: entryId}, siteId);

            this.domUtils.showToast(approve ? 'addon.mod_data.recordapproved' : 'addon.mod_data.recorddisapproved', true, 3000);
        }).catch(() => {
            // Ignore error, it was already displayed.
        }).finally(() => {
            modal.dismiss();
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
                    render = '<addon-mod-data-action action="' + action + '" [entry]="entries[' + entry.id + ']" mode="' + mode +
                    '" [database]="data" [module]="module" [offset]="' + offset + '" [group]="group" ></addon-mod-data-action>';
                }
                template = template.replace(replace, render);
            } else {
                template = template.replace(replace, '');
            }
        }

        return template;
    }

    /**
     * Get online and offline entries, or search entries.
     *
     * @param   {any}       data               Database object.
     * @param   {any[]}     fields             The fields that define the contents.
     * @param   {number}    [groupId=0]        Group ID.
     * @param   {string}    [search]           Search text. It will be used if advSearch is not defined.
     * @param   {any[]}     [advSearch]        Advanced search data.
     * @param   {string}    [sort=0]           Sort the records by this field id, reserved ids are:
     *                                            0: timeadded
     *                                           -1: firstname
     *                                           -2: lastname
     *                                           -3: approved
     *                                           -4: timemodified.
     *                                          Empty for using the default database setting.
     * @param   {string}    [order=DESC]        The direction of the sorting: 'ASC' or 'DESC'.
     *                                          Empty for using the default database setting.
     * @param   {number}    [page=0]            Page of records to return.
     * @param   {number}    [perPage=PER_PAGE]  Records per page to return. Default on PER_PAGE.
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<AddonModDataEntries>}  Promise resolved when the database is retrieved.
     */
    fetchEntries(data: any, fields: any[], groupId: number = 0, search?: string, advSearch?: any[], sort: string = '0',
            order: string = 'DESC', page: number = 0, perPage: number = AddonModDataProvider.PER_PAGE, siteId?: string):
            Promise<AddonModDataEntries> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const offlineActions = {};
            const result: AddonModDataEntries = {
                entries: [],
                totalcount: 0,
                offlineEntries: []
            };

            const offlinePromise = this.dataOffline.getDatabaseEntries(data.id, site.id).then((actions) => {
                result.hasOfflineActions = !!actions.length;

                actions.forEach((action) => {
                    if (typeof offlineActions[action.entryid] == 'undefined') {
                        offlineActions[action.entryid] = [];
                    }
                    offlineActions[action.entryid].push(action);

                    // We only display new entries in the first page when not searching.
                    if (action.action == 'add' && page == 0 && !search && !advSearch &&
                            (!action.groupid || !groupId || action.groupid == groupId)) {
                        result.offlineEntries.push({
                            id: action.entryid,
                            canmanageentry: true,
                            approved: !data.approval || data.manageapproved,
                            dataid: data.id,
                            groupid: action.groupid,
                            timecreated: -action.entryid,
                            timemodified: -action.entryid,
                            userid: site.getUserId(),
                            fullname: site.getInfo().fullname,
                            contents: {}
                        });
                    }
                });

                // Sort offline entries by creation time.
                result.offlineEntries.sort((entry1, entry2) => entry2.timecreated - entry1.timecreated);
            });

            const ratingsPromise = this.ratingOffline.hasRatings('mod_data', 'entry', 'module', data.coursemodule)
                    .then((hasRatings) => {
                result.hasOfflineRatings = hasRatings;
            });

            let fetchPromise: Promise<void>;
            if (search || advSearch) {
                fetchPromise = this.dataProvider.searchEntries(data.id, groupId, search, advSearch, sort, order, page, perPage,
                        site.id).then((fetchResult) => {
                    result.entries = fetchResult.entries;
                    result.totalcount = fetchResult.totalcount;
                    result.maxcount = fetchResult.maxcount;
                });
            } else {
                fetchPromise = this.dataProvider.getEntries(data.id, groupId, sort, order, page, perPage, false, false, site.id)
                        .then((fetchResult) => {
                    result.entries = fetchResult.entries;
                    result.totalcount = fetchResult.totalcount;
                });
            }

            return Promise.all([offlinePromise, ratingsPromise, fetchPromise]).then(() => {
                // Apply offline actions to online and offline entries.
                const promises = [];
                result.entries.forEach((entry) => {
                    promises.push(this.applyOfflineActions(entry, offlineActions[entry.id] || [], fields));
                });
                result.offlineEntries.forEach((entry) => {
                    promises.push(this.applyOfflineActions(entry, offlineActions[entry.id] || [], fields));
                });

                return Promise.all(promises);
            }).then(() => {
                return result;
            });
        });
    }

    /**
     * Fetch an online or offline entry.
     *
     * @param {any} data Database.
     * @param {any[]} fields List of database fields.
     * @param {number} entryId Entry ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{entry: AddonModDataEntry, ratinginfo?: CoreRatingInfo}>} Promise resolved with the entry.
     */
    fetchEntry(data: any, fields: any[], entryId: number, siteId?: string):
            Promise<{entry: AddonModDataEntry, ratinginfo?: CoreRatingInfo}> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.dataOffline.getEntryActions(data.id, entryId, site.id).then((offlineActions) => {
                let promise: Promise<{entry: AddonModDataEntry, ratinginfo?: CoreRatingInfo}>;

                if (entryId > 0) {
                    // Online entry.
                    promise = this.dataProvider.getEntry(data.id, entryId, false, site.id);
                } else  {
                    // Offline entry or new entry.
                    promise = Promise.resolve({
                        entry: {
                            id: entryId,
                            userid: site.getUserId(),
                            groupid: 0,
                            dataid: data.id,
                            timecreated: -entryId,
                            timemodified: -entryId,
                            approved: !data.approval || data.manageapproved,
                            canmanageentry: true,
                            fullname: site.getInfo().fullname,
                            contents: [],
                        }
                    });
                }

                return promise.then((response) => {
                    return this.applyOfflineActions(response.entry, offlineActions, fields).then(() => {
                        return response;
                    });
                });
            });
        });
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
     * Convenience function to get the course id of the database.
     *
     * @param {number} dataId Database id.
     * @param {number} [courseId] Course id, if known.
     * @param {string} [siteId] Site id, if not set, current site will be used.
     * @return {Promise<number>} Resolved with course Id when done.
     */
    protected getActivityCourseIdIfNotSet(dataId: number, courseId?: number, siteId?: string): Promise<number> {
        if (courseId) {
            return Promise.resolve(courseId);
        }

        return this.courseProvider.getModuleBasicInfoByInstance(dataId, 'data', siteId).then((module) => {
            return module.course;
        });
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
     * Displays a confirmation modal for deleting an entry.
     *
     * @param {number} dataId Database ID.
     * @param {number} entryId Entry ID.
     * @param {number} [courseId] Course ID. It not defined, it will be fetched.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    showDeleteEntryModal(dataId: number, entryId: number, courseId?: number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.domUtils.showConfirm(this.translate.instant('addon.mod_data.confirmdeleterecord')).then(() => {
            const modal = this.domUtils.showModalLoading();

            return this.getActivityCourseIdIfNotSet(dataId, courseId, siteId).then((courseId) => {
                return this.dataProvider.deleteEntry(dataId, entryId, courseId, siteId);
            }).catch((message) => {
                this.domUtils.showErrorModalDefault(message, 'addon.mod_data.errordeleting', true);

                return Promise.reject(null);
            }).then(() => {
                return this.utils.allPromises([
                    this.dataProvider.invalidateEntryData(dataId, entryId, siteId),
                    this.dataProvider.invalidateEntriesData(dataId, siteId)
                ]).catch(() => {
                    // Ignore errors.
                });
            }).then(() => {
                this.eventsProvider.trigger(AddonModDataProvider.ENTRY_CHANGED, {dataId, entryId,  deleted: true}, siteId);

                this.domUtils.showToast('addon.mod_data.recorddeleted', true, 3000);
            }).finally(() => {
                modal.dismiss();
            });
        }).catch(() => {
            // Ignore error, it was already displayed.
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
