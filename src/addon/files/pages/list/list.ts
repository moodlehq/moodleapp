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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonFilesProvider, AddonFilesFile, AddonFilesGetUserPrivateFilesInfoResult } from '../../providers/files';
import { AddonFilesHelperProvider } from '../../providers/helper';

/**
 * Page that displays the list of files.
 */
@IonicPage({ segment: 'addon-files-list' })
@Component({
    selector: 'page-addon-files-list',
    templateUrl: 'list.html',
})
export class AddonFilesListPage implements OnDestroy {

    title: string; // Page title.
    showPrivateFiles: boolean; // Whether the user can view private files.
    showSiteFiles: boolean; // Whether the user can view site files.
    showUpload: boolean; // Whether the user can upload files.
    root: string; // The root of the files loaded: 'my' or 'site'.
    path: string; // The path of the directory being loaded. If empty path it means the root is being loaded.
    userQuota: number; // The user quota (in bytes).
    filesInfo: AddonFilesGetUserPrivateFilesInfoResult; // Info about private files (size, number of files, etc.).
    spaceUsed: string; // Space used in a readable format.
    userQuotaReadable: string; // User quota in a readable format.
    files: AddonFilesFile[]; // List of files.
    component: string; // Component to link the file downloads to.
    filesLoaded: boolean; // Whether the files are loaded.

    protected updateSiteObserver;

    constructor(navParams: NavParams, eventsProvider: CoreEventsProvider, private sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService, private appProvider: CoreAppProvider,
            private filesProvider: AddonFilesProvider, private filesHelper: AddonFilesHelperProvider,
            private textUtils: CoreTextUtilsProvider) {
        this.title = navParams.get('title') || this.translate.instant('addon.files.files');
        this.root = navParams.get('root');
        this.path = navParams.get('path');

        // Update visibility if current site info is updated.
        this.updateSiteObserver = eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.setVisibility();
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.setVisibility();
        this.userQuota = this.sitesProvider.getCurrentSite().getInfo().userquota;

        if (!this.root) {
            // Load private files by default.
            if (this.showPrivateFiles) {
                this.root = 'my';
            } else if (this.showSiteFiles) {
                this.root = 'site';
            }
        }

        if (this.root) {
            this.rootChanged();
        } else {
            this.filesLoaded = true;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.refreshFiles().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Function called when the root has changed.
     */
    rootChanged(): void {
        this.filesLoaded = false;
        this.component = this.root == 'my' ? AddonFilesProvider.PRIVATE_FILES_COMPONENT : AddonFilesProvider.SITE_FILES_COMPONENT;

        this.fetchFiles().finally(() => {
            this.filesLoaded = true;
        });
    }

    /**
     * Upload a new file.
     */
    uploadFile(): void {
        this.filesProvider.versionCanUploadFiles().then((canUpload) => {
            if (!canUpload) {
                this.domUtils.showAlertTranslated('core.notice', 'addon.files.erroruploadnotworking');
            } else if (!this.appProvider.isOnline()) {
                this.domUtils.showErrorModal('core.fileuploader.errormustbeonlinetoupload', true);
            } else {
                this.filesHelper.uploadPrivateFile(this.filesInfo).then(() => {
                    // File uploaded, refresh the list.
                    this.filesLoaded = false;
                    this.refreshFiles().finally(() => {
                        this.filesLoaded = true;
                    });
                }).catch(() => {
                    // Ignore errors, they're handled inside the function.
                });
            }
        });
    }

    /**
     * Set visibility of some items based on site data.
     */
    protected setVisibility(): void {
        this.showPrivateFiles = this.filesProvider.canViewPrivateFiles();
        this.showSiteFiles = this.filesProvider.canViewSiteFiles();
        this.showUpload = this.filesProvider.canUploadFiles();
    }

    /**
     * Fetch the files.
     *
     * @return Promise resolved when done.
     */
    protected fetchFiles(): Promise<any> {
        let promise: Promise<AddonFilesFile[]>;

        if (!this.path) {
            // The path is unknown, the user must be requesting a root.
            if (this.root == 'site') {
                this.title = this.translate.instant('addon.files.sitefiles');
                promise = this.filesProvider.getSiteFiles();
            } else if (this.root == 'my') {
                this.title = this.translate.instant('addon.files.files');

                promise = this.filesProvider.getPrivateFiles().then((files) => {
                    if (this.showUpload && this.filesProvider.canGetPrivateFilesInfo() && this.userQuota > 0) {
                        // Get the info to calculate the available size.
                        return this.filesProvider.getPrivateFilesInfo().then((info) => {
                            this.filesInfo = info;
                            this.spaceUsed = this.textUtils.bytesToSize(info.filesizewithoutreferences, 1);
                            this.userQuotaReadable = this.textUtils.bytesToSize(this.userQuota, 1);

                            return files;
                        });
                    } else {
                        // User quota isn't useful, delete it.
                        delete this.userQuota;
                    }

                    return files;
                });
            } else {
                // Unknown root.
                promise = Promise.reject(null);
            }
        } else {
            // Path is set, serve the files the user requested.
            promise = this.filesProvider.getFiles(this.path);
        }

        return promise.then((files) => {
            this.files = files;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.files.couldnotloadfiles', true);
        });
    }

    /**
     * Refresh the displayed files.
     *
     * @return Promise resolved when done.
     */
    protected refreshFiles(): Promise<any> {
        const promises = [];

        promises.push(this.filesProvider.invalidateDirectory(this.root, this.path));
        promises.push(this.filesProvider.invalidatePrivateFilesInfoForUser());

        return Promise.all(promises).finally(() => {
            return this.fetchFiles();
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
