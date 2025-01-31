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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DownloadStatus } from '@/core/constants';
import { CoreAnimations } from '@components/animations';
import { toBoolean } from '@/core/transforms/boolean';
import { TranslateModule } from '@ngx-translate/core';
import { CoreFaIconDirective } from '../../directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '../../directives/update-non-reactive-attributes';
import { IonicModule } from '@ionic/angular';

/**
 * Component to show a download button with refresh option, the spinner and the status of it.
 *
 * Usage:
 * <core-download-refresh [status]="status" [enabled]="true" [canTrustDownload]="true" (action)="download()">
 * </core-download-refresh>
 */
@Component({
    selector: 'core-download-refresh',
    templateUrl: 'core-download-refresh.html',
    styleUrl: 'download-refresh.scss',
    animations: [CoreAnimations.SHOW_HIDE],
    standalone: true,
    imports: [
        IonicModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
        TranslateModule,
    ],
})
export class CoreDownloadRefreshComponent implements OnInit {

    @Input() status?: DownloadStatus; // Download status.
    @Input() statusesTranslatable?: Partial<CoreDownloadStatusTranslatable>; // Download statuses translatable strings.
    @Input() statusSubject = ''; // Status subject to use on name filed in the translatable string.
    @Input({ transform: toBoolean }) enabled = false; // Whether the download is enabled.
    @Input({ transform: toBoolean }) loading = true; // Force loading status when is not downloading.
    @Input({ transform: toBoolean }) canTrustDownload = false; // If false, refresh will be shown if downloaded.
    @Output() action: EventEmitter<boolean>; // Will emit an event when the item clicked.

    /**
     * @deprecated since 4.5. Use statusesTranslatable instead.
     */
    @Input() statusTranslatable?: string; // Download status translatable string.

    statusDownloaded = DownloadStatus.DOWNLOADED;
    statusNotDownloaded = DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    statusOutdated = DownloadStatus.OUTDATED;
    statusDownloading = DownloadStatus.DOWNLOADING;

    translates: CoreDownloadStatusTranslatable = {
        downloaded: 'core.downloaded',
        notdownloaded: 'core.download',
        outdated: 'core.refresh',
        downloading: 'core.downloading',
        loading: 'core.loading',
    };

    constructor() {
        this.action = new EventEmitter();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.translates = Object.assign(this.translates, this.statusesTranslatable || {});
    }

    /**
     * Download clicked.
     *
     * @param e Click event.
     * @param refresh Whether it's refreshing.
     */
    download(e: Event, refresh: boolean): void {
        e.preventDefault();
        e.stopPropagation();

        this.action.emit(refresh);
    }

}

export type CoreDownloadStatusTranslatable = {
    downloaded: string;
    notdownloaded: string;
    outdated: string;
    downloading: string;
    loading: string;
};
