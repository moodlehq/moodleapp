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
import { DownloadStatus } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CoreFileComponent } from '@components/file/file';

@Component({
    selector: 'addon-privatefiles-file',
    templateUrl: 'file.html',
    standalone: true,
    styleUrl: 'file.scss',
    imports: [CoreSharedModule],
})
export class AddonPrivateFilesFileComponent extends CoreFileComponent implements OnDestroy {

    @Input({ transform: toBoolean }) showCheckbox = true; // Show checkbox
    @Input({ transform: toBoolean, required: false }) selected = false; // Selected file.

    @Output() onSelectedFileChange: EventEmitter<boolean>; // Will notify when the checkbox value changes.
    @Output() onOpenMenuClick: EventEmitter<CoreFileComponent>; // Will notify when menu clicked.

    statusDownloaded = DownloadStatus.DOWNLOADED;

    constructor() {
        super();
        this.onSelectedFileChange = new EventEmitter<boolean>();
        this.onOpenMenuClick = new EventEmitter<CoreFileComponent>();
    }

    /**
     * Emits onOpenMenuClick event with the current instance.
     */
    openMenuClick(): void {
        this.onOpenMenuClick.emit(this);
    }

}
