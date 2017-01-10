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

angular.module('mm.core.fileuploader')

.factory('$mmFileUploader', function($mmSite, $mmFS, $q, $timeout, $log, $mmSitesManager) {

    $log = $log.getInstance('$mmFileUploader');

    var self = {};

    /**
     * Upload a file.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadFile
     * @param  {Object} uri      File URI.
     * @param  {Object} options  Options for the upload.
     *                           - {Boolean} deleteAfterUpload Whether or not to delete the original after upload. It will only
     *                                                         be deleted in success.
     *                           - {String} fileKey The name of the form element. Defaults to "file".
     *                           - {String} fileName The file name to use when saving the file on the server.
     *                           - {String} mimeType The mime type of the data to upload.
     * @param  {String} [siteId] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}
     */
    self.uploadFile = function(uri, options, siteId) {
        options = options || {};
        siteId = siteId || $mmSite.getId();

        var deleteAfterUpload = options.deleteAfterUpload,
            ftOptions = angular.copy(options);

        delete ftOptions.deleteAfterUpload;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.uploadFile(uri, ftOptions);
        }).then(function(result) {
            if (deleteAfterUpload) {
                $timeout(function() {
                    // Use set timeout, otherwise in Node-Webkit the upload threw an error sometimes.
                    $mmFS.removeExternalFile(uri);
                }, 500);
            }
            return result;
        });
    };

    /**
     * Upload image.
     * @todo Handle Node Webkit.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadImage
     * @param  {String}  uri         File URI.
     * @param  {Boolean} isFromAlbum True if the image was taken from album, false if it's a new image taken with camera.
     * @return {Promise}
     */
    self.uploadImage = function(uri, isFromAlbum) {
        $log.debug('Uploading an image');
        var options = {};

        if (typeof uri == 'undefined' || uri === ''){
            // In Node-Webkit, if you successfully upload a picture and then you open the file picker again
            // and cancel, this function is called with an empty uri. Let's filter it.
            $log.debug('Received invalid URI in $mmFileUploader.uploadImage()');
            return $q.reject();
        }

        options.deleteAfterUpload = !isFromAlbum;
        options.fileKey = 'file';
        options.fileName = 'image_' + new Date().getTime() + '.jpg';
        options.mimeType = 'image/jpeg';

        return self.uploadFile(uri, options);
    };

    /**
     * Upload media.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadMedia
     * @param  {Object} mediaFile File object to upload.
     * @return {Promise}          Promise resolved once the file has been uploaded.
     */
    self.uploadMedia = function(mediaFile) {
        $log.debug('Uploading media');
        var options = {},
            filename = mediaFile.name,
            split;

        if (ionic.Platform.isIOS()) {
            // In iOS we'll add a timestamp to the filename to make it unique.
            split = filename.split('.');
            split[0] += '_' + new Date().getTime();
            filename = split.join('.');
        }

        options.fileKey = null;
        options.fileName = filename;
        options.mimeType = null;
        options.deleteAfterUpload = true;
        return self.uploadFile(mediaFile.fullPath, options);
    };

    /**
     * Upload a file of any type.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploader#uploadGenericFile
     * @param  {String} uri                File URI.
     * @param  {String} name               File name.
     * @param  {String} type               File type.
     * @param  {Boolean} deleteAfterUpload Whether the file should be deleted after upload.
     * @param  {String} [fileArea]         File area to upload the file to.
     *                                     In Moodle 3.1 or higher defaults to 'draft', in previous versions defaults to 'private'.
     * @param  {Number} [itemId]           Draft ID to upload the file to, 0 to create new. Only for draft files.
     * @param  {String} [siteId]           Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}                   Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type, deleteAfterUpload, fileArea, itemId, siteId) {
        var options = {};
        options.fileKey = null;
        options.fileName = name;
        options.mimeType = type;
        options.deleteAfterUpload = deleteAfterUpload;
        options.itemId = itemId;
        options.fileArea = fileArea;

        return self.uploadFile(uri, options, siteId);
    };

    return self;
});
