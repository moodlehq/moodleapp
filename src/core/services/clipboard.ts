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
import { makeSingleton } from '@singletons';
import { CoreToasts } from './overlays/toasts';
import { Clipboard } from '@capacitor/clipboard';

/**
 * Service to handle clipboard operations.
 */
@Injectable({ providedIn: 'root' })
export class CoreClipboardService {

    /**
     * Copies a text to clipboard and shows a toast message.
     *
     * @param text Text to be copied
     */
    async copy(text: string): Promise<void> {
        await Clipboard.write({ string: text }); // eslint-disable-line id-denylist

        // Show toast using ionicLoading.
        CoreToasts.show({
            message: 'core.copiedtoclipboard',
            translateMessage: true,
        });
    }

    /**
     * Read a value from the clipboard (the "paste" action)
     *
     * @returns The result containing the text from the clipboard.
     */
    async paste(): Promise<string> {
        const result = await Clipboard.read();

        return result.value;
    }

}

export const CoreClipboard = makeSingleton(CoreClipboardService);
