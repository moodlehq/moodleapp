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

import { Clipboard } from '@singletons';
import { CoreToasts } from '@services/toasts';

/**
 * Singleton with helper functions for text manipulation.
 */
export class CoreText {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Add starting slash to a string if needed.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static addStartingSlash(text = ''): string {
        if (text[0] === '/') {
            return text;
        }

        return '/' + text;
    }

    /**
     * Remove ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static removeEndingSlash(text?: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) == '/') {
            return text.substring(0, text.length - 1);
        }

        return text;
    }

    /**
     * Remove starting slash from a string if needed.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static removeStartingSlash(text = ''): string {
        if (text[0] !== '/') {
            return text;
        }

        return text.substring(1);
    }

    /**
     * Copies a text to clipboard and shows a toast message.
     *
     * @param text Text to be copied
     */
    static async copyToClipboard(text: string): Promise<void> {
        try {
            await Clipboard.copy(text);
        } catch {
            // Use HTML Copy command.
            const virtualInput = document.createElement('textarea');
            virtualInput.innerHTML = text;
            virtualInput.select();
            virtualInput.setSelectionRange(0, 99999);
            document.execCommand('copy'); // eslint-disable-line deprecation/deprecation
        }

        // Show toast using ionicLoading.
        CoreToasts.show({
                message: 'core.copiedtoclipboard',
                translateMessage: true,
        });
    }

}
