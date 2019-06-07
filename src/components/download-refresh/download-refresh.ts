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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CoreConstants } from '@core/constants';

/**
 * Component to show a download button with refresh option, the spinner and the status of it.
 *
 * Usage:
 * <core-download-refresh [status]="status" enabled="true" canCheckUpdates="true" action="download()"></core-download-refresh>
 */
@Component({
    selector: 'core-download-refresh',
    templateUrl: 'core-download-refresh.html'
})
export class CoreDownloadRefreshComponent {
    @Input() status: string; // Download status.
    @Input() enabled = false; // Whether the download is enabled.
    @Input() loading = true; // Force loading status when is not downloading.
    @Input() canTrustDownload = false; // If false, refresh will be shown if downloaded.
    @Output() action: EventEmitter<boolean>; // Will emit an event when the item clicked.

    statusDownloaded = CoreConstants.DOWNLOADED;
    statusNotDownloaded = CoreConstants.NOT_DOWNLOADED;
    statusOutdated = CoreConstants.OUTDATED;
    statusDownloading = CoreConstants.DOWNLOADING;

    constructor() {
        this.action = new EventEmitter();
    }

    /**
     * Download clicked.
     *
     * @param {Event} e Click event.
     * @param {boolean} refresh Whether it's refreshing.
     */
    download(e: Event, refresh: boolean): void {
        e.preventDefault();
        e.stopPropagation();
        this.action.emit(refresh);
    }
}
