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
import { CoreNativeFilePicker } from '@services/native/file-picker';

/**
 * Chooser plugin wrapper.
 *
 * @deprecated since 6.0. Use CoreFileUploaderHelper.chooseAndUploadFile instead.
 */
@Injectable({ providedIn: 'root' })
export class Chooser {

    /**
     * Displays native prompt for user to select a file.
     *
     * @param accept Optional MIME type filter (e.g. 'image/gif,video/*').
     * @returns Selected file's raw binary data, base64-encoded data: URI, MIME type, display name, and original URI.
     * If user cancels, promise will be resolved as undefined.
     * If error occurs, promise will be rejected.
     * @deprecated since 6.0. Use CoreFileUploaderHelper.chooseAndUploadFile() instead.
     */
    async getFile(accept?: string): Promise<undefined|{
        data: Uint8Array;
        dataURI: string;
        mediaType: string;
        name: string;
        uri: string;
    }> {
        const file = await CoreNativeFilePicker.pickFile(
            accept ? accept.split(',').map(type => type.trim()) : undefined,
            true,
        );

        if (!file) {
            return undefined;
        }

        return {
            data: this.decodeBase64(file.data),
            dataURI: file.data ? `data:${file.mimeType ?? ''};base64,${file.data}` : '',
            mediaType: file.mimeType ?? '',
            name: file.name,
            uri: file.path ?? file.webPath ?? '',
        };
    }

    /**
     * Converts base64-encoded data to binary data.
     *
     * @param data Base64-encoded data.
     * @returns Decoded binary data.
     */
    protected decodeBase64(data?: string): Uint8Array {
        if (!data) {
            return new Uint8Array(0);
        }

        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
    }

    /**
     * Displays native prompt for user to select a file.
     *
     * @param accept Optional MIME type filter (e.g. 'image/gif,video/*').
     * @returns Selected file's MIME type, display name, and original URI.
     * If user cancels, promise will be resolved as undefined.
     * If error occurs, promise will be rejected.
     * @deprecated since 6.0. Use CoreFileUploaderHelper.chooseAndUploadFile() instead.
     */
    async getFileMetadata(accept?: string): Promise<undefined | {
        mediaType: string;
        name: string;
        uri: string;
    }> {
        const file = await CoreNativeFilePicker.pickFile(
            accept ? [accept] : undefined,
            false,
        );

        if (!file) {
            return undefined;
        }

        return {
            mediaType: file.mimeType ?? '',
            name: file.name,
            uri: file.path ?? file.webPath ?? '',
        };
    }

}
