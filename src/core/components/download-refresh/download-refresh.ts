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

import { Component, input, output, computed } from '@angular/core';
import { DownloadStatus } from '@/core/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

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
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
    ],
})
export class CoreDownloadRefreshComponent {

    readonly status = input<DownloadStatus>(); // Download status.
    readonly statusesTranslatable = input<Partial<CoreDownloadStatusTranslatable>>(); // Download statuses translatable strings.
    readonly statusSubject = input(''); // Status subject to use on name filed in the translatable string.
    readonly enabled = input(false, { transform: toBoolean }); // Whether the download is enabled.
    readonly loading = input(true, { transform: toBoolean }); // Force loading status when is not downloading.
    readonly canTrustDownload = input(false, { transform: toBoolean }); // If false, refresh will be shown if downloaded.
    readonly action = output<boolean>(); // Will emit an event when the item clicked.

    /**
     * @deprecated since 4.5. Use statusesTranslatable instead.
     */
    readonly statusTranslatable = input<string>(); // Download status translatable string.

    statusDownloaded = DownloadStatus.DOWNLOADED;
    statusNotDownloaded = DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    statusOutdated = DownloadStatus.OUTDATED;
    statusDownloading = DownloadStatus.DOWNLOADING;

    readonly translates = computed<CoreDownloadStatusTranslatable>(() => ({
        downloaded: 'core.downloaded',
        notdownloaded: 'core.download',
        outdated: 'core.refresh',
        downloading: 'core.downloading',
        loading: 'core.loading',
        ...(this.statusesTranslatable() || {}),
    }));

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
