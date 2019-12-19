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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicPage, ViewController, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreSharedFilesProvider } from '../../providers/sharedfiles';

/**
 * Modal to display the list of shared files.
 */
@IonicPage({ segment: 'core-shared-files-list' })
@Component({
    selector: 'page-core-shared-files-list',
    templateUrl: 'list.html',
})
export class CoreSharedFilesListPage implements OnInit, OnDestroy {

    siteId: string;
    isModal: boolean;
    manage: boolean;
    pick: boolean; // To pick a file you MUST use a modal.
    path = '';
    title: string;
    filesLoaded: boolean;
    files: any[];

    protected mimetypes: string[];
    protected shareObserver;

    constructor(private viewCtrl: ViewController, navParams: NavParams, private sharedFilesProvider: CoreSharedFilesProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider, private translate: TranslateService,
            private fileProvider: CoreFileProvider, private eventsProvider: CoreEventsProvider, private navCtrl: NavController) {
        this.siteId = navParams.get('siteId') || this.sitesProvider.getCurrentSiteId();
        this.mimetypes = navParams.get('mimetypes');
        this.isModal = !!navParams.get('isModal');
        this.manage = !!navParams.get('manage');
        this.pick = !!navParams.get('pick');
        this.path = navParams.get('path') || '';
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loadFiles();

        // Listen for new files shared with the app.
        this.shareObserver = this.eventsProvider.on(CoreEventsProvider.FILE_SHARED, (data) => {
            if (data.siteId == this.siteId) {
                // File was stored in current site, refresh the list.
                this.filesLoaded = false;
                this.loadFiles().finally(() => {
                    this.filesLoaded = true;
                });
            }
        });
    }

    /**
     * Load the files.
     *
     * @return Promise resolved when done.
     */
    protected loadFiles(): Promise<any> {
        if (this.path) {
            this.title = this.fileProvider.getFileAndDirectoryFromPath(this.path).name;
        } else {
            this.title = this.translate.instant('core.sharedfiles.sharedfiles');
        }

        return this.sharedFilesProvider.getSiteSharedFiles(this.siteId, this.path, this.mimetypes).then((files) => {
            this.files = files;
            this.filesLoaded = true;
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Refresh the list of files.
     *
     * @param refresher Refresher.
     */
    refreshFiles(refresher: any): void {
        this.loadFiles().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Called when a file is deleted. Remove the file from the list.
     *
     * @param index Position of the file.
     */
    fileDeleted(index: number): void {
        this.files.splice(index, 1);
    }

    /**
     * Called when a file is renamed. Update the list.
     *
     * @param index Position of the file.
     * @param data Data containing the new FileEntry.
     */
    fileRenamed(index: number, data: any): void {
        this.files[index] = data.file;
    }

    /**
     * Open a subfolder.
     *
     * @param folder The folder to open.
     */
    openFolder(folder: any): void {
        const path = this.textUtils.concatenatePaths(this.path, folder.name);
        if (this.isModal) {
            // In Modal we don't want to open a new page because we cannot dismiss the modal from the new page.
            this.path = path;
            this.filesLoaded = false;
            this.loadFiles();
        } else {
            this.navCtrl.push('CoreSharedFilesListPage', {
                path: path,
                manage: this.manage,
                pick: this.pick,
                siteId: this.siteId,
                mimetypes: this.mimetypes,
                isModal: this.isModal
            });
        }
    }

    /**
     * Change site loaded.
     *
     * @param id Site to load.
     */
    changeSite(id: string): void {
        this.siteId = id;
        this.path = '';
        this.filesLoaded = false;
        this.loadFiles();
    }

    /**
     * A file was picked.
     *
     * @param file Picked file.
     */
    filePicked(file: any): void {
        this.viewCtrl.dismiss(file);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        if (this.shareObserver) {
            this.shareObserver.off();
        }
    }
}
