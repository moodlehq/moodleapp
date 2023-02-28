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

import { isInitAudioEncoderMessage } from '@features/fileuploader/utils/worker-messages';
import { initMp3MediaEncoder } from 'mp3-mediarecorder/worker';

/**
 * Handle worker message.
 *
 * @param event Worker message event.
 */
function onMessage(event: MessageEvent): void {
    if (!isInitAudioEncoderMessage(event.data)) {
        return;
    }

    removeEventListener('message', onMessage);
    initMp3MediaEncoder(event.data.config);
}

addEventListener('message', onMessage);
