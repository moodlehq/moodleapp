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

/**
 * Chooser plugin wrapper.
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
     */
    getFile(accept?: string): Promise<IChooserResult | undefined> {
        return window.chooser.getFile(accept);
    }

    /**
     * Displays native prompt for user to select a file.
     *
     * @param accept Optional MIME type filter (e.g. 'image/gif,video/*').
     * @returns Selected file's MIME type, display name, and original URI.
     * If user cancels, promise will be resolved as undefined.
     * If error occurs, promise will be rejected.
     */
    getFileMetadata(accept?: string): Promise<IChooserResult | undefined> {
        return window.chooser.getFileMetadata(accept);
    }

}
