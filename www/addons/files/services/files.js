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

angular.module('mm.addons.files')

.factory('$mmaFiles', function($mmSite, $mmUtil, $q, md5) {
    var self = {},
        defaultParams = {
            "contextid": 0,
            "component": "",
            "filearea": "",
            "itemid": 0,
            "filepath": "",
            "filename": ""
        };

    /**
     * Get a file.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getFile
     * @param  {Object} A list of parameters accepted by the Web service.
     * @return {Path} // TODO
     */
    self.getFile = function(params) {
        // TODO
    };

    /**
     * Get the list of files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getFiles
     * @param  {Object} A list of parameters accepted by the Web service.
     * @return {Object} An object containing the files in the key 'entries'.
     *                  Additional properties is added to the entries, such as:
     *                  - imgpath: The path to the icon.
     *                  - link: The JSON string of params to get to the file.
     *                  - linkId: A hash of the file parameters.
     */
    self.getFiles = function(params) {
        var deferred = $q.defer();
        $mmSite.read('core_files_get_files', params).then(function(result) {
            var data = {
                entries: []
            };

            if (typeof result.files == 'undefined') {
                deferred.reject();
                return;
            }

            angular.forEach(result.files, function(entry) {
                entry.link = {};
                entry.link.contextid = (entry.contextid) ? entry.contextid : "";
                entry.link.component = (entry.component) ? entry.component : "";
                entry.link.filearea = (entry.filearea) ? entry.filearea : "";
                entry.link.itemid = (entry.itemid) ? entry.itemid : 0;
                entry.link.filepath = (entry.filepath) ? entry.filepath : "";
                entry.link.filename = (entry.filename) ? entry.filename : "";

                if (entry.component && entry.isdir) {
                    // Delete unused elements that may break the request.
                    entry.link.filename = "";
                }

                if (entry.isdir) {
                    entry.imgpath = $mmUtil.getFolderIcon();
                } else {
                    entry.imgpath = $mmUtil.getFileIcon(entry.filename);
                }

                entry.link = JSON.stringify(entry.link);
                entry.linkId = md5.createHash(entry.link);
                // entry.localpath = "";

                // if (!entry.isdir && entry.url) {
                //     // TODO Check $mmSite.
                //     var uniqueId = $mmSite.id + "-" + md5.createHash(entry.url);
                //     var path = MM.db.get("files", uniqueId);
                //     if (path) {
                //         entry.localpath = path.get("localpath");
                //     }
                // }

                data.entries.push(entry);
            });

            deferred.resolve(data);
        }, function() {
            deferred.reject();
        });

        return deferred.promise;
    };

    /**
     * Get the private files of the current user.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getMyFiles
     * @param  {Number} The user ID.
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getMyFiles = function() {
        var params = angular.copy(defaultParams, {});
        params.component = "user";
        params.filearea = "private";
        params.contextid = -1;
        params.contextlevel = "user";
        params.instanceid = $mmSite.getCurrentSiteInfo().userid;
        return self.getFiles(params);
    };

    /**
     * Get the site files.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFiles#getSiteFiles
     * @return {Object} See $mmaFiles#getFiles
     */
    self.getSiteFiles = function() {
        var params = angular.copy(defaultParams, {});
        return self.getFiles(params);
    };

    return self;
});
