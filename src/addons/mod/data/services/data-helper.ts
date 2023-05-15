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

import { ContextLevel } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreCourse } from '@features/course/services/course';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { FileEntry } from '@ionic-native/file/ngx';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils, ToastDuration } from '@services/utils/dom';
import { CoreFormFields } from '@singletons/form';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModDataEntry,
    AddonModData,
    AddonModDataProvider,
    AddonModDataSearchEntriesOptions,
    AddonModDataEntries,
    AddonModDataEntryFields,
    AddonModDataAction,
    AddonModDataGetEntryFormatted,
    AddonModDataData,
    AddonModDataTemplateType,
    AddonModDataGetDataAccessInformationWSResponse,
    AddonModDataTemplateMode,
    AddonModDataField,
    AddonModDataEntryWSField,
} from './data';
import { AddonModDataFieldsDelegate } from './data-fields-delegate';
import { AddonModDataOffline, AddonModDataOfflineAction } from './data-offline';
import { CoreFileEntry } from '@services/file-helper';

/**
 * Service that provides helper functions for datas.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataHelperProvider {

    /**
     * Returns the record with the offline actions applied.
     *
     * @param record Entry to modify.
     * @param offlineActions Offline data with the actions done.
     * @param fields Entry defined fields indexed by fieldid.
     * @returns Promise resolved when done.
     */
    protected async applyOfflineActions(
        record: AddonModDataEntry,
        offlineActions: AddonModDataOfflineAction[],
        fields: AddonModDataField[],
    ): Promise<AddonModDataEntry> {
        const promises: Promise<void>[] = [];

        offlineActions.forEach((action) => {
            record.timemodified = action.timemodified;
            record.hasOffline = true;
            const offlineContents: Record<number, CoreFormFields> = {};

            switch (action.action) {
                case AddonModDataAction.APPROVE:
                    record.approved = true;
                    break;
                case AddonModDataAction.DISAPPROVE:
                    record.approved = false;
                    break;
                case AddonModDataAction.DELETE:
                    record.deleted = true;
                    break;
                case AddonModDataAction.ADD:
                case AddonModDataAction.EDIT:
                    record.groupid = action.groupid;

                    action.fields.forEach((offlineContent) => {
                        if (offlineContents[offlineContent.fieldid] === undefined) {
                            offlineContents[offlineContent.fieldid] = {};
                        }

                        if (offlineContent.subfield) {
                            offlineContents[offlineContent.fieldid][offlineContent.subfield] =
                                CoreTextUtils.parseJSON(offlineContent.value, '');
                        } else {
                            offlineContents[offlineContent.fieldid][''] = CoreTextUtils.parseJSON(offlineContent.value, '');
                        }
                    });

                    // Override field contents.
                    fields.forEach((field) => {
                        if (AddonModDataFieldsDelegate.hasFiles(field)) {
                            promises.push(this.getStoredFiles(record.dataid, record.id, field.id).then((offlineFiles) => {
                                record.contents[field.id] = AddonModDataFieldsDelegate.overrideData(
                                    field,
                                    record.contents[field.id],
                                    offlineContents[field.id],
                                    offlineFiles,
                                );
                                record.contents[field.id].fieldid = field.id;

                                return;
                            }));
                        } else {
                            record.contents[field.id] = AddonModDataFieldsDelegate.overrideData(
                                field,
                                record.contents[field.id],
                                offlineContents[field.id],
                            );
                            record.contents[field.id].fieldid = field.id;
                        }
                    });
                    break;
                default:
                    break;
            }
        });

        await Promise.all(promises);

        return record;
    }

    /**
     * Approve or disapprove a database entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param approve True to approve, false to disapprove.
     * @param courseId Course ID. It not defined, it will be fetched.
     * @param siteId Site ID. If not defined, current site.
     */
    async approveOrDisapproveEntry(
        dataId: number,
        entryId: number,
        approve: boolean,
        courseId?: number,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            courseId = await this.getActivityCourseIdIfNotSet(dataId, courseId, siteId);

            try {
                // Approve/disapprove entry.
                await AddonModData.approveEntry(dataId, entryId, approve, courseId, siteId);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_data.errorapproving', true);

                throw error;
            }

            const promises: Promise<void>[] = [];

            promises.push(AddonModData.invalidateEntryData(dataId, entryId, siteId));
            promises.push(AddonModData.invalidateEntriesData(dataId, siteId));

            await CoreUtils.ignoreErrors(Promise.all(promises));

            CoreEvents.trigger(AddonModDataProvider.ENTRY_CHANGED, { dataId: dataId, entryId: entryId }, siteId);

            CoreDomUtils.showToast(
                approve ? 'addon.mod_data.recordapproved' : 'addon.mod_data.recorddisapproved',
                true,
                ToastDuration.LONG,
            );
        } catch {
            // Ignore error, it was already displayed.
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Displays fields for being shown.
     *
     * @param template Template HMTL.
     * @param fields Fields that defines every content in the entry.
     * @param entry Entry.
     * @param mode Mode list or show.
     * @param actions Actions that can be performed to the record.
     * @param options Show fields options (sortBy, offset, etc).
     *
     * @returns Generated HTML.
     */
    displayShowFields(
        template: string,
        fields: AddonModDataField[],
        entry: AddonModDataEntry,
        mode: AddonModDataTemplateMode,
        actions: Record<AddonModDataAction, boolean>,
        options: AddonModDatDisplayFieldsOptions = {},
    ): string {

        if (!template) {
            return '';
        }

        // Replace the fields found on template.
        fields.forEach((field) => {
            let replace = '[[' + field.name + ']]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            let replaceRegex = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            const render = '<addon-mod-data-field-plugin [field]="fields[' + field.id + ']" [value]="entries[' + entry.id +
                    '].contents[' + field.id + ']" mode="' + mode + '" [database]="database" (gotoEntry)="gotoEntry($event)">' +
                    '</addon-mod-data-field-plugin>';

            template = template.replace(replaceRegex, render);

            // Replace the field name tag.
            replace = '[[' + field.name + '#name]]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegex = new RegExp(replace, 'gi');

            template = template.replace(replaceRegex, field.name);

            // Replace the field description tag.
            replace = '[[' + field.name + '#description]]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegex = new RegExp(replace, 'gi');

            template = template.replace(replaceRegex, field.description);
        });

        for (const action in actions) {
            const replaceRegex = new RegExp('##' + action + '##', 'gi');
            // Is enabled?
            if (!actions[action]) {
                template = template.replace(replaceRegex, '');

                continue;
            }

            if (action == AddonModDataAction.MOREURL) {
                // Render more url directly because it can be part of an HTML attribute.
                template = template.replace(
                    replaceRegex,
                    CoreSites.getRequiredCurrentSite().getURL() + '/mod/data/view.php?d={{database.id}}&rid=' + entry.id,
                );

                continue;
            } else if (action == 'approvalstatus') {
                template = template.replace(
                    replaceRegex,
                    Translate.instant('addon.mod_data.' + (entry.approved ? 'approved' : 'notapproved')),
                );

                continue;
            }

            template = template.replace(
                replaceRegex,
                `<addon-mod-data-action action="${action}" [entry]="entries[${entry.id}]" mode="${mode}" ` +
                '[database]="database" [access]="access" [title]="title" ' +
                (options.offset !== undefined ? `[offset]="${options.offset}" ` : '') +
                (options.sortBy !== undefined ? `[sortBy]="${options.sortBy}" ` : '') +
                (options.sortDirection !== undefined ? `sortDirection="${options.sortDirection}" ` : '') +
                '[group]="group"></addon-mod-data-action>',
            );
        }

        // Replace otherfields found on template.
        const regex = new RegExp('##otherfields##', 'gi');

        if (!template.match(regex)) {
            return template;
        }

        const unusedFields = fields.filter(field => !template.includes(`[field]="fields[${field.id}]`)).map((field) =>
            `<p><strong>${field.name}</strong></p>` +
                '<p><addon-mod-data-field-plugin [field]="fields[' + field.id + ']" [value]="entries[' + entry.id +
                '].contents[' + field.id + ']" mode="' + mode + '" [database]="database" (gotoEntry)="gotoEntry($event)">' +
                '</addon-mod-data-field-plugin></p>');

        return template.replace(regex, unusedFields.join(''));
    }

    /**
     * Get online and offline entries, or search entries.
     *
     * @param database Database object.
     * @param fields The fields that define the contents.
     * @param options Other options.
     * @returns Promise resolved when the database is retrieved.
     */
    async fetchEntries(
        database: AddonModDataData,
        fields: AddonModDataField[],
        options: AddonModDataSearchEntriesOptions = {},
    ): Promise<AddonModDataEntries> {
        const site = await CoreSites.getSite(options.siteId);
        options.groupId = options.groupId || 0;
        options.page = options.page || 0;

        const offlineActions: Record<number, AddonModDataOfflineAction[]> = {};
        const result: AddonModDataEntries = {
            entries: [],
            totalcount: 0,
            offlineEntries: [],
        };
        options.siteId = site.id;

        const offlinePromise = AddonModDataOffline.getDatabaseEntries(database.id, site.id).then((actions) => {
            result.hasOfflineActions = !!actions.length;

            actions.forEach((action) => {
                if (offlineActions[action.entryid] === undefined) {
                    offlineActions[action.entryid] = [];
                }
                offlineActions[action.entryid].push(action);

                // We only display new entries in the first page when not searching.
                if (action.action == AddonModDataAction.ADD && options.page == 0 && !options.search && !options.advSearch &&
                    (!action.groupid || !options.groupId || action.groupid == options.groupId)) {
                    result.offlineEntries!.push({
                        id: action.entryid,
                        canmanageentry: true,
                        approved: !database.approval || database.manageapproved,
                        dataid: database.id,
                        groupid: action.groupid,
                        timecreated: -action.entryid,
                        timemodified: -action.entryid,
                        userid: site.getUserId(),
                        fullname: site.getInfo()?.fullname,
                        contents: {},
                    });
                }

            });

            // Sort offline entries by creation time.
            result.offlineEntries!.sort((a, b) => b.timecreated - a.timecreated);

            return;
        });

        const ratingsPromise = CoreRatingOffline.hasRatings('mod_data', 'entry', ContextLevel.MODULE, database.coursemodule)
            .then((hasRatings) => {
                result.hasOfflineRatings = hasRatings;

                return;
            });

        let fetchPromise: Promise<void>;
        if (options.search || options.advSearch) {
            fetchPromise = AddonModData.searchEntries(database.id, options).then((searchResult) => {
                result.entries = searchResult.entries;
                result.totalcount = searchResult.totalcount;
                result.maxcount = searchResult.maxcount;

                return;
            });
        } else {
            fetchPromise = AddonModData.getEntries(database.id, options).then((entriesResult) => {
                result.entries = entriesResult.entries;
                result.totalcount = entriesResult.totalcount;

                return;
            });
        }
        await Promise.all([offlinePromise, ratingsPromise, fetchPromise]);

        // Apply offline actions to online and offline entries.
        const promises: Promise<AddonModDataEntry>[] = [];
        result.entries.forEach((entry) => {
            promises.push(this.applyOfflineActions(entry, offlineActions[entry.id] || [], fields));
        });

        result.offlineEntries!.forEach((entry) => {
            promises.push(this.applyOfflineActions(entry, offlineActions[entry.id] || [], fields));
        });

        await Promise.all(promises);

        return result;
    }

    /**
     * Fetch an online or offline entry.
     *
     * @param database Database.
     * @param fields List of database fields.
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the entry.
     */
    async fetchEntry(
        database: AddonModDataData,
        fields: AddonModDataField[],
        entryId: number,
        siteId?: string,
    ): Promise<AddonModDataGetEntryFormatted> {
        const site = await CoreSites.getSite(siteId);

        const offlineActions = await AddonModDataOffline.getEntryActions(database.id, entryId, site.id);

        let response: AddonModDataGetEntryFormatted;
        if (entryId > 0) {
            // Online entry.
            response = await AddonModData.getEntry(database.id, entryId, { cmId: database.coursemodule, siteId: site.id });
        } else {
            // Offline entry or new entry.
            response = {
                entry: {
                    id: entryId,
                    userid: site.getUserId(),
                    groupid: 0,
                    dataid: database.id,
                    timecreated: -entryId,
                    timemodified: -entryId,
                    approved: !database.approval || database.manageapproved,
                    canmanageentry: true,
                    fullname: site.getInfo()?.fullname,
                    contents: {},
                },
            };
        }

        await this.applyOfflineActions(response.entry, offlineActions, fields);

        return response;
    }

    /**
     * Returns an object with all the actions that the user can do over the record.
     *
     * @param database Database activity.
     * @param accessInfo Access info to the activity.
     * @param entry Entry or record where the actions will be performed.
     * @returns Keyed with the action names and boolean to evalute if it can or cannot be done.
     */
    getActions(
        database: AddonModDataData,
        accessInfo: AddonModDataGetDataAccessInformationWSResponse,
        entry: AddonModDataEntry,
        mode: AddonModDataTemplateMode,
    ): Record<AddonModDataAction, boolean> {
        return {
            add: false, // Not directly used on entries.
            more: true,
            moreurl: true,
            user: true,
            userpicture: true,
            timeadded: true,
            timemodified: true,
            tags: true,

            edit: entry.canmanageentry && !entry.deleted, // This already checks capabilities and readonly period.
            delete: entry.canmanageentry,
            approve: database.approval && accessInfo.canapprove && !entry.approved && !entry.deleted,
            disapprove: database.approval && accessInfo.canapprove && entry.approved && !entry.deleted,

            approvalstatus: database.approval,
            comments: database.comments,

            actionsmenu: entry.canmanageentry
                || (database.approval && accessInfo.canapprove && !entry.deleted)
                || mode === AddonModDataTemplateMode.LIST,

            // Unsupported actions.
            delcheck: false,
            export: false,
        };
    }

    /**
     * Convenience function to get the course id of the database.
     *
     * @param dataId Database id.
     * @param courseId Course id, if known.
     * @param siteId Site id, if not set, current site will be used.
     * @returns Resolved with course Id when done.
     */
    protected async getActivityCourseIdIfNotSet(dataId: number, courseId?: number, siteId?: string): Promise<number> {
        if (courseId) {
            return courseId;
        }

        const module = await CoreCourse.getModuleBasicInfoByInstance(
            dataId,
            'data',
            { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return module.course;
    }

    /**
     * Returns the default template of a certain type.
     *
     * Based on Moodle function data_generate_default_template.
     *
     * @param type Type of template.
     * @param fields List of database fields.
     * @returns Template HTML.
     */
    getDefaultTemplate(type: AddonModDataTemplateType, fields: AddonModDataField[]): string {
        if (type == AddonModDataTemplateType.LIST_HEADER || type == AddonModDataTemplateType.LIST_FOOTER) {
            return '';
        }

        const html: string[] = [];

        if (type == AddonModDataTemplateType.LIST) {
            html.push('##delcheck##<br />');
        }

        html.push(
            '<div class="defaulttemplate">',
            '<table class="mod-data-default-template ##approvalstatus##">',
            '<tbody>',
        );

        fields.forEach((field) => {
            html.push(
                '<tr class="">',
                '<td class="template-field cell c0" style="">',
                field.name,
                ': </td>',
                '<td class="template-token cell c1 lastcol" style="">[[',
                field.name,
                ']]</td>',
                '</tr>',
            );
        });

        if (type == AddonModDataTemplateType.LIST) {
            html.push(
                '<tr class="lastrow">',
                '<td class="controls template-field cell c0 lastcol" style="" colspan="2">',
                '##actionsmenu##  ##edit##  ##more##  ##delete##  ##approve##  ##disapprove##  ##export##',
                '</td>',
                '</tr>',
            );
        } else if (type == AddonModDataTemplateType.SINGLE) {
            html.push(
                '<tr class="lastrow">',
                '<td class="controls template-field cell c0 lastcol" style="" colspan="2">',
                '##actionsmenu##  ##edit##  ##delete##  ##approve##  ##disapprove##  ##export##',
                '</td>',
                '</tr>',
            );
        } else if (type == AddonModDataTemplateType.SEARCH) {
            html.push(
                '<tr class="searchcontrols">',
                '<td class="template-field cell c0" style="">Author first name: </td>',
                '<td class="template-token cell c1 lastcol" style="">##firstname##</td>',
                '</tr>',
                '<tr class="searchcontrols lastrow">',
                '<td class="template-field cell c0" style="">Author surname: </td>',
                '<td class="template-token cell c1 lastcol" style="">##lastname##</td>',
                '</tr>',
            );
        }

        html.push(
            '</tbody>',
            '</table>',
            '</div>',
        );

        if (type == AddonModDataTemplateType.LIST) {
            html.push('<hr />');
        }

        return html.join('');
    }

    /**
     * Retrieve the entered data in the edit form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @param inputData Array with the entered form values.
     * @param fields Fields that defines every content in the entry.
     * @param dataId Database Id. If set, files will be uploaded and itemId set.
     * @param entryId Entry Id.
     * @param entryContents Original entry contents.
     * @param offline True to prepare the data for an offline uploading, false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @returns That contains object with the answers.
     */
    async getEditDataFromForm(
        inputData: CoreFormFields,
        fields: AddonModDataField[],
        dataId: number,
        entryId: number,
        entryContents: AddonModDataEntryFields,
        offline = false,
        siteId?: string,
    ): Promise<AddonModDataEntryWSField[]> {
        if (!inputData) {
            return [];
        }

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Filter and translate fields to each field plugin.
        const entryFieldDataToSend: AddonModDataEntryWSField[] = [];

        const promises = fields.map(async (field) => {
            const fieldData = AddonModDataFieldsDelegate.getFieldEditData(field, inputData, entryContents[field.id]);
            if (!fieldData) {
                return;
            }
            const proms = fieldData.map(async (fieldSubdata) => {
                let value = fieldSubdata.value;

                // Upload Files if asked.
                if (dataId && fieldSubdata.files) {
                    value = await this.uploadOrStoreFiles(
                        dataId,
                        0,
                        entryId,
                        fieldSubdata.fieldid,
                        fieldSubdata.files,
                        offline,
                        siteId,
                    );
                }

                // WS wants values in JSON format.
                entryFieldDataToSend.push({
                    fieldid: fieldSubdata.fieldid,
                    subfield: fieldSubdata.subfield ?? '',
                    value: (value || value === 0) ? JSON.stringify(value) : '',
                });

                return;
            });

            await Promise.all(proms);
        });

        await Promise.all(promises);

        return entryFieldDataToSend;
    }

    /**
     * Retrieve the temp files to be updated.
     *
     * @param inputData Array with the entered form values.
     * @param fields Fields that defines every content in the entry.
     * @param entryContents Original entry contents indexed by field id.
     * @returns That contains object with the files.
     */
    async getEditTmpFiles(
        inputData: CoreFormFields,
        fields: AddonModDataField[],
        entryContents: AddonModDataEntryFields,
    ): Promise<CoreFileEntry[]> {
        if (!inputData) {
            return [];
        }

        // Filter and translate fields to each field plugin.
        const promises = fields.map((field) =>
            AddonModDataFieldsDelegate.getFieldEditFiles(field, inputData, entryContents[field.id]));

        const fieldsFiles = await Promise.all(promises);

        return fieldsFiles.reduce((files, fieldFiles) => files.concat(fieldFiles), []);
    }

    /**
     * Get a list of stored attachment files for a new entry. See $mmaModDataHelper#storeFiles.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID or, if creating, timemodified.
     * @param fieldId Field ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getStoredFiles(dataId: number, entryId: number, fieldId: number, siteId?: string): Promise<FileEntry[]> {
        const folderPath = await AddonModDataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId);

        try {
            return await CoreFileUploader.getStoredFiles(folderPath);
        } catch {
            // Ignore not found files.
            return [];
        }
    }

    /**
     * Returns the template of a certain type.
     *
     * @param data Database object.
     * @param type Type of template.
     * @param fields List of database fields.
     * @returns Template HTML.
     */
    getTemplate(data: AddonModDataData, type: AddonModDataTemplateType, fields: AddonModDataField[]): string {
        let template = data[type] || this.getDefaultTemplate(type, fields);

        if (type != AddonModDataTemplateType.LIST_HEADER && type != AddonModDataTemplateType.LIST_FOOTER) {
            // Try to fix syntax errors so the template can be parsed by Angular.
            template = CoreDomUtils.fixHtml(template);
        }

        // Add core-link directive to links.
        template = template.replace(
            /<a ([^>]*href="[^>]*)>/ig,
            (match, attributes) => '<a core-link capture="true" ' + attributes + '>',
        );

        return template;
    }

    /**
     * Check if data has been changed by the user.
     *
     * @param inputData Object with the entered form values.
     * @param fields Fields that defines every content in the entry.
     * @param entryContents Original entry contents indexed by field id.
     * @returns True if changed, false if not.
     */
    hasEditDataChanged(
        inputData: CoreFormFields,
        fields: AddonModDataField[],
        entryContents: AddonModDataEntryFields,
    ): boolean {
        return fields.some((field) =>
            AddonModDataFieldsDelegate.hasFieldDataChanged(field, inputData, entryContents[field.id]));
    }

    /**
     * Displays a confirmation modal for deleting an entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param courseId Course ID. It not defined, it will be fetched.
     * @param siteId Site ID. If not defined, current site.
     */
    async showDeleteEntryModal(dataId: number, entryId: number, courseId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        try {
            await CoreDomUtils.showDeleteConfirm('addon.mod_data.confirmdeleterecord');

            const modal = await CoreDomUtils.showModalLoading();

            try {
                if (entryId > 0) {
                    courseId = await this.getActivityCourseIdIfNotSet(dataId, courseId, siteId);
                }

                if (courseId) {
                    await AddonModData.deleteEntry(dataId, entryId, courseId, siteId);
                }
            } catch (message) {
                CoreDomUtils.showErrorModalDefault(message, 'addon.mod_data.errordeleting', true);

                modal.dismiss();

                return;
            }

            try {
                await AddonModData.invalidateEntryData(dataId, entryId, siteId);
                await AddonModData.invalidateEntriesData(dataId, siteId);
            } catch {
                // Ignore errors.
            }

            CoreEvents.trigger(AddonModDataProvider.ENTRY_CHANGED, { dataId, entryId, deleted: true }, siteId);

            CoreDomUtils.showToast('addon.mod_data.recorddeleted', true, ToastDuration.LONG);

            modal.dismiss();
        } catch {
            // Ignore error, it was already displayed.
        }

    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID or, if creating, timemodified.
     * @param fieldId Field ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    async storeFiles(
        dataId: number,
        entryId: number,
        fieldId: number,
        files: CoreFileEntry[],
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModDataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId);

        return CoreFileUploader.storeFilesToUpload(folderPath, files);
    }

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @param dataId Database ID.
     * @param itemId Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param entryId Entry ID or, if creating, timemodified.
     * @param fieldId Field ID.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the itemId for the uploaded file/s.
     */
    async uploadOrStoreFiles(
        dataId: number,
        itemId: number,
        entryId: number,
        fieldId: number,
        files: CoreFileEntry[],
        offline: true,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult>;
    async uploadOrStoreFiles(
        dataId: number,
        itemId: number,
        entryId: number,
        fieldId: number,
        files: CoreFileEntry[],
        offline: false,
        siteId?: string,
    ): Promise<number>;
    async uploadOrStoreFiles(
        dataId: number,
        itemId: number,
        entryId: number,
        fieldId: number,
        files: CoreFileEntry[],
        offline: boolean,
        siteId?: string,
    ): Promise<number | CoreFileUploaderStoreFilesResult>;
    async uploadOrStoreFiles(
        dataId: number,
        itemId: number = 0,
        entryId: number,
        fieldId: number,
        files: CoreFileEntry[],
        offline: boolean,
        siteId?: string,
    ): Promise<number | CoreFileUploaderStoreFilesResult> {
        if (offline) {
            return this.storeFiles(dataId, entryId, fieldId, files, siteId);
        }

        if (!files.length) {
            return 0;
        }

        return CoreFileUploader.uploadOrReuploadFiles(files, AddonModDataProvider.COMPONENT, itemId, siteId);
    }

}
export const AddonModDataHelper = makeSingleton(AddonModDataHelperProvider);

export type AddonModDatDisplayFieldsOptions = {
    sortBy?: string | number;
    sortDirection?: string;
    offset?: number;
};
