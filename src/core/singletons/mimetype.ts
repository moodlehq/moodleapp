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

import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFile } from '@services/file';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreText } from '@singletons/text';
import { Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWS, CoreWSFile } from '@services/ws';

import EXT_TO_MIME from '@/assets/exttomime.json';
import MIME_TO_EXT from '@/assets/mimetoext.json';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { CoreSite } from '@classes/sites/site';

type MimeTypeInfo = {
    type: string;
    icon?: string;
    groups?: string[];
    // eslint-disable-next-line id-denylist
    string?: string;
    deprecated?: string; // Deprecated mimetype name.
};

type MimeTypeGroupInfo = {
    mimetypes: string[];
    extensions: string[];
};

/**
 * "Utils" service with helper functions for mimetypes and extensions.
 */
export class CoreMimetype {

    protected static readonly EXTENSION_REGEX = /^[a-z0-9]+$/;

    protected static logger = CoreLogger.getInstance('CoreMimetype');
    protected static groupsMimeInfo: Record<string, MimeTypeGroupInfo> = {};

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Check if a file extension can be embedded without using iframes.
     *
     * @param extension Extension.
     * @returns Whether it can be embedded.
     */
    static canBeEmbedded(extension?: string): boolean {
        return CoreMimetype.isExtensionInGroup(extension, ['web_image', 'web_video', 'web_audio']);
    }

    /**
     * Clean a extension, removing the dot, hash, extra params...
     *
     * @param extension Extension to clean.
     * @returns Clean extension.
     */
    static cleanExtension(extension: string): string {
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
        if (extension && extension[0] === '.') {
            extension = extension.substring(1);
        }

        return extension;
    }

    /**
     * Fill the mimetypes and extensions info for a certain group.
     *
     * @param group Group name.
     */
    protected static fillGroupMimeInfo(group: string): void {
        const mimetypes: Record<string, boolean> = {}; // Use an object to prevent duplicates.
        const extensions: string[] = []; // Extensions are unique.

        for (const extension in EXT_TO_MIME) {
            const data: MimeTypeInfo = EXT_TO_MIME[extension];
            if (data.type && data.groups && data.groups.includes(group)) {
                // This extension has the group, add it to the list.
                mimetypes[data.type] = true;
                extensions.push(extension);
            }
        }

        CoreMimetype.groupsMimeInfo[group] = {
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
    static getExtension(mimetype: string, url?: string): string | undefined {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        if (mimetype === 'application/x-forcedownload' || mimetype === 'application/forcedownload') {
            // Couldn't get the right mimetype, try to guess it.
            return url && CoreMimetype.guessExtensionFromUrl(url);
        }

        const extensions: string[] = MIME_TO_EXT[mimetype];
        if (extensions?.length) {
            if (extensions.length > 1 && url) {
                // There's more than one possible extension. Check if the URL has extension.
                const candidate = CoreMimetype.guessExtensionFromUrl(url);
                if (candidate && extensions.includes(candidate)) {
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
    static getEmbeddedHtml(file: CoreFileEntry, path?: string): string {
        const filename = CoreFileUtils.isFileEntry(file) ? (file as FileEntry).name : file.filename;
        const extension = !CoreFileUtils.isFileEntry(file) && file.mimetype
            ? CoreMimetype.getExtension(file.mimetype)
            : (filename && CoreMimetype.getFileExtension(filename));
        const mimeType = !CoreFileUtils.isFileEntry(file) && file.mimetype
            ? file.mimetype
            : (extension && CoreMimetype.getMimeType(extension));

        // @todo linting: See if this can be removed
        (file as CoreWSFile).mimetype = mimeType;

        if (extension && CoreMimetype.canBeEmbedded(extension)) {
            const embedType = CoreMimetype.getExtensionType(extension);

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
     * @param site Where the icons are going to be applied. This param will be removed in future versions.
     * @returns Icon URL.
     */
    static getExtensionIcon(extension: string, site: CoreSite | undefined): string {
        const icon = CoreMimetype.getExtensionIconName(extension) || 'unknown';

        return CoreMimetype.getFileIconForType(icon, site);
    }

    /**
     * Get the name of the icon of an extension.
     *
     * @param extension Extension.
     * @returns Icon. Undefined if not found.
     */
    static getExtensionIconName(extension: string): string | undefined {
        if (EXT_TO_MIME[extension]) {
            if (EXT_TO_MIME[extension].icon) {
                return EXT_TO_MIME[extension].icon;
            } else {
                const type = EXT_TO_MIME[extension].type.split('/')[0];
                if (type === 'video' || type === 'text' || type === 'image' || type === 'document' || type === 'audio') {
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
    static getExtensionType(extension: string): string | undefined {
        extension = CoreMimetype.cleanExtension(extension);

        return EXT_TO_MIME[extension]?.string;
    }

    /**
     * Get all the possible extensions of a mimetype. Returns empty array if not found.
     *
     * @param mimetype Mimetype.
     * @returns Extensions.
     */
    static getExtensions(mimetype: string): string[] {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        return MIME_TO_EXT[mimetype] || [];
    }

    /**
     * Get a file icon URL based on its file name.
     *
     * @param filename The name of the file.
     * @param site Where the icons are going to be applied. This param will be removed in future versions.
     * @returns The path to a file icon.
     */
    static getFileIcon(filename: string, site: CoreSite | undefined): string {
        const extension = CoreMimetype.getFileExtension(filename);
        const icon = (extension && CoreMimetype.getExtensionIconName(extension)) || 'unknown';

        return CoreMimetype.getFileIconForType(icon, site);
    }

    /**
     * Given a type (audio, video, html, ...), return its file icon path.
     *
     * @param type The type to get the icon.
     * @param site Where the icons are going to be applied. This param will be removed in future versions.
     * @returns The icon path.
     */
    static getFileIconForType(type: string, site: CoreSite | undefined): string {
        const legacyIcons = site !== undefined && !site.isVersionGreaterEqualThan('4.0');

        if (!legacyIcons) {
            return `assets/img/files/${type}.svg`;
        }

        return `assets/img/files_legacy/${type}-64.png`;
    }

    /**
     * Guess the extension of a file from its URL.
     * This is very weak and unreliable.
     *
     * @param fileUrl The file URL.
     * @returns The lowercased extension without the dot, or undefined.
     */
    static guessExtensionFromUrl(fileUrl: string): string | undefined {
        const parsed = CoreUrl.parse(fileUrl);
        const split = parsed?.path?.split('.');
        let extension: string | undefined;

        if (split && split.length > 1) {
            const candidate = split[split.length - 1].toLowerCase();
            if (CoreMimetype.EXTENSION_REGEX.test(candidate)) {
                extension = candidate;
            }
        }

        // Check extension corresponds to a mimetype to know if it's valid.
        if (extension && CoreMimetype.getMimeType(extension) === undefined) {
            CoreMimetype.logger.warn(`Guess file extension: Not valid extension ${extension}`);

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
    static getFileExtension(filename: string): string | undefined {
        const dot = filename.lastIndexOf('.');
        let ext: string | undefined;

        if (dot > -1) {
            ext = filename.substring(dot + 1).toLowerCase();
            ext = CoreMimetype.cleanExtension(ext);

            // Check extension corresponds to a mimetype to know if it's valid.
            if (CoreMimetype.getMimeType(ext) === undefined) {
                CoreMimetype.logger.warn(`Get file extension: Not valid extension ${ext}`);

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
    static getGroupMimeInfo(group: string): MimeTypeGroupInfo;
    static getGroupMimeInfo(group: string, field: string): string[] | undefined;
    static getGroupMimeInfo(group: string, field?: string): MimeTypeGroupInfo | string[] | undefined {
        if (CoreMimetype.groupsMimeInfo[group] === undefined) {
            CoreMimetype.fillGroupMimeInfo(group);
        }

        if (field) {
            return CoreMimetype.groupsMimeInfo[group][field];
        }

        return CoreMimetype.groupsMimeInfo[group];
    }

    /**
     * Get the mimetype of an extension. Returns undefined if not found.
     *
     * @param extension Extension.
     * @returns Mimetype.
     */
    static getMimeType(extension?: string): string | undefined {
        if (!extension) {
            return;
        }

        extension = CoreMimetype.cleanExtension(extension);

        return EXT_TO_MIME[extension]?.type;
    }

    /**
     * Get the deprecated mimetype of an extension. Returns undefined if not found or no deprecated mimetype.
     *
     * @param extension Extension.
     * @returns Deprecated mimetype.
     */
    static getDeprecatedMimeType(extension: string): string | undefined {
        extension = CoreMimetype.cleanExtension(extension);

        return EXT_TO_MIME[extension]?.deprecated;
    }

    /**
     * Obtains descriptions for file types (e.g. 'Microsoft Word document') from the language file.
     * Based on Moodle's get_mimetype_description.
     *
     * @param obj Instance of FileEntry OR object with 'filename' and 'mimetype' OR string with mimetype.
     * @param capitalise If true, capitalises first character of result.
     * @returns Type description.
     */
    static getMimetypeDescription(obj: CoreFileEntry | string, capitalise?: boolean): string {
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
            extension = CoreMimetype.getFileExtension(filename);

            if (!mimetype) {
                // Try to calculate the mimetype using the extension.
                mimetype = extension && CoreMimetype.getMimeType(extension);
            }
        }

        if (!mimetype) {
            // Don't have the mimetype, stop.
            return '';
        }

        if (!extension) {
            extension = CoreMimetype.getExtension(mimetype);
        }

        const mimetypeStr = CoreMimetype.getMimetypeType(mimetype) || '';
        const chunks = mimetype.split('/');
        const attr = {
            mimetype,
            ext: extension || '',
            mimetype1: chunks[0],
            mimetype2: chunks[1] || '',
        };
        const translateParams: Record<string, string> = {};

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
        const defaultTrns = Translate.instant(`${langPrefix}default`, { $a: translateParams });
        let result = mimetype;

        if (safeMimetypeTrns !== langPrefix + safeMimetype) {
            result = safeMimetypeTrns;
        } else if (safeMimetypeStrTrns !== langPrefix + safeMimetypeStr) {
            result = safeMimetypeStrTrns;
        } else if (defaultTrns !== `${langPrefix}default`) {
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
    static getMimetypeType(mimetype: string): string | undefined {
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        const extensions: string[] = MIME_TO_EXT[mimetype];
        if (!extensions) {
            return;
        }

        const extension = extensions.find(ext => EXT_TO_MIME[ext]?.string);

        return extension ? EXT_TO_MIME[extension].string : undefined;
    }

    /**
     * Get the icon of a mimetype.
     *
     * @param mimetype Mimetype.
     * @param site Where the icons are going to be applied. This param will be removed in future versions.
     * @returns Type of the mimetype.
     */
    static getMimetypeIcon(mimetype: string, site: CoreSite | undefined): string {
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        const extensions: string[] = MIME_TO_EXT[mimetype] || [];
        let icon = 'unknown';

        for (let i = 0; i < extensions.length; i++) {
            const iconName = CoreMimetype.getExtensionIconName(extensions[i]);

            if (iconName) {
                icon = iconName;
                break;
            }
        }

        return CoreMimetype.getFileIconForType(icon, site);
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     * This function is in here instead of MimetypeUtils to prevent circular dependencies.
     *
     * @param url The URL of the file.
     * @returns Promise resolved with the mimetype.
     */
    static async getMimeTypeFromUrl(url: string): Promise<string> {
        // First check if it can be guessed from the URL.
        const extension = CoreMimetype.guessExtensionFromUrl(url);
        const mimetype = extension && CoreMimetype.getMimeType(extension);

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
    static getTranslatedGroupName(name: string): string {
        const key = `assets.mimetypes.group:${name}`;
        const translated = Translate.instant(key);

        return translated !== key ? translated : name;
    }

    /**
     * Check if an extension belongs to at least one of the groups.
     * Similar to Moodle's file_mimetype_in_typegroup, but using the extension instead of mimetype.
     *
     * @param extension Extension.
     * @param groups List of groups to check.
     * @returns Whether the extension belongs to any of the groups.
     */
    static isExtensionInGroup(extension: string | undefined, groups: string[]): boolean {
        if (!extension) {
            return false;
        }

        extension = CoreMimetype.cleanExtension(extension);
        const extensionGroups: string[] = EXT_TO_MIME[extension] && EXT_TO_MIME[extension].groups;
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
    static isStreamedMimetype(mimetype: string): boolean {
        return mimetype.includes('video') || mimetype.includes('audio');
    }

    /**
     * Remove the extension from a path (if any).
     *
     * @param path Path.
     * @returns Path without extension.
     */
    static removeExtension(path: string): string {
        const position = path.lastIndexOf('.');

        if (position > -1) {
            // Check extension corresponds to a mimetype to know if it's valid.
            const extension = path.substring(position + 1).toLowerCase();
            if (CoreMimetype.getMimeType(extension) !== undefined) {
                return path.substring(0, position); // Remove extension.
            }
        }

        return path;
    }

}
