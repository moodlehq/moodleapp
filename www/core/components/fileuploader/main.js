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

.config(function($stateProvider) {

    $stateProvider

    .state('site.fileuploader-picker', {
        url: '/fileuploader-picker',
        params: {
            maxsize: -1,
            upload: true, // True if file should be uploaded, false to only pick the file.
            allowOffline: false // To allow picking files in offline. Only supported if upload=false.
        },
        views: {
            'site': {
                templateUrl: 'core/components/fileuploader/templates/picker.html',
                controller: 'mmFileUploaderPickerCtrl'
            }
        }
    });
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventLogout, $mmFileUploaderDelegate,
            mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmFileUploaderDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventLogout, $mmFileUploaderDelegate.clearSiteHandlers);
});
