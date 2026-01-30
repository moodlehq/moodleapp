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

import { CoreText } from '@static/text';
import { CoreUtils } from '@static/utils';
import { CoreH5P } from '@features/h5p/services/h5p';
import { Translate } from '@singletons';
import { CoreH5PCore, CoreH5PLibraryData, CoreH5PLibraryAddonData, CoreH5PContentDepsTreeDependency } from './core';
import { CoreArray } from '@static/array';
import { CoreObject } from '@static/object';

const ALLOWED_STYLEABLE_TAGS = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'table', 'col', 'figure', 'td', 'th', 'li'];

/**
 * Equivalent to H5P's H5PContentValidator, but without some of the validations.
 * It's also used to build the dependency list.
 */
export class CoreH5PContentValidator {

    protected typeMap = {
        text: 'validateText',
        number: 'validateNumber', // eslint-disable-line id-denylist
        boolean: 'validateBoolean', // eslint-disable-line id-denylist
        list: 'validateList',
        group: 'validateGroup',
        file: 'validateFile',
        image: 'validateImage',
        video: 'validateVideo',
        audio: 'validateAudio',
        select: 'validateSelect',
        library: 'validateLibrary',
    };

    protected nextWeight = 1;
    protected libraries: { [libString: string]: CoreH5PLibraryData } = {};
    protected dependencies: { [key: string]: CoreH5PContentDepsTreeDependency } = {};
    protected relativePathRegExp = /^((\.\.\/){1,2})(.*content\/)?(\d+|editor)\/(.+)$/;
    protected allowedHtml: { [tag: string]: string } = {};
    protected allowedStyles?: RegExp[];
    protected metadataSemantics?: CoreH5PSemantics[];
    protected copyrightSemantics?: CoreH5PSemantics;

    constructor(protected siteId: string) { }

    /**
     * Add Addon library.
     *
     * @param library The addon library to add.
     * @returns Promise resolved when done.
     */
    async addon(library: CoreH5PLibraryAddonData): Promise<void> {
        const depKey = `preloaded-${library.machineName}`;

        this.dependencies[depKey] = {
            library: library,
            type: 'preloaded',
        };

        this.nextWeight = await CoreH5P.h5pCore.findLibraryDependencies(this.dependencies, library, this.nextWeight);

        this.dependencies[depKey].weight = this.nextWeight++;
    }

    /**
     * Get the flat dependency tree.
     *
     * @returns Dependencies.
     */
    getDependencies(): { [key: string]: CoreH5PContentDepsTreeDependency } {
        return this.dependencies;
    }

    /**
     * Validate metadata
     *
     * @param metadata Metadata.
     * @returns Promise resolved with metadata validated & filtered.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validateMetadata(metadata: any): Promise<unknown> {
        const semantics = this.getMetadataSemantics();
        const group = CoreUtils.clone(metadata || {});

        // Stop complaining about "invalid selected option in select" for old content without license chosen.
        if (group.license === undefined) {
            group.license = 'U';
        }

        return this.validateGroup(group, { type: 'group', fields: semantics }, false);
    }

    /**
     * Validate given text value against text semantics.
     *
     * @param text Text to validate.
     * @param semantics Semantics.
     * @returns Validated text.
     */
    validateText(text: string, semantics: CoreH5PSemantics): string {
        if (typeof text != 'string') {
            text = '';
        }

        if (semantics.tags) {
            // Not testing for empty array allows us to use the 4 defaults without specifying them in semantics.
            let tags = ['div', 'span', 'p', 'br'].concat(semantics.tags);

            // Add related tags for table etc.
            if (tags.indexOf('table') != -1) {
                tags = tags.concat(['tr', 'td', 'th', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'figure', 'figcaption']);
            }
            if (tags.indexOf('b') != -1) {
                tags.push('strong');
            }
            if (tags.indexOf('i') != -1) {
                tags.push('em');
            }
            if (tags.indexOf('ul') != -1 || tags.indexOf('ol') != -1) {
                tags.push('li');
            }
            if (tags.indexOf('del') != -1 || tags.indexOf('strike') != -1) {
                tags.push('s');
            }

            tags = CoreArray.unique(tags);

            // Determine allowed style tags
            const stylePatterns: RegExp[] = [];
            // All styles must be start to end patterns (^...$)
            if (semantics.font) {
                if (semantics.font.size) {
                    stylePatterns.push(/^font-size: *[0-9.]+(em|px|%) *;?$/i);
                }
                if (semantics.font.family) {
                    stylePatterns.push(/^font-family: *[-a-z0-9,'&; ]+;?$/i);
                }
                if (semantics.font.color) {
                    stylePatterns.push(/^color: *(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\)|hsla?\([0-9,.% ]+\)) *;?$/i);
                }
                if (semantics.font.background) {
                    stylePatterns.push(
                        /^background-color: *(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\)|hsla?\([0-9,.% ]+\)) *;?$/i,
                    );
                }
                if (semantics.font.spacing) {
                    stylePatterns.push(/^letter-spacing: *[0-9.]+(em|px|%) *;?$/i);
                }
                if (semantics.font.height) {
                    stylePatterns.push(/^line-height: *[0-9.]+(em|px|%|) *;?$/i);
                }
            }

            // Allow styling of tables if they are allowed
            if (semantics.tags?.indexOf('table') != -1) {
                // CKEditor outputs border as width style color
                // eslint-disable-next-line @stylistic/max-len
                stylePatterns.push(/^border: *[0-9.]+(em|px|%|) *(none|solid|dotted|dashed|double|groove|ridge|inset|outset) *(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\)|hsla?\([0-9,.% ]+\)) *;?$/i);
                stylePatterns.push(/^border-style: *(none|solid|dotted|dashed|double|groove|ridge|inset|outset) *;?$/i);
                stylePatterns.push(/^border-width: *[0-9.]+(em|px|%|) *;?$/i);
                stylePatterns.push(/^border-color: *(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\)|hsla?\([0-9,.% ]+\)) *;?$/i);
                stylePatterns.push(/^vertical-align: *(middle|top|bottom);?$/i);
                stylePatterns.push(/^padding: *[0-9.]+(em|px|%|) *;?$/i);
                stylePatterns.push(/^width: *[0-9.]+(em|px|%|) *;?$/i);
                stylePatterns.push(/^height: *[0-9.]+(em|px|%|) *;?$/i);
                stylePatterns.push(/^float: *(right|left|none) *;?$/i);
                // Needed for backwards compatibility
                stylePatterns.push(/^border-collapse: *collapse *;?$/i);
                // Table can have background color when font bgcolor is disabled
                // Double entry of bgcolor in stylePatterns shouldn't matter
                stylePatterns.push(/^background-color: *(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\)|hsla?\([0-9,.% ]+\)) *;?$/i);
              }

            // Alignment is allowed for all wysiwyg texts
            stylePatterns.push(/^text-align: *(center|left|right);?$/i);

            // Strip invalid HTML tags.
            text = this.filterXss(text, tags, stylePatterns);
        } else {
            // Filter text to plain text.
            text = CoreText.escapeHTML(text, false);
        }

        // Check if string is within allowed length.
        if (semantics.maxLength !== undefined) {
            text = text.substring(0, semantics.maxLength);
        }

        return text;
    }

    /**
     * Validates content files
     *
     * @param contentPath The path containing content files to validate.
     * @param isLibrary Whether it's a library.
     * @returns True if all files are valid.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    validateContentFiles(contentPath: string, isLibrary = false): boolean {
        // Nothing to do, already checked by Moodle.
        return true;
    }

    /**
     * Validate given value against number semantics.
     *
     * @param value Number to validate.
     * @param semantics Semantics.
     * @returns Validated number.
     */
    validateNumber(value: unknown, semantics: CoreH5PSemantics): number {
        // Validate that num is indeed a number.
        let num = Number(value);
        if (isNaN(num)) {
            num = 0;
        }
        // Check if number is within valid bounds. Move within bounds if not.
        if (semantics.min !== undefined && num < semantics.min) {
            num = semantics.min;
        }
        if (semantics.max !== undefined && num > semantics.max) {
            num = semantics.max;
        }
        // Check if number is within allowed bounds even if step value is set.
        if (semantics.step !== undefined) {
            const testNumber = num - (semantics.min !== undefined ? semantics.min : 0);
            const rest = testNumber % semantics.step;
            if (rest !== 0) {
                num -= rest;
            }
        }
        // Check if number has proper number of decimals.
        if (semantics.decimals !== undefined) {
            num = Number(num.toFixed(semantics.decimals));
        }

        return num;
    }

    /**
     * Validate given value against boolean semantics.
     *
     * @param bool Boolean to check.
     * @returns Validated bool.
     */
    validateBoolean(bool: unknown): boolean {
        return !!bool;
    }

    /**
     * Validate select values.
     *
     * @param select Values to validate.
     * @param semantics Semantics.
     * @returns Validated select.
     */
    validateSelect(select: string | string[], semantics: CoreH5PSemantics): string | string[] {
        const optional = semantics.optional;
        const options: Record<string, boolean> = {};
        let strict = false;

        if (semantics.options && semantics.options.length) {
            // We have a strict set of options to choose from.
            strict = true;

            semantics.options.forEach((option: OptionSemantics) => {
                // Support optgroup - just flatten options into one.
                if (option.type == 'optgroup') {
                    option.options?.forEach((subOption) => {
                        options[subOption.value || ''] = true;
                    });
                } else if (option.value) {
                    options[option.value] = true;
                }
            });
        }

        if (semantics.multiple && Array.isArray(select)) {
            // Multi-choice generates array of values. Test each one against valid options, if we are strict.
            for (const key in select) {
                const value = select[key];

                if (strict && !optional && !options[value]) {
                    delete select[key];
                } else {
                    select[key] = CoreText.escapeHTML(value, false);
                }
            }
        } else {
            // Single mode. If we get an array in here, we chop off the first element and use that instead.
            if (Array.isArray(select)) {
                select = select[0];
            }

            if (strict && !optional && !options[select]) {
                select = (<OptionSemantics> semantics.options![0]).value || '';
            }
            select = CoreText.escapeHTML(select, false);
        }

        return select;
    }

    /**
     * Validate given list value against list semantics.
     * Will recurse into validating each item in the list according to the type.
     *
     * @param list List to validate.
     * @param semantics Semantics.
     * @returns Validated list.
     */
    async validateList(list: Record<string, unknown> | unknown[], semantics: CoreH5PSemantics): Promise<unknown[] | null> {
        const field = semantics.field!;
        const validateFunction = this[this.typeMap[field.type || '']].bind(this);
        const isArray = Array.isArray(list);
        let keys = Object.keys(list);

        // Check that list is not longer than allowed length.
        if (semantics.max !== undefined) {
            keys = keys.slice(0, semantics.max);
        }

        // Validate each element in list.
        for (const i in keys) {
            const key = keys[i];
            const keyNumber = parseInt(key, 10);

            if (isNaN(keyNumber)) {
                // It's an object and the key isn't an integer. Delete it.
                delete list[key];
            } else {
                const val = await validateFunction(list[keyNumber], field);

                if (val === null) {
                    if (isArray) {
                        (<unknown[]> list).splice(keyNumber, 1);
                    } else {
                        delete list[key];
                    }
                } else {
                    list[keyNumber] = val;
                }
            }
        }

        if (!isArray) {
            list = CoreObject.toArray(<Record<string, unknown>> list);
        }

        if (!list.length) {
            return null;
        }

        return <unknown[]> list;
    }

    /**
     * Validate a file like object, such as video, image, audio and file.
     *
     * @param file File to validate.
     * @param semantics Semantics.
     * @param typeValidKeys List of valid keys.
     * @returns Promise resolved with the validated file.
     */
    protected async validateFilelike(file: FileLike, semantics: CoreH5PSemantics, typeValidKeys: string[] = []): Promise<FileLike> {
        // Do not allow to use files from other content folders.
        const matches = file.path.match(this.relativePathRegExp);
        if (matches && matches.length) {
            file.path = matches[5];
        }

        // Remove temporary files suffix.
        if (file.path.slice(-4) === '#tmp') {
            file.path = file.path.substring(0, file.path.length - 4);
        }

        // Make sure path and mime does not have any special chars
        file.path = CoreText.escapeHTML(file.path, false);
        if (file.mime) {
            file.mime = CoreText.escapeHTML(file.mime, false);
        }

        // Remove attributes that should not exist, they may contain JSON escape code.
        let validKeys = ['path', 'mime', 'copyright'].concat(typeValidKeys);
        if (semantics.extraAttributes) {
            validKeys = validKeys.concat(semantics.extraAttributes);
        }
        validKeys = CoreArray.unique(validKeys);

        this.filterParams(file, validKeys);

        if (typeof file.width == 'string') {
            file.width = parseInt(file.width, 10);
        }

        if (typeof file.height == 'string') {
            file.height = parseInt(file.height, 10);
        }

        if (file.codecs) {
            file.codecs = CoreText.escapeHTML(file.codecs, false);
        }

        if (typeof file.bitrate == 'string') {
            file.bitrate = parseInt(file.bitrate, 10);
        }

        if (file.quality !== undefined) {
            if (file.quality === null || file.quality.level === undefined || file.quality.label === undefined) {
                delete file.quality;
            } else {
                this.filterParams(file.quality, ['level', 'label']);
                file.quality.level = Number(file.quality.level);
                file.quality.label = CoreText.escapeHTML(file.quality.label, false);
            }
        }

        if (file.copyright !== undefined) {
            await this.validateGroup(file.copyright, this.getCopyrightSemantics());
        }

        return file;
    }

    /**
     * Validate given file data.
     *
     * @param file File.
     * @param semantics Semantics.
     * @returns Promise resolved with the validated file.
     */
    validateFile(file: FileLike, semantics: CoreH5PSemantics): Promise<FileLike> {
        return this.validateFilelike(file, semantics);
    }

    /**
     * Validate given image data.
     *
     * @param image Image.
     * @param semantics Semantics.
     * @returns Promise resolved with the validated file.
     */
    validateImage(image: FileLike, semantics: CoreH5PSemantics): Promise<FileLike> {
        return this.validateFilelike(image, semantics, ['width', 'height', 'originalImage']);
    }

    /**
     * Validate given video data.
     *
     * @param video Video.
     * @param semantics Semantics.
     * @returns Promise resolved with the validated file.
     */
    async validateVideo(video: Record<string, FileLike>, semantics: CoreH5PSemantics): Promise<Record<string, FileLike>> {
        for (const key in video) {
            await this.validateFilelike(video[key], semantics, ['width', 'height', 'codecs', 'quality', 'bitrate']);
        }

        return video;
    }

    /**
     * Validate given audio data.
     *
     * @param audio Audio.
     * @param semantics Semantics.
     * @returns Promise resolved with the validated file.
     */
    async validateAudio(audio: Record<string, FileLike>, semantics: CoreH5PSemantics): Promise<Record<string, FileLike>> {
        for (const key in audio) {
            await this.validateFilelike(audio[key], semantics);
        }

        return audio;
    }

    /**
     * Validate given group value against group semantics.
     * Will recurse into validating each group member.
     *
     * @param group Group.
     * @param semantics Semantics.
     * @param flatten Whether to flatten.
     * @returns Promise resolved when done.
     */
    async validateGroup(group: unknown, semantics: CoreH5PSemantics, flatten = true): Promise<unknown> {
        if (!semantics.fields) {
            return group;
        }

        // Groups with just one field are compressed in the editor to only output the child content.
        const isSubContent = semantics.isSubContent === true;

        if (semantics.fields.length == 1 && flatten && !isSubContent) {
            const field = semantics.fields[0];
            const validateFunction = this[this.typeMap[field.type || '']].bind(this);

            return validateFunction(group, field);
        } else {
            const groupObject = <Record<string, unknown>> group;

            for (const key in groupObject) {
                // If subContentId is set, keep value
                if (isSubContent && key == 'subContentId') {
                    continue;
                }

                // Find semantics for name=key.
                const field = semantics.fields.find(field => field.name === key);
                let value: unknown = null;

                if (field) {
                    if (semantics.optional) {
                        field.optional = true;
                    }

                    const validateFunction = this[this.typeMap[field.type || '']].bind(this);
                    if (validateFunction) {
                        value = await validateFunction(groupObject[key], field);

                        groupObject[key] = value;
                    }
                }

                if (value === null) {
                    delete groupObject[key];
                }
            }

            return groupObject;
        }
    }

    /**
     * Validate given library value against library semantics.
     * Check if provided library is within allowed options.
     * Will recurse into validating the library's semantics too.
     *
     * @param value Value.
     * @param semantics Semantics.
     * @returns Promise resolved when done.
     */
    async validateLibrary(value: LibraryType, semantics: CoreH5PSemantics): Promise<LibraryType | undefined> {
        if (!value.library) {
            return;
        }

        if (!this.libraries[value.library]) {
            // Load the library and store it in the index of libraries.
            const libSpec = CoreH5PCore.libraryFromString(value.library);

            this.libraries[value.library] = await CoreH5P.h5pCore.loadLibrary(
                libSpec?.machineName || '',
                libSpec?.majorVersion || 0,
                libSpec?.minorVersion || 0,
                this.siteId,
            );
        }

        const library = this.libraries[value.library];

        // Validate parameters.
        value.params = await this.validateGroup(value.params, { type: 'group', fields: library.semantics }, false);

        // Validate subcontent's metadata
        if (value.metadata) {
            value.metadata = await this.validateMetadata(value.metadata);
        }

        let validKeys = ['library', 'params', 'subContentId', 'metadata'];
        if (semantics.extraAttributes) {
            validKeys = CoreArray.unique(validKeys.concat(semantics.extraAttributes));
        }

        this.filterParams(value, validKeys);

        if (value.subContentId &&
                !value.subContentId.match(/^\{?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}?$/)) {
            delete value.subContentId;
        }

        // Find all dependencies for this library.
        const depKey = `preloaded-${library.machineName}`;
        if (!this.dependencies[depKey]) {
            this.dependencies[depKey] = {
                library: library,
                type: 'preloaded',
            };

            this.nextWeight = await CoreH5P.h5pCore.findLibraryDependencies(this.dependencies, library, this.nextWeight);

            this.dependencies[depKey].weight = this.nextWeight++;

            return value;
        } else {
            return value;
        }
    }

    /**
     * Check params for a allowlist of allowed properties.
     *
     * @param params Object to filter.
     * @param allowlist List of keys to keep.
     */
    filterParams(params: Record<string, unknown>, allowlist: string[]): void {
        for (const key in params) {
            if (allowlist.indexOf(key) == -1) {
                delete params[key];
            }
        }
    }

    /**
     * Filters HTML to prevent cross-site-scripting (XSS) vulnerabilities.
     * Based on kses by Ulf Harnhammar, see http://sourceforge.net/projects/kses.
     *
     * @param text The string with raw HTML in it.
     * @param allowedTags An array of allowed tags.
     * @param allowedStyles Allowed styles.
     * @returns An XSS safe version of the string.
     */
    protected filterXss(text: string, allowedTags?: string[], allowedStyles?: RegExp[]): string {
        if (!text || typeof text != 'string') {
            return text;
        }

        allowedTags = allowedTags || ['a', 'em', 'strong', 'cite', 'blockquote', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd'];

        this.allowedStyles = allowedStyles;

        // Store the text format.
        this.filterXssSplit(allowedTags, true);

        // Remove Netscape 4 JS entities.
        text = text.replace(/&\s*\{[^}]*(\}\s*;?|$)/g, '');

        // Defuse all HTML entities.
        text = text.replace(/&/g, '&amp;');

        // Change back only well-formed entities in our allowed list:
        // Decimal numeric entities.
        text = text.replace(/&amp;#([0-9]+;)/g, '&#$1');
        // Hexadecimal numeric entities.
        text = text.replace(/&amp;#[Xx]0*((?:[0-9A-Fa-f]{2})+;)/g, '&#x$1');
        // Named entities.
        text = text.replace(/&amp;([A-Za-z][A-Za-z0-9]*;)/g, '&$1');

        const matches = text.match(/(<(?=[^a-zA-Z!/])|<!--.*?-->|<[^>]*(>|$)|>)/g);
        if (matches && matches.length) {
            matches.forEach((match) => {
                text = text.replace(match, this.filterXssSplit([match]));
            });
        }

        return text;
    }

    /**
     * Processes an HTML tag.
     *
     * @param tags An array with various meaning depending on the value of store.
     *             If store is TRUE then the array contains the allowed tags.
     *             If store is FALSE then the array has one element, the HTML tag to process.
     * @param store Whether to store m.
     * @returns string If the element isn't allowed, an empty string. Otherwise, the cleaned up version of the HTML element.
     */
    protected filterXssSplit(tags: string[], store = false): string {
        if (store) {
            this.allowedHtml = CoreArray.toObject(tags);

            return '';
        }

        const tag = tags[0];

        if (tag.substring(0, 1) != '<') {
            // We matched a lone ">" character.
            return '&gt;';
        } else if (tag.length == 1) {
            // We matched a lone "<" character.
            return '&lt;';
        }

        const matches = tag.match(/^<\s*(\/\s*)?([a-zA-Z0-9-]+)\s*([^>]*)>?|(<!--.*?-->)$/);
        if (!matches) {
            // Seriously malformed.
            return '';
        }

        const slash = matches[1] ? matches[1].trim() : '';
        const attrList = matches[3] || '';
        const comment = matches[4] || '';
        let elem = matches[2] || '';

        if (comment) {
            elem = '!--';
        }

        if (!this.allowedHtml[elem.toLowerCase()]) {
            // Disallowed HTML element.
            return '';
        }

        if (comment) {
            return comment;
        }

        if (slash != '') {
            return `</${elem}>`;
        }

        // Is there a closing XHTML slash at the end of the attributes?
        const newAttrList = attrList.replace(/(\s?)\/\s*$/g, '$1');
        const xhtmlSlash = attrList != newAttrList ? ' /' : '';

        // Clean up attributes.
        let attr2 = this.filterXssAttributes(
            newAttrList,
            ALLOWED_STYLEABLE_TAGS.indexOf(elem) != -1 ? this.allowedStyles : undefined,
        ).join(' ');
        attr2 = attr2.replace(/[<>]/g, '');
        attr2 = attr2.length ? ` ${attr2}` : '';

        return `<${elem}${attr2}${xhtmlSlash}>`;
    }

    /**
     * Processes a string of HTML attributes.
     *
     * @param attr HTML attributes.
     * @param allowedStyles Allowed styles.
     * @returns Cleaned up version of the HTML attributes.
     */
    protected filterXssAttributes(attr: string, allowedStyles?: RegExp[]): string[] {
        const attrArray: string[] = [];
        let mode = 0;
        let attrName = '';
        let skip = false;

        while (attr.length != 0) {
            // Was the last operation successful?
            let working = 0;
            let matches: RegExpMatchArray | null = null;
            let thisVal: string | undefined;

            switch (mode) {
                case 0:
                    // Attribute name, href for instance.
                    matches = attr.match(/^([-a-zA-Z]+)/);
                    if (matches && matches.length > 1) {
                        attrName = matches[1].toLowerCase();
                        skip = attrName == 'style' || attrName.substring(0, 2) == 'on' || attrName.substring(0, 1) == '-' ||
                                attrName.length > 96; // Ignore long attributes to avoid unnecessary processing overhead.
                        working = mode = 1;
                        attr = attr.replace(/^[-a-zA-Z]+/, '');
                    }
                    break;

                case 1:
                    // Equals sign or valueless ("selected").
                    if (attr.match(/^\s*=\s*/)) {
                        working = 1;
                        mode = 2;
                        attr = attr.replace(/^\s*=\s*/, '');
                        break;
                    }

                    if (attr.match(/^\s+/)) {
                        working = 1;
                        mode = 0;
                        if (!skip) {
                            attrArray.push(attrName);
                        }
                        attr = attr.replace(/^\s+/, '');
                    }
                    break;

                case 2:
                    // Attribute value, a URL after href= for instance.
                    matches = attr.match(/^"([^"]*)"(\s+|$)/);
                    if (matches && matches.length > 1) {
                        if (allowedStyles && attrName === 'style') {
                            // Allow certain styles.

                            // Prevent font family from getting split wrong because of the ; in &quot;
                            if (matches[1].includes('font-family')) {
                                matches[1] = matches[1].replace(/&quot;/g, '\'');
                            }

                            const validatedStyles: string[] = [];
                            const styles = matches[1].split(';');

                            for (const pattern of allowedStyles) {
                                for (let style of styles) {
                                    style = style.trim();
                                    if (style.match(pattern)) {
                                        validatedStyles.push(style);
                                        break;
                                    }
                                }
                            }

                            attrArray.push(`style="${validatedStyles.join(';')};"`);
                            break;
                        }

                        thisVal = this.filterXssBadProtocol(matches[1]);

                        if (!skip) {
                            attrArray.push(`${attrName}="${thisVal}"`);
                        }
                        working = 1;
                        mode = 0;
                        attr = attr.replace(/^"[^"]*"(\s+|$)/, '');
                        break;
                    }

                    matches = attr.match(/^'([^']*)'(\s+|$)/);
                    if (matches && matches.length > 1) {
                        thisVal = this.filterXssBadProtocol(matches[1]);

                        if (!skip) {
                            attrArray.push(`${attrName}="${thisVal}"`);
                        }
                        working = 1;
                        mode = 0;
                        attr = attr.replace(/^'[^']*'(\s+|$)/, '');
                        break;
                    }

                    matches = attr.match(/^([^\s"']+)(\s+|$)/);
                    if (matches && matches.length > 1) {
                        thisVal = this.filterXssBadProtocol(matches[1]);

                        if (!skip) {
                            attrArray.push(`${attrName}="${thisVal}"`);
                        }
                        working = 1;
                        mode = 0;
                        attr = attr.replace(/^([^\s"']+)(\s+|$)/, '');
                    }
                    break;

                default:
            }

            if (working == 0) {
                // Not well formed; remove and try again.
                attr = attr.replace(/^("[^"]*("|$)|'[^']*('|$)||\S)*\s*/, '');
                mode = 0;
            }
        }

        // The attribute list ends with a valueless attribute like "selected".
        if (mode == 1 && !skip) {
            attrArray.push(attrName);
        }

        return attrArray;
    }

    /**
     * Processes an HTML attribute value and strips dangerous protocols from URLs.
     *
     * @param str The string with the attribute value.
     * @param decode Whether to decode entities in the str.
     * @returns Cleaned up and HTML-escaped version of str.
     */
    filterXssBadProtocol(str: string, decode = true): string {
        // Get the plain text representation of the attribute value (i.e. its meaning).
        if (decode) {
            str = CoreText.decodeHTMLEntities(str);
        }

        return CoreText.escapeHTML(this.stripDangerousProtocols(str), false);
    }

    /**
     * Strips dangerous protocols (e.g. 'javascript:') from a URI.
     *
     * @param uri A plain-text URI that might contain dangerous protocols.
     * @returns A plain-text URI stripped of dangerous protocols.
     */
    protected stripDangerousProtocols(uri: string): string {

        const allowedProtocols = {
            ftp: true,
            http: true,
            https: true,
            mailto: true,
        };
        let before: string | undefined;

        // Iteratively remove any invalid protocol found.
        do {
            before = uri;
            const colonPos = uri.indexOf(':');

            if (colonPos > 0) {
                // We found a colon, possibly a protocol. Verify.
                const protocol = uri.substring(0, colonPos);
                // If a colon is preceded by a slash, question mark or hash, it cannot possibly be part of the URL scheme.
                // This must be a relative URL, which inherits the (safe) protocol of the base document.
                if (protocol.match(/[/?#]/)) {
                    break;
                }
                // Check if this is a disallowed protocol.
                if (!allowedProtocols[protocol.toLowerCase()]) {
                    uri = uri.substring(colonPos + 1);
                }
            }
        } while (before != uri);

        return uri;
    }

    /**
     * Get metadata semantics.
     *
     * @returns Semantics.
     */
    getMetadataSemantics(): CoreH5PSemantics[] {

        if (this.metadataSemantics) {
            return this.metadataSemantics;
        }

        const ccVersions = this.getCCVersions();

        this.metadataSemantics = [
            {
                name: 'title',
                type: 'text',
                label: Translate.instant('core.h5p.title'),
                placeholder: 'La Gioconda',
            },
            {
                name: 'a11yTitle',
                type: 'text',
                label: Translate.instant('core.h5p.a11yTitle:label'),
                optional: true,
            },
            {
                name: 'license',
                type: 'select',
                label: Translate.instant('core.h5p.license'),
                default: 'U',
                options: [
                    {
                        value: 'U',
                        label: Translate.instant('core.h5p.undisclosed'),
                    },
                    {
                        type: 'optgroup',
                        label: Translate.instant('core.h5p.creativecommons'),
                        options: [
                            {
                                value: 'CC BY',
                                label: Translate.instant('core.h5p.ccattribution'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC BY-SA',
                                label: Translate.instant('core.h5p.ccattributionsa'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC BY-ND',
                                label: Translate.instant('core.h5p.ccattributionnd'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC BY-NC',
                                label: Translate.instant('core.h5p.ccattributionnc'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC BY-NC-SA',
                                label: Translate.instant('core.h5p.ccattributionncsa'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC BY-NC-ND',
                                label: Translate.instant('core.h5p.ccattributionncnd'),
                                versions: ccVersions,
                            },
                            {
                                value: 'CC0 1.0',
                                label: Translate.instant('core.h5p.ccpdd'),
                            },
                            {
                                value: 'CC PDM',
                                label: Translate.instant('core.h5p.pdm'),
                            },
                        ],
                    },
                    {
                        value: 'GNU GPL',
                        label: Translate.instant('core.h5p.gpl'),
                    },
                    {
                        value: 'PD',
                        label: Translate.instant('core.h5p.pd'),
                    },
                    {
                        value: 'ODC PDDL',
                        label: Translate.instant('core.h5p.pddl'),
                    },
                    {
                        value: 'C',
                        label: Translate.instant('core.h5p.copyrightstring'),
                    },
                ],
            },
            {
                name: 'licenseVersion',
                type: 'select',
                label: Translate.instant('core.h5p.licenseversion'),
                options: ccVersions,
                optional: true,
            },
            {
                name: 'yearFrom',
                type: 'number',
                label: Translate.instant('core.h5p.yearsfrom'),
                placeholder: '1991',
                min: -9999,
                max: 9999,
                optional: true,
            },
            {
                name: 'yearTo',
                type: 'number',
                label: Translate.instant('core.h5p.yearsto'),
                placeholder: '1992',
                min: -9999,
                max: 9999,
                optional: true,
            },
            {
                name: 'source',
                type: 'text',
                label: Translate.instant('core.h5p.source'),
                placeholder: 'https://',
                optional: true,
            },
            {
                name: 'authors',
                type: 'list',
                field: {
                    name: 'author',
                    type: 'group',
                    fields: [
                        {
                            label: Translate.instant('core.h5p.authorname'),
                            name: 'name',
                            optional: true,
                            type: 'text',
                        },
                        {
                            name: 'role',
                            type: 'select',
                            label: Translate.instant('core.h5p.authorrole'),
                            default: 'Author',
                            options: [
                                {
                                    value: 'Author',
                                    label: Translate.instant('core.h5p.author'),
                                },
                                {
                                    value: 'Editor',
                                    label: Translate.instant('core.h5p.editor'),
                                },
                                {
                                    value: 'Licensee',
                                    label: Translate.instant('core.h5p.licensee'),
                                },
                                {
                                    value: 'Originator',
                                    label: Translate.instant('core.h5p.originator'),
                                },
                            ],
                        },
                    ],
                },
            },
            {
                name: 'licenseExtras',
                type: 'text',
                widget: 'textarea',
                label: Translate.instant('core.h5p.licenseextras'),
                optional: true,
                description: Translate.instant('core.h5p.additionallicenseinfo'),
            },
            {
                name: 'changes',
                type: 'list',
                field: {
                    name: 'change',
                    type: 'group',
                    label: Translate.instant('core.h5p.changelog'),
                    fields: [
                        {
                            name: 'date',
                            type: 'text',
                            label: Translate.instant('core.h5p.date'),
                            optional: true,
                        },
                        {
                            name: 'author',
                            type: 'text',
                            label: Translate.instant('core.h5p.changedby'),
                            optional: true,
                        },
                        {
                            name: 'log',
                            type: 'text',
                            widget: 'textarea',
                            label: Translate.instant('core.h5p.changedescription'),
                            placeholder: Translate.instant('core.h5p.changeplaceholder'),
                            optional: true,
                        },
                    ],
                },
            },
            {
                name: 'authorComments',
                type: 'text',
                widget: 'textarea',
                label: Translate.instant('core.h5p.authorcomments'),
                description: Translate.instant('core.h5p.authorcommentsdescription'),
                optional: true,
            },
            {
                name: 'contentType',
                type: 'text',
                widget: 'none',
            },
            {
                name: 'defaultLanguage',
                type: 'text',
                widget: 'none',
            },
        ];

        return this.metadataSemantics;
    }

    /**
     * Get copyright semantics.
     *
     * @returns Semantics.
     */
    getCopyrightSemantics(): CoreH5PSemantics {

        if (this.copyrightSemantics) {
            return this.copyrightSemantics;
        }

        const ccVersions = this.getCCVersions();

        this.copyrightSemantics = {
            name: 'copyright',
            type: 'group',
            label: Translate.instant('core.h5p.copyrightinfo'),
            fields: [
                {
                    name: 'title',
                    type: 'text',
                    label: Translate.instant('core.h5p.title'),
                    placeholder: 'La Gioconda',
                    optional: true,
                },
                {
                    name: 'author',
                    type: 'text',
                    label: Translate.instant('core.h5p.author'),
                    placeholder: 'Leonardo da Vinci',
                    optional: true,
                },
                {
                    name: 'year',
                    type: 'text',
                    label: Translate.instant('core.h5p.years'),
                    placeholder: '1503 - 1517',
                    optional: true,
                },
                {
                    name: 'source',
                    type: 'text',
                    label: Translate.instant('core.h5p.source'),
                    placeholder: 'http://en.wikipedia.org/wiki/Mona_Lisa',
                    optional: true,
                    regexp: {
                        pattern: '^http[s]?://.+',
                        modifiers: 'i',
                    },
                },
                {
                    name: 'license',
                    type: 'select',
                    label: Translate.instant('core.h5p.license'),
                    default: 'U',
                    options: [
                        {
                            value: 'U',
                            label: Translate.instant('core.h5p.undisclosed'),
                        },
                        {
                            value: 'CC BY',
                            label: Translate.instant('core.h5p.ccattribution'),
                            versions: ccVersions,
                        },
                        {
                            value: 'CC BY-SA',
                            label: Translate.instant('core.h5p.ccattributionsa'),
                            versions: ccVersions,
                        },
                        {
                            value: 'CC BY-ND',
                            label: Translate.instant('core.h5p.ccattributionnd'),
                            versions: ccVersions,
                        },
                        {
                            value: 'CC BY-NC',
                            label: Translate.instant('core.h5p.ccattributionnc'),
                            versions: ccVersions,
                        },
                        {
                            value: 'CC BY-NC-SA',
                            label: Translate.instant('core.h5p.ccattributionncsa'),
                            versions: ccVersions,
                        },
                        {
                            value: 'CC BY-NC-ND',
                            label: Translate.instant('core.h5p.ccattributionncnd'),
                            versions: ccVersions,
                        },
                        {
                            value: 'GNU GPL',
                            label: Translate.instant('core.h5p.licenseGPL'),
                            versions: [
                                {
                                    value: 'v3',
                                    label: Translate.instant('core.h5p.licenseV3'),
                                },
                                {
                                    value: 'v2',
                                    label: Translate.instant('core.h5p.licenseV2'),
                                },
                                {
                                    value: 'v1',
                                    label: Translate.instant('core.h5p.licenseV1'),
                                },
                            ],
                        },
                        {
                            value: 'PD',
                            label: Translate.instant('core.h5p.pd'),
                            versions: [
                                {
                                    value: '-',
                                    label: '-',
                                },
                                {
                                    value: 'CC0 1.0',
                                    label: Translate.instant('core.h5p.licenseCC010U'),
                                },
                                {
                                    value: 'CC PDM',
                                    label: Translate.instant('core.h5p.pdm'),
                                },
                            ],
                        },
                        {
                            value: 'C',
                            label: Translate.instant('core.h5p.copyrightstring'),
                        },
                    ],
                },
                {
                    name: 'version',
                    type: 'select',
                    label: Translate.instant('core.h5p.licenseversion'),
                    options: [],
                },
            ],
        };

        return this.copyrightSemantics;
    }

    /**
     * Get CC versions for semantics.
     *
     * @returns CC versions.
     */
    protected getCCVersions(): VersionSemantics[] {
        return [
            {
                value: '4.0',
                label: Translate.instant('core.h5p.licenseCC40'),
            },
            {
                value: '3.0',
                label: Translate.instant('core.h5p.licenseCC30'),
            },
            {
                value: '2.5',
                label: Translate.instant('core.h5p.licenseCC25'),
            },
            {
                value: '2.0',
                label: Translate.instant('core.h5p.licenseCC20'),
            },
            {
                value: '1.0',
                label: Translate.instant('core.h5p.licenseCC10'),
            },
        ];
    }

}

/**
 * Semantics of each field type. More info in https://h5p.org/semantics
 */
export type CoreH5PSemantics = {
    type?: string;
    name?: string;
    label?: string;
    description?: string;
    optional?: boolean;
    default?: string;
    importance?: 'low' | 'medium' | 'high';
    common?: boolean;
    widget?: string;
    widgets?: {
        name: string;
        label: string;
    }[];
    field?: CoreH5PSemantics;
    fields?: CoreH5PSemantics[];
    maxLength?: number;
    regexp?: {
        pattern: string;
        modifiers: string;
    };
    enterMode?: 'p' | 'div';
    tags?: string[];
    font?: {
        size?: unknown;
        family?: unknown;
        color?: unknown;
        background?: unknown;
        spacing?: unknown;
        height?: unknown;
    };
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    entity?: string;
    isSubContent?: boolean;
    expanded?: boolean;
    options?: (string | OptionSemantics)[];
    important?: {
        description: string;
        example: string;
    };
    multiple?: boolean;
    extraAttributes?: string[];
    placeholder?: string;
};

type OptionSemantics = {
    value?: string;
    label?: string;
    type?: string;
    options?: OptionSemantics[];
    versions?: VersionSemantics[];
};

type VersionSemantics = {
    value: string;
    label: string;
};

/**
 * File like object, such as video, image, audio and file.
 */
type FileLike = {
    path: string;
    mime?: string;
    width?: number | string;
    height?: number | string;
    codecs?: string;
    bitrate?: number | string;
    quality?: {
        level?: string | number;
        label?: string;
    };
    copyright?: unknown;
};

/**
 * Library type.
 */
type LibraryType = {
    library: string;
    params: unknown;
    metadata?: unknown;
    subContentId?: string;
};
