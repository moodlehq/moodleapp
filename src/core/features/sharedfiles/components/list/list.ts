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

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FileEntry, DirectoryEntry } from '@ionic-native/file/ngx';
import { Md5 } from 'ts-md5';

import { CoreSharedFiles } from '@features/sharedfiles/services/sharedfiles';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CorePath } from '@singletons/path';

/**
 * Component to display the list of shared files, either as a modal or inside a page.
 */
@Component({
    selector: 'core-shared-files-list',
    templateUrl: 'list.html',
})
export class CoreSharedFilesListComponent implements OnInit, OnDestroy {

    @Input() siteId?: string;
    @Input() mimetypes?: string[];
    @Input() isModal?: boolean; // Whether the component is loaded in a modal.
    @Input() manage?: boolean;
    @Input() pick?: boolean; // To pick a file you MUST use a modal.
    @Input() path?: string;
    @Input() showSitePicker?: boolean;
    @Output() onPathChanged = new EventEmitter<string>();
    @Output() onFilePicked = new EventEmitter<FileEntry>();

    filesLoaded = false;
    files: (FileEntry | DirectoryEntry)[] = [];

    protected shareObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.siteId = this.siteId || CoreSites.getCurrentSiteId();

        this.loadFiles();

        // Listen for new files shared with the app.
        this.shareObserver = CoreEvents.on(CoreEvents.FILE_SHARED, (data) => {
            if (data.siteId === this.siteId) {
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
     * @returns Promise resolved when done.
     */
    protected async loadFiles(): Promise<void> {
        this.files = await CoreSharedFiles.getSiteSharedFiles(this.siteId, this.path, this.mimetypes);
        this.filesLoaded = true;
    }

    /**
     * Refresh the list of files.
     *
     * @param refresher Refresher.
     */
    refreshFiles(refresher: HTMLIonRefresherElement): void {
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
    fileRenamed(index: number, data: { file: FileEntry }): void {
        this.files[index] = data.file;
    }

    /**
     * Open a subfolder.
     *
     * @param folder The folder to open.
     */
    openFolder(folder: DirectoryEntry): void {
        const path = CorePath.concatenatePaths(this.path || '', folder.name);

        if (this.isModal) {
            this.path = path;
            this.filesLoaded = false;
            this.loadFiles();
            this.onPathChanged.emit(path);

            return;
        }

        const hash = <string> Md5.hashAsciiStr(path);

        CoreNavigator.navigate(`../${hash}`, {
            params: {
                path,
                manage: this.manage,
                pick: this.pick,
                siteId: this.siteId,
                mimetypes: this.mimetypes,
                isModal: false,
            },
        });
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
        this.onPathChanged.emit('');
    }

    /**
     * A file was picked.
     *
     * @param file Picked file.
     */
    filePicked(file: FileEntry): void {
        this.onFilePicked.emit(file);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.shareObserver?.off();
    }

}
