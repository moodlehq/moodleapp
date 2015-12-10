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
 * SCORM service.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScorm
 */
.factory('$mmaModScorm', function($mmSite, $q, $translate, $mmLang, $mmFilepool, $mmFS, $mmWS, $sce,
            mmaModScormComponent, mmCoreNotDownloaded) {
    var self = {},
        statuses = ['notattempted', 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'suspend'],
        downloadPromises = {}; // Store download promises to be able to restore them.

    // Constants.
    self.GRADESCOES     = 0;
    self.GRADEHIGHEST   = 1;
    self.GRADEAVERAGE   = 2;
    self.GRADESUM       = 3;

    self.HIGHESTATTEMPT = 0;
    self.AVERAGEATTEMPT = 1;
    self.FIRSTATTEMPT   = 2;
    self.LASTATTEMPT    = 3;

    /**
     * Calculates the SCORM grade based on the grading method and the list of attempts scores.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#calculateScormGrade
     * @param  {Object} scorm      SCORM.
     * @param  {Object[]} attempts List of attempts. Each attempts must have a property called "grade".
     * @return {Number}            Grade. -1 if no grade.
     */
    self.calculateScormGrade = function(scorm, attempts) {
        if (!attempts.length) {
            return -1;
        }

        switch (scorm.whatgrade) {
            case self.FIRSTATTEMPT:
                return attempts[0].grade;
            case self.LASTATTEMPT:
                return attempts[attempts.length - 1].grade;
            case self.HIGHESTATTEMPT:
                var grade = 0;
                for (var attempt = 0; attempt < attempts.length; attempt++) {
                    grade = Math.max(attempts[attempt].grade, grade);
                }
                return grade;
            case self.AVERAGEATTEMPT:
                var sumgrades = 0;
                for (var att = 0; att < attempts.length; att++) {
                    sumgrades += attempts[att].grade;
                }
                return Math.round(sumgrades / attempts.length);
        }

        return -1;
    };

    /**
     * Calculates the size of a SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#calculateScormSize
     * @param {Object} scorm SCORM.
     * @return {Promise}     Promise resolved with the SCORM size.
     */
    self.calculateScormSize = function(scorm) {
        if (scorm.packagesize) {
            return $q.when(scorm.packagesize);
        }

        return $mmWS.getRemoteFileSize(self.getPackageUrl(scorm));
    };

    /**
     * Count the attempts left for the given scorm.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#countAttemptsLeft
     * @param {Object} scorm         SCORM.
     * @param {Number} attemptscount Number of attempts performed.
     * @return {Number}              Number of attempts left.
     */
    self.countAttemptsLeft = function(scorm, attemptscount) {
        if (scorm.maxattempt == 0) {
            return Number.MAX_VALUE; // Unlimited attempts.
        }

        attemptscount = parseInt(attemptscount, 10);
        if (isNaN(attemptscount)) {
            return -1;
        }
        return scorm.maxattempt - attemptscount;
    };

    /**
     * Check if TOC should be displayed in the player.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#displayTocInPlayer
     * @param {Object} scorm SCORM.
     * @return {Boolean}     True if should display TOC, false otherwise.
     */
    self.displayTocInPlayer = function(scorm) {
        return scorm.hidetoc !== 3;
    };

    /**
     * Download and unzips the SCORM package.
     * @see $mmaModScorm#_downloadOrPrefetch
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#download
     * @param {Object} scorm SCORM object returned by $mmaModScorm#getScorm.
     * @return {Promise}     Promise resolved when the package is downloaded and unzipped.
     */
    self.download = function(scorm) {
        return self._downloadOrPrefetch(scorm, false);
    };

    /**
     * Downloads/Prefetches and unzips the SCORM package.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#_downloadOrPrefetch
     * @param {Object} scorm     SCORM object returned by $mmaModScorm#getScorm.
     * @param {Boolean} prefetch True if prefetch, false otherwise.
     * @return {Promise}         Promise resolved when the package is downloaded and unzipped. It will call notify in these cases:
     *                                   -File download in progress. Notify object will have these properties:
     *                                       packageDownload {Boolean} Always true.
     *                                       loaded {Number} Number of bytes of the package loaded.
     *                                       fileProgress {Object} FileTransfer's notify param for the current file.
     *                                   -Download or unzip starting. Notify object will have these properties:
     *                                       message {String} Message code related to the starting operation.
     *                                   -File unzip in progress. Notify object will have these properties:
     *                                       loaded {Number} Number of bytes unzipped.
     *                                       total {Number} Total of bytes of the ZIP file.
     * @protected
     */
    self._downloadOrPrefetch = function(scorm, prefetch) {
        var result = self.isScormSupported(scorm),
            siteid = $mmSite.getId();
        if (result !== true) {
            return $mmLang.translateAndReject(result);
        }

        if (downloadPromises[siteid] && downloadPromises[siteid][scorm.id]) {
            // There's already a download ongoing for this package, return the promise.
            return downloadPromises[siteid][scorm.id];
        } else if (!downloadPromises[siteid]) {
            downloadPromises[siteid] = {};
        }

        var files = self.getScormFileList(scorm),
            revision = scorm.sha1hash, // We use sha1hash instead of revision number.
            dirPath,
            deferred = $q.defer(), // We use a deferred to be able to notify.
            fn = prefetch ? $mmFilepool.prefetchPackage : $mmFilepool.downloadPackage;

        downloadPromises[siteid][scorm.id] = deferred.promise; // Store promise to be able to restore it later.

        // Get the folder where the unzipped files will be.
        self.getScormFolder(scorm.moduleurl).then(function(path) {
            dirPath = path;
            // Download the ZIP file to the filepool.
            // Using undefined for success & fail will pass the success/failure to the parent promise.
            deferred.notify({message: 'mm.core.downloading'});
            return fn(siteid, files, mmaModScormComponent, scorm.coursemodule, revision, 0)
                                                        .then(undefined, undefined, deferred.notify);
        }).then(function() {
            // Remove the destination folder to prevent having old unused files.
            return $mmFS.removeDir(dirPath).catch(function() {
                // Ignore errors, it might have failed because the folder doesn't exist.
            });
        }).then(function() {
            // Get the ZIP file path.
            return $mmFilepool.getFilePathByUrl(siteid, self.getPackageUrl(scorm));
        }).then(function(zippath) {
            // Unzip and delete the zip when finished.
            deferred.notify({message: 'mm.core.unzipping'});
            return $mmFS.unzipFile(zippath, dirPath).then(function() {
                return $mmFilepool.removeFileByUrl(siteid, self.getPackageUrl(scorm)).catch(function() {
                    // Ignore errors.
                });
            }, function(error) {
                // Error unzipping. Set status as not downloaded and reject.
                return $mmFilepool.storePackageStatus(siteid, mmaModScormComponent, scorm.coursemodule,
                                            mmCoreNotDownloaded, revision, 0).then(function() {
                    return $q.reject(error);
                });
            }, deferred.notify);
        }).then(deferred.resolve, deferred.reject).finally(function() {
            delete downloadPromises[siteid][scorm.id]; // Delete stored promise.
        });

        return deferred.promise;
    };

    /**
     * This is a little language parser for AICC_SCRIPT.
     * Evaluates the expression and returns a boolean answer.
     * See 2.3.2.5.1. Sequencing/Navigation Today  - from the SCORM 1.2 spec (CAM).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#evalPrerequisites
     * @param  {String} prerequisites The AICC_SCRIPT prerequisites expression.
     * @param  {Object} trackData     The tracked user data of each SCO.
     * @return {Boolean}              True if prerequisites are fulfilled, false otherwise.
     */
    self.evalPrerequisites = function(prerequisites, trackData) {

        var stack = [],
            statuses = {
                'passed': 'passed',
                'completed': 'completed',
                'failed': 'failed',
                'incomplete': 'incomplete',
                'browsed': 'browsed',
                'not attempted': 'notattempted',
                'p': 'passed',
                'c': 'completed',
                'f': 'failed',
                'i': 'incomplete',
                'b': 'browsed',
                'n': 'notattempted'
            };

        // Expand the amp entities.
        prerequisites = prerequisites.replace(/&amp;/gi, '&');
        // Find all my parsable tokens.
        prerequisites = prerequisites.replace(/(&|\||\(|\)|\~)/gi, '\t$1\t');
        // Expand operators.
        prerequisites = prerequisites.replace(/&/gi, '&&');
        prerequisites = prerequisites.replace(/\|/gi, '||');
        // Now - grab all the tokens.
        var elements = prerequisites.trim().split('\t');

        // Process each token to build an expression to be evaluated.
        angular.forEach(elements, function(element) {
            element = element.trim();
            if (!element) {
                return;
            }
            if (!element.match(/^(&&|\|\||\(|\))$/gi)) {
                // Create each individual expression.
                // Search for ~ = <> X*{} .

                var re = /^(\d+)\*\{(.+)\}$/, // Sets like 3*{S34, S36, S37, S39}.
                    reOther = /^(.+)(\=|\<\>)(.+)$/, // Other symbols.
                    matches;

                if (re.test(element)) {
                    matches = element.match(re);

                    var repeat = matches[1],
                        set = matches[2].split(','),
                        count = 0;
                    angular.forEach(set, function(setelement) {
                        setelement = setelement.trim();
                        if (typeof trackData[setelement] != 'undefined' &&
                                (trackData[setelement].status == 'completed' || trackData[setelement].status == 'passed')) {
                            count++;
                        }
                    });
                    if (count >= repeat) {
                        element = 'true';
                    } else {
                        element = 'false';
                    }
                } else if (element == '~') {
                    // Not maps ~.
                    element = '!';
                } else if (reOther.test(element)) {
                    // Other symbols = | <> .
                    matches = element.match(reOther);
                    element = matches[1].trim();
                    if (typeof trackData[element] != 'undefined') {
                        value = matches[3].trim().replace(/(\'|\")/gi);
                        if (typeof statuses[value] != 'undefined') {
                            value = statuses[value];
                        }
                        if (matches[2] == '<>') {
                            oper = '!=';
                        } else {
                            oper = '==';
                        }
                        element = '(\'' + trackData[element].status + '\' ' + oper + ' \'' + value + '\')';
                    } else {
                        element = 'false';
                    }
                } else {
                    // Everything else must be an element defined like S45 ...
                    if (typeof trackData[element] != 'undefined' &&
                            (trackData[element].status == 'completed' || trackData[element].status == 'passed')) {
                        element = 'true';
                    } else {
                        element = 'false';
                    }
                }

            }
            stack.push(' ' + element + ' ');
        });

        return eval(stack.join('') + ';');
    };

    /**
     * Formats a grade to be displayed.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#formatGrade
     * @param  {Object} scorm SCORM.
     * @param  {Number} grade Grade.
     * @return {String}       Grade to display.
     */
    self.formatGrade = function(scorm, grade) {
        if (typeof grade == 'undefined' || grade == -1) {
            return $translate.instant('mm.core.none');
        }
        if (scorm.grademethod !== self.GRADESCOES && scorm.maxgrade > 0) {
            return $translate.instant('mm.core.percentagenumber', {$a: (grade / scorm.maxgrade) * 100});
        }
        return grade;
    };

    /**
     * Formats a tree-like TOC into an array.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#formatTocToArray
     * @param {Object[]} toc     SCORM's TOC (tree format).
     * @param {Number} [level=0] The level of the TOC we're right now. 0 by default.
     * @return {Object[]}        SCORM's TOC (array format).
     */
    self.formatTocToArray = function(toc, level) {
        if (!toc || !toc.length) {
            return [];
        }

        if (typeof level == 'undefined') {
            level = 0;
        }

        var formatted = [];
        angular.forEach(toc, function(node) {
            node.level = level;
            formatted.push(node);
            formatted = formatted.concat(self.formatTocToArray(node.children, level + 1));
        });

        return formatted;
    };

    /**
     * Get cache key for SCORM attempt count WS calls.
     *
     * @param {Number} scormid  SCORM ID.
     * @param {Number} [userid] User ID. If not defined, current user.
     * @return {String}         Cache key.
     */
    function getAttemptCountCacheKey(scormid, userid) {
        userid = userid || $mmSite.getUserId();
        return 'mmaModScorm:attemptcount:' + scormid + ':' + userid;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getAttemptCount
     * @param {Number} scormid        SCORM ID.
     * @param {Number} [userid]       User ID. If not defined, current user.
     * @param {Boolean} ignoreMissing True if it should ignore attempts that haven't reported a grade/completion.
     * @return {Promise}              Promise resolved when the attempt count is retrieved.
     */
    self.getAttemptCount = function(scormid, userid, ignoreMissing) {
        userid = userid || $mmSite.getUserId();

        var params = {
                scormid: scormid,
                userid: userid,
                ignoremissingcompletion: ignoreMissing ? 1 : 0
            },
            preSets = {
                cacheKey: getAttemptCountCacheKey(scormid, userid)
            };

        return $mmSite.read('mod_scorm_get_scorm_attempt_count', params, preSets).then(function(response) {
            if (response && typeof response.attemptscount != 'undefined') {
                return response.attemptscount;
            }
            return $q.reject();
        });
    };

    /**
     * Get the grade for a certain SCORM and attempt.
     * Based on Moodle's scorm_grade_user_attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getAttemptGrade
     * @param {Number} scormid SCORM ID.
     * @param {Number} attempt Attempt number.
     * @return {Promise}       Promise resolved with the grade.
     */
    self.getAttemptGrade = function(scorm, attempt) {
        var attemptscore = {
            scoes: 0,
            values: 0,
            max: 0,
            sum: 0
        };
        return self.getScormUserData(scorm.id, attempt).then(function(data) {
            angular.forEach(data, function(scodata) {
                var userdata = scodata.userdata;
                if (userdata.status == 'completed' || userdata.status == 'passed') {
                    attemptscore.scoes++;
                }

                if (userdata.score_raw || (typeof scorm.scormtype != 'undefined' &&
                            scorm.scormtype == 'sco' && typeof userdata.score_raw != 'undefined')) {
                    var scoreraw = parseFloat(userdata.score_raw);
                    attemptscore.values++;
                    attemptscore.sum += scoreraw;
                    attemptscore.max = (scoreraw > attemptscore.max) ? scoreraw : attemptscore.max;
                }
            });

            var score = 0;
            switch (scorm.grademethod) {
                case self.GRADEHIGHEST:
                    score = attemptscore.max;
                break;
                case self.GRADEAVERAGE:
                    if (attemptscore.values > 0) {
                        score = attemptscore.sum / attemptscore.values;
                    } else {
                        score = 0;
                    }
                break;
                case self.GRADESUM:
                    score = attemptscore.sum;
                break;
                case self.GRADESCOES:
                    score = attemptscore.scoes;
                break;
                default:
                    score = attemptscore.max;   // Remote Learner GRADEHIGHEST is default.
            }

            return score;
        });
    };

    /**
     * Get the list of a organizations defined in a SCORM package.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getOrganizations
     * @param  {Number} scormid SCORM ID.
     * @return {Promise}        Promise resolved with the list of organizations.
     */
    self.getOrganizations = function(scormid) {
        return self.getScoes(scormid).then(function(scoes) {
            var organizations = [];
            angular.forEach(scoes, function(sco) {
                // Is an organization entry?
                if (sco.organization == '' && sco.parent == '/' && sco.scormtype == '') {
                    organizations.push({
                        identifier: sco.identifier,
                        title: sco.title,
                        sortorder: sco.sortorder
                    });
                }
            });
            return organizations;
        });
    };

    /**
     * Get the organization Toc object
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getOrganizationToc
     * @param  {Number} scormid      SCORM ID.
     * @param  {String} organization Organization identifier.
     * @param  {Number} attempt      The attempt number (to populate SCO track data).
     * @return {Promise}             Promise resolved with the toc object.
     */
    self.getOrganizationToc = function(scormid, organization, attempt) {
        // First of all, get the track data for all the SCOes in the organization for the given attempt.
        // We need this data to display the SCO status in the toc.
        return self.getScormUserData(scormid, attempt).then(function(data) {
            var trackData = {};
            // Extract data for each SCO.
            angular.forEach(data, function(sco) {
                trackData[sco.scoid] = sco.userdata;
            });

            // Get organization SCOes.
            return self.getScoes(scormid, organization).then(function(scoes) {
                var map = {},
                    rootScoes = [],
                    trackDataBySCO = {};

                // First populate trackDataBySCO to index by SCO identifier.
                angular.forEach(scoes, function(sco) {
                    trackDataBySCO[sco.identifier] = trackData[sco.id];
                });

                angular.forEach(scoes, function(sco, index) {
                    sco.children = [];
                    map[sco.identifier] = index;
                    if (sco.parent !== '/') {
                        // Add specific SCO information (related to tracked data).
                        var scodata = trackData[sco.id];
                        // Check isvisible attribute.
                        sco.isvisible = typeof scodata.isvisible != 'undefined' ?
                                                scodata.isvisible && scodata.isvisible !== 'false' : true;
                        // Check pre-requisites status.
                        sco.prereq = typeof scodata.prerequisites == 'undefined' ||
                                                self.evalPrerequisites(scodata.prerequisites, trackDataBySCO);
                        // Add status.
                        sco.status = (typeof scodata.status == 'undefined' || scodata.status === '') ?
                                                'notattempted' : scodata.status;
                        // Exit var.
                        sco.exitvar = typeof scodata.exitvar == 'undefined' ? 'cmi.core.exit' : scodata.exitvar;
                        sco.exitvalue = scodata[sco.exitvar];

                        if (sco.parent == organization) {
                            // It's a root SCO, add it to the root array.
                            rootScoes.push(sco);
                        } else {
                            // Add this sco to the parent.
                            scoes[map[sco.parent]].children.push(sco);
                        }
                    }
                });

                return rootScoes;
            });
        });
    };

    /**
     * Get the package URL of a given SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getPackageUrl
     * @param  {Object} scorm SCORM.
     * @return {String}       Package URL.
     */
    self.getPackageUrl = function(scorm) {
        if (scorm.packageurl) {
            return scorm.packageurl;
        }
        if (scorm.reference) {
            return scorm.reference;
        }
        return '';
    };

    /**
     * Get cache key for get SCORM scoes WS calls.
     *
     * @param  {Number} scormid      SCORM ID.
     * @param  {String} organization Organization ID.
     * @return {String}              Cache key.
     */
    function getScoesCacheKey(scormid, organization) {
        return getScoesCommonCacheKey(scormid) + ':' + organization;
    }

    /**
     * Get common cache key for get SCORM scoes WS calls.
     *
     * @param  {Number} scormid      SCORM ID.
     * @return {String}              Cache key.
     */
    function getScoesCommonCacheKey(scormid) {
        return 'mmaModScorm:scoes:' + scormid;
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScoes
     * @param  {Number} scormid      SCORM ID.
     * @param  {String} organization Organization ID.
     * @return {Promise}             Promise resolved with a list of SCO objects.
     */
    self.getScoes = function(scormid, organization) {
        organization = organization || '';

        var params = {
                scormid: scormid,
                organization: organization
            },
            preSets = {
                cacheKey: getScoesCacheKey(scormid, organization)
            };

        return $mmSite.read('mod_scorm_get_scorm_scoes', params, preSets).then(function(response) {
            if (response && response.scoes) {
                return response.scoes;
            }
            return $q.reject();
        });
    };

    /**
     * Given a SCORM and a SCO, returns the full launch URL for the SCO.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScoSrc
     * @param  {Object} scorm SCORM.
     * @param  {Object} sco   SCO.
     * @return {Promise}      Promise resolved with the URL.
     */
    self.getScoSrc = function(scorm, sco) {
        return $mmFilepool.getDirectoryUrlByUrl($mmSite.getId(), scorm.moduleurl).then(function(dirPath) {
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return $sce.trustAsResourceUrl($mmFS.concatenatePaths(dirPath, sco.launch));
        });
    };

    /**
     * Get the path to the folder where a SCORM is downloaded.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormFolder
     * @param  {String} moduleurl Module URL (returned by get_course_contents).
     * @return {Promise}          Promise resolved with the folder path.
     */
    self.getScormFolder = function(moduleurl) {
        return $mmFilepool.getFilePathByUrl($mmSite.getId(), moduleurl);
    };

    /**
     * Gets a list of files to downlaod for a SCORM, using a format similar to module.contents from get_course_contents.
     * It will only return one file: the ZIP package.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormFileList
     * @param  {Object} scorm SCORM.
     * @return {Object[]}     File list.
     */
    self.getScormFileList = function(scorm) {
        var files = [];
        if (self.isScormSupported(scorm) === true && !scorm.warningmessage) {
            files.push({
                fileurl: self.getPackageUrl(scorm),
                filepath: '/',
                filename: scorm.reference,
                filesize: scorm.packagesize,
                type: 'file',
                timemodified: 0
            });
        }
        return files;
    };

    /**
     * Get the URL and description of the status icon.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScoStatusIcon
     * @param {Object} sco         SCO.
     * @param {Boolean} incomplete True if SCORM is incomplete, false otherwise.
     * @return {Object}            Image URL and description.
     */
    self.getScoStatusIcon = function(sco, incomplete) {
        var imagename = '',
            descname = '',
            status;

        if (sco.scormtype == 'sco') {
            // Not an asset, calculate image using status.
            status = sco.status;
            if (statuses.indexOf(status) < 0) {
                // Status empty or not valid, use 'notattempted'.
                status = 'notattempted';
            }
            if (!incomplete) {
                // Check if SCO is completed or not. If SCORM is incomplete there's no need to check SCO.
                incomplete = self.isStatusIncomplete(status);
            }

            if (incomplete && sco.exitvalue == 'suspend') {
                imagename = 'suspend';
                descname = 'suspended';
            } else {
                imagename = sco.status;
                descname = sco.status;
            }
        } else {
            imagename = 'asset';
            descname = (!sco.status || sco.status == 'notattempted') ? 'asset' : 'assetlaunched';
        }

        return {
            url: 'addons/mod_scorm/img/' + imagename + '.gif',
            description: $translate.instant('mma.mod_scorm.' + descname)
        };
    };

    /**
     * Get cache key for SCORM data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getScormDataCacheKey(courseid) {
        return 'mmaModScorm:scorm:' + courseid;
    }

    /**
     * Get a SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScorm
     * @param {Number} courseid  Course ID.
     * @param {Number} cmid      Course module ID.
     * @parma {String} moduleurl Module UR:
     * @return {Promise}         Promise resolved when the SCORM is retrieved.
     */
    self.getScorm = function(courseid, cmid, moduleurl) {
        var params = {
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getScormDataCacheKey(courseid)
            };

        return $mmSite.read('mod_scorm_get_scorms_by_courses', params, preSets).then(function(response) {
            if (response && response.scorms) {
                var currentScorm;
                angular.forEach(response.scorms, function(scorm) {
                    if (scorm.coursemodule == cmid) {
                        currentScorm = scorm;
                    }
                });
                if (currentScorm) {
                    // If the SCORM isn't available the WS returns a warning and it doesn't return timeopen and timeclosed.
                    if (typeof currentScorm.timeopen == 'undefined') {
                        angular.forEach(response.warnings, function(warning) {
                            if (warning.itemid === currentScorm.id) {
                                currentScorm.warningmessage = warning.message;
                            }
                        });
                    }
                    currentScorm.moduleurl = moduleurl;
                    return currentScorm;
                }
            }
            return $q.reject();
        });
    };

    /**
     * Get a readable SCORM grade method.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormGradingMethod
     * @param {Object} scorm SCORM.
     * @return {String}      Grading method.
     */
    self.getScormGradeMethod = function(scorm) {
        if (scorm.maxattempt == 1) {
            switch (parseInt(scorm.grademethod, 10)) {
                case self.GRADEHIGHEST:
                    return $translate.instant('mma.mod_scorm.gradehighest');
                case self.GRADEAVERAGE:
                    return $translate.instant('mma.mod_scorm.gradeaverage');
                case self.GRADESUM:
                    return $translate.instant('mma.mod_scorm.gradesum');
                case self.GRADESCOES:
                    return $translate.instant('mma.mod_scorm.gradescoes');
            }
        } else {
            switch (parseInt(scorm.whatgrade, 10)) {
                case self.HIGHESTATTEMPT:
                    return $translate.instant('mma.mod_scorm.highestattempt');
                case self.AVERAGEATTEMPT:
                    return $translate.instant('mma.mod_scorm.averageattempt');
                case self.FIRSTATTEMPT:
                    return $translate.instant('mma.mod_scorm.firstattempt');
                case self.LASTATTEMPT:
                    return $translate.instant('mma.mod_scorm.lastattempt');
            }
        }
    };

    /**
     * Get cache key for SCORM user data WS calls.
     *
     * @param {Number} scormid SCORM ID.
     * @param {Number} attempt Attempt number.
     * @return {String}        Cache key.
     */
    function getScormUserDataCacheKey(scormid, attempt) {
        return getScormUserDataCommonCacheKey(scormid) + ':' + attempt;
    }

    /**
     * Get common cache key for SCORM user data WS calls.
     *
     * @param {Number} scormid SCORM ID.
     * @return {String}        Cache key.
     */
    function getScormUserDataCommonCacheKey(scormid) {
        return 'mmaModScorm:userdata:' + scormid;
    }

    /**
     * Get the user data for a certain SCORM and attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormUserData
     * @param {Number} scormid SCORM ID.
     * @param {Number} attempt Attempt number.
     * @return {Promise}       Promise resolved when the user data is retrieved.
     */
    self.getScormUserData = function(scormid, attempt) {
        var params = {
                scormid: scormid,
                attempt: attempt
            },
            preSets = {
                cacheKey: getScormUserDataCacheKey(scormid, attempt)
            };

        return $mmSite.read('mod_scorm_get_scorm_user_data', params, preSets).then(function(response) {
            if (response && response.data) {
                // Format the response.
                angular.forEach(response.data, function(sco) {
                    var formattedDefaultData = {},
                        formattedUserData = {};

                    angular.forEach(sco.defaultdata, function(entry) {
                        formattedDefaultData[entry.element] = entry.value;
                    });
                    angular.forEach(sco.userdata, function(entry) {
                        formattedUserData[entry.element] = entry.value;
                    });

                    sco.defaultdata = formattedDefaultData;
                    sco.userdata = formattedUserData;
                });
                return response.data;
            }
            return $q.reject();
        });
    };

    /**
     * Invalidates all the data related to a certain SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateAllScormData
     * @param {Number} scormid  SCORM ID.
     * @param {Number} [userid] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAllScormData = function(scormid, userid) {
        var promises = [];
        promises.push(self.invalidateAttemptCount(scormid, userid));
        promises.push(self.invalidateScoes(scormid));
        promises.push(self.invalidateScormUserData(scormid));
        return $q.all(promises);
    };

    /**
     * Invalidates attempt count.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateAttemptCount
     * @param {Number} scormid  SCORM ID.
     * @param {Number} [userid] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptCount = function(scormid, userid) {
        return $mmSite.invalidateWsCacheForKey(getAttemptCountCacheKey(scormid, userid));
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateContent
     * @param {Object} moduleId The module ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId) {
        return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModScormComponent, moduleId);
    };

    /**
     * Invalidates SCORM scoes for all organizations.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateScoes
     * @param {Number} scormid SCORM ID.
     * @return {Promise}       Promise resolved when the data is invalidated.
     */
    self.invalidateScoes = function(scormid) {
        return $mmSite.invalidateWsCacheForKeyStartingWith(getScoesCommonCacheKey(scormid));
    };

    /**
     * Invalidates SCORM data.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateScormData
     * @param {Number} courseid Course ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateScormData = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getScormDataCacheKey(courseid));
    };

    /**
     * Invalidates SCORM user data for all attempts.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateScormUserData
     * @param {Number} scormid SCORM ID.
     * @return {Promise}       Promise resolved when the data is invalidated.
     */
    self.invalidateScormUserData = function(scormid) {
        return $mmSite.invalidateWsCacheForKeyStartingWith(getScormUserDataCommonCacheKey(scormid));
    };

    /**
     * Check if the given SCORM is incomplete.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormIncomplete
     * @param {Object} scorm   SCORM.
     * @param {Number} attempt Attempt.
     * @return {Promise}       Promise resolved with a boolean: true if incomplete, false otherwise.
     */
    self.isScormIncomplete = function(scorm, attempt) {
        return self.getScormUserData(scorm.id, attempt).then(function(data) {
            var incomplete = false;
            angular.forEach(data, function(sco) {
                if (!Object.keys(sco.userdata).length) {
                    incomplete = true;
                } else {
                    if (self.isStatusIncomplete(sco.userdata.status)) {
                        incomplete = true;
                    }
                }
            });

            return incomplete;
        });
    };

    /**
     * Check if a SCO status is incomplete.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isStatusIncomplete
     * @param  {String}  status SCO status.
     * @return {Boolean}        True if incomplete, false otherwise.
     */
    self.isStatusIncomplete = function(status) {
        return !status || status == 'notattempted' || status == 'incomplete' || status == 'browsed';
    };

    /**
     * Return whether or not the plugin is enabled. Plugin is enabled if the scorm WS are available.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_scorm_get_scorm_attempt_count') &&
                $mmSite.wsAvailable('mod_scorm_get_scorm_sco_tracks') &&
                $mmSite.wsAvailable('mod_scorm_get_scorm_scoes') &&
                $mmSite.wsAvailable('mod_scorm_get_scorm_user_data') &&
                $mmSite.wsAvailable('mod_scorm_get_scorms_by_courses') &&
                $mmSite.wsAvailable('mod_scorm_insert_scorm_tracks');
    };

    /**
     * Check if the given SCORM is closed.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormClosed
     * @param {Object} scorm SCORM to check.
     * @return {Boolean}     True if SCORM is closed, false if it hasn't closed yet.
     */
    self.isScormClosed = function(scorm) {
        var timeNow = $mmUtil.timestamp();
        if (scorm.timeclose > 0 && timeNow > scorm.timeclose) {
            return true;
        }
        return false;
    };

    /**
     * Check if the given SCORM is downloadable.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormDownloadable
     * @param {Object} scorm SCORM to check.
     * @return {Boolean}     True if SCORM is downloadable, false otherwise.
     */
    self.isScormDownloadable = function(scorm) {
        return typeof scorm.protectpackagedownloads != 'undefined' && scorm.protectpackagedownloads === false;
    };

    /**
     * Check if the given SCORM is open.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormOpen
     * @param {Object} scorm SCORM to check.
     * @return {Boolean}     True if SCORM is open, false if it hasn't opened yet.
     */
    self.isScormOpen = function(scorm) {
        var timeNow = $mmUtil.timestamp();
        if (scorm.timeopen > 0 && scorm.timeopen > timeNow) {
            return false;
        }
        return true;
    };

    /**
     * Check if a SCORM is supported in the app. If it's not, returns the error code to show.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormSupported
     * @param {Object} scorm    SCORM to check.
     * @return {Boolean|String} True if SCORM is supported, string with error code otherwise.
     */
    self.isScormSupported = function(scorm) {
        if (!self.isScormValidVersion(scorm)) {
            return 'mma.mod_scorm.errorinvalidversion';
        } else if (!self.isScormDownloadable(scorm)) {
            return 'mma.mod_scorm.errornotdownloadable';
        } else if (!self.isValidPackageUrl(self.getPackageUrl(scorm))) {
            return 'mma.mod_scorm.errorpackagefile';
        }

        return true;
    };

    /**
     * Check if it's a valid SCORM 1.2.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isScormValidVersion
     * @param {Object} scorm SCORM to check.
     * @return {Boolean}     True if SCORM is valid, false otherwise.
     */
    self.isScormValidVersion = function(scorm) {
        return scorm.version == 'SCORM_1.2';
    };

    /**
     * Check if a package URL is valid.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isValidPackageUrl
     * @param  {String}  packageurl Package URL.
     * @return {Boolean}            True if valid, false otherwise.
     */
    self.isValidPackageUrl = function(packageurl) {
        if (!packageurl) {
            return false;
        }
        if (packageurl.indexOf('imsmanifest.xml') > -1) {
            return false;
        }
        return true;
    };

    /**
     * Report a SCORM as being viewed.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                scormid: id
            };
            return $mmSite.write('mod_scorm_view_scorm', params);
        }
        return $q.reject();
    };

    /**
     * Prefetches and unzips the SCORM package.
     * @see $mmaModScorm#_downloadOrPrefetch
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#prefetch
     * @param {Object} scorm SCORM object returned by $mmaModScorm#getScorm.
     * @return {Promise}     Promise resolved when the package is prefetched and unzipped.
     */
    self.prefetch = function(scorm) {
        return self._downloadOrPrefetch(scorm, true);
    };

    /**
     * Saves a SCORM tracking record.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#saveTracks
     * @param  {Number} scoId    Sco ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data.
     * @return {Promise}         Promise resolved when data is saved.
     */
    self.saveTracks = function(scoId, attempt, tracks) {
        var params = {
            scoid: scoId,
            attempt: attempt,
            tracks: tracks
        };

        return $mmSite.write('mod_scorm_insert_scorm_tracks', params).then(function(response) {
            if (response && response.trackids) {
                return response.trackids;
            }
            return $q.reject();
        });
    };

    return self;
});
