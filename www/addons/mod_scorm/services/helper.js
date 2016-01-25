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
.factory('$mmaModScormHelper', function($mmaModScorm, $mmUtil, $translate, $q, $mmaModScormOffline, $mmaModScormSync, $mmSite) {

    var self = {},
        elementsToIgnore = ['status', 'score_raw', 'total_time', 'session_time', 'student_id', 'student_name', 'credit',
                            'mode', 'entry']; // List of elements we want to ignore when copying attempts (they're calculated).

    /**
     * Build message to show warnings.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#buildWarningsMessage
     * @param  {String[]} warnings Warnings to show.
     * @return {String}            Message with all the warnings.
     */
    self.buildWarningsMessage = function(warnings) {
        var message = '';
        angular.forEach(warnings, function(warning) {
            if (warning) {
                message = message + '<p>' + warning + '</p>';
            }
        });
        return message;
    };

    /**
     * Creates a new offline attempt based on an existing online attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#convertAttemptToOffline
     * @param  {Object} scorm   SCORM.
     * @param  {Number} attempt Number of the online attempt.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the attempt is created.
     */
    self.convertAttemptToOffline = function(scorm, attempt, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get data from the online attempt.
        return $mmaModScorm.getScormUserData(scorm.id, attempt, false, siteId).then(function(onlineData) {
            // The SCORM API might have written some data to the offline attempt already.
            // We don't want to override it with cached online data.
            return $mmaModScormOffline.getScormUserData(siteId, scorm.id, attempt).catch(function() {
                // Ignore errors.
            }).then(function(offlineData) {
                var dataToStore = angular.copy(onlineData);
                // Filter the data to copy.
                angular.forEach(dataToStore, function(sco) {
                    // Delete calculated data.
                    elementsToIgnore.forEach(function(el) {
                        delete sco.userdata[el];
                    });

                    // Don't override offline data.
                    if (offlineData && offlineData[sco.scoid] && offlineData[sco.scoid].userdata) {
                        var scoUserData = {};
                        angular.forEach(sco.userdata, function(value, element) {
                            if (!offlineData[sco.scoid].userdata[element]) {
                                // This element is not stored in offline, we can save it.
                                scoUserData[element] = value;
                            }
                        });
                        sco.userdata = scoUserData;
                    }
                });

                return $mmaModScormOffline.createNewAttempt(siteId, scorm, undefined, attempt, dataToStore, onlineData);
            });
        }).catch(function() {
            // Shouldn't happen.
            return $q.reject($translate.instant('mma.mod_scorm.errorcreateofflineattempt'));
        });
    };

    /**
     * Creates a new offline attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#createOfflineAttempt
     * @param  {Object} scorm      SCORM.
     * @param  {Number} newAttempt Number of the new attempt.
     * @param  {Number} lastOnline Number of the last online attempt.
     * @param {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the attempt is created.
     */
    self.createOfflineAttempt = function(scorm, newAttempt, lastOnline, siteId) {
        siteId = siteId || $mmSite.getId();
        // Try to get data from online attempts.
        return self.searchOnlineAttemptUserData(scorm.id, lastOnline, siteId).then(function(userData) {
            // We're creating a new attempt, remove all the user data that is not needed for a new attempt.
            // We need to get the SCO data from here because WS get_scoes doesn't return sco_data in Moodle 3.0.
            angular.forEach(userData, function(sco) {
                var filtered = {};
                angular.forEach(sco.userdata, function(value, element) {
                    if (element.indexOf('.') == -1 && elementsToIgnore.indexOf(element) == -1) {
                        // The element doesn't use a dot notation, probably SCO data.
                        filtered[element] = value;
                    }
                });
                sco.userdata = filtered;
            });
            return $mmaModScormOffline.createNewAttempt(siteId, scorm, undefined, newAttempt, userData);
        }).catch(function() {
            return $q.reject($translate.instant('mma.mod_scorm.errorcreateofflineattempt'));
        });
    };

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
     * Determines the attempt to continue/review. It will be:
     * - The last incomplete online attempt if it hasn't been continued in offline and all offline attempts are complete.
     * - The attempt with highest number without surpassing max attempts otherwise.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#determineAttemptToContinue
     * @param  {Object} scorm    SCORM.
     * @param  {Object} attempts Result of $mmaModScorm#getAttemptCount.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with an object with 2 properties: 'number' and 'offline'.
     */
    self.determineAttemptToContinue = function(scorm, attempts, siteId) {
        siteId = siteId || $mmSite.getId();
        var lastOnline,
            result = {
                number: 0,
                offline: false
            };

        // Get the last attempt. It'll be the highest number as long as it doesn't surpass the max number of attempts.
        function getLastBeforeMax() {
            if (scorm.maxattempt != 0 && attempts.lastAttempt.number > scorm.maxattempt) {
                result.number = scorm.maxattempt;
                result.offline = attempts.offline.indexOf(scorm.maxattempt) > -1;
            } else {
                result.number = attempts.lastAttempt.number;
                result.offline = attempts.lastAttempt.offline;
            }
        }

        // Get last online attempt.
        if (attempts.online.length) {
            lastOnline = Math.max.apply(Math, attempts.online);
        }

        if (lastOnline) {
            // Check if last online incomplete.
            var hasOffline = attempts.offline.indexOf(lastOnline) > -1;
            return $mmaModScorm.isAttemptIncomplete(scorm.id, lastOnline, hasOffline, false, siteId).then(function(incomplete) {
                if (incomplete) {
                    result.number = lastOnline;
                    result.offline = hasOffline;
                } else {
                    getLastBeforeMax();
                }
                return result;
            });
        } else {
            getLastBeforeMax();
            return $q.when(result);
        }
    };

    /**
     * Get the first SCO to load in a SCORM. If a non-empty TOC is provided, it will be the first valid SCO in the TOC.
     * Otherwise, it will be the first valid SCO returned by $mmaModScorm#getScos.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getFirstSco
     * @param {String} scormId        Scorm ID.
     * @param {Object[]} [toc]        SCORM's TOC.
     * @param {String} [organization] Organization to use.
     * @param {Number} attempt        Attempt number.
     * @param {Boolean} offline       True if attempt is offline, false otherwise.
     * @param {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the first SCO.
     */
    self.getFirstSco = function(scormId, toc, organization, attempt, offline, siteId) {
        siteId = siteId || $mmSite.getId();
        var promise;
        if (toc && toc.length) {
            promise = $q.when(toc);
        } else {
            // SCORM doesn't have a TOC. Get all the scos.
            promise = $mmaModScorm.getScosWithData(scormId, organization, attempt, offline, false, siteId);
        }

        return promise.then(function(scos) {
            // Search the first valid SCO.
            for (var i = 0; i < scos.length; i++) {
                var sco = scos[i];
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
     * Get SCORM sync time in a human readable format.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#getScormReadableSyncTime
     * @param  {Number} scormId SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the readable time.
     */
    self.getScormReadableSyncTime = function(scormId, siteId) {
        return $mmaModScormSync.getScormSyncTime(scormId, siteId).then(function(time) {
            if (time == 0) {
                return $translate('mm.core.none');
            } else {
                return moment(time).format('LLL');
            }
        });
    };

    /**
     * Searches user data for an online attempt. If the data can't be retrieved,
     * re-try with the previous online attempt (if exists).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHelper#searchOnlineAttemptUserData
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Online attempt to get the data.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with user data.
     */
    self.searchOnlineAttemptUserData = function(scormId, attempt, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmaModScorm.getScormUserData(scormId, attempt, false, siteId).catch(function() {
            if (attempt > 0) {
                // We couldn't retrieve the data. Try again with the previous online attempt.
                return self.searchOnlineAttemptUserData(scormId, attempt - 1, siteId);
            } else {
                // No more attempts to try. Reject
                return $q.reject();
            }
        });
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
