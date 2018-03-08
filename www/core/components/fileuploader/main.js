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

angular.module('mm.core.fileuploader', ['mm.core'])

.constant('mmFileUploaderAlbumPriority', 2000)
.constant('mmFileUploaderCameraPriority', 1800)
.constant('mmFileUploaderAudioPriority', 1600)
.constant('mmFileUploaderVideoPriority', 1400)
.constant('mmFileUploaderFilePriority', 1200)

.config(function($mmFileUploaderDelegateProvider, mmFileUploaderAlbumPriority, mmFileUploaderCameraPriority,
            mmFileUploaderAudioPriority, mmFileUploaderVideoPriority, mmFileUploaderFilePriority) {
    // Register fileuploader handlers.
    $mmFileUploaderDelegateProvider.registerHandler('mmFileUploaderAlbum',
                '$mmFileUploaderHandlers.albumFilePicker', mmFileUploaderAlbumPriority);
    $mmFileUploaderDelegateProvider.registerHandler('mmFileUploaderCamera',
                '$mmFileUploaderHandlers.cameraFilePicker', mmFileUploaderCameraPriority);
    $mmFileUploaderDelegateProvider.registerHandler('mmFileUploaderAudio',
                '$mmFileUploaderHandlers.audioFilePicker', mmFileUploaderAudioPriority);
    $mmFileUploaderDelegateProvider.registerHandler('mmFileUploaderVideo',
                '$mmFileUploaderHandlers.videoFilePicker', mmFileUploaderVideoPriority);
    $mmFileUploaderDelegateProvider.registerHandler('mmFileUploaderFile',
                '$mmFileUploaderHandlers.filePicker', mmFileUploaderFilePriority);
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventLogout, $mmFileUploaderDelegate,
            mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventLogout, $mmFileUploaderDelegate.clearSiteHandlers);
});
