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

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { AddonPrivateFiles, AddonPrivateFilesGetUserInfoWSResult } from './privatefiles';
import { CoreError } from '@classes/errors/error';
import { makeSingleton, Translate } from '@singletons';

/**
 * Service that provides some helper functions regarding private and site files.
 */
@Injectable({ providedIn: 'root' })
export class AddonPrivateFilesHelperProvider {

    /**
     * Select a file, upload it and move it to private files.
     *
     * @param info Private files info. See AddonPrivateFilesProvider.getPrivateFilesInfo.
     * @return Promise resolved when a file is uploaded, rejected otherwise.
     */
    async uploadPrivateFile(info?: AddonPrivateFilesGetUserInfoWSResult): Promise<void> {
        // Calculate the max size.
        const currentSite = CoreSites.getCurrentSite();
        let maxSize = currentSite?.getInfo()?.usermaxuploadfilesize || -1;
        let userQuota = currentSite?.getInfo()?.userquota;

        if (userQuota === 0) {
            // 0 means ignore user quota. In the app it is -1.
            userQuota = -1;
        } else if (userQuota !== undefined && userQuota > 0 && info !== undefined) {
            userQuota = userQuota - info.filesizewithoutreferences;
        }

        if (userQuota !== undefined) {
            // Use the minimum value.
            maxSize = Math.min(maxSize, userQuota);
        }

        // Select and upload the file.
        const result = await CoreFileUploaderHelper.selectAndUploadFile(maxSize);

        if (!result) {
            throw new CoreError(Translate.instant('core.fileuploader.errorwhileuploading'));
        }

        // File uploaded. Move it to private files.
        const modal = await CoreDomUtils.showModalLoading('core.fileuploader.uploading', true);

        try {
            await AddonPrivateFiles.moveFromDraftToPrivate(result.itemid);

            CoreDomUtils.showToast('core.fileuploader.fileuploaded', true, undefined, 'core-toast-success');
        } finally {
            modal.dismiss();
        }
    }

}

export const AddonPrivateFilesHelper = makeSingleton(AddonPrivateFilesHelperProvider);
