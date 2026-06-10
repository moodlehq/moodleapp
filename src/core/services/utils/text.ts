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

import { CoreAnyError } from '@classes/errors/error';
import { CoreText } from '@static/text';
import { CoreErrorHelper } from '@services/error-helper';

/**
 * "Utils" service with helper functions for text.
 *
 * @deprecated since 4.5. Some of the functions have been moved to CoreText but not all of them, check function deprecation message.
 */
@Injectable({ providedIn: 'root' })
export class CoreTextUtilsProvider {

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param text Text to format.
     * @returns Formatted text.
     *
     * @deprecated since 4.5. Use CoreText.formatHtmlLines instead.
     */
    formatHtmlLines(text: string): string {
        return CoreText.formatHtmlLines(text);
    }

    /**
     * Get the error message from an error object.
     *
     * @param error Error.
     * @returns Error message, undefined if not found.
     *
     * @deprecated since 4.5. Use CoreErrorHelper.getErrorMessageFromError instead.
     */
    getErrorMessageFromError(error?: CoreAnyError): string | undefined {
        return CoreErrorHelper.getErrorMessageFromError(error);
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param json JSON text.
     * @param defaultValue Default value to return if the parse fails. Defaults to the original value.
     * @param logErrorFn An error to call with the exception to log the error. If not supplied, no error.
     * @returns JSON parsed as object or what it gets.
     *
     * @deprecated since 4.5. Use CoreText.parseJSON instead.
     */
    parseJSON<T>(json: string, defaultValue?: T, logErrorFn?: (error?: Error) => void): T {
        return CoreText.parseJSON(json, defaultValue, logErrorFn);
    }

}
