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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonRefresher } from '@ionic/angular';
import { Md5 } from 'ts-md5/dist/md5';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonPrivateFiles,
    AddonPrivateFilesProvider,
    AddonPrivateFilesFile,
    AddonPrivateFilesGetUserInfoWSResult,
    AddonPrivateFilesGetFilesWSParams,
} from '@/addons/privatefiles/services/privatefiles';
import { AddonPrivateFilesHelper } from '@/addons/privatefiles/services/privatefiles-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the list of files.
 */
@Component({
    selector: 'page-addon-privatefiles-index',
    templateUrl: 'index.html',
})
export class AddonPrivateFilesIndexPage implements OnInit, OnDestroy {

    title!: string; // Page title.
    root?: 'my' | 'site'; // The root of the files loaded: 'my' or 'site'.
    path?: AddonPrivateFilesGetFilesWSParams; // The path of the directory being loaded. If empty path it means load the root.
    showPrivateFiles!: boolean; // Whether the user can view private files.
    showSiteFiles!: boolean; // Whether the user can view site files.
    showUpload!: boolean; // Whether the user can upload files.
    userQuota?: number; // The user quota (in bytes).
    filesInfo?: AddonPrivateFilesGetUserInfoWSResult; // Info about private files (size, number of files, etc.).
    spaceUsed?: string; // Space used in a readable format.
    userQuotaReadable?: string; // User quota in a readable format.
    files?: AddonPrivateFilesFile[]; // List of files.
    component!: string; // Component to link the file downloads to.
    filesLoaded = false; // Whether the files are loaded.

    protected updateSiteObserver: CoreEventObserver;

    constructor(
        protected route: ActivatedRoute,
    ) {
        // Update visibility if current site info is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.setVisibility();
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.root = this.route.snapshot.queryParams['root'];

        if (this.route.snapshot.queryParams['contextid']) {
            // Loading a certain folder.
            this.path = {
                contextid: this.route.snapshot.queryParams['contextid'],
                component: this.route.snapshot.queryParams['component'],
                filearea: this.route.snapshot.queryParams['filearea'],
                itemid: this.route.snapshot.queryParams['itemid'],
                filepath: this.route.snapshot.queryParams['filepath'],
                filename: this.route.snapshot.queryParams['filename'],
            };
        }

        this.title = this.path?.filename || Translate.instance.instant('addon.privatefiles.files');

        this.setVisibility();
        this.userQuota = CoreSites.instance.getCurrentSite()?.getInfo()?.userquota;

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
     * Set visibility of some items based on site data.
     */
    protected setVisibility(): void {
        this.showPrivateFiles = AddonPrivateFiles.instance.canViewPrivateFiles();
        this.showSiteFiles = AddonPrivateFiles.instance.canViewSiteFiles();
        this.showUpload = AddonPrivateFiles.instance.canUploadFiles();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(event?: CustomEvent<IonRefresher>): void {
        this.refreshFiles().finally(() => {
            event?.detail.complete();
        });
    }

    /**
     * Function called when the root has changed.
     */
    rootChanged(): void {
        this.filesLoaded = false;
        this.component = this.root == 'my' ? AddonPrivateFilesProvider.PRIVATE_FILES_COMPONENT :
            AddonPrivateFilesProvider.SITE_FILES_COMPONENT;

        this.fetchFiles().finally(() => {
            this.filesLoaded = true;
        });
    }

    /**
     * Upload a new file.
     */
    async uploadFile(): Promise<void> {
        const canUpload = await AddonPrivateFiles.instance.versionCanUploadFiles();

        if (!canUpload) {
            CoreDomUtils.instance.showAlertTranslated('core.notice', 'addon.privatefiles.erroruploadnotworking');

            return;
        }

        if (!CoreApp.instance.isOnline()) {
            CoreDomUtils.instance.showErrorModal('core.fileuploader.errormustbeonlinetoupload', true);

            return;
        }

        try {
            await AddonPrivateFilesHelper.instance.uploadPrivateFile(this.filesInfo);

            // File uploaded, refresh the list.
            this.filesLoaded = false;

            await CoreUtils.instance.ignoreErrors(this.refreshFiles());

            this.filesLoaded = true;
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.fileuploader.errorwhileuploading', true);
        }
    }

    /**
     * Fetch the files.
     *
     * @return Promise resolved when done.
     */
    protected async fetchFiles(): Promise<void> {
        try {
            if (this.path) {
                // Path is set, serve the files the user requested.
                this.files = await AddonPrivateFiles.instance.getFiles(this.path);

                return;
            }

            // The path is unknown, the user must be requesting a root.
            if (this.root == 'site') {
                this.title = Translate.instance.instant('addon.privatefiles.sitefiles');

                this.files = await AddonPrivateFiles.instance.getSiteFiles();
            } else if (this.root == 'my') {
                this.title = Translate.instance.instant('addon.privatefiles.files');

                this.files = await AddonPrivateFiles.instance.getPrivateFiles();

                if (this.showUpload && AddonPrivateFiles.instance.canGetPrivateFilesInfo() && this.userQuota &&
                    this.userQuota > 0) {
                    // Get the info to calculate the available size.
                    this.filesInfo = await AddonPrivateFiles.instance.getPrivateFilesInfo();

                    this.spaceUsed = CoreTextUtils.instance.bytesToSize(this.filesInfo.filesizewithoutreferences, 1);
                    this.userQuotaReadable = CoreTextUtils.instance.bytesToSize(this.userQuota, 1);
                } else {
                    // User quota isn't useful, delete it.
                    delete this.userQuota;
                }
            } else {
                // Unknown root.
                CoreDomUtils.instance.showErrorModal('addon.privatefiles.couldnotloadfiles', true);
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.privatefiles.couldnotloadfiles', true);
        }
    }

    /**
     * Refresh the displayed files.
     *
     * @return Promise resolved when done.
     */
    protected async refreshFiles(): Promise<void> {
        try {
            await Promise.all([
                AddonPrivateFiles.instance.invalidateDirectory(this.root, this.path),
                AddonPrivateFiles.instance.invalidatePrivateFilesInfoForUser(),
            ]);
        } finally {
            await this.fetchFiles();
        }
    }

    /**
     * Open a folder.
     *
     * @param folder Folder to open.
     */
    openFolder(folder: AddonPrivateFilesFile): void {
        const params = {
            contextid: folder.contextid,
            component: folder.component || '',
            filearea: folder.filearea || '',
            itemid: folder.itemid || 0,
            filepath: folder.filepath || '',
            filename: folder.filename || '',
        };

        if (folder.component) {
            // Delete unused elements that may break the request.
            params.filename = '';
        }

        const hash = <string> Md5.hashAsciiStr(JSON.stringify(params));

        CoreNavigator.instance.navigate(`../${hash}`, { params });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }

}
