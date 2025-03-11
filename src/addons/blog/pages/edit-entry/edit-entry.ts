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
import { CoreSharedModule } from '@/core/shared.module';
import { ADDON_BLOG_ENTRY_UPDATED, ADDON_BLOG_SYNC_ID } from '@addons/blog/constants';
import {
    AddonBlog,
    AddonBlogAddEntryOption,
    AddonBlogFilter,
    AddonBlogPost,
    AddonBlogProvider,
    AddonBlogPublishState,
} from '@addons/blog/services/blog';
import { AddonBlogOffline } from '@addons/blog/services/blog-offline';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AddonBlogSync } from '@addons/blog/services/blog-sync';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseBasicData } from '@features/courses/services/courses';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CanLeave } from '@guards/can-leave';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreTime } from '@singletons/time';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { DEFAULT_TEXT_FORMAT } from '@singletons/text';

@Component({
    selector: 'addon-blog-edit-entry',
    templateUrl: './edit-entry.html',
    standalone: true,
    imports: [
        CoreEditorRichTextEditorComponent,
        CoreSharedModule,
    ],
})
export default class AddonBlogEditEntryPage implements CanLeave, OnInit, OnDestroy {

    @ViewChild('editEntryForm') formElement!: ElementRef;

    publishState = AddonBlogPublishState;
    form = new FormGroup({
        subject: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        summary: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        publishState: new FormControl<AddonBlogPublishState>(
            AddonBlogPublishState.site,
            { nonNullable: true, validators: [Validators.required] },
        ),
        associateWithCourse: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.required] }),
        associateWithModule: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.required] }),
    });

    entry?: AddonBlogPost | AddonBlogEditEntryFormattedOfflinePost;
    loaded = false;
    maxFiles = 99;
    initialFiles: CoreFileEntry[] = [];
    files: CoreFileEntry[] = [];
    courseId?: number;
    modId?: number;
    userId?: number;
    associatedCourse?: CoreCourseBasicData;
    associatedModule?: CoreCourseModuleData;
    associationsExpanded = false;
    moduleContext: ContextLevel = ContextLevel.MODULE;
    courseContext: ContextLevel = ContextLevel.COURSE;
    contextLevel: ContextLevel = ContextLevel.SYSTEM;
    contextInstanceId = 0;
    component = AddonBlogProvider.COMPONENT;
    siteHomeId?: number;
    forceLeave = false;
    isOfflineEntry = false;

    /**
     * Gives if the form is not pristine. (only for existing entries)
     *
     * @returns Data has changed or not.
     */
    get hasDataChangedForEdit(): boolean {
        const form = this.form.controls;

        return form.summary.value !== this.entry?.summary ||
            form.subject.value !== this.entry?.subject ||
            form.publishState.value !== this.entry?.publishstate ||
            CoreFileUploader.areFileListDifferent(this.files, this.initialFiles) ||
            form.associateWithModule.value !== (this.entry?.moduleid !== 0) ||
            form.associateWithCourse.value !== (this.entry?.courseid !== 0);
    }

    /**
     * Gives if the form is not pristine. (only for new entries)
     *
     * @returns Data has changed or not.
     */
    get hasDataChangedForNewEntry(): boolean {
        const form = this.form.controls;

        return form.subject.value !== '' ||
            form.summary.value !== '' ||
            form.publishState.value !== AddonBlogPublishState.site ||
            CoreFileUploader.areFileListDifferent(this.files, this.initialFiles);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const site = await CoreSites.getSite();
        const isEditingEnabled = await AddonBlog.isEditingEnabled();

        if (!site || !isEditingEnabled) {
            return CoreNavigator.back();
        }

        const entryId = CoreNavigator.getRouteParam('id');
        const lastModified = CoreNavigator.getRouteNumberParam('lastModified');
        const filters: AddonBlogFilter | undefined = CoreNavigator.getRouteParam('filters');
        const courseId = CoreNavigator.getRouteNumberParam('courseId');
        const cmId = CoreNavigator.getRouteNumberParam('cmId');
        this.userId = CoreNavigator.getRouteNumberParam('userId');
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();
        this.isOfflineEntry = entryId?.startsWith('new-') ?? false;
        const entryIdParsed = Number(entryId);

        if (entryIdParsed === 0) {
            this.loaded = true;

            try {
                if (cmId) {
                    this.modId = cmId;
                    this.form.controls.associateWithModule.setValue(true);
                    this.associatedModule = await CoreCourse.getModule(this.modId);
                }

                if (courseId) {
                    this.courseId = courseId;
                    this.form.controls.associateWithCourse.setValue(true);
                    const { course } = await CoreCourseHelper.getCourse(this.courseId);
                    this.associatedCourse = course;
                }
            } catch (error) {
                CoreAlerts.showError(error, { default: 'Error getting associations, they may not be displayed correctly.' });
            }

            return;
        }

        try {
            await AddonBlogSync.waitForSync(ADDON_BLOG_SYNC_ID);

            if (!this.isOfflineEntry) {
                const onlineEntryParams = { filters, lastModified, entryId: entryIdParsed };

                const offlineContent = await this.getFormattedBlogOfflineEntry({ id: entryIdParsed }, onlineEntryParams);
                this.entry = offlineContent ?? await this.getEntry(onlineEntryParams, false);
            } else {
                this.entry = await this.getFormattedBlogOfflineEntry({ created: Number(entryId?.slice(4)) });

                if (!this.entry) {
                    throw new CoreError('This offline entry no longer exists.');
                }
            }

            this.files = [...(this.entry.attachmentfiles ?? [])];
            this.initialFiles = [...this.files];

            CoreSync.blockOperation(AddonBlogProvider.COMPONENT, this.entry.id ?? this.entry.created);
            this.courseId = this.courseId || this.entry.courseid;
            this.modId = CoreNavigator.getRouteNumberParam('cmId') || this.entry.coursemoduleid;

            if (this.courseId) {
                this.form.controls.associateWithCourse.setValue(true);
                const { course } = await CoreCourseHelper.getCourse(this.courseId);
                this.associatedCourse = course;
            }

            if (this.modId) {
                this.form.controls.associateWithModule.setValue(true);
                this.associatedModule = await CoreCourse.getModule(this.modId);
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error retrieving data.' });
            this.forceLeave = true;
            CoreNavigator.back();

            return;
        }

        this.form.setValue({
            subject: this.entry.subject,
            summary: CoreFileHelper.replacePluginfileUrls(
                this.entry.summary,
                this.entry.summaryfiles,
            ),
            publishState: this.entry.publishstate ?? AddonBlogPublishState.site,
            associateWithCourse: this.form.controls.associateWithCourse.value,
            associateWithModule: this.form.controls.associateWithModule.value,
        });

        this.calculateContext();
        this.loaded = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        if (!this.entry) {
            return;
        }

        CoreSync.unblockOperation(AddonBlogProvider.COMPONENT, this.entry.id ?? this.entry.created);
    }

    /**
     * Retrieves blog entry.
     *
     * @param params Params to get the entry.
     * @param filter Whether to obtain the data filtered or not. If filter=true it will always return cached data.
     * @returns Blog entry.
     */
    protected async getEntry(params: AddonBlogEditEntryGetEntryParams, filter = false): Promise<AddonBlogPost> {
        try {
            const { entries } = await AddonBlog.getEntries(
                { entryid: params.entryId },
                {
                    readingStrategy: filter ? CoreSitesReadingStrategy.ONLY_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
                    filter,
                },
            );

            const selectedEntry = entries.find(entry => entry.id === params.entryId);

            if (!selectedEntry) {
                throw new CoreError('Entry not found');
            }

            if (params.filters && params.lastModified && selectedEntry.lastmodified < params.lastModified) {
                throw new CoreError('Entry is outdated');
            }

            return selectedEntry;
        } catch (error) {
            if (!params.filters || CoreWSError.isWebServiceError(error)) {
                // Cannot get the entry, reject.
                throw error;
            }

            const updatedEntries = await AddonBlog.getEntries(params.filters, {
                readingStrategy: filter ? CoreSitesReadingStrategy.ONLY_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
                filter,
            });
            const entry = updatedEntries.entries.find(entry => entry.id === params.entryId);

            if (!entry) {
                throw error;
            }

            return entry;
        }

    }

    /**
     * Calculate context level and context instance.
     */
    calculateContext(): void {
        // Calculate the context level.
        if (this.userId && !this.courseId && !this.modId) {
            this.contextLevel = ContextLevel.USER;
            this.contextInstanceId = this.userId;
        } else if (this.courseId && this.courseId != this.siteHomeId) {
            this.contextLevel = ContextLevel.COURSE;
            this.contextInstanceId = this.courseId;
        } else {
            this.contextLevel = ContextLevel.SYSTEM;
            this.contextInstanceId = 0;
        }
    }

    /**
     * Update or create entry.
     *
     * @returns Promise resolved when done.
     */
    async save(): Promise<void> {
        const { summary, subject, publishState } = this.form.value;

        if (!subject || !summary || !publishState) {
            return;
        }

        const loading = await CoreLoadings.show('core.sending', true);

        if (this.entry?.id) {
            try {
                if (!CoreNetwork.isOnline()) {
                    const attachmentsId = await this.uploadOrStoreFiles({ entryId: this.entry.id });

                    return await this.saveEntry({ attachmentsId });
                }

                if (!CoreFileUploader.areFileListDifferent(this.files, this.initialFiles)) {
                    return await this.saveEntry({});
                }

                const { attachmentsid } = await AddonBlog.prepareEntryForEdition({ entryid: this.entry.id });

                const lastModified = CoreNavigator.getRouteNumberParam('lastModified');
                const filters: AddonBlogFilter | undefined = CoreNavigator.getRouteParam('filters');
                const entry = this.entry && 'attachment' in this.entry
                    ? this.entry
                    : await CorePromiseUtils.ignoreErrors(this.getEntry({ filters, lastModified, entryId: this.entry.id }, true));

                const removedFiles = CoreFileUploader.getFilesToDelete(entry?.attachmentfiles ?? [], this.files);

                if (removedFiles.length) {
                    await CoreFileUploader.deleteDraftFiles(attachmentsid, removedFiles);
                }

                await CoreFileUploader.uploadFiles(attachmentsid, this.files);

                return await this.saveEntry({ attachmentsId: attachmentsid });
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // It's a WebService error, the user cannot send the message so don't store it.
                    CoreAlerts.showError(error, { default: 'Error updating entry.' });

                    return;
                }

                const attachmentsId = await this.uploadOrStoreFiles({ entryId: this.entry.id, forceStorage: true });

                return await this.saveEntry({ attachmentsId, forceOffline: true });
            } finally {
                await loading.dismiss();
            }
        }

        const created = this.entry?.created ?? CoreTime.timestamp();

        try {
            if (!this.files.length) {
                return await this.saveEntry({ created });
            }

            const attachmentsId = await this.uploadOrStoreFiles({ created });
            await this.saveEntry({ created, attachmentsId });
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                CoreAlerts.showError(error, { default: 'Error creating entry.' });

                return;
            }

            const attachmentsId = await this.uploadOrStoreFiles({ created, forceStorage: true });

            return await this.saveEntry({ attachmentsId, forceOffline: true });
        } finally {
            await loading.dismiss();
        }
    }

    /**
     * Upload or store locally files.
     *
     * @param param Folder where files will be located.
     * @returns folder where files will be located.
     */
    async uploadOrStoreFiles(param: AddonBlogEditEntryUploadOrStoreFilesParam): Promise<number | CoreFileUploaderStoreFilesResult> {
        if (CoreNetwork.isOnline() && !param.forceStorage) {
            return await CoreFileUploader.uploadOrReuploadFiles(this.files, this.component);
        }

        const folder = 'entryId' in param ? { id: param.entryId } : { created: param.created };
        const folderPath = await AddonBlogOffline.getOfflineEntryFilesFolderPath(folder);

        return await CoreFileUploader.storeFilesToUpload(folderPath, this.files);
    }

    /**
     * Expand or collapse associations.
     */
    toggleAssociations(): void {
        this.associationsExpanded = !this.associationsExpanded;
    }

    /**
     * Check if the user can leave the view. If there are changes to be saved, it will ask for confirm.
     *
     * @returns Promise resolved with true if can leave the view, rejected otherwise.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave) {
            return true;
        }

        if ((!this.entry && this.hasDataChangedForNewEntry) || (this.entry && this.hasDataChangedForEdit)) {
            // Modified, confirm user wants to go back.
            await CoreAlerts.confirmLeaveWithChanges();
        }

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Create or update entry.
     *
     * @param params Creation date and attachments ID.
     * @returns Promise resolved when done.
     */
    async saveEntry(params: AddonBlogEditEntrySaveEntryParams): Promise<void> {
        const { summary, subject, publishState } = this.form.value;

        if (!summary || !subject || !publishState) {
            return;
        }

        const options: AddonBlogAddEntryOption[] = [
            { name: 'publishstate', value: publishState },
            { name: 'courseassoc', value: this.form.controls.associateWithCourse.value && this.courseId ? this.courseId : 0 },
            { name: 'modassoc', value: this.form.controls.associateWithModule.value && this.modId ? this.modId : 0 },
        ];

        if (params.attachmentsId) {
            options.push({ name: 'attachmentsid', value: params.attachmentsId });
        }

        if (!this.entry?.id) {
            await AddonBlog.addEntry({
                subject,
                summary: CoreFileHelper.restorePluginfileUrls(summary, this.entry?.summaryfiles ?? []),
                summaryformat: DEFAULT_TEXT_FORMAT,
                options,
                created: params.created ?? CoreTime.timestamp(),
                forceOffline: params.forceOffline,
            });
        } else {
            await AddonBlog.updateEntry({
                subject,
                summary: CoreFileHelper.restorePluginfileUrls(summary, this.entry?.summaryfiles ?? []),
                summaryformat: DEFAULT_TEXT_FORMAT,
                options,
                forceOffline: params.forceOffline,
                entryid: this.entry.id,
                created: this.entry.created,
            });
        }

        CoreEvents.trigger(ADDON_BLOG_ENTRY_UPDATED);
        this.forceLeave = true;
        CoreForms.triggerFormSubmittedEvent(this.formElement, true, CoreSites.getCurrentSiteId());

        return CoreNavigator.back();
    }

    /**
     * Retrieves a formatted blog offline entry.
     *
     * @param params Entry creation date or entry ID.
     * @param onlineEntryParams When editing an online entry, the params to obtain it.
     * @returns Formatted entry.
     */
    async getFormattedBlogOfflineEntry(
        params: AddonBlogEditGetFormattedBlogOfflineEntryParams,
        onlineEntryParams?: AddonBlogEditEntryGetEntryParams,
    ): Promise<AddonBlogEditEntryFormattedOfflinePost | undefined> {
        const entryRecord = await AddonBlogOffline.getOfflineEntry(params);
        if (!entryRecord) {
            return;
        }

        const onlineEntry = onlineEntryParams ?
            await CorePromiseUtils.ignoreErrors(this.getEntry(onlineEntryParams, true)) :
            undefined;

        return await AddonBlog.formatOfflineEntry(entryRecord, onlineEntry);
    }

}

type AddonBlogEditGetFormattedBlogOfflineEntryParams = { id: number } | { created: number };

type AddonBlogEditEntryUploadOrStoreFilesParam = ({ entryId: number } | { created: number }) & { forceStorage?: boolean };

type AddonBlogEditEntryGetEntryParams = { entryId: number; filters?: AddonBlogFilter; lastModified?: number };

type AddonBlogEditEntryPost = Omit<AddonBlogPost, 'id'> & { id?: number };

type AddonBlogEditEntrySaveEntryParams = {
    created?: number;
    attachmentsId?: number | CoreFileUploaderStoreFilesResult;
    forceOffline?: boolean;
};

type AddonBlogEditEntryFormattedOfflinePost = Omit<
    AddonBlogEditEntryPost, | 'attachment' | 'attachmentfiles' | 'rating' | 'format' | 'usermodified' | 'module'
> & { attachmentfiles?: CoreFileEntry[] };
