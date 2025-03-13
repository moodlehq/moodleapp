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

import { CoreText } from './text';

/**
 * Singleton with helper functions for paths.
 */
export class CorePath {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Calculate a relative path from a folder to another folder.
     *
     * E.g. if initial folder is foo/bar, and final folder is foo/baz/xyz, it will return ../bar/xyz.
     *
     * @param initialFolder The initial folder path.
     * @param finalFolder The final folder. The "root" should be the same as initialFolder.
     * @returns Relative path.
     */
    static calculateRelativePath(initialFolder: string, finalFolder: string): string {
        initialFolder = CoreText.removeStartingSlash(CoreText.removeEndingSlash(initialFolder));
        finalFolder = CoreText.removeStartingSlash(CoreText.removeEndingSlash(finalFolder));

        if (initialFolder === finalFolder) {
            return '';
        }

        const initialFolderSplit = initialFolder === '' ? [] : initialFolder.split('/');
        const finalFolderSplit = finalFolder === '' ? [] : finalFolder.split('/');

        let firstDiffIndex = initialFolderSplit.length > 0 && finalFolderSplit.length > 0 ?
            initialFolderSplit.findIndex((value, index) => value !== finalFolderSplit[index]) :
            0;

        if (firstDiffIndex === -1) {
            // All elements in initial folder are equal. The first diff is the first element in the final folder.
            firstDiffIndex = initialFolderSplit.length;
        }

        const newPathToFinalFolder = finalFolderSplit.slice(firstDiffIndex).join('/');

        return '../'.repeat(initialFolderSplit.length - firstDiffIndex) + newPathToFinalFolder;
    }

    /**
     * Convert a relative path (based on a certain folder) to a relative path based on a different folder.
     *
     * E.g. if current folder is foo/bar, relative URL is test.jpg and new folder is foo/baz,
     * it will return ../bar/test.jpg.
     *
     * @param currentFolder The current folder path.
     * @param path The relative path.
     * @param newFolder The folder to use to calculate the new relative path. The "root" should be the same as currentFolder.
     * @returns Relative path.
     */
    static changeRelativePath(currentFolder: string, path: string, newFolder: string): string {
        return CorePath.concatenatePaths(CorePath.calculateRelativePath(newFolder, currentFolder), path);
    }

    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param leftPath Left path.
     * @param rightPath Right path.
     * @returns Concatenated path.
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
            return `${leftPath}/${rightPath}`;
        } else {
            return leftPath + rightPath;
        }
    }

    /**
     * Check if a certain path is the ancestor of another path.
     *
     * @param ancestorPath Ancestor path.
     * @param path Path to check.
     * @returns Whether the path is an ancestor of the other path.
     */
    static pathIsAncestor(ancestorPath: string, path: string): boolean {
        const ancestorSplit = CoreText.removeEndingSlash(ancestorPath).split('/');
        const pathSplit = CoreText.removeEndingSlash(path).split('/');

        if (ancestorSplit.length >= pathSplit.length) {
            return false;
        }

        return !ancestorSplit.some((value, index) => value !== pathSplit[index]);
    }

}
