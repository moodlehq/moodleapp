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
     * Add starting slash to a string if needed.
     *
     * @param text Text to treat.
     * @return Treated text.
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
     * @return Treated text.
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
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param leftPath Left path.
     * @param rightPath Right path.
     * @return Concatenated path.
     */
    static concatenatePaths(leftPath: string, rightPath: string): string {
        if (!leftPath) {
            return rightPath;
        } else if (!rightPath) {
            return leftPath;
        }

        const lastCharLeft = leftPath.slice(-1);
        const firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substring(1);
        } else if (lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    }

}
