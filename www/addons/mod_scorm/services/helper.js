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

angular.module('mm.addons.mod_scorm')

/**
 * Helper to gather some common SCORM functions.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmCourseHelper
 */
.factory('$mmaModScormHelper', function($mmaModScorm, $mmUtil, $translate, $q) {

    var self = {};

    /**
     * Show a confirm dialog if needed. If SCORM doesn't have size, try to calculate it.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#confirmDownload
     * @param {Object} scorm SCORM to download.
     * @return {Promise}     Promise resolved if the user confirms or no confirmation needed.
     */
    self.confirmDownload = function(scorm) {
        var promise;
        if (!scorm.packagesize) {
            // We don't have package size, try to calculate it.
            promise = $mmaModScorm.calculateScormSize(scorm).then(function(size) {
                // Store it so we don't have to calculate it again when using the same object.
                scorm.packagesize = size;
                return size;
            });
        } else {
            promise = $q.when(scorm.packagesize);
        }

        return promise.then(function(size) {
            return $mmUtil.confirmDownloadSize(size);
        });
    };

    /**
     * Get the first SCO to load in a SCORM. If a non-empty TOC is provided, it will be the first valid SCO in the TOC.
     * Otherwise, it will be the first valid SCO returned by $mmaModScorm#getScoes.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getFirstSco
     * @param {String} scormid        Scorm ID.
     * @param {Object[]} [toc]        SCORM's TOC.
     * @param {String} [organization] Organization to use.
     * @param {Number} attempt        Attempt number.
     * @return {Promise}              Promise resolved with the first SCO.
     */
    self.getFirstSco = function(scormid, toc, organization, attempt) {
        var promise;
        if (toc && toc.length) {
            promise = $q.when(toc);
        } else {
            // SCORM doesn't have a TOC. Get all the scoes.
            promise = $mmaModScorm.getScoesWithData(scormid, organization, attempt);
        }

        return promise.then(function(scoes) {
            // Search the first valid SCO.
            for (var i = 0; i < scoes.length; i++) {
                var sco = scoes[i];
                if (sco.isvisible && sco.prereq && sco.launch) {
                    return sco;
                }
            }
        });
    };

    /**
     * Given a TOC in array format (@see $mmaModScorm#formatTocToArray) and a scoId, return the next available SCO.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getNextScoFromToc
     * @param  {Object[]} toc SCORM's TOC.
     * @param  {Number} scoId SCO ID.
     * @return {Object}       Next SCO.
     */
    self.getNextScoFromToc = function(toc, scoId) {
        for (var i = 0, len = toc.length; i < len; i++) {
            if (toc[i].id == scoId) {
                // We found the current SCO. Now let's search the next visible SCO with fulfilled prerequisites.
                for (var j = i + 1; j < len; j++) {
                    if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                        return toc[j];
                    }
                }
                break;
            }
        }
    };

    /**
     * Given a TOC in array format (@see $mmaModScorm#formatTocToArray) and a scoId, return the previous available SCO.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getPreviousScoFromToc
     * @param  {Object[]} toc SCORM's TOC.
     * @param  {Number} scoId SCO ID.
     * @return {Object}       Previous SCO.
     */
    self.getPreviousScoFromToc = function(toc, scoId) {
        for (var i = 0, len = toc.length; i < len; i++) {
            if (toc[i].id == scoId) {
                // We found the current SCO. Now let's search the previous visible SCO with fulfilled prerequisites.
                for (var j = i - 1; j >= 0; j--) {
                    if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                        return toc[j];
                    }
                }
                break;
            }
        }
    };

    /**
     * Given a TOC in array format (@see $mmaModScorm#formatTocToArray) and a scoId, return the SCO.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getScoFromToc
     * @param  {Object[]} toc SCORM's TOC.
     * @param  {Number} scoId SCO ID.
     * @return {Object}       SCO.
     */
    self.getScoFromToc = function(toc, scoId) {
        for (var i = 0, len = toc.length; i < len; i++) {
            if (toc[i].id == scoId) {
                return toc[i];
            }
        }
    };

    /**
     * Show error because a SCORM download failed.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#showDownloadError
     * @param {Object} scorm SCORM downloaded.
     * @return {Void}
     */
    self.showDownloadError = function(scorm) {
        $translate('mma.mod_scorm.errordownloadscorm', {name: scorm.name}).then(function(message) {
            $mmUtil.showErrorModal(message);
        });
    };

    return self;
});
