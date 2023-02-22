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

import { VideoJSOgvJS } from '@addons/filter/mediaplugin/classes/videojs-ogvjs';
import { OGVLoader } from 'ogv';
import videojs from 'video.js';

export { videojs };

/**
 * Initialize the controller.
 */
export function initializeVideoJSOgvJS(): void {
    OGVLoader.base = 'assets/lib/ogv';

    videojs.getComponent('Tech').registerTech('OgvJS', VideoJSOgvJS);
}
