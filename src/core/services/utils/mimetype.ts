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

import { CoreFile } from '@services/file';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreText } from '@singletons/text';
import { makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWS, CoreWSFile } from '@services/ws';

import extToMime from '@/assets/exttomime.json';
import mimeToExt from '@/assets/mimetoext.json';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreUrl } from '@singletons/url';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@singletons/utils';

interface MimeTypeInfo {
    type: string;
    icon?: string;
    groups?: string[];
    // eslint-disable-next-line id-blacklist
    string?: string;
    deprecated?: string; // Deprecated mimetype name.
}

interface MimeTypeGroupInfo {
    mimetypes: string[];
    extensions: string[];
}

const EXTENSION_REGEX = /^[a-z0-9]+$/;

/*
 * "Utils" service with helper functions for mimetypes and extensions.
 */
@Injectable({ providedIn: 'root' })
export class CoreMimetypeUtilsProvider {

    protected logger: CoreLogger;
    protected extToMime: Record<string, MimeTypeInfo> = {};
    protected mimeToExt: Record<string, string[]> = {};
    protected groupsMimeInfo: Record<string, MimeTypeGroupInfo> = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreMimetypeUtilsProvider');

        this.extToMime = extToMime;
        this.mimeToExt = mimeToExt;
    }

    /**
     * Check if a file extension can be embedded without using iframes.
     *
     * @param extension Extension.
     * @returns Whether it can be embedded.
     */
    canBeEmbedded(extension?: string): boolean {
        return this.isExtensionInGroup(extension, ['web_image', 'web_video', 'web_audio']);
    }

    /**
     * Clean a extension, removing the dot, hash, extra params...
     *
     * @param extension Extension to clean.
     * @returns Clean extension.
     */
    cleanExtension(extension: string): string {
        if (!extension) {
            return extension;
        }

        // If the extension has parameters, remove them.
        let position = extension.indexOf('?');
        if (position > -1) {
            extension = extension.substring(0, position);
        }

        // If the extension has an anchor, remove it.
        position = extension.indexOf('#');
        if (position > -1) {
            extension = extension.substring(0, position);
        }

        // Remove hash in extension if there's any (added by filepool).
        extension = extension.replace(/_.{32}$/, '');

        // Remove dot from the extension if found.
        if (extension && extension[0] == '.') {
            extension = extension.substring(1);
        }

        return extension;
    }

    /**
     * Fill the mimetypes and extensions info for a certain group.
     *
     * @param group Group name.
     */
    protected fillGroupMimeInfo(group: string): void {
        const mimetypes = {}; // Use an object to prevent duplicates.
        const extensions: string[] = []; // Extensions are unique.

        for (const extension in this.extToMime) {
            const data = this.extToMime[extension];
            if (data.type && data.groups && data.groups.indexOf(group) != -1) {
                // This extension has the group, add it to the list.
                mimetypes[data.type] = true;
                extensions.push(extension);
            }
        }

        this.groupsMimeInfo[group] = {
            mimetypes: Object.keys(mimetypes),
            extensions,
        };
    }

    /**
     * Get the extension of a mimetype. Returns undefined if not found.
     *
     * @param mimetype Mimetype.
     * @param url URL of the file. It will be used if there's more than one possible extension.
     * @returns Extension.
     */
    getExtension(mimetype: string, url?: string): string | undefined {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        if (mimetype == 'application/x-forcedownload' || mimetype == 'application/forcedownload') {
            // Couldn't get the right mimetype, try to guess it.
            return url && this.guessExtensionFromUrl(url);
        }

        const extensions = this.mimeToExt[mimetype];
        if (extensions && extensions.length) {
            if (extensions.length > 1 && url) {
                // There's more than one possible extension. Check if the URL has extension.
                const candidate = this.guessExtensionFromUrl(url);
                if (candidate && extensions.indexOf(candidate) != -1) {
                    return candidate;
                }
            }

            return extensions[0];
        }
    }

    /**
     * Set the embed type to display an embedded file and mimetype if not found.
     *
     * @param file File object.
     * @param path Alternative path that will override fileurl from file object.
     * @returns The embedded HTML string.
     */
    getEmbeddedHtml(file: CoreFileEntry, path?: string): string {
        const filename = CoreFileUtils.isFileEntry(file) ? (file as FileEntry).name : file.filename;
        const extension = !CoreFileUtils.isFileEntry(file) && file.mimetype
            ? this.getExtension(file.mimetype)
            : (filename && this.getFileExtension(filename));
        const mimeType = !CoreFileUtils.isFileEntry(file) && file.mimetype
            ? file.mimetype
            : (extension && this.getMimeType(extension));

        // @todo linting: See if this can be removed
        (file as CoreWSFile).mimetype = mimeType;

        if (extension && this.canBeEmbedded(extension)) {
            const embedType = this.getExtensionType(extension);

            // @todo linting: See if this can be removed
            (file as { embedType?: string }).embedType = embedType;

            path = path ?? (CoreFileUtils.isFileEntry(file) ? CoreFile.getFileEntryURL(file) : CoreFileHelper.getFileUrl(file));
            path = path && CoreFile.convertFileSrc(path);

            switch (embedType) {
                case 'image':
                    return `<img src="${path}">`;
                case 'audio':
                case 'video':
                    // Add videoJS class and ID because the media could use the VideoJS player.
                    return [
                        `<${embedType} controls title="${filename}" src="${path}" controlsList="nodownload" class="video-js" ` +
                            `id="id_videojs_moodleapp_${CoreUtils.getUniqueId('CoreMimetypeUtils-embedded-media')}">`,
                        `<source src="${path}" type="${mimeType}">`,
                        `</${embedType}>`,
                    ].join('');
                default:
                    return '';
            }
        }

        return '';
    }

    /**
     * Get the URL of the icon of an extension.
     *
     * @param extension Extension.
     * @returns Icon URL.
     */
    getExtensionIcon(extension: string): string {
        const icon = this.getExtensionIconName(extension) || 'unknown';

        return this.getFileIconForType(icon);
    }

    /**
     * Get the name of the icon of an extension.
     *
     * @param extension Extension.
     * @returns Icon. Undefined if not found.
     */
    getExtensionIconName(extension: string): string | undefined {
        if (this.extToMime[extension]) {
            if (this.extToMime[extension].icon) {
                return this.extToMime[extension].icon;
            } else {
                const type = this.extToMime[extension].type.split('/')[0];
                if (type == 'video' || type == 'text' || type == 'image' || type == 'document' || type == 'audio') {
                    return type;
                }
            }
        }
    }

    /**
     * Get the "type" (string) of an extension, something like "image", "video" or "audio".
     *
     * @param extension Extension.
     * @returns Type of the extension.
     */
    getExtensionType(extension: string): string | undefined {
        extension = this.cleanExtension(extension);

        if (this.extToMime[extension] && this.extToMime[extension].string) {
            return this.extToMime[extension].string;
        }
    }

    /**
     * Get all the possible extensions of a mimetype. Returns empty array if not found.
     *
     * @param mimetype Mimetype.
     * @returns Extensions.
     */
    getExtensions(mimetype: string): string[] {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        return this.mimeToExt[mimetype] || [];
    }

    /**
     * Get a file icon URL based on its file name.
     *
     * @param filename The name of the file.
     * @returns The path to a file icon.
     */
    getFileIcon(filename: string): string {
        const extension = this.getFileExtension(filename);
        const icon = (extension && this.getExtensionIconName(extension)) || 'unknown';

        return this.getFileIconForType(icon);
    }

    /**
     * Get the folder icon URL.
     *
     * @returns The path to a folder icon.
     */
    getFolderIcon(): string {
        if (CoreSites.getCurrentSite() === undefined || CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            return 'assets/img/files/folder.svg';
        }

        return 'assets/img/files_legacy/folder-64.png';
    }

    /**
     * Given a type (audio, video, html, ...), return its file icon path.
     *
     * @param type The type to get the icon.
     * @returns The icon path.
     */
    getFileIconForType(type: string): string {
        if (CoreSites.getCurrentSite() === undefined || CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            return 'assets/img/files/' + type + '.svg';
        }

        return 'assets/img/files_legacy/' + type + '-64.png';
    }

    /**
     * Guess the extension of a file from its URL.
     * This is very weak and unreliable.
     *
     * @param fileUrl The file URL.
     * @returns The lowercased extension without the dot, or undefined.
     */
    guessExtensionFromUrl(fileUrl: string): string | undefined {
        const parsed = CoreUrl.parse(fileUrl);
        const split = parsed?.path?.split('.');
        let extension: string | undefined;

        if (split && split.length > 1) {
            const candidate = split[split.length - 1].toLowerCase();
            if (EXTENSION_REGEX.test(candidate)) {
                extension = candidate;
            }
        }

        // Check extension corresponds to a mimetype to know if it's valid.
        if (extension && this.getMimeType(extension) === undefined) {
            this.logger.warn('Guess file extension: Not valid extension ' + extension);

            return;
        }

        return extension;
    }

    /**
     * Returns the file extension of a file.
     * When the file does not have an extension, it returns undefined.
     *
     * @param filename The file name.
     * @returns The lowercased extension, or undefined.
     */
    getFileExtension(filename: string): string | undefined {
        const dot = filename.lastIndexOf('.');
        let ext: string | undefined;

        if (dot > -1) {
            ext = filename.substring(dot + 1).toLowerCase();
            ext = this.cleanExtension(ext);

            // Check extension corresponds to a mimetype to know if it's valid.
            if (this.getMimeType(ext) === undefined) {
                this.logger.warn('Get file extension: Not valid extension ' + ext);

                return;
            }
        }

        return ext;
    }

    /**
     * Get the mimetype/extension info belonging to a certain group.
     *
     * @param group Group name.
     * @param field The field to get. If not supplied, all the info will be returned.
     * @returns Info for the group.
     */
    getGroupMimeInfo(group: string): MimeTypeGroupInfo;
    getGroupMimeInfo(group: string, field: string): string[] | undefined;
    getGroupMimeInfo(group: string, field?: string): MimeTypeGroupInfo | string[] | undefined {
        if (this.groupsMimeInfo[group] === undefined) {
            this.fillGroupMimeInfo(group);
        }

        if (field) {
            return this.groupsMimeInfo[group][field];
        }

        return this.groupsMimeInfo[group];
    }

    /**
     * Get the mimetype of an extension. Returns undefined if not found.
     *
     * @param extension Extension.
     * @returns Mimetype.
     */
    getMimeType(extension?: string): string | undefined {
        if (!extension) {
            return;
        }

        extension = this.cleanExtension(extension);

        if (this.extToMime[extension] && this.extToMime[extension].type) {
            return this.extToMime[extension].type;
        }
    }

    /**
     * Get the deprecated mimetype of an extension. Returns undefined if not found or no deprecated mimetype.
     *
     * @param extension Extension.
     * @returns Deprecated mimetype.
     */
    getDeprecatedMimeType(extension: string): string | undefined {
        extension = this.cleanExtension(extension);

        return this.extToMime[extension]?.deprecated;
    }

    /**
     * Obtains descriptions for file types (e.g. 'Microsoft Word document') from the language file.
     * Based on Moodle's get_mimetype_description.
     *
     * @param obj Instance of FileEntry OR object with 'filename' and 'mimetype' OR string with mimetype.
     * @param capitalise If true, capitalises first character of result.
     * @returns Type description.
     */
    getMimetypeDescription(obj: CoreFileEntry | string, capitalise?: boolean): string {
        const langPrefix = 'assets.mimetypes.';
        let filename: string | undefined = '';
        let mimetype: string | undefined = '';
        let extension: string | undefined = '';

        if (typeof obj === 'object' && CoreFileUtils.isFileEntry(obj)) {
            // It's a FileEntry. Don't use the file function because it's asynchronous and the type isn't reliable.
            filename = obj.name;
        } else if (typeof obj === 'object') {
            filename = obj.filename || '';
            mimetype = obj.mimetype || '';
        } else {
            mimetype = obj;
        }

        if (filename) {
            extension = this.getFileExtension(filename);

            if (!mimetype) {
                // Try to calculate the mimetype using the extension.
                mimetype = extension && this.getMimeType(extension);
            }
        }

        if (!mimetype) {
            // Don't have the mimetype, stop.
            return '';
        }

        if (!extension) {
            extension = this.getExtension(mimetype);
        }

        const mimetypeStr = this.getMimetypeType(mimetype) || '';
        const chunks = mimetype.split('/');
        const attr = {
            mimetype,
            ext: extension || '',
            mimetype1: chunks[0],
            mimetype2: chunks[1] || '',
        };
        const translateParams = {};

        for (const key in attr) {
            const value = attr[key];
            translateParams[key] = value;
            translateParams[key.toUpperCase()] = value.toUpperCase();
            translateParams[CoreText.capitalize(key)] = CoreText.capitalize(value);
        }

        // MIME types may include + symbol but this is not permitted in string ids.
        const safeMimetype = mimetype.replace(/\+/g, '_');
        const safeMimetypeStr = mimetypeStr.replace(/\+/g, '_');
        const safeMimetypeTrns = Translate.instant(langPrefix + safeMimetype, { $a: translateParams });
        const safeMimetypeStrTrns = Translate.instant(langPrefix + safeMimetypeStr, { $a: translateParams });
        const defaultTrns = Translate.instant(langPrefix + 'default', { $a: translateParams });
        let result = mimetype;

        if (safeMimetypeTrns != langPrefix + safeMimetype) {
            result = safeMimetypeTrns;
        } else if (safeMimetypeStrTrns != langPrefix + safeMimetypeStr) {
            result = safeMimetypeStrTrns;
        } else if (defaultTrns != langPrefix + 'default') {
            result = defaultTrns;
        }

        if (capitalise) {
            result = CoreText.capitalize(result);
        }

        return result;
    }

    /**
     * Get the "type" (string) of a mimetype, something like "image", "video" or "audio".
     *
     * @param mimetype Mimetype.
     * @returns Type of the mimetype.
     */
    getMimetypeType(mimetype: string): string | undefined {
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        const extensions = this.mimeToExt[mimetype];
        if (!extensions) {
            return;
        }

        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i];
            if (this.extToMime[extension] && this.extToMime[extension].string) {
                return this.extToMime[extension].string;
            }
        }
    }

    /**
     * Get the icon of a mimetype.
     *
     * @param mimetype Mimetype.
     * @returns Type of the mimetype.
     */
    getMimetypeIcon(mimetype: string): string {
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        const extensions = this.mimeToExt[mimetype] || [];
        let icon = 'unknown';

        for (let i = 0; i < extensions.length; i++) {
            const iconName = this.getExtensionIconName(extensions[i]);

            if (iconName) {
                icon = iconName;
                break;
            }
        }

        return this.getFileIconForType(icon);
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     * This function is in here instead of MimetypeUtils to prevent circular dependencies.
     *
     * @param url The URL of the file.
     * @returns Promise resolved with the mimetype.
     */
    async getMimeTypeFromUrl(url: string): Promise<string> {
        // First check if it can be guessed from the URL.
        const extension = CoreMimetypeUtils.guessExtensionFromUrl(url);
        const mimetype = extension && CoreMimetypeUtils.getMimeType(extension);

        // Ignore PHP extension for now, it could be serving a file.
        if (mimetype && extension !== 'php') {
            return mimetype;
        }

        // Can't be guessed, get the remote mimetype.
        const remoteMimetype = await CoreWS.getRemoteFileMimeType(url);

        return remoteMimetype || mimetype || '';
    }

    /**
     * Given a group name, return the translated name.
     *
     * @param name Group name.
     * @returns Translated name.
     */
    getTranslatedGroupName(name: string): string {
        const key = 'assets.mimetypes.group:' + name;
        const translated = Translate.instant(key);

        return translated != key ? translated : name;
    }

    /**
     * Check if an extension belongs to at least one of the groups.
     * Similar to Moodle's file_mimetype_in_typegroup, but using the extension instead of mimetype.
     *
     * @param extension Extension.
     * @param groups List of groups to check.
     * @returns Whether the extension belongs to any of the groups.
     */
    isExtensionInGroup(extension: string | undefined, groups: string[]): boolean {
        if (!extension) {
            return false;
        }

        extension = this.cleanExtension(extension);
        const extensionGroups = this.extToMime[extension] && this.extToMime[extension].groups;
        let found = false;

        if (groups.length && extensionGroups) {
            found = extensionGroups.some((group => groups.includes(group)));
        }

        return found;
    }

    /**
     * Check if a mimetype belongs to a file that can be streamed (audio, video).
     *
     * @param mimetype Mimetype.
     * @returns Boolean.
     */
    isStreamedMimetype(mimetype: string): boolean {
        return mimetype.indexOf('video') != -1 || mimetype.indexOf('audio') != -1;
    }

    /**
     * Remove the extension from a path (if any).
     *
     * @param path Path.
     * @returns Path without extension.
     */
    removeExtension(path: string): string {
        const position = path.lastIndexOf('.');

        if (position > -1) {
            // Check extension corresponds to a mimetype to know if it's valid.
            const extension = path.substring(position + 1).toLowerCase();
            if (this.getMimeType(extension) !== undefined) {
                return path.substring(0, position); // Remove extension.
            }
        }

        return path;
    }

}

export const CoreMimetypeUtils = makeSingleton(CoreMimetypeUtilsProvider);
