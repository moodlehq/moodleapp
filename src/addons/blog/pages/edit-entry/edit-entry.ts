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
import { ADDON_BLOG_ENTRY_UPDATED } from '@addons/blog/constants';
import {
    AddonBlog,
    AddonBlogAddEntryOption,
    AddonBlogFilter,
    AddonBlogPost,
    AddonBlogProvider,
    AddonBlogPublishState,
} from '@addons/blog/services/blog';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreCommentsComponentsModule } from '@features/comments/components/components.module';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseBasicData } from '@features/courses/services/courses';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreTagComponentsModule } from '@features/tag/components/components.module';
import { CanLeave } from '@guards/can-leave';
import { CoreLoadings } from '@services/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';

@Component({
    selector: 'addon-blog-edit-entry',
    templateUrl: './edit-entry.html',
    standalone: true,
    imports: [
        CoreEditorComponentsModule,
        CoreSharedModule,
        CoreCommentsComponentsModule,
        CoreTagComponentsModule,
    ],
})
export class AddonBlogEditEntryPage implements CanLeave, OnInit {

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

    entry?: AddonBlogPost;
    loaded = false;
    maxFiles = 99;
    initialFiles: CoreWSFile[] = [];
    files: CoreWSFile[] = [];
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

        const entryId = CoreNavigator.getRouteNumberParam('id');
        const lastModified = CoreNavigator.getRouteNumberParam('lastModified');
        const filters: AddonBlogFilter | undefined = CoreNavigator.getRouteParam('filters');
        const courseId = CoreNavigator.getRouteNumberParam('courseId');
        const cmId = CoreNavigator.getRouteNumberParam('cmId');
        this.userId = CoreNavigator.getRouteNumberParam('userId');
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        if (!entryId) {
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
                CoreDomUtils.showErrorModalDefault(error, 'Error getting associations, they may not be displayed correctly.');
            }

            return;
        }

        try {
            this.entry = await this.getEntry({ filters, lastModified, entryId });
            this.files = this.entry.attachmentfiles ?? [];
            this.initialFiles = [...this.files];
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
            CoreDomUtils.showErrorModalDefault(error, 'Error retrieving data.');
            this.forceLeave = true;
            CoreNavigator.back();

            return;
        }

        this.form.setValue({
            subject: this.entry?.subject ?? '',
            summary: this.entry?.summary ?? '',
            publishState: this.entry?.publishstate ?? AddonBlogPublishState.site,
            associateWithCourse: this.form.controls.associateWithCourse.value,
            associateWithModule: this.form.controls.associateWithModule.value,
        });

        this.calculateContext();
        this.loaded = true;
    }

    /**
     * Retrieves blog entry.
     *
     * @returns Blog entry.
     */
    protected async getEntry(params: AddonBlogEditEntryGetEntryParams): Promise<AddonBlogPost> {
        try {
            const { entries } = await AddonBlog.getEntries(
                { entryid: params.entryId },
                { readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK },
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
            if (!params.filters || CoreUtils.isWebServiceError(error)) {
                // Cannot get the entry, reject.
                throw error;
            }

            const updatedEntries = await AddonBlog.getEntries(params.filters);
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

        if (this.entry) {
            try {
                if (!CoreFileUploader.areFileListDifferent(this.files, this.initialFiles)) {
                    return await this.saveEntry();
                }

                const { attachmentsid } = await AddonBlog.prepareEntryForEdition({ entryid: this.entry.id });
                const removedFiles = CoreFileUploader.getFilesToDelete(this.initialFiles, this.files);

                if (removedFiles.length) {
                    await CoreFileUploader.deleteDraftFiles(attachmentsid, removedFiles);
                }

                await CoreFileUploader.uploadFiles(attachmentsid, this.files);

                return await this.saveEntry(attachmentsid);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'Error updating entry.');
            } finally {
                await loading.dismiss();
            }

            return;
        }

        try {
            if (!this.files.length) {
                return await this.saveEntry();
            }

            const attachmentId = await CoreFileUploader.uploadOrReuploadFiles(this.files, this.component);
            await this.saveEntry(attachmentId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error creating entry.');
        } finally {
            await loading.dismiss();
        }
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
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Add attachment to options list.
     *
     * @param attachmentsId Attachment ID.
     * @param options Options list.
     */
    addAttachments(attachmentsId: number | undefined, options: AddonBlogAddEntryOption[]): void {
        if (attachmentsId === undefined) {
            return;
        }

        options.push({ name: 'attachmentsid', value: attachmentsId });
    }

    /**
     * Create or update entry.
     *
     * @param attachmentsId Attachments.
     * @returns Promise resolved when done.
     */
    async saveEntry(attachmentsId?: number): Promise<void> {
        const { summary, subject, publishState } = this.form.value;

        if (!summary || !subject || !publishState) {
            return;
        }

        const options: AddonBlogAddEntryOption[] = [
            { name: 'publishstate', value: publishState },
            { name: 'courseassoc', value: this.form.controls.associateWithCourse.value && this.courseId ? this.courseId : 0 },
            { name: 'modassoc', value: this.form.controls.associateWithModule.value && this.modId ? this.modId : 0 },
        ];

        this.addAttachments(attachmentsId, options);

        this.entry
            ? await AddonBlog.updateEntry({ subject, summary, summaryformat: 1, options , entryid: this.entry.id })
            : await AddonBlog.addEntry({ subject, summary, summaryformat: 1, options });

        CoreEvents.trigger(ADDON_BLOG_ENTRY_UPDATED);
        this.forceLeave = true;
        CoreForms.triggerFormSubmittedEvent(this.formElement, true, CoreSites.getCurrentSiteId());

        return CoreNavigator.back();
    }

}

type AddonBlogEditEntryGetEntryParams = {
    entryId: number;
    filters?: AddonBlogFilter;
    lastModified?: number;
};
