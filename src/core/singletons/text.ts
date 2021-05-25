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

/**
 * Singleton with helper functions for text manipulation.
 */
export class CoreText {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Remove ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    static removeEndingSlash(text?: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) == '/') {
            return text.substr(0, text.length - 1);
        }

        return text;
    }

}
