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

import { Component, OnInit, ViewChild, ElementRef, Type } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreTag } from '@features/tag/services/tag';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreForms } from '@singletons/form';
import { CoreUtils } from '@singletons/utils';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModDataComponentsCompileModule } from '../../components/components-compile.module';
import {
    AddonModDataData,
    AddonModDataField,
    AddonModData,
    AddonModDataEntry,
    AddonModDataEntryFields,
    AddonModDataEditEntryResult,
    AddonModDataAddEntryResult,
    AddonModDataEntryWSField,
} from '../../services/data';
import { AddonModDataHelper } from '../../services/data-helper';
import { CoreDom } from '@singletons/dom';
import { AddonModDataEntryFieldInitialized } from '../../classes/base-field-plugin-component';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_DATA_COMPONENT, ADDON_MOD_DATA_ENTRY_CHANGED, AddonModDataTemplateType } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreArray } from '@singletons/array';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays the view edit page.
 */
@Component({
    selector: 'page-addon-mod-data-edit',
    templateUrl: 'edit.html',
    styleUrls: ['../../data.scss', '../../data-forms.scss'],
})
export class AddonModDataEditPage implements OnInit {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChild('editFormEl') formElement!: ElementRef;

    protected entryId?: number;
    protected fieldsArray: AddonModDataField[] = [];
    protected siteId: string;
    protected offline = false;
    protected forceLeave = false; // To allow leaving the page without checking for changes.
    protected initialSelectedGroup?: number;
    protected isEditing = false;
    protected originalData: AddonModDataEntryFields = {};
    protected logView: () => void;

    entry?: AddonModDataEntry;
    fields: Record<number, AddonModDataField> = {};
    courseId!: number;
    moduleId = 0;
    database?: AddonModDataData;
    title = '';
    component = ADDON_MOD_DATA_COMPONENT;
    loaded = false;
    selectedGroup = 0;
    cssClass = '';
    groupInfo?: CoreGroupInfo;
    editFormRender = '';
    editForm: FormGroup;
    extraImports: Type<unknown>[] = [AddonModDataComponentsCompileModule];
    jsData?: {
        fields: Record<number, AddonModDataField>;
        database?: AddonModDataData;
        contents: AddonModDataEntryFields;
        errors?: Record<number, string>;
        form: FormGroup;
        onFieldInit: (data: AddonModDataEntryFieldInitialized) => void;
    };

    errors: Record<number, string> = {};

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
        this.editForm = new FormGroup({});

        this.logView = CoreTime.once(() => {
            if (!this.database) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: this.isEditing ? 'mod_data_update_entry' : 'mod_data_add_entry',
                name: this.title,
                data: { databaseid: this.database.id, category: 'data' },
                url: '/mod/data/edit.php?' + (this.isEditing ? `d=${this.database.id}&rid=${this.entryId}` : `id=${this.moduleId}`),
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.moduleId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.title = CoreNavigator.getRouteParam<string>('title') || '';
            this.entryId = CoreNavigator.getRouteNumberParam('entryId') || undefined;
            this.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;
        } catch (error) {
            CoreAlerts.showError(error);

            CoreNavigator.back();

            return;
        }

        // If entryId is lower than 0 or null, it is a new entry or an offline entry.
        this.isEditing = this.entryId !== undefined && this.entryId > 0;

        this.fetchEntryData(true);
    }

    /**
     * Check if we can leave the page or not and ask to confirm the lost of data.
     *
     * @returns True if we can leave, false otherwise.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave || !this.entry) {
            return true;
        }

        const inputData = this.editForm.value;

        let changed = AddonModDataHelper.hasEditDataChanged(inputData, this.fieldsArray, this.originalData);
        changed = changed || (!this.isEditing && this.initialSelectedGroup != this.selectedGroup);

        if (changed) {
            // Show confirmation if some data has been modified.
            await CoreAlerts.confirm(Translate.instant('core.confirmcanceledit'));
        }

        // Delete the local files from the tmp folder.
        const files = await AddonModDataHelper.getEditTmpFiles(inputData, this.fieldsArray, this.entry!.contents);
        CoreFileUploader.clearTmpFiles(files);

        CoreForms.triggerFormCancelledEvent(this.formElement, this.siteId);

        return true;
    }

    /**
     * Fetch the entry data.
     *
     * @param refresh To refresh all downloaded data.
     * @returns Resolved when done.
     */
    protected async fetchEntryData(refresh = false): Promise<void> {
        try {
            this.database = await AddonModData.getDatabase(this.courseId, this.moduleId);
            this.title = this.database.name || this.title;
            this.cssClass = 'addon-data-entries-' + this.database.id;

            this.fieldsArray = await AddonModData.getFields(this.database.id, { cmId: this.moduleId });
            this.fields = CoreArray.toObject(this.fieldsArray, 'id');

            const entry = await AddonModDataHelper.fetchEntry(this.database, this.fieldsArray, this.entryId || 0);
            this.entry = entry.entry;
            this.originalData = CoreUtils.clone(this.entry.contents);

            if (this.entryId) {
                // Load correct group.
                this.selectedGroup = this.entry.groupid;
            }

            // Check permissions when adding a new entry or offline entry.
            if (!this.isEditing) {
                let haveAccess = false;
                let groupInfo: CoreGroupInfo | undefined = this.groupInfo;

                if (refresh) {
                    groupInfo = await CoreGroups.getActivityGroupInfo(this.database.coursemodule);
                    if (groupInfo.visibleGroups && groupInfo.groups.length) {
                        // There is a bug in Moodle with All participants and visible groups (MOBILE-3597). Remove it.
                        groupInfo.groups = groupInfo.groups.filter(group => group.id !== 0);
                        groupInfo.defaultGroupId = groupInfo.groups[0].id;
                    }

                    this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, groupInfo);
                    this.initialSelectedGroup = this.selectedGroup;
                }

                if (groupInfo?.groups && groupInfo?.groups.length > 0) {
                    if (refresh) {
                        const canAddGroup: Record<number, boolean> = {};

                        await Promise.all(groupInfo.groups.map(async (group) => {
                            const accessData = await AddonModData.getDatabaseAccessInformation(this.database!.id, {
                                cmId: this.moduleId,
                                groupId: group.id,
                            });

                            canAddGroup[group.id] = accessData.canaddentry;
                        }));

                        groupInfo.groups = groupInfo.groups.filter((group) => !!canAddGroup[group.id]);

                        haveAccess = canAddGroup[this.selectedGroup];
                    } else {
                        // Groups already filtered, so it have access.
                        haveAccess = true;
                    }
                } else {
                    const accessData = await AddonModData.getDatabaseAccessInformation(this.database.id, { cmId: this.moduleId });
                    haveAccess = accessData.canaddentry;
                }

                this.groupInfo = groupInfo;

                if (!haveAccess) {
                    // You shall not pass, go back.
                    CoreAlerts.showError(Translate.instant('addon.mod_data.noaccess'));

                    // Go back to entry list.
                    this.forceLeave = true;
                    CoreNavigator.back();

                    return;
                }
            }

            this.editFormRender = this.displayEditFields();
            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        }

        this.loaded = true;
    }

    /**
     * Saves data.
     *
     * @param e Event.
     * @returns Resolved when done.
     */
    async save(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const inputData = this.editForm.value;

        try {
            let changed = AddonModDataHelper.hasEditDataChanged(
                inputData,
                this.fieldsArray,
                this.entry?.contents || {},
            );

            changed = changed || (!this.isEditing && this.initialSelectedGroup != this.selectedGroup);
            if (!changed) {
                if (this.entryId) {
                    await this.returnToEntryList();

                    return;
                }

                // New entry, no changes means no field filled, warn the user.
                throw new CoreError(Translate.instant('addon.mod_data.emptyaddform'));
            }

            const modal = await CoreLoadings.show('core.sending', true);

            // Create an ID to assign files.
            const entryTemp = this.entryId ? this.entryId : - (Date.now());
            let editData: AddonModDataEntryWSField[] = [];

            try {
                try {
                    editData = await AddonModDataHelper.getEditDataFromForm(
                        inputData,
                        this.fieldsArray,
                        this.database!.id,
                        entryTemp,
                        this.entry?.contents || {},
                        this.offline,
                    );
                } catch (error) {
                    if (this.offline || CoreWSError.isWebServiceError(error)) {
                        throw error;
                    }

                    // Cannot submit in online, prepare for offline usage.
                    this.offline = true;

                    editData = await AddonModDataHelper.getEditDataFromForm(
                        inputData,
                        this.fieldsArray,
                        this.database!.id,
                        entryTemp,
                        this.entry?.contents || {},
                        this.offline,
                    );
                }

                if (editData.length <= 0) {
                    // No field filled, warn the user.
                    throw new CoreError(Translate.instant('addon.mod_data.emptyaddform'));
                }

                let updateEntryResult: AddonModDataEditEntryResult | AddonModDataAddEntryResult | undefined;
                if (this.isEditing) {
                    updateEntryResult = await AddonModData.editEntry(
                        this.database!.id,
                        this.entryId!,
                        this.courseId,
                        editData,
                        this.fieldsArray,
                        this.siteId,
                        this.offline,
                    );
                } else {
                    updateEntryResult = await AddonModData.addEntry(
                        this.database!.id,
                        entryTemp,
                        this.courseId,
                        editData,
                        this.selectedGroup,
                        this.fieldsArray,
                        this.siteId,
                        this.offline,
                    );
                }

                // This is done if entry is updated when editing or creating if not.
                if ((this.isEditing && 'updated' in updateEntryResult && updateEntryResult.updated) ||
                    (!this.isEditing && 'newentryid' in updateEntryResult && updateEntryResult.newentryid)) {

                    CoreForms.triggerFormSubmittedEvent(this.formElement, updateEntryResult.sent, this.siteId);

                    const promises: Promise<void>[] = [];

                    if (updateEntryResult.sent) {
                        CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'data' });

                        if (this.isEditing) {
                            promises.push(AddonModData.invalidateEntryData(this.database!.id, this.entryId!, this.siteId));
                        }
                        promises.push(AddonModData.invalidateEntriesData(this.database!.id, this.siteId));
                    }

                    try {
                        await Promise.all(promises);
                        CoreEvents.trigger(
                            ADDON_MOD_DATA_ENTRY_CHANGED,
                            { dataId: this.database!.id, entryId: this.entryId },

                            this.siteId,
                        );
                    } finally {
                        this.returnToEntryList();
                    }
                } else {
                    this.errors = {};
                    if (updateEntryResult.fieldnotifications) {
                        updateEntryResult.fieldnotifications.forEach((fieldNotif) => {
                            const field = this.fieldsArray.find((field) => field.name == fieldNotif.fieldname);
                            if (field) {
                                this.errors[field.id] = fieldNotif.notification;
                            }
                        });
                    }

                    this.jsData!.errors = this.errors;

                    this.scrollToFirstError();

                    if (updateEntryResult.generalnotifications?.length) {
                        CoreAlerts.show({
                            header: Translate.instant('core.notice'),
                            message: CoreText.buildMessage(updateEntryResult.generalnotifications),
                        });
                    }
                }
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Cannot edit entry' });
        }
    }

    /**
     * Set group to see the database.
     *
     * @param groupId Group identifier to set.
     * @returns Resolved when done.
     */
    setGroup(groupId: number): Promise<void> {
        this.selectedGroup = groupId;
        this.loaded = false;

        return this.fetchEntryData();
    }

    /**
     * Displays Edit Search Fields.
     *
     * @returns Generated HTML.
     */
    protected displayEditFields(): string {
        this.jsData = {
            fields: this.fields,
            contents: CoreUtils.clone(this.entry?.contents) || {},
            form: this.editForm,
            database: this.database,
            errors: this.errors,
            onFieldInit: (data) => this.onFieldInit(data),
        };

        let template = AddonModDataHelper.getTemplate(this.database!, AddonModDataTemplateType.ADD, this.fieldsArray);

        // Replace the fields found on template.
        this.fieldsArray.forEach((field) => {
            let replace = '[[' + field.name + ']]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            let replaceRegEx = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            const render = '<addon-mod-data-field-plugin [class.has-errors]="!!errors[' + field.id + ']" mode="edit" \
                [field]="fields[' + field.id + ']" [value]="contents[' + field.id + ']" [form]="form" [database]="database" \
                [error]="errors[' + field.id + ']" (onFieldInit)="onFieldInit($event)"></addon-mod-data-field-plugin>';
            template = template.replace(replaceRegEx, render);

            // Replace the field id tag.
            replace = '[[' + field.name + '#id]]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegEx = new RegExp(replace, 'gi');

            template = template.replace(replaceRegEx, 'field_' + field.id);

            // Replace the field name tag.
            replace = '[[' + field.name + '#name]]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegEx = new RegExp(replace, 'gi');

            template = template.replace(replaceRegEx, field.name);

            // Replace the field description tag.
            replace = '[[' + field.name + '#description]]';
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegEx = new RegExp(replace, 'gi');

            template = template.replace(replaceRegEx, field.description);
        });

        const regex = new RegExp('##otherfields##', 'gi');

        if (template.match(regex)) {
            const unusedFields = this.fieldsArray.filter(field => !template.includes(`[field]="fields[${field.id}]`)).map((field) =>
                `<p><strong>${field.name}</strong></p>` +
                '<p><addon-mod-data-field-plugin [class.has-errors]="!!errors[' + field.id + ']" mode="edit" \
                [field]="fields[' + field.id + ']" [value]="contents[' + field.id + ']" [form]="form" [database]="database" \
                [error]="errors[' + field.id + ']" (onFieldInit)="onFieldInit($event)"></addon-mod-data-field-plugin><p>');

            template = template.replace(regex, unusedFields.join(''));
        }

        // Editing tags is not supported.
        const replaceRegEx = new RegExp('##tags##', 'gi');
        const message = CoreTag.areTagsAvailableInSite()
            ? '<p class="item-dimmed">{{ \'addon.mod_data.edittagsnotsupported\' | translate }}</p>'
            : '';
        template = template.replace(replaceRegEx, message);

        return template;
    }

    /**
     * A certain value has been initialized.
     *
     * @param data Data.
     */
    onFieldInit(data: AddonModDataEntryFieldInitialized): void {
        if (!this.originalData[data.fieldid]) {
            this.originalData[data.fieldid] = {
                id: 0,
                recordid: this.entry?.id ?? 0,
                fieldid: data.fieldid,
                content: data.content,
                content1: data.content1 ?? null,
                content2: data.content2 ?? null,
                content3: data.content3 ?? null,
                content4: data.content4 ?? null,
                files: data.files ?? [],
            };
        }
    }

    /**
     * Return to the entry list (previous page) discarding temp data.
     *
     * @returns Resolved when done.
     */
    protected async returnToEntryList(): Promise<void> {
        const inputData = this.editForm.value;

        try {
            const files = await AddonModDataHelper.getEditTmpFiles(
                inputData,
                this.fieldsArray,
                this.entry?.contents || {},
            );

            CoreFileUploader.clearTmpFiles(files);
        } finally {
            // Go back to entry list.
            this.forceLeave = true;
            CoreNavigator.back();
        }
    }

    /**
     * Scroll to first error or to the top if not found.
     */
    protected async scrollToFirstError(): Promise<void> {
        const scrolled = await CoreDom.scrollToElement(this.formElement.nativeElement, '.addon-data-error');
        if (!scrolled) {
            this.content?.scrollToTop();
        }
    }

}
