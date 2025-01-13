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

import { Component, Input, OnInit } from '@angular/core';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFileUploader, CoreFileUploaderTypeList } from '@features/fileuploader/services/fileuploader';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { Translate } from '@singletons';
import { CoreNetwork } from '@services/network';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreFileEntry } from '@services/file-helper';
import { CoreCourses } from '@features/courses/services/courses';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Component to render attachments, allow adding more and delete the current ones.
 *
 * All the changes done will be applied to the "files" input array, no file will be uploaded. The component using this
 * component should be the one uploading and moving the files.
 *
 * All the files added will be copied to the app temporary folder, so they should be deleted after uploading them
 * or if the user cancels the action.
 *
 * <core-attachments [files]="files" [maxSize]="configs.maxsubmissionsizebytes" [maxSubmissions]="configs.maxfilesubmissions"
 *     [component]="component" [componentId]="assign.cmid" [acceptedTypes]="configs.filetypeslist" [allowOffline]="allowOffline">
 * </core-attachments>
 */
@Component({
    selector: 'core-attachments',
    templateUrl: 'core-attachments.html',
    styleUrl: 'attachments.scss',
})
export class CoreAttachmentsComponent implements OnInit {

    @Input() files: CoreFileEntry[] = []; // List of attachments. New attachments will be added to this array.
    @Input() maxSize?: number; // Max size. -1 means unlimited, 0 means course/user max size, not defined means unknown.
    @Input() maxSubmissions?: number; // Max number of attachments. -1 means unlimited, not defined means unknown limit.
    @Input() component?: string; // Component the downloaded files will be linked to.
    @Input() componentId?: string | number; // Component ID.
    @Input({ transform: toBoolean }) allowOffline = false; // Whether to allow selecting files in offline.
    @Input() acceptedTypes?: string; // List of supported filetypes. If undefined, all types supported.
    @Input({ transform: toBoolean }) required = false; // Whether to display the required mark.
    @Input() courseId?: number; // Course ID.
    @Input() title = Translate.instant('core.fileuploader.attachedfiles'); // Title to display.

    maxSizeReadable?: string;
    maxSubmissionsReadable?: string;
    unlimitedFiles?: boolean;
    fileTypes?: CoreFileUploaderTypeList;
    loaded = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.files = this.files || [];
        this.maxSize = this.maxSize !== null ? Number(this.maxSize) : NaN;

        if (this.maxSize === 0) {
            await this.getMaxSizeOfArea();
        } else if (this.maxSize > 0) {
            this.maxSizeReadable = CoreText.bytesToSize(this.maxSize, 2);
        } else if (this.maxSize === -1) {
            this.maxSizeReadable = Translate.instant('core.unlimited');
        } else {
            this.maxSizeReadable = Translate.instant('core.unknown');
        }

        if (this.maxSubmissions === undefined || this.maxSubmissions < 0) {
            this.maxSubmissionsReadable = this.maxSubmissions === undefined ?
                Translate.instant('core.unknown') : undefined;
            this.unlimitedFiles = true;
        } else {
            this.maxSubmissionsReadable = String(this.maxSubmissions);
        }

        this.acceptedTypes = this.acceptedTypes?.trim();

        if (this.acceptedTypes && this.acceptedTypes != '*') {
            this.fileTypes = CoreFileUploader.prepareFiletypeList(this.acceptedTypes);
        }

        this.loaded = true;
    }

    /**
     * Get max size of the area.
     *
     * @returns Promise resolved when done.
     */
    protected async getMaxSizeOfArea(): Promise<void> {
        if (this.courseId) {
            // Check course max size.
            const course = await CorePromiseUtils.ignoreErrors(CoreCourses.getCourseByField('id', this.courseId));

            if (course?.maxbytes) {
                this.maxSize = course.maxbytes;
                this.maxSizeReadable = CoreText.bytesToSize(this.maxSize, 2);

                return;
            }
        }

        // Check user max size.
        const currentSite = CoreSites.getCurrentSite();
        const siteInfo = currentSite?.getInfo();

        if (siteInfo?.usermaxuploadfilesize) {
            this.maxSize = siteInfo.usermaxuploadfilesize;
            this.maxSizeReadable = CoreText.bytesToSize(this.maxSize, 2);
        } else {
            this.maxSizeReadable = Translate.instant('core.unknown');
        }
    }

    /**
     * Add a new attachment.
     */
    async add(): Promise<void> {
        if (!this.allowOffline && !CoreNetwork.isOnline()) {
            CoreAlerts.showError(Translate.instant('core.fileuploader.errormustbeonlinetoupload'));

            return;
        }

        const mimetypes = this.fileTypes && this.fileTypes.mimetypes;

        try {
            const result = await CoreFileUploaderHelper.selectFile(this.maxSize, this.allowOffline, undefined, mimetypes);

            this.files?.push(result);
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error selecting file.' });
        }
    }

    /**
     * Delete a file from the list.
     *
     * @param index The index of the file.
     * @param askConfirm Whether to ask confirm.
     */
    async delete(index: number, askConfirm?: boolean): Promise<void> {

        if (askConfirm) {
            try {
                await CoreAlerts.confirmDelete(Translate.instant('core.confirmdeletefile'));
            } catch {
                // User cancelled.
                return;
            }
        }

        // Remove the file from the list.
        this.files?.splice(index, 1);
    }

    /**
     * A file was renamed.
     *
     * @param index Index of the file.
     * @param data The data received.
     */
    renamed(index: number, data: { file: FileEntry }): void {
        this.files[index] = data.file;
    }

}
