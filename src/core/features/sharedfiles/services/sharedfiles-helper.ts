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

import { Injectable } from '@angular/core';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreFileUploaderHandlerResult } from '@features/fileuploader/services/fileuploader-delegate';
import { CoreFile } from '@services/file';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { AlertController, ApplicationInit, makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSharedFiles } from './sharedfiles';
import { SHAREDFILES_PAGE_NAME } from '../constants';
import { CoreSharedFilesChooseSitePage } from '../pages/choose-site/choose-site';
import { CoreError } from '@classes/errors/error';
import { CorePlatform } from '@services/platform';
import { CoreModals } from '@services/overlays/modals';

/**
 * Helper service to share files with the app.
 */
@Injectable({ providedIn: 'root' })
export class CoreSharedFilesHelperProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreSharedFilesHelperProvider');
    }

    /**
     * Initialize.
     */
    initialize(): void {
        if (!CorePlatform.isIOS()) {
            return;
        }

        let lastCheck = Date.now();

        // Check if there are new files at app start and when the app is resumed.
        this.searchIOSNewSharedFiles();

        CorePlatform.resume.subscribe(() => {
            // Wait a bit to make sure that APP_LAUNCHED_URL is treated before this callback.
            setTimeout(() => {
                if (Date.now() - lastCheck < 1000) {
                    // Last check less than 1s ago, don't do anything.
                    return;
                }

                lastCheck = Date.now();
                this.searchIOSNewSharedFiles();
            }, 200);
        });

        CoreEvents.on(CoreEvents.APP_LAUNCHED_URL, (data) => {
            if (data.url.indexOf('file://') === 0) {
                // We received a file in iOS, it's probably a shared file. Treat it.
                lastCheck = Date.now();
                this.searchIOSNewSharedFiles(data.url);
            }
        });
    }

    /**
     * Ask a user if he wants to replace a file (using originalName) or rename it (using newName).
     *
     * @param originalName Original name.
     * @param newName New name.
     * @returns Promise resolved with the name to use when the user chooses. Rejected if user cancels.
     */
    async askRenameReplace(originalName: string, newName: string): Promise<string> {
        const alert = await AlertController.create({
            header: Translate.instant('core.sharedfiles.sharedfiles'),
            message: Translate.instant('core.sharedfiles.chooseactionrepeatedfile', { $a: newName }),
            buttons: [
                {
                    text: Translate.instant('core.sharedfiles.rename'),
                    role: 'rename',
                },
                {
                    text: Translate.instant('core.sharedfiles.replace'),
                    role: 'replace',
                },
            ],
        });

        await alert.present();

        const result = await alert.onDidDismiss();

        if (result.role === 'rename') {
            return newName;
        } else if (result.role === 'replace') {
            return originalName;
        } else {
            // Canceled.
            throw new CoreCanceledError();
        }
    }

    /**
     * Go to the choose site view.
     *
     * @param filePath File path to send to the view.
     * @param isInbox Whether the file is in the Inbox folder.
     */
    goToChooseSite(filePath: string, isInbox?: boolean): void {
        if (CoreSites.isLoggedIn()) {
            CoreNavigator.navigateToSitePath(`/${SHAREDFILES_PAGE_NAME}/choosesite`, {
                params: { filePath, isInbox },
            });
        } else {
            CoreNavigator.navigate(`/${SHAREDFILES_PAGE_NAME}/choosesite`, {
                params: { filePath, isInbox },
            });
        }
    }

    /**
     * Whether the user is already choosing a site to store a shared file.
     *
     * @returns Whether the user is already choosing a site to store a shared file.
     */
    protected isChoosingSite(): boolean {
        return CoreNavigator.getCurrentRoute({ pageComponent: CoreSharedFilesChooseSitePage }) !== null;
    }

    /**
     * Open the view to select a shared file.
     *
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved when a file is picked, rejected if file picker is closed without selecting a file.
     */
    async pickSharedFile(mimetypes?: string[]): Promise<CoreFileUploaderHandlerResult> {
        const { CoreSharedFilesListModalComponent } =
            await import('@features/sharedfiles/components/list-modal/list-modal');

        const file = await CoreModals.openModal<FileEntry>({
            component: CoreSharedFilesListModalComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: { mimetypes, pick: true },
        });

        if (!file) {
            // User cancelled.
            throw new CoreCanceledError();
        }

        const error = CoreFileUploader.isInvalidMimetype(mimetypes, file.fullPath);
        if (error) {
            throw new CoreError(error);
        }

        return {
            path: file.fullPath,
            treated: false,
        };
    }

    /**
     * Delete a shared file.
     *
     * @param fileEntry The file entry to delete.
     * @param isInbox Whether the file is in the Inbox folder.
     * @returns Promise resolved when done.
     */
    protected removeSharedFile(fileEntry: FileEntry, isInbox?: boolean): Promise<void> {
        if (isInbox) {
            return CoreSharedFiles.deleteInboxFile(fileEntry);
        } else {
            return CoreFile.removeFileByFileEntry(fileEntry);
        }
    }

    /**
     * Checks if there is a new file received in iOS and move it to the shared folder of current site.
     * If more than one site is found, the user will have to choose the site where to store it in.
     * If more than one file is found, treat only the first one.
     *
     * @param path Path to a file received when launching the app.
     * @returns Promise resolved when done.
     */
    async searchIOSNewSharedFiles(path?: string): Promise<void> {
        try {
            await ApplicationInit.donePromise;

            if (this.isChoosingSite()) {
                // We're already treating a shared file. Abort.
                return;
            }

            let fileEntry: FileEntry | undefined;
            if (path) {
                // The app was launched with the path to the file, get the file.
                fileEntry = await CoreFile.getExternalFile(path);
            } else {
                // No path received, search if there is any file in the Inbox folder.
                fileEntry = await CoreSharedFiles.checkIOSNewFiles();
            }

            if (!fileEntry) {
                return;
            }

            const siteIds = await CoreSites.getSitesIds();

            if (!siteIds.length) {
                // No sites stored, show error and delete the file.
                CoreDomUtils.showErrorModal('core.sharedfiles.errorreceivefilenosites', true);

                return this.removeSharedFile(fileEntry, !path);
            } else if (siteIds.length == 1) {
                return this.storeSharedFileInSite(fileEntry, siteIds[0], !path);
            } else if (!this.isChoosingSite()) {
                this.goToChooseSite(CoreFile.getFileEntryURL(fileEntry), !path);
            }
        } catch (error) {
            if (error) {
                this.logger.error('Error searching iOS new shared files', error, path);
            }
        }
    }

    /**
     * Store a shared file in a site's shared files folder.
     *
     * @param fileEntry Shared file entry.
     * @param siteId Site ID. If not defined, current site.
     * @param isInbox Whether the file is in the Inbox folder.
     * @returns Promise resolved when done.
     */
    async storeSharedFileInSite(fileEntry: FileEntry, siteId?: string, isInbox?: boolean): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // First of all check if there's already a file with the same name in the shared files folder.
        const sharedFilesDirPath = CoreSharedFiles.getSiteSharedFilesDirPath(siteId);

        let newName = await CoreFile.getUniqueNameInFolder(sharedFilesDirPath, fileEntry.name);

        if (newName.toLowerCase() != fileEntry.name.toLowerCase()) {
            // Repeated name. Ask the user what he wants to do.
            newName = await this.askRenameReplace(fileEntry.name, newName);
        }

        try {
            await CoreSharedFiles.storeFileInSite(fileEntry, newName, siteId);
        } catch (error) {
            CoreDomUtils.showErrorModal(error || 'Error moving file.');
        } finally {
            this.removeSharedFile(fileEntry, isInbox);
            CoreDomUtils.showAlertTranslated('core.success', 'core.sharedfiles.successstorefile');
        }
    }

}

export const CoreSharedFilesHelper = makeSingleton(CoreSharedFilesHelperProvider);
