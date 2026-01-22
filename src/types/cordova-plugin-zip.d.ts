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
 * Types for file cordova plugin.
 *
 * @see https://github.com/moodlemobile/cordova-plugin-zip
 */

interface Window {

    zip: {
        unzip(
            source: string,
            destination: string,
            onSuccess: (result: number) => void,
            onProgress?: (ev: {loaded: number; total: number}) => void,
        ): void;
    };

}
