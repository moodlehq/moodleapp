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
import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CoreModalComponent } from '@classes/modal-component';

@Component({
    selector: 'addon-privatefiles-file-actions',
    styleUrl: './file-actions.scss',
    templateUrl: 'file-actions.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CoreSharedModule],
})
export class AddonPrivateFilesFileActionsComponent extends CoreModalComponent<AddonPrivateFilesFileActionsComponentParams> {

    @Input({ required: false }) isDownloaded = false;
    @Input({ required: true }) filename = '';
    @Input({ required: true }) icon = '';

    constructor(elementRef: ElementRef<HTMLElement>) {
        super(elementRef);
    }

}

export type AddonPrivateFilesFileActionsComponentParams = {
    status: 'cancel' | 'deleteOnline' | 'deleteOffline' | 'download';
};
