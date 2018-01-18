// (C) Copyright 2015 Martin Dougiamas
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
import { HttpClient } from '@angular/common/http';
import { CoreLoggerProvider } from '../logger';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from './text';

/*
 * "Utils" service with helper functions for mimetypes and extensions.
 */
@Injectable()
export class CoreMimetypeUtilsProvider {
    logger;
    extToMime = {}; // Object to map extensions -> mimetypes.
    mimeToExt = {}; // Object to map mimetypes -> extensions.
    groupsMimeInfo = {}; // Object to hold extensions and mimetypes that belong to a certain "group" (audio, video, ...).
    extensionRegex = /^[a-z0-9]+$/;
    wsProvider: any = {}; // @todo

    constructor(http: HttpClient, logger: CoreLoggerProvider, private translate: TranslateService,
            private textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('CoreMimetypeUtilsProvider');

        http.get('assets/exttomime.json').subscribe((result) => {
            this.extToMime = result;
        }, (err) => {
            // Error, shouldn't happen.
        });

        http.get('assets/mimetoext.json').subscribe((result) => {
            this.mimeToExt = result;
        }, (err) => {
            // Error, shouldn't happen.
        });
    }

    /**
     * Check if a file extension can be embedded without using iframes.
     *
     * @param {string} extension Extension.
     * @return {boolean} Whether it can be embedded.
     */
    canBeEmbedded(extension: string) : boolean {
        return this.isExtensionInGroup(extension, ['web_image', 'web_video', 'web_audio']);
    }

    /**
     * Clean a extension, removing the dot, hash, extra params...
     *
     * @param {string} extension Extension to clean.
     * @return {string} Clean extension.
     */
    cleanExtension(extension: string) : string {
        if (!extension) {
            return extension;
        }

        // If the extension has parameters, remove them.
        let position = extension.indexOf('?');
        if (position > -1) {
            extension = extension.substr(0, position);
        }

        // Remove hash in extension if there's any (added by filepool).
        extension = extension.replace(/_.{32}$/, '');

        // Remove dot from the extension if found.
        if (extension && extension[0] == '.') {
            extension = extension.substr(1);
        }

        return extension;
    }

    /**
     * Fill the mimetypes and extensions info for a certain group.
     *
     * @param {string} group Group name.
     */
    protected fillGroupMimeInfo(group: string) : void {
        let mimetypes = {}, // Use an object to prevent duplicates.
            extensions = []; // Extensions are unique.

        for (let extension in this.extToMime) {
            let data = this.extToMime[extension];
            if (data.type && data.groups && data.groups.indexOf(group) != -1) {
                // This extension has the group, add it to the list.
                mimetypes[data.type] = true;
                extensions.push(extension);
            }
        }

        this.groupsMimeInfo[group] = {
            mimetypes: Object.keys(mimetypes),
            extensions: extensions
        };
    }

    /**
     * Get the extension of a mimetype. Returns undefined if not found.
     *
     * @param {string} mimetype Mimetype.
     * @param {string} [url] URL of the file. It will be used if there's more than one possible extension.
     * @return {string} Extension.
     */
    getExtension(mimetype: string, url?: string) : string {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        if (mimetype == 'application/x-forcedownload' || mimetype == 'application/forcedownload') {
            // Couldn't get the right mimetype, try to guess it.
            return this.guessExtensionFromUrl(url);
        }

        let extensions = this.mimeToExt[mimetype];
        if (extensions && extensions.length) {
            if (extensions.length > 1 && url) {
                // There's more than one possible extension. Check if the URL has extension.
                let candidate = this.guessExtensionFromUrl(url);
                if (extensions.indexOf(candidate) != -1) {
                    return candidate;
                }
            }
            return extensions[0];
        }
    }

    /**
     * Get the "type" (string) of an extension, something like "image", "video" or "audio".
     *
     * @param {string} extension Extension.
     * @return {string} Type of the extension.
     */
    getExtensionType(extension: string) : string {
        extension = this.cleanExtension(extension);

        if (this.extToMime[extension] && this.extToMime[extension].string) {
            return this.extToMime[extension].string;
        }
    }

    /**
     * Get all the possible extensions of a mimetype. Returns empty array if not found.
     *
     * @param {string} mimetype Mimetype.
     * @return {string[]} Extensions.
     */
    getExtensions(mimetype: string) : string[] {
        mimetype = mimetype || '';
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.
        return this.mimeToExt[mimetype] || [];
    }

    /**
     * Get a file icon URL based on its file name.
     *
     * @param {string} The name of the file.
     * @return {string} The path to a file icon.
     */
    getFileIcon(filename: string) : string {
        let ext = this.getFileExtension(filename),
            icon = 'unknown';

        if (ext && this.extToMime[ext]) {
            if (this.extToMime[ext].icon) {
                icon = this.extToMime[ext].icon;
            } else {
                let type = this.extToMime[ext].type.split('/')[0];
                if (type == 'video' || type == 'text' || type == 'image' || type == 'document' || type == 'audio') {
                    icon = type;
                }
            }
        }

        return 'assets/img/files/' + icon + '-64.png';
    }

    /**
     * Get the folder icon URL.
     *
     * @return {string} The path to a folder icon.
     */
    getFolderIcon() : string {
        return 'assets/img/files/folder-64.png';
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     *
     * @param {string} url The URL of the file.
     * @return {Promise<string>} Promise resolved with the mimetype.
     */
    getMimeTypeFromUrl(url: string) : Promise<string> {
        // First check if it can be guessed from the URL.
        let extension = this.guessExtensionFromUrl(url),
            mimetype = this.getMimeType(extension);

        if (mimetype) {
            return Promise.resolve(mimetype);
        }

        // Can't be guessed, get the remote mimetype.
        return this.wsProvider.getRemoteFileMimeType(url).then((mimetype) => {
            return mimetype || '';
        });
    }

    /**
     * Guess the extension of a file from its URL.
     * This is very weak and unreliable.
     *
     * @param {string} fileUrl The file URL.
     * @return {string} The lowercased extension without the dot, or undefined.
     */
    guessExtensionFromUrl(fileUrl: string) : string {
        let split = fileUrl.split('.'),
            candidate,
            extension,
            position;

        if (split.length > 1) {
            candidate = split.pop().toLowerCase();
            // Remove params if any.
            position = candidate.indexOf('?');
            if (position > -1) {
                candidate = candidate.substr(0, position);
            }

            if (this.extensionRegex.test(candidate)) {
                extension = candidate;
            }
        }

        // Check extension corresponds to a mimetype to know if it's valid.
        if (extension && typeof this.getMimeType(extension) == 'undefined') {
            this.logger.warn('Guess file extension: Not valid extension ' + extension);
            return;
        }

        return extension;
    }

    /**
     * Returns the file extension of a file.
     * When the file does not have an extension, it returns undefined.
     *
     * @param {string} filename The file name.
     * @return {string} The lowercased extension, or undefined.
     */
    getFileExtension(filename: string) : string {
        let dot = filename.lastIndexOf("."),
            ext;

        if (dot > -1) {
            ext = filename.substr(dot + 1).toLowerCase();
            ext = this.cleanExtension(ext);

            // Check extension corresponds to a mimetype to know if it's valid.
            if (typeof this.getMimeType(ext) == 'undefined') {
                this.logger.warn('Get file extension: Not valid extension ' + ext);
                return;
            }
        }

        return ext;
    }

    /**
     * Get the mimetype/extension info belonging to a certain group.
     *
     * @param {string} group Group name.
     * @param {string} [field] The field to get. If not supplied, all the info will be returned.
     * @return {any} Info for the group.
     */
    getGroupMimeInfo(group: string, field?: string) : any {
        if (typeof this.groupsMimeInfo[group] == 'undefined') {
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
     * @param {string} extension Extension.
     * @return {string} Mimetype.
     */
    getMimeType(extension: string) : string {
        extension = this.cleanExtension(extension);

        if (this.extToMime[extension] && this.extToMime[extension].type) {
            return this.extToMime[extension].type;
        }
    }

    /**
     * Obtains descriptions for file types (e.g. 'Microsoft Word document') from the language file.
     * Based on Moodle's get_mimetype_description.
     *
     * @param {any} obj Instance of FileEntry OR object with 'filename' and 'mimetype' OR string with mimetype.
     * @param {boolean} [capitalise] If true, capitalises first character of result.
     * @return {string} Type description.
     */
    getMimetypeDescription(obj: any, capitalise?: boolean) : string {
        let filename = '',
            mimetype = '',
            extension = '',
            langPrefix = 'assets.mimetypes.';

        if (typeof obj == 'object' && typeof obj.file == 'function') {
            // It's a FileEntry. Don't use the file function because it's asynchronous and the type isn't reliable.
            filename = obj.name;
        } else if (typeof obj == 'object') {
            filename = obj.filename || '';
            mimetype = obj.mimetype || '';
        } else {
            mimetype = obj;
        }

        if (filename) {
            extension = this.getFileExtension(filename);

            if (!mimetype) {
                // Try to calculate the mimetype using the extension.
                mimetype = this.getMimeType(extension);
            }
        }

        if (!mimetype) {
            // Don't have the mimetype, stop.
            return '';
        }

        if (!extension) {
            extension = this.getExtension(mimetype);
        }

        let mimetypeStr = this.getMimetypeType(mimetype) || '',
            chunks = mimetype.split('/'),
            attr = {
                mimetype: mimetype,
                ext: extension || '',
                mimetype1: chunks[0],
                mimetype2: chunks[1] || '',
            },
            translateParams = {};

        for (let key in attr) {
            let value = attr[key];
            translateParams[key] = value;
            translateParams[key.toUpperCase()] = value.toUpperCase();
            translateParams[this.textUtils.ucFirst(key)] = this.textUtils.ucFirst(value);
        }

        // MIME types may include + symbol but this is not permitted in string ids.
        let safeMimetype = mimetype.replace(/\+/g, '_'),
            safeMimetypeStr = mimetypeStr.replace(/\+/g, '_'),
            safeMimetypeTrns = this.translate.instant(langPrefix + safeMimetype, {$a: translateParams}),
            safeMimetypeStrTrns = this.translate.instant(langPrefix + safeMimetypeStr, {$a: translateParams}),
            defaultTrns = this.translate.instant(langPrefix + 'default', {$a: translateParams}),
            result = mimetype;

        if (safeMimetypeTrns != langPrefix + safeMimetype) {
            result = safeMimetypeTrns;
        } else if (safeMimetypeStrTrns != langPrefix + safeMimetypeStr) {
            result = safeMimetypeStrTrns;
        } else if (defaultTrns != langPrefix + 'default') {
            result = defaultTrns;
        }

        if (capitalise) {
            result = this.textUtils.ucFirst(result);
        }

        return result;
    }

    /**
     * Get the "type" (string) of a mimetype, something like "image", "video" or "audio".
     *
     * @param {string} mimetype Mimetype.
     * @return {string} Type of the mimetype.
     */
    getMimetypeType(mimetype: string) : string {
        mimetype = mimetype.split(';')[0]; // Remove codecs from the mimetype if any.

        let extensions = this.mimeToExt[mimetype];
        if (!extensions) {
            return;
        }

        for (let i = 0; i < extensions.length; i++) {
            let extension = extensions[i];
            if (this.extToMime[extension] && this.extToMime[extension].string) {
                return this.extToMime[extension].string;
            }
        }
    }

    /**
     * Given a group name, return the translated name.
     *
     * @param {string} name Group name.
     * @return {string} Translated name.
     */
    getTranslatedGroupName(name: string) : string {
        let key = 'assets.mimetypes.group:' + name,
            translated = this.translate.instant(key);
        return translated != key ? translated : name;
    }

    /**
     * Check if an extension belongs to at least one of the groups.
     * Similar to Moodle's file_mimetype_in_typegroup, but using the extension instead of mimetype.
     *
     * @param {string} extension Extension.
     * @param {string[]} groups List of groups to check.
     * @return {boolean} Whether the extension belongs to any of the groups.
     */
    isExtensionInGroup(extension: string, groups: string[]) : boolean {
        extension = this.cleanExtension(extension);

        if (groups && groups.length && this.extToMime[extension] && this.extToMime[extension].groups) {
            for (let i = 0; i < this.extToMime[extension].groups.length; i++) {
                let group = this.extToMime[extension].groups[i];
                if (groups.indexOf(group) != -1) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Remove the extension from a path (if any).
     *
     * @param {string} path Path.
     * @return {string} Path without extension.
     */
    removeExtension(path: string) : string {
        let extension,
            position = path.lastIndexOf('.');

        if (position > -1) {
            // Check extension corresponds to a mimetype to know if it's valid.
            extension = path.substr(position + 1);
            if (typeof this.getMimeType(extension) != 'undefined') {
                return path.substr(0, position); // Remove extension.
            }
        }
        return path;
    }
}
