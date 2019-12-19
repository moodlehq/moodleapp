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

import { Component, ViewChild } from '@angular/core';
import { Content, IonicPage, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { FormGroup } from '@angular/forms';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { AddonModDataOfflineProvider } from '../../providers/offline';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { AddonModDataComponentsModule } from '../../components/components.module';
import { CoreTagProvider } from '@core/tag/providers/tag';

/**
 * Page that displays the view edit page.
 */
@IonicPage({ segment: 'addon-mod-data-edit' })
@Component({
    selector: 'page-addon-mod-data-edit',
    templateUrl: 'edit.html',
})
export class AddonModDataEditPage {
    @ViewChild(Content) content: Content;

    protected module: any;
    protected courseId: number;
    protected data: any;
    protected entryId: number;
    protected entry: any;
    protected fields = {};
    protected fieldsArray = [];
    protected siteId: string;
    protected offline: boolean;
    protected forceLeave = false; // To allow leaving the page without checking for changes.

    title = '';
    component = AddonModDataProvider.COMPONENT;
    loaded = false;
    selectedGroup = 0;
    cssClass = '';
    groupInfo: any;
    editFormRender = '';
    editForm: FormGroup;
    extraImports = [AddonModDataComponentsModule];
    jsData: any;
    errors = {};

    constructor(params: NavParams, protected utils: CoreUtilsProvider, protected groupsProvider: CoreGroupsProvider,
            protected domUtils: CoreDomUtilsProvider, protected fieldsDelegate: AddonModDataFieldsDelegate,
            protected courseProvider: CoreCourseProvider, protected dataProvider: AddonModDataProvider,
            protected dataOffline: AddonModDataOfflineProvider, protected dataHelper: AddonModDataHelperProvider,
            sitesProvider: CoreSitesProvider, protected navCtrl: NavController, protected translate: TranslateService,
            protected eventsProvider: CoreEventsProvider, protected fileUploaderProvider: CoreFileUploaderProvider,
            private tagProvider: CoreTagProvider) {
        this.module = params.get('module') || {};
        this.entryId = params.get('entryId') || null;
        this.courseId = params.get('courseId');
        this.selectedGroup = params.get('group') || 0;

        this.siteId = sitesProvider.getCurrentSiteId();

        this.title = this.module.name;

        this.editForm = new FormGroup({});
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchEntryData();
    }

    /**
     * Check if we can leave the page or not and ask to confirm the lost of data.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave || !this.entry) {
            return true;
        }

        const inputData = this.editForm.value;

        return this.dataHelper.hasEditDataChanged(inputData, this.fieldsArray, this.data.id,
                this.entry.contents).then((changed) => {
            if (!changed) {
                return Promise.resolve();
            }

            // Show confirmation if some data has been modified.
            return  this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        }).then(() => {
            // Delete the local files from the tmp folder.
            return this.dataHelper.getEditTmpFiles(inputData, this.fieldsArray, this.data.id,
                    this.entry.contents).then((files) => {
                this.fileUploaderProvider.clearTmpFiles(files);
            });
        });
    }

    /**
     * Fetch the entry data.
     *
     * @return Resolved when done.
     */
    protected fetchEntryData(): Promise<any> {
        return this.dataProvider.getDatabase(this.courseId, this.module.id).then((data) => {
            this.title = data.name || this.title;
            this.data = data;
            this.cssClass = 'addon-data-entries-' + data.id;

            return this.dataProvider.getDatabaseAccessInformation(data.id);
        }).then((accessData) => {
            if (this.entryId) {
                return this.groupsProvider.getActivityGroupInfo(this.data.coursemodule).then((groupInfo) => {
                    this.groupInfo = groupInfo;
                    this.selectedGroup = this.groupsProvider.validateGroupId(this.selectedGroup, groupInfo);
                });
            }
        }).then(() => {
            return this.dataProvider.getFields(this.data.id);
        }).then((fieldsData) => {
            this.fieldsArray = fieldsData;
            this.fields = this.utils.arrayToObject(fieldsData, 'id');

            return this.dataHelper.fetchEntry(this.data, fieldsData, this.entryId);
        }).then((entry) => {
            this.entry = entry.entry;

            this.editFormRender = this.displayEditFields();
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Saves data.
     *
     * @param e Event.
     * @return Resolved when done.
     */
    save(e: Event): Promise<any> {
        e.preventDefault();
        e.stopPropagation();

        const inputData = this.editForm.value;

        return this.dataHelper.hasEditDataChanged(inputData, this.fieldsArray, this.data.id,
                this.entry.contents).then((changed) => {

            if (!changed) {
                if (this.entryId) {
                    return this.returnToEntryList();
                }

                // New entry, no changes means no field filled, warn the user.
                return Promise.reject('addon.mod_data.emptyaddform');
            }

            const modal = this.domUtils.showModalLoading('core.sending', true);

            // Create an ID to assign files.
            const entryTemp = this.entryId ? this.entryId : - (new Date().getTime());

            return this.dataHelper.getEditDataFromForm(inputData, this.fieldsArray, this.data.id, entryTemp, this.entry.contents,
                this.offline).catch((e) => {
                    if (!this.offline) {
                        // Cannot submit in online, prepare for offline usage.
                        this.offline = true;

                        return this.dataHelper.getEditDataFromForm(inputData, this.fieldsArray, this.data.id, entryTemp,
                            this.entry.contents, this.offline);
                    }

                    return Promise.reject(e);
            }).then((editData) => {
                if (editData.length > 0) {
                    if (this.entryId) {
                        return this.dataProvider.editEntry(this.data.id, this.entryId, this.courseId, editData, this.fields,
                            undefined, this.offline);
                    }

                    return this.dataProvider.addEntry(this.data.id, entryTemp, this.courseId, editData, this.selectedGroup,
                        this.fields, undefined, this.offline);
                }

                return false;
            }).then((result: any) => {
                if (!result) {
                    // No field filled, warn the user.
                    return Promise.reject('addon.mod_data.emptyaddform');
                }

                // This is done if entry is updated when editing or creating if not.
                if ((this.entryId && result.updated) || (!this.entryId && result.newentryid)) {
                    const promises = [];

                    this.entryId = this.entryId || result.newentryid;

                    promises.push(this.dataProvider.invalidateEntryData(this.data.id, this.entryId, this.siteId));
                    promises.push(this.dataProvider.invalidateEntriesData(this.data.id, this.siteId));

                    return Promise.all(promises).then(() => {
                        this.eventsProvider.trigger(AddonModDataProvider.ENTRY_CHANGED,
                            { dataId: this.data.id, entryId: this.entryId } , this.siteId);
                    }).finally(() => {
                        return this.returnToEntryList();
                    });
                } else {
                    this.errors = {};
                    if (result.fieldnotifications) {
                        result.fieldnotifications.forEach((fieldNotif) => {
                            const field = this.fieldsArray.find((field) => field.name == fieldNotif.fieldname);
                            if (field) {
                                this.errors[field.id] = fieldNotif.notification;
                            }
                        });
                    }
                    this.jsData['errors'] = this.errors;

                    setTimeout(() => {
                        this.scrollToFirstError();
                    });
                }
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Cannot edit entry', true);
        });
    }

    /**
     * Set group to see the database.
     *
     * @param groupId Group identifier to set.
     * @return Resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.selectedGroup = groupId;
        this.loaded = false;

        return this.fetchEntryData();
    }

    /**
     * Displays Edit Search Fields.
     *
     * @return Generated HTML.
     */
    protected displayEditFields(): string {
        this.jsData = {
            fields: this.fields,
            contents: this.utils.clone(this.entry.contents),
            form: this.editForm,
            data: this.data,
            errors: this.errors
        };

        let replace,
            render,
            template = this.dataHelper.getTemplate(this.data, 'addtemplate', this.fieldsArray);

        // Replace the fields found on template.
        this.fieldsArray.forEach((field) => {
            replace = '[[' + field.name + ']]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            render = '<addon-mod-data-field-plugin mode="edit" [field]="fields[' + field.id + ']"\
                [value]="contents[' + field.id + ']" [form]="form" [database]="data" [error]="errors[' + field.id + ']">\
                </addon-mod-data-field-plugin>';
            template = template.replace(replace, render);

            // Replace the field id tag.
            replace = '[[' + field.name + '#id]]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');

            template = template.replace(replace, 'field_' + field.id);
        });

        // Editing tags is not supported.
        replace = new RegExp('##tags##', 'gi');
        const message = '<p class="item-dimmed">{{ \'addon.mod_data.edittagsnotsupported\' | translate }}</p>';
        template = template.replace(replace, this.tagProvider.areTagsAvailableInSite() ? message : '');

        return template;
    }

    /**
     * Return to the entry list (previous page) discarding temp data.
     *
     * @return Resolved when done.
     */
    protected returnToEntryList(): Promise<any> {
        const inputData = this.editForm.value;

        return this.dataHelper.getEditTmpFiles(inputData, this.fieldsArray, this.data.id,
                this.entry.contents).then((files) => {
            this.fileUploaderProvider.clearTmpFiles(files);
        }).finally(() => {
            // Go back to entry list.
            this.forceLeave = true;
            this.navCtrl.pop();
        });
    }

    /**
     * Scroll to first error or to the top if not found.
     */
    protected scrollToFirstError(): void {
        if (!this.domUtils.scrollToElementBySelector(this.content, '.addon-data-error')) {
            this.domUtils.scrollToTop(this.content);
        }
    }
}
