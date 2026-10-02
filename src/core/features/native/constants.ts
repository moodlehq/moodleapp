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

export const enum AndroidNotificationPriority {
    NONE = 0,
    MIN = 1,
    LOW = 2,
    DEFAULT = 3,
    HIGH = 4,
    MAX = 5,
}

/**
 * List of Error Codes and Meanings for FileOpener
 *
 * When an error is thrown, one of the following codes (as a string value) will be used.
 */
export const enum CoreNativeCapacitorFileOpenerErrorCode {
    INTERNAL_ERROR = '1',
    INVALID_ARGUMENT = '2',
    FILE_NOT_SUPPORTED = '8',
    FILE_NOT_FOUND = '9',
    UNKNOWN = '10',
}
