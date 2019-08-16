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

import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileProvider } from '@providers/file';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Component to handle a local file. Only files inside the app folder can be managed.
 *
 * Shows the file name, icon (depending on extension), size and time modified.
 * Also, if managing is enabled it will also show buttons to rename and delete the file.
 */
@Component({
    selector: 'core-local-file',
    templateUrl: 'core-local-file.html'
})
export class CoreLocalFileComponent implements OnInit {
    @Input() file: any; // A fileEntry retrieved using CoreFileProvider.getFile or similar.
    @Input() manage?: boolean | string; // Whether the user can manage the file (edit and delete).
    @Input() overrideClick?: boolean | string; // Whether the default item click should be overridden.
    @Output() onDelete?: EventEmitter<void>; // Will notify when the file is deleted.
    @Output() onRename?: EventEmitter<any>; // Will notify when the file is renamed. Receives the FileEntry as the param.
    @Output() onClick?: EventEmitter<void>; // Will notify when the file is clicked. Only if overrideClick is true.

    fileName: string;
    fileIcon: string;
    fileExtension: string;
    size: string;
    timemodified: string;
    newFileName = '';
    editMode: boolean;
    relativePath: string;

    constructor(private mimeUtils: CoreMimetypeUtilsProvider, private utils: CoreUtilsProvider, private translate: TranslateService,
            private textUtils: CoreTextUtilsProvider, private fileProvider: CoreFileProvider,
            private domUtils: CoreDomUtilsProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.onDelete = new EventEmitter();
        this.onRename = new EventEmitter();
        this.onClick = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.manage = this.utils.isTrueOrOne(this.manage);

        this.loadFileBasicData();

        // Get the size and timemodified.
        this.fileProvider.getMetadata(this.file).then((metadata) => {
            if (metadata.size >= 0) {
                this.size = this.textUtils.bytesToSize(metadata.size, 2);
            }

            this.timemodified = this.timeUtils.userDate(metadata.modificationTime, 'core.strftimedatetimeshort');
        });
    }

    /**
     * Load the basic data for the file.
     */
    protected loadFileBasicData(): void {
        this.fileName = this.file.name;
        this.fileIcon = this.mimeUtils.getFileIcon(this.file.name);
        this.fileExtension = this.mimeUtils.getFileExtension(this.file.name);

        // Let's calculate the relative path for the file.
        this.relativePath = this.fileProvider.removeBasePath(this.file.toURL());
        if (!this.relativePath) {
            // Didn't find basePath, use fullPath but if the user tries to manage the file it'll probably fail.
            this.relativePath = this.file.fullPath;
        }
    }

    /**
     * File clicked.
     *
     * @param {Event} e Click event.
     */
    fileClicked(e: Event): void {
        if (this.editMode) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (this.utils.isTrueOrOne(this.overrideClick) && this.onClick.observers.length) {
            this.onClick.emit();
        } else {
            this.utils.openFile(this.file.toURL());
        }
    }

    /**
     * Activate the edit mode.
     *
     * @param {Event} e Click event.
     */
    activateEdit(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
        this.editMode = true;
        this.newFileName = this.file.name;
    }

    /**
     * Rename the file.
     *
     * @param {string} newName New name.
     * @param {Event}  e       Click event.
     */
    changeName(newName: string, e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        if (newName == this.file.name) {
            // Name hasn't changed, stop.
            this.editMode = false;

            return;
        }

        const modal = this.domUtils.showModalLoading(),
            fileAndDir = this.fileProvider.getFileAndDirectoryFromPath(this.relativePath),
            newPath = this.textUtils.concatenatePaths(fileAndDir.directory, newName);

        // Check if there's a file with this name.
        this.fileProvider.getFile(newPath).then(() => {
            // There's a file with this name, show error and stop.
            this.domUtils.showErrorModal('core.errorfileexistssamename', true);
        }).catch(() => {
            // File doesn't exist, move it.
            return this.fileProvider.moveFile(this.relativePath, newPath).then((fileEntry) => {
                this.editMode = false;
                this.file = fileEntry;
                this.loadFileBasicData();
                this.onRename.emit({ file: this.file });
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.errorrenamefile', true);
            });
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Delete the file.
     *
     * @param {Event} e Click event.
     */
    deleteFile(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        // Ask confirmation.
        this.domUtils.showConfirm(this.translate.instant('core.confirmdeletefile')).then(() => {
            const modal = this.domUtils.showModalLoading();

            return this.fileProvider.removeFile(this.relativePath).then(() => {
                this.onDelete.emit();
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errordeletefile', true);
        });
    }
}
