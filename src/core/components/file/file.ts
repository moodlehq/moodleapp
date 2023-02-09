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

import { Component, Input, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { CoreNetwork } from '@services/network';
import { CoreFilepool } from '@services/filepool';
import { CoreFileHelper } from '@services/file-helper';
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils, CoreUtilsOpenFileOptions, OpenFileAction } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreConstants } from '@/core/constants';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreWSFile } from '@services/ws';
import { CorePlatform } from '@services/platform';

/**
 * Component to handle a remote file. Shows the file name, icon (depending on mimetype) and a button
 * to download/refresh it.
 */
@Component({
    selector: 'core-file',
    templateUrl: 'core-file.html',
})
export class CoreFileComponent implements OnInit, OnDestroy {

    @Input() file?: CoreWSFile; // The file.
    @Input() component?: string; // Component the file belongs to.
    @Input() componentId?: string | number; // Component ID.
    @Input() canDelete?: boolean | string; // Whether file can be deleted.
    @Input() alwaysDownload?: boolean | string; // Whether it should always display the refresh button when the file is downloaded.
    @Input() canDownload?: boolean | string = true; // Whether file can be downloaded.
    @Input() showSize?: boolean | string = true; // Whether show filesize.
    @Input() showTime?: boolean | string = true; // Whether show file time modified.
    @Output() onDelete: EventEmitter<void>; // Will notify when the delete button is clicked.

    isDownloading?: boolean;
    isDownloaded?: boolean;
    fileIcon?: string;
    fileName!: string;
    fileSizeReadable?: string;
    state?: string;
    timemodified!: number;
    isIOS = false;
    openButtonIcon = '';
    openButtonLabel = '';

    protected fileUrl!: string;
    protected siteId?: string;
    protected fileSize?: number;
    protected observer?: CoreEventObserver;
    protected defaultIsOpenWithPicker = false;

    constructor() {
        this.onDelete = new EventEmitter<void>();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.file) {
            return;
        }

        this.canDelete = CoreUtils.isTrueOrOne(this.canDelete);
        this.alwaysDownload = CoreUtils.isTrueOrOne(this.alwaysDownload);
        this.canDownload = CoreUtils.isTrueOrOne(this.canDownload);

        this.fileUrl = CoreFileHelper.getFileUrl(this.file);
        this.timemodified = this.file.timemodified || 0;
        this.siteId = CoreSites.getCurrentSiteId();
        this.fileSize = this.file.filesize;
        this.fileName = this.file.filename || '';

        this.isIOS = CorePlatform.isIOS();
        this.defaultIsOpenWithPicker = CoreFileHelper.defaultIsOpenWithPicker();
        this.openButtonIcon = this.defaultIsOpenWithPicker ? 'fas-file' : 'fas-share-square';
        this.openButtonLabel = this.defaultIsOpenWithPicker ? 'core.openfile' : 'core.openwith';

        if (CoreUtils.isTrueOrOne(this.showSize) && this.fileSize && this.fileSize >= 0) {
            this.fileSizeReadable = CoreTextUtils.bytesToSize(this.fileSize, 2);
        }

        this.showTime = CoreUtils.isTrueOrOne(this.showTime) && this.timemodified > 0;

        if ('isexternalfile' in this.file && this.file.isexternalfile) {
            this.alwaysDownload = true; // Always show the download button in external files.
        }

        this.fileIcon = 'mimetype' in this.file && this.file.mimetype ?
            CoreMimetypeUtils.getMimetypeIcon(this.file.mimetype) : CoreMimetypeUtils.getFileIcon(this.fileName);

        if (this.canDownload) {
            this.calculateState();

            try {
                // Update state when receiving events about this file.
                const eventName = await CoreFilepool.getFileEventNameByUrl(this.siteId, this.fileUrl);

                this.observer = CoreEvents.on(eventName, () => {
                    this.calculateState();
                });
            } catch (error) {
                // File not downloadable.
            }
        }
    }

    /**
     * Convenience function to get the file state and set variables based on it.
     *
     * @returns Promise resolved when state has been calculated.
     */
    protected async calculateState(): Promise<void> {
        if (!this.siteId) {
            return;
        }

        const state = await CoreFilepool.getFileStateByUrl(this.siteId, this.fileUrl, this.timemodified);

        const site = await CoreSites.getSite(this.siteId);

        this.canDownload = site.canDownloadFiles();

        this.state = state;
        this.isDownloading = this.canDownload && state === CoreConstants.DOWNLOADING;
        this.isDownloaded = this.canDownload && CoreFileHelper.isStateDownloaded(state);
    }

    /**
     * Convenience function to open a file, downloading it if needed.
     *
     * @param ev Click event (if any).
     * @param isOpenButton Whether the open button was clicked.
     * @returns Promise resolved when file is opened.
     */
    openFile(ev?: Event, isOpenButton = false): Promise<void> {
        ev?.preventDefault();
        ev?.stopPropagation();

        const options: CoreUtilsOpenFileOptions = {};
        if (isOpenButton) {
            // Use the non-default method.
            options.iOSOpenFileAction = this.defaultIsOpenWithPicker ? OpenFileAction.OPEN : OpenFileAction.OPEN_WITH;
        }

        return CoreFileHelper.downloadAndOpenFile(this.file!, this.component, this.componentId, this.state, (event) => {
            if (event && 'calculating' in event && event.calculating) {
                // The process is calculating some data required for the download, show the spinner.
                this.isDownloading = true;
            }
        }, undefined, options).catch((error) => {
            CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
        });
    }

    /**
     * Download a file and, optionally, open it afterwards.
     *
     * @param e Click event.
     * @param openAfterDownload Whether the file should be opened after download.
     */
    async download(e?: Event, openAfterDownload = false): Promise<void> {
        e && e.preventDefault();
        e && e.stopPropagation();

        if (!this.file || !this.siteId) {
            return;
        }

        if (this.isDownloading && !openAfterDownload) {
            return;
        }

        if (!this.canDownload || !this.state || this.state == CoreConstants.NOT_DOWNLOADABLE) {
            // File cannot be downloaded, just open it.
            if (CoreUrlUtils.isLocalFileUrl(this.fileUrl)) {
                CoreUtils.openFile(this.fileUrl);
            } else {
                CoreUtils.openOnlineFile(CoreUrlUtils.unfixPluginfileURL(this.fileUrl));
            }

            return;
        }

        if (!CoreNetwork.isOnline() && (!openAfterDownload || (openAfterDownload &&
                !CoreFileHelper.isStateDownloaded(this.state)))) {
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        if (openAfterDownload) {
            // File needs to be opened now.
            try {
                await this.openFile();
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        } else {
            try {
                // File doesn't need to be opened (it's a prefetch). Show confirm modal if file size is defined and it's big.
                const size = await CorePluginFileDelegate.getFileSize(this.file, this.siteId);

                if (size) {
                    await CoreDomUtils.confirmDownloadSize({ size: size, total: true });
                }

                // User confirmed, add the file to queue.
                // @todo Is the invalidate really needed?
                await CoreUtils.ignoreErrors(CoreFilepool.invalidateFileByUrl(this.siteId, this.fileUrl));

                this.isDownloading = true;

                try {
                    await CoreFilepool.addToQueueByUrl(
                        this.siteId,
                        this.fileUrl,
                        this.component,
                        this.componentId,
                        this.timemodified,
                        undefined,
                        undefined,
                        0,
                        this.file,
                    );
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
                    this.calculateState();
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        }
    }

    /**
     * Delete the file.
     *
     * @param e Click event.
     */
    delete(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        if (this.canDelete) {
            this.onDelete.emit();
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.observer?.off();
    }

}
