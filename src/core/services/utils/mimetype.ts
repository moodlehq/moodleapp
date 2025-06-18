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
import { CoreFileEntry } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreMimetype } from '@singletons/mimetype';

interface MimeTypeGroupInfo {
    mimetypes: string[];
    extensions: string[];
}

/**
 * "Utils" service with helper functions for mimetypes and extensions.
 *
 * @deprecated since 5.0. Use CoreMimetype instead.
 */
@Injectable({ providedIn: 'root' })
export class CoreMimetypeUtilsProvider {

    /**
     * Check if a file extension can be embedded without using iframes.
     *
     * @param extension Extension.
     * @returns Whether it can be embedded.
     * @deprecated since 5.0. Use CoreMimetype.canBeEmbedded instead.
     */
    canBeEmbedded(extension?: string): boolean {
        return CoreMimetype.canBeEmbedded(extension);
    }

    /**
     * Clean a extension, removing the dot, hash, extra params...
     *
     * @param extension Extension to clean.
     * @returns Clean extension.
     * @deprecated since 5.0. Use CoreMimetype.cleanExtension instead.
     */
    cleanExtension(extension: string): string {
        return CoreMimetype.cleanExtension(extension);
    }

    /**
     * Get the extension of a mimetype. Returns undefined if not found.
     *
     * @param mimetype Mimetype.
     * @param url URL of the file. It will be used if there's more than one possible extension.
     * @returns Extension.
     * @deprecated since 5.0. Use CoreMimetype.getExtension instead.
     */
    getExtension(mimetype: string, url?: string): string | undefined {
       return CoreMimetype.getExtension(mimetype, url);
    }

    /**
     * Set the embed type to display an embedded file and mimetype if not found.
     *
     * @param file File object.
     * @param path Alternative path that will override fileurl from file object.
     * @returns The embedded HTML string.
     * @deprecated since 5.0. Use CoreMimetype.getEmbeddedHtml instead.
     */
    getEmbeddedHtml(file: CoreFileEntry, path?: string): string {
        return CoreMimetype.getEmbeddedHtml(file, path);
    }

    /**
     * Get the URL of the icon of an extension.
     *
     * @param extension Extension.
     * @returns Icon URL.
     * @deprecated since 5.0. Use CoreMimetype.getExtensionIcon instead.
     */
    getExtensionIcon(extension: string): string {
        const site = CoreSites.getCurrentSite();

        return CoreMimetype.getExtensionIcon(extension, site);
    }

    /**
     * Get the name of the icon of an extension.
     *
     * @param extension Extension.
     * @returns Icon. Undefined if not found.
     * @deprecated since 5.0. Use CoreMimetype.getExtensionIconName instead.
     */
    getExtensionIconName(extension: string): string | undefined {
        return CoreMimetype.getExtensionIconName(extension);
    }

    /**
     * Get the "type" (string) of an extension, something like "image", "video" or "audio".
     *
     * @param extension Extension.
     * @returns Type of the extension.
     * ,@deprecated since 5.0. Use CoreMimetype.getExtensionType instead.
     */
    getExtensionType(extension: string): string | undefined {
        return CoreMimetype.getExtensionType(extension);
    }

    /**
     * Get all the possible extensions of a mimetype. Returns empty array if not found.
     *
     * @param mimetype Mimetype.
     * @returns Extensions.
     * @deprecated since 5.0. Use CoreMimetype.getExtensions instead.
     */
    getExtensions(mimetype: string): string[] {
        return CoreMimetype.getExtensions(mimetype);
    }

    /**
     * Get a file icon URL based on its file name.
     *
     * @param filename The name of the file.
     * @returns The path to a file icon.
     * @deprecated since 5.0. Use CoreMimetype.getFileIcon instead.
     */
    getFileIcon(filename: string): string {
        const site = CoreSites.getCurrentSite();

        return CoreMimetype.getFileIcon(filename, site);
    }

    /**
     * Get the folder icon URL.
     *
     * @returns The path to a folder icon.
     * @deprecated since 5.0. Use CoreMimetype.getFileIconForType('folder') instead.
     */
    getFolderIcon(): string {
        const site = CoreSites.getCurrentSite();

        return CoreMimetype.getFileIconForType('folder', site);
    }

    /**
     * Given a type (audio, video, html, ...), return its file icon path.
     *
     * @param type The type to get the icon.
     * @returns The icon path.
     * @deprecated since 5.0. Use CoreMimetype.getFileIconForType instead.
     */
    getFileIconForType(type: string): string {
        const site = CoreSites.getCurrentSite();

        return CoreMimetype.getFileIconForType(type, site);
    }

    /**
     * Guess the extension of a file from its URL.
     * This is very weak and unreliable.
     *
     * @param fileUrl The file URL.
     * @returns The lowercased extension without the dot, or undefined.
     * @deprecated since 5.0. Use CoreMimetype.guessExtensionFromUrl instead.
     */
    guessExtensionFromUrl(fileUrl: string): string | undefined {
        return CoreMimetype.guessExtensionFromUrl(fileUrl);
    }

    /**
     * Returns the file extension of a file.
     * When the file does not have an extension, it returns undefined.
     *
     * @param filename The file name.
     * @returns The lowercased extension, or undefined.
     * @deprecated since 5.0. Use CoreMimetype.getFileExtension instead.
     */
    getFileExtension(filename: string): string | undefined {
        return CoreMimetype.getFileExtension(filename);
    }

    /**
     * Get the mimetype/extension info belonging to a certain group.
     *
     * @param group Group name.
     * @param field The field to get. If not supplied, all the info will be returned.
     * @returns Info for the group.
     * @deprecated since 5.0. Use CoreMimetype.getGroupMimeInfo instead.
     */
    getGroupMimeInfo(group: string): MimeTypeGroupInfo;
    getGroupMimeInfo(group: string, field: string): string[] | undefined;
    getGroupMimeInfo(group: string, field?: string): MimeTypeGroupInfo | string[] | undefined {
        if (!field) {
            return CoreMimetype.getGroupMimeInfo(group);
        }

        return CoreMimetype.getGroupMimeInfo(group, field);
    }

    /**
     * Get the mimetype of an extension. Returns undefined if not found.
     *
     * @param extension Extension.
     * @returns Mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getMimeType instead.
     */
    getMimeType(extension?: string): string | undefined {
        return CoreMimetype.getMimeType(extension);
    }

    /**
     * Get the deprecated mimetype of an extension. Returns undefined if not found or no deprecated mimetype.
     *
     * @param extension Extension.
     * @returns Deprecated mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getDeprecatedMimeType instead.
     */
    getDeprecatedMimeType(extension: string): string | undefined {
        return CoreMimetype.getDeprecatedMimeType(extension);
    }

    /**
     * Obtains descriptions for file types (e.g. 'Microsoft Word document') from the language file.
     * Based on Moodle's get_mimetype_description.
     *
     * @param obj Instance of FileEntry OR object with 'filename' and 'mimetype' OR string with mimetype.
     * @param capitalise If true, capitalises first character of result.
     * @returns Type description.
     * @deprecated since 5.0. Use CoreMimetype.getMimetypeDescription instead.
     */
    getMimetypeDescription(obj: CoreFileEntry | string, capitalise?: boolean): string {
       return CoreMimetype.getMimetypeDescription(obj, capitalise);
    }

    /**
     * Get the "type" (string) of a mimetype, something like "image", "video" or "audio".
     *
     * @param mimetype Mimetype.
     * @returns Type of the mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getMimetypeType instead.
     */
    getMimetypeType(mimetype: string): string | undefined {
       return CoreMimetype.getMimetypeType(mimetype);
    }

    /**
     * Get the icon of a mimetype.
     *
     * @param mimetype Mimetype.
     * @returns Type of the mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getMimetypeIcon instead.
     */
    getMimetypeIcon(mimetype: string): string {
        const site = CoreSites.getCurrentSite();

        return CoreMimetype.getMimetypeIcon(mimetype, site);
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     * This function is in here instead of MimetypeUtils to prevent circular dependencies.
     *
     * @param url The URL of the file.
     * @returns Promise resolved with the mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getMimeTypeFromUrl instead.
     */
    async getMimeTypeFromUrl(url: string): Promise<string> {
        return CoreMimetype.getMimeTypeFromUrl(url);
    }

    /**
     * Given a group name, return the translated name.
     *
     * @param name Group name.
     * @returns Translated name.
     * @deprecated since 5.0. Use CoreMimetype.getTranslatedGroupName instead.
     */
    getTranslatedGroupName(name: string): string {
        return CoreMimetype.getTranslatedGroupName(name);
    }

    /**
     * Check if an extension belongs to at least one of the groups.
     * Similar to Moodle's file_mimetype_in_typegroup, but using the extension instead of mimetype.
     *
     * @param extension Extension.
     * @param groups List of groups to check.
     * @returns Whether the extension belongs to any of the groups.
     * @deprecated since 5.0. Use CoreMimetype.isExtensionInGroup instead.
     */
    isExtensionInGroup(extension: string | undefined, groups: string[]): boolean {
        return CoreMimetype.isExtensionInGroup(extension, groups);
    }

    /**
     * Check if a mimetype belongs to a file that can be streamed (audio, video).
     *
     * @param mimetype Mimetype.
     * @returns Boolean.
     * @deprecated since 5.0. Use CoreMimetype.isStreamedMimetype instead.
     */
    isStreamedMimetype(mimetype: string): boolean {
        return CoreMimetype.isStreamedMimetype(mimetype);
    }

    /**
     * Remove the extension from a path (if any).
     *
     * @param path Path.
     * @returns Path without extension.
     * @deprecated since 5.0. Use CoreMimetype.removeExtension instead.
     */
    removeExtension(path: string): string {
        return CoreMimetype.removeExtension(path);
    }

}
/**
 * @deprecated since 5.0. Use CoreMimetype instead.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export const CoreMimetypeUtils = makeSingleton(CoreMimetypeUtilsProvider);
