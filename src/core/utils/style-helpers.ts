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
 * Element styles.
 *
 * Number styles are interpreted as pixels; any other values should be set as a string.
 */
export type CoreStyles = Record<string, string | number>;

/**
 * Render the given styles to be used inline on an element.
 *
 * @param styles Styles.
 * @returns Inline styles.
 */
export function renderInlineStyles(styles: CoreStyles): string {
    return Object
        .entries(styles)
        .reduce((renderedStyles, [property, value]) => {
            const propertyValue = typeof value === 'string' ? value : `${value}px`;

            return `${property}:${propertyValue};${renderedStyles}`;
        }, '');
}
