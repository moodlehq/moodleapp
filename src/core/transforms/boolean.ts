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
 * Transform an Input value to a boolean.
 * False values are: 0, '0', 'false', false, undefined, null.
 * Please notice that empty strings are considered true for consistency with HTML.
 *
 * @param value Value to transform.
 * @returns Transformed value.
 */
export function toBoolean(value: unknown): boolean {
    if (value === undefined || value === null) {
        return false;
    }

    if (value === '') {
        // Empty string is considered true for consistency with HTML, where putting an attribute without value means true.
        return true;
    }

    return !(value === false || value === 'false' || Number(value) === 0);
}
