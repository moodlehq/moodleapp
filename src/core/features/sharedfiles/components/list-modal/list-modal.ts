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

import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, OnInit, Input } from '@angular/core';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFile } from '@services/file';
import { ModalController, Translate } from '@singletons';
import { CoreSharedFilesComponentsModule } from '../components.module';

/**
 * Modal to display the list of shared files.
 */
@Component({
    selector: 'core-shared-files-list-modal',
    templateUrl: 'list-modal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSharedFilesComponentsModule,
    ],
})
export class CoreSharedFilesListModalComponent implements OnInit {

    @Input() siteId?: string;
    @Input() mimetypes?: string[];
    @Input({ transform: toBoolean }) manage = false;
    @Input({ transform: toBoolean }) pick = false; // To pick a file you MUST use a modal.
    @Input() path?: string;
    @Input({ transform: toBoolean }) hideSitePicker = false;

    title?: string;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.calculateTitle(this.path);
    }

    /**
     * Calculate the title.
     *
     * @param path Path to use.
     */
    calculateTitle(path?: string): void {
        if (path) {
            this.title = CoreFile.getFileAndDirectoryFromPath(path).name;
        } else {
            this.title = Translate.instant('core.sharedfiles.sharedfiles');
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * A file was picked.
     *
     * @param file Picked file.
     */
    filePicked(file: FileEntry): void {
        ModalController.dismiss(file);
    }

}
