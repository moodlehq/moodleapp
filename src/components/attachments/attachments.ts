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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreFileUploaderHelperProvider } from '@core/fileuploader/providers/helper';

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
    templateUrl: 'core-attachments.html'
})
export class CoreAttachmentsComponent implements OnInit {
    @Input() files: any[]; // List of attachments. New attachments will be added to this array.
    @Input() maxSize: number; // Max size for attachments. If not defined, 0 or -1, unknown size.
    @Input() maxSubmissions: number; // Max number of attachments. If -1 or not defined, unknown limit.
    @Input() component: string; // Component the downloaded files will be linked to.
    @Input() componentId: string | number; // Component ID.
    @Input() allowOffline: boolean | string; // Whether to allow selecting files in offline.
    @Input() acceptedTypes: string; // List of supported filetypes. If undefined, all types supported.
    @Input() required: boolean; // Whether to display the required mark.

    maxSizeReadable: string;
    maxSubmissionsReadable: string;
    unlimitedFiles: boolean;

    protected fileTypes: { info: any[], mimetypes: string[] };

    constructor(protected appProvider: CoreAppProvider, protected domUtils: CoreDomUtilsProvider,
            protected textUtils: CoreTextUtilsProvider, protected fileUploaderProvider: CoreFileUploaderProvider,
            protected translate: TranslateService, protected fileUploaderHelper: CoreFileUploaderHelperProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.maxSize = Number(this.maxSize); // Make sure it's defined and it's a number.
        this.maxSize = !isNaN(this.maxSize) && this.maxSize > 0 ? this.maxSize : -1;

        if (this.maxSize == -1) {
            this.maxSizeReadable = this.translate.instant('core.unknown');
        } else {
            this.maxSizeReadable = this.textUtils.bytesToSize(this.maxSize, 2);
        }

        if (typeof this.maxSubmissions == 'undefined' || this.maxSubmissions < 0) {
            this.maxSubmissionsReadable = this.translate.instant('core.unknown');
            this.unlimitedFiles = true;
        } else {
            this.maxSubmissionsReadable = String(this.maxSubmissions);
        }

        this.acceptedTypes = this.acceptedTypes && this.acceptedTypes.trim();

        if (this.acceptedTypes && this.acceptedTypes != '*') {
            this.fileTypes = this.fileUploaderProvider.prepareFiletypeList(this.acceptedTypes);
        }
    }

    /**
     * Add a new attachment.
     */
    add(): void {
        const allowOffline = this.allowOffline && this.allowOffline !== 'false';

        if (!allowOffline && !this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.fileuploader.errormustbeonlinetoupload', true);
        } else {
            const mimetypes = this.fileTypes && this.fileTypes.mimetypes;

            this.fileUploaderHelper.selectFile(this.maxSize, allowOffline, undefined, mimetypes).then((result) => {
                this.files.push(result);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Error selecting file.');
            });
        }
    }

    /**
     * Delete a file from the list.
     *
     * @param index The index of the file.
     * @param askConfirm Whether to ask confirm.
     */
    delete(index: number, askConfirm?: boolean): void {
        let promise;

        if (askConfirm) {
            promise = this.domUtils.showDeleteConfirm('core.confirmdeletefile');
        } else {
            promise = Promise.resolve();
        }

        promise.then(() => {
            // Remove the file from the list.
            this.files.splice(index, 1);
        }).catch(() => {
            // User cancelled.
        });
    }

    /**
     * A file was renamed.
     *
     * @param index Index of the file.
     * @param data The data received.
     */
    renamed(index: number, data: any): void {
        this.files[index] = data.file;
    }
}
