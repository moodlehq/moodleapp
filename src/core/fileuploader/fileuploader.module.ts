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

import { NgModule } from '@angular/core';
import { CoreFileUploaderProvider } from './providers/fileuploader';
import { CoreFileUploaderHelperProvider } from './providers/helper';
import { CoreFileUploaderDelegate } from './providers/delegate';
import { CoreFileUploaderAlbumHandler } from './providers/album-handler';
import { CoreFileUploaderAudioHandler } from './providers/audio-handler';
import { CoreFileUploaderCameraHandler } from './providers/camera-handler';
import { CoreFileUploaderFileHandler } from './providers/file-handler';
import { CoreFileUploaderVideoHandler } from './providers/video-handler';

// List of providers (without handlers).
export const CORE_FILEUPLOADER_PROVIDERS: any[] = [
    CoreFileUploaderProvider,
    CoreFileUploaderHelperProvider,
    CoreFileUploaderDelegate
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreFileUploaderProvider,
        CoreFileUploaderHelperProvider,
        CoreFileUploaderDelegate,
        CoreFileUploaderAlbumHandler,
        CoreFileUploaderAudioHandler,
        CoreFileUploaderCameraHandler,
        CoreFileUploaderFileHandler,
        CoreFileUploaderVideoHandler
    ]
})
export class CoreFileUploaderModule {
    constructor(delegate: CoreFileUploaderDelegate, albumHandler: CoreFileUploaderAlbumHandler,
            audioHandler: CoreFileUploaderAudioHandler, cameraHandler: CoreFileUploaderCameraHandler,
            videoHandler: CoreFileUploaderVideoHandler, fileHandler: CoreFileUploaderFileHandler) {
        delegate.registerHandler(albumHandler);
        delegate.registerHandler(audioHandler);
        delegate.registerHandler(cameraHandler);
        delegate.registerHandler(fileHandler);
        delegate.registerHandler(videoHandler);
    }
}
