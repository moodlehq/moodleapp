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
.factory('$mmaModScorm', function($mmSite, $q, $translate, $mmFilepool, $mmFS, $mmWS, $sce, $mmaModScormOnline,
            $mmaModScormOffline, $mmUtil, $log, $mmSitesManager, mmaModScormComponent, mmCoreOutdated, mmCoreDownloading) {
    $log = $log.getInstance('$mmaModScorm');

    var self = {},
        statuses = ['notattempted', 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'suspend'];

    // Constants.
    self.GRADESCOES     = 0;
    self.GRADEHIGHEST   = 1;
    self.GRADEAVERAGE   = 2;
    self.GRADESUM       = 3;

    self.HIGHESTATTEMPT = 0;
    self.AVERAGEATTEMPT = 1;
    self.FIRSTATTEMPT   = 2;
    self.LASTATTEMPT    = 3;

    self.MODEBROWSE = 'browse';
    self.MODENORMAL = 'normal';
    self.MODEREVIEW = 'review';

    /**
     * Calculates the SCORM grade based on the grading method and the list of attempts scores.
     * We only treat online attempts to calculate a SCORM grade.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#calculateScormGrade
     * @param  {Object} scorm           SCORM.
     * @param  {Object} onlineAttempts  Online attempts. Each attempt must have a property called "grade".
     * @return {Number}                 Grade. -1 if no grade.
     */
    self.calculateScormGrade = function(scorm, onlineAttempts) {
        if (!onlineAttempts || !Object.keys(onlineAttempts).length) {
            return -1;
        }

        switch (scorm.whatgrade) {
            case self.FIRSTATTEMPT:
                return onlineAttempts[1] ? onlineAttempts[1].grade : -1;
            case self.LASTATTEMPT:
                var max = 0;
                angular.forEach(Object.keys(onlineAttempts), function(number) {
                    max = Math.max(number, max);
                });
                if (max > 0) {
                    return onlineAttempts[max].grade;
                }
                return -1;
            case self.HIGHESTATTEMPT:
                var grade = 0;
                angular.forEach(onlineAttempts, function(attempt) {
                    grade = Math.max(attempt.grade, grade);
                });
                return grade;
            case self.AVERAGEATTEMPT:
                var sumgrades = 0,
                    total = 0;
                angular.forEach(onlineAttempts, function(attempt) {
                    sumgrades += attempt.grade;
                    total++;
                });
                return Math.round(sumgrades / total);
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
     * @param {Number} attemptsCount Number of attempts performed.
     * @return {Number}              Number of attempts left.
     */
    self.countAttemptsLeft = function(scorm, attemptsCount) {
        if (scorm.maxattempt == 0) {
            return Number.MAX_VALUE; // Unlimited attempts.
        }

        attemptsCount = parseInt(attemptsCount, 10);
        if (isNaN(attemptsCount)) {
            return -1;
        }
        return scorm.maxattempt - attemptsCount;
    };

    /**
     * Returns the mode and attempt number to use based on mode selected and SCORM data.
     * This function is based on Moodle's scorm_check_mode.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#determineAttemptAndMode
     * @param {Object} scorm       SCORM.
     * @param {String} mode        Selected mode.
     * @param {Number} attempt     Current attempt.
     * @param {Boolean} newAttempt True if should start a new attempt, false otherwise.
     * @param {Boolean} incomplete True if current attempt is incomplete, false otherwise.
     * @return {Object}            Object with properties: 'mode', 'attempt' and 'newAttempt'.
     */
    self.determineAttemptAndMode = function(scorm, mode, attempt, newAttempt, incomplete) {
        if (mode == self.MODEBROWSE) {
            if (scorm.hidebrowse) {
                // Prevent Browse mode if hidebrowse is set.
                mode = self.MODENORMAL;
            } else {
                // We don't need to check attempts as browse mode is set.
                if (attempt == 0) {
                    attempt = 1;
                    newAttempt = true;
                }

                return {
                    mode: mode,
                    attempt: attempt,
                    newAttempt: newAttempt
                };
            }
        }

        // Validate user request to start a new attempt.
        if (attempt == 0) {
            newAttempt = true;
        } else if (incomplete) {
            // The option to start a new attempt should never have been presented. Force false.
            newAttempt = false;
        } else if (scorm.forcenewattempt) {
            // A new attempt should be forced for already completed attempts.
            newAttempt = true;
        }

        if (newAttempt && (scorm.maxattempt == 0 || attempt < scorm.maxattempt)) {
            // Create a new attempt. Force mode normal.
            attempt++;
            mode = self.MODENORMAL;
        } else {
            if (incomplete) {
                // We can't review an incomplete attempt.
                mode = self.MODENORMAL;
            } else {
                // We aren't starting a new attempt and the current one is complete, force review mode.
                mode = self.MODEREVIEW;
            }
        }

        return {
            mode: mode,
            attempt: attempt,
            newAttempt: newAttempt
        };
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
            grade = (grade / scorm.maxgrade) * 100;
            return $translate.instant('mm.core.percentagenumber', {$a: $mmUtil.roundToDecimals(grade, 2)});
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
     * Get the number of attempts done by a user in the given SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getAttemptCount
     * @param {Number} scormId        SCORM ID.
     * @param {String} [siteId]       Site ID. If not defined, current site.
     * @param {Number} [userId]       User ID. If not defined use site's current user.
     * @param {Boolean} ignoreMissing True if it should ignore attempts without grade/completion. Only for online attempts.
     * @param {Boolean} ignoreCache   True if it should ignore cached data for online attempts.
     * @return {Promise}              Promise resolved when the attempt count is retrieved. It returns an object with
     *                                online attempts, offline attempts, total number of attempts and last attempt.
     */
    self.getAttemptCount = function(scormId, siteId, userId, ignoreMissing, ignoreCache) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var result = {
                    lastAttempt: {
                        number: 0,
                        offline: false
                    }
                },
                promises = [];

            promises.push($mmaModScormOnline.getAttemptCount(siteId, scormId, userId, ignoreMissing, ignoreCache)
                        .then(function(count) {
                // Calculate numbers of online attempts.
                result.online = [];
                for (var i = 1; i <= count; i++) {
                    result.online.push(i);
                }
                // Calculate last attempt.
                if (count > result.lastAttempt.number) {
                    result.lastAttempt.number = count;
                    result.lastAttempt.offline = false;
                }
            }));

            promises.push($mmaModScormOffline.getAttempts(siteId, scormId, userId).then(function(attempts) {
                // Get only attempt numbers.
                result.offline = attempts.map(function(entry) {
                    // Calculate last attempt. We use >= to prioritize offline events if an attempt is both online and offline.
                    if (entry.attempt >= result.lastAttempt.number) {
                        result.lastAttempt.number = entry.attempt;
                        result.lastAttempt.offline = true;
                    }
                    return entry.attempt;
                });
            }));

            return $q.all(promises).then(function() {
                var total = result.online.length;
                result.offline.forEach(function(attempt) {
                    // Check if this attempt also exists in online, it might have been copied to local.
                    if (result.online.indexOf(attempt) == -1) {
                        total++;
                    }
                });
                result.total = total;
                return result;
            });
        });
    };

    /**
     * Get the grade for a certain SCORM and attempt.
     * Based on Moodle's scorm_grade_user_attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getAttemptGrade
     * @param {Number} scormid  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Boolean} offline True if attempt is offline, false otherwise.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the grade. If the attempt hasn't reported grade/completion, grade will be -1.
     */
    self.getAttemptGrade = function(scorm, attempt, offline, siteId) {
        var attemptscore = {
            scos: 0,
            values: 0,
            max: 0,
            sum: 0
        };

        return self.getScormUserData(scorm.id, attempt, offline, siteId).then(function(data) {
            angular.forEach(data, function(scodata) {
                var userdata = scodata.userdata;
                if (userdata.status == 'completed' || userdata.status == 'passed') {
                    attemptscore.scos++;
                }

                if (userdata.score_raw || (typeof scorm.scormtype != 'undefined' &&
                            scorm.scormtype == 'sco' && typeof userdata.score_raw != 'undefined')) {
                    var scoreraw = parseFloat(userdata.score_raw);
                    attemptscore.values++;
                    attemptscore.sum += scoreraw;
                    attemptscore.max = Math.max(scoreraw, attemptscore.max);
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
                    score = attemptscore.scos;
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
     * @param  {Number} scormId SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the list of organizations.
     */
    self.getOrganizations = function(scormId, siteId) {
        return self.getScos(scormId, siteId).then(function(scos) {
            var organizations = [];
            angular.forEach(scos, function(sco) {
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
     * @param  {Number} scormId      SCORM ID.
     * @param  {String} organization Organization identifier.
     * @param  {Number} attempt      The attempt number (to populate SCO track data).
     * @param {Boolean} offline      True if attempt is offline, false otherwise.
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the toc object.
     */
    self.getOrganizationToc = function(scormId, organization, attempt, offline, siteId) {

        return self.getScosWithData(scormId, organization, attempt, offline, false, siteId).then(function(scos) {
            var map = {},
                rootScos = [];

            angular.forEach(scos, function(sco, index) {
                sco.children = [];
                map[sco.identifier] = index;
                if (sco.parent !== '/') {
                    if (sco.parent == organization) {
                        // It's a root SCO, add it to the root array.
                        rootScos.push(sco);
                    } else {
                        // Add this sco to the parent.
                        scos[map[sco.parent]].children.push(sco);
                    }
                }
            });

            return rootScos;
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
     * Get the user data for a certain SCORM and attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormUserData
     * @param {Number} scormId      SCORM ID.
     * @param {Number} attempt      Attempt number.
     * @param {Boolean} offline     True if attempt is offline, false otherwise.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @param {Object[]} [scos]     SCOs returned by $mmaModScorm#getScos. Recommended if offline=true.
     * @param {Boolean} ignoreCache True if it should ignore cached data for online attempts.
     * @return {Promise}            Promise resolved when the user data is retrieved.
     */
    self.getScormUserData = function(scormId, attempt, offline, siteId, scos, ignoreCache) {
        siteId = siteId || $mmSite.getId();
        if (offline) {
            var promise = scos ? $q.when(scos) : self.getScos(scormId, siteId);
            return promise.then(function(scos) {
                return $mmaModScormOffline.getScormUserData(siteId, scormId, attempt, undefined, scos);
            });
        } else {
            return $mmaModScormOnline.getScormUserData(siteId, scormId, attempt, ignoreCache);
        }
    };

    /**
     * Get cache key for get SCORM scos WS calls.
     *
     * @param  {Number} scormId SCORM ID.
     * @return {String}         Cache key.
     */
    function getScosCacheKey(scormId) {
        return 'mmaModScorm:scos:' + scormId;
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScos
     * @param  {Number} scormId        SCORM ID.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {String} [organization] Organization ID.
     * @param  {Boolean} ignoreCache   True if it should ignore cached data (it will always fail if offline or server down).
     * @return {Promise}               Promise resolved with a list of SCO objects.
     */
    self.getScos = function(scormId, siteId, organization, ignoreCache) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            organization = organization || '';

            // Don't send the organization to the WS, we'll filter them locally.
            var params = {
                    scormid: scormId
                },
                preSets = {
                    cacheKey: getScosCacheKey(scormId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_scorm_get_scorm_scoes', params, preSets).then(function(response) {
                if (response && response.scoes) {
                    var scos = [];
                    if (organization) {
                        // Filter SCOs by organization.
                        angular.forEach(response.scoes, function(sco) {
                            if (sco.organization == organization) {
                                scos.push(sco);
                            }
                        });
                    } else {
                        scos = response.scoes;
                    }
                    return scos;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization, including data about
     * a certain attempt (status, isvisible, ...).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScosWithData
     * @param  {Number} scormId      SCORM ID.
     * @param  {String} organization Organization ID.
     * @param  {Number} attempt      Attempt number.
     * @param  {Boolean} offline     True if attempt is offline, false otherwise.
     * @param  {Boolean} ignoreCache True if it should ignore cached data for online attempts.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with a list of SCO objects.
     */
    self.getScosWithData = function(scormId, organization, attempt, offline, ignoreCache, siteId) {
        // Get organization SCOs.
        return self.getScos(scormId, siteId, organization, ignoreCache).then(function(scos) {
            // Get the track data for all the SCOs in the organization for the given attempt.
            // We'll use this data to set SCO data like isvisible, status and so.
            return self.getScormUserData(scormId, attempt, offline, siteId, scos, ignoreCache).then(function(data) {

                var trackDataBySCO = {};

                // First populate trackDataBySCO to index by SCO identifier.
                angular.forEach(scos, function(sco) {
                    trackDataBySCO[sco.identifier] = data[sco.id].userdata;
                });

                angular.forEach(scos, function(sco) {
                    // Add specific SCO information (related to tracked data).
                    var scodata = data[sco.id].userdata;
                    if (!scodata) {
                        return;
                    }
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
                });

                return scos;
            });
        });
    };

    /**
     * Given a SCORM and a SCO, returns the full launch URL for the SCO.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScoSrc
     * @param  {Object} scorm   SCORM.
     * @param  {Object} sco     SCO.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the URL.
     */
    self.getScoSrc = function(scorm, sco, siteId) {
        siteId = siteId || $mmSite.getId();

        // Build the launch URL. Moodle web checks SCORM version, we don't need to, it's always SCORM 1.2.
        var launchUrl = sco.launch,
            connector = '',
            parameters;

        if (sco.extradata && sco.extradata.length) {
            for (var i = 0; i < sco.extradata.length; i++) {
                var entry = sco.extradata[i];
                if (entry.element == 'parameters') {
                    parameters = entry.value;
                    break;
                }
            }
        }

        if (parameters) {
            connector = launchUrl.indexOf('?') > -1 ? '&' : '?';
            if (parameters.charAt(0) == '?') {
                parameters = parameters.substr(1);
            }

            launchUrl += connector + parameters;
        }

        if (isExternalLink(launchUrl)) {
            // It's an online URL.
            return $q.when($sce.trustAsResourceUrl(launchUrl));
        }

        return $mmFilepool.getPackageDirUrlByUrl(siteId, scorm.moduleurl).then(function(dirPath) {
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return $sce.trustAsResourceUrl($mmFS.concatenatePaths(dirPath, launchUrl));
        });
    };

    /**
     * Get the path to the folder where a SCORM is downloaded.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormFolder
     * @param  {String} moduleUrl Module URL (returned by get_course_contents).
     * @param {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the folder path.
     */
    self.getScormFolder = function(moduleUrl, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmFilepool.getPackageDirPathByUrl(siteId, moduleUrl);
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
            url: 'addons/mod/scorm/img/' + imagename + '.gif',
            description: $translate.instant('mma.mod_scorm.' + descname)
        };
    };

    /**
     * Get cache key for SCORM data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getScormDataCacheKey(courseId) {
        return 'mmaModScorm:scorm:' + courseId;
    }

    /**
     * Get a SCORM with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String}     siteId          Site ID.
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {String}     moduleUrl       Module URL.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the SCORM is retrieved.
     */
    function getScorm(siteId, courseId, key, value, moduleUrl, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getScormDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_scorm_get_scorms_by_courses', params, preSets).then(function(response) {
                if (response && response.scorms) {
                    var currentScorm;
                    angular.forEach(response.scorms, function(scorm) {
                        if (!currentScorm && scorm[key] == value) {
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
                        currentScorm.moduleurl = moduleUrl;
                        return currentScorm;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a SCORM by module ID.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScorm
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmid            Course module ID.
     * @parma   {String}    moduleUrl       Module URL.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the SCORM is retrieved.
     */
    self.getScorm = function(courseId, cmid, moduleUrl, siteId, forceCache) {
        siteId = siteId || $mmSite.getId();
        return getScorm(siteId, courseId, 'coursemodule', cmid, moduleUrl, forceCache);
    };

    /**
     * Get a SCORM by SCORM ID.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScormById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmid            Course module ID.
     * @parma   {String}    moduleUrl       Module URL.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the SCORM is retrieved.
     */
    self.getScormById = function(courseId, id, moduleUrl, siteId, forceCache) {
        siteId = siteId || $mmSite.getId();
        return getScorm(siteId, courseId, 'id', id, moduleUrl, forceCache);
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
     * Invalidates all the data related to a certain SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateAllScormData
     * @param {Number} scormId  SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAllScormData = function(scormId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        var promises = [];
        promises.push($mmaModScormOnline.invalidateAttemptCount(siteId, scormId, userId));
        promises.push(self.invalidateScos(scormId, siteId));
        promises.push($mmaModScormOnline.invalidateScormUserData(siteId, scormId));
        return $q.all(promises);
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID of the module.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateContent = function(moduleId, courseId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return self.getScorm(courseId, moduleId).then(function(scorm) {
            var promises = [];
            promises.push(self.invalidateAllScormData(scorm.id, siteId, userId));
            promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModScormComponent, moduleId));
            return $q.all(promises);
        });
    };

    /**
     * Invalidates SCORM scos for all organizations.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateScos
     * @param {Number} scormId SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}       Promise resolved when the data is invalidated.
     */
    self.invalidateScos = function(scormId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getScosCacheKey(scormId));
        });
    };

    /**
     * Invalidates SCORM data.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#invalidateScormData
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateScormData = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getScormDataCacheKey(courseId));
        });
    };

    /**
     * Check if a SCORM's attempt is incomplete.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isAttemptIncomplete
     * @param {Object} scormId      SCORM ID.
     * @param {Number} attempt      Attempt.
     * @param {Boolean} offline     True if attempt is offline, false otherwise.
     * @param {Boolean} ignoreCache True if it should ignore cached data for online attempts.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with a boolean: true if incomplete, false otherwise.
     */
    self.isAttemptIncomplete = function(scormId, attempt, offline, ignoreCache, siteId) {
        return self.getScosWithData(scormId, undefined, attempt, offline, ignoreCache, siteId).then(function(scos) {
            var incomplete = false;

            angular.forEach(scos, function(sco) {
                // Ignore SCOs not visible or without launch URL.
                if (sco.isvisible && sco.launch) {
                    if (self.isStatusIncomplete(sco.status)) {
                        incomplete = true;
                    }
                }
            });

            return incomplete;
        });
    };

    /**
     * Given a launch URL, check if it's a external link.
     * Based on Moodle's scorm_external_link.
     *
     * @param  {String}  link Link to check.
     * @return {Boolean}      Whether it's an external link.
     */
    function isExternalLink(link) {
        link = link.toLowerCase();

        if (link.match(/https?:\/\//)) {
            return true;
        } else if (link.substr(0, 4) == 'www.') {
            return true;
        }

        return false;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the scorm WS are available.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_scorm_get_scorm_attempt_count') &&
                    site.wsAvailable('mod_scorm_get_scorm_sco_tracks') &&
                    site.wsAvailable('mod_scorm_get_scorm_scoes') &&
                    site.wsAvailable('mod_scorm_get_scorm_user_data') &&
                    site.wsAvailable('mod_scorm_get_scorms_by_courses') &&
                    site.wsAvailable('mod_scorm_insert_scorm_tracks');
        });
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
     * Check if a package URL is valid.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isValidPackageUrl
     * @param  {String}  packageUrl Package URL.
     * @return {Boolean}            True if valid, false otherwise.
     */
    self.isValidPackageUrl = function(packageUrl) {
        if (!packageUrl) {
            return false;
        }
        if (packageUrl.indexOf('imsmanifest.xml') > -1) {
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
     * @param {String} id       Module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        siteId = siteId || $mmSite.getId();
        if (id) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    scormid: id
                };
                return site.write('mod_scorm_view_scorm', params);
            });
        }
        return $q.reject();
    };

    /**
     * Report a SCO as being launched.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#logLaunchSco
     * @param {Number} scormId  SCORM ID.
     * @param {Number} scoId    SCO ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the WS call is successful.
     */
    self.logLaunchSco = function(scormId, scoId, siteId) {
        siteId = siteId || $mmSite.getId();
        var params = {
            scormid: scormId,
            scoid: scoId
        };
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.write('mod_scorm_launch_sco', params).then(function(response) {
                if (!response || !response.status) {
                    return $q.reject();
                }
            });
        });
    };

    /**
     * Saves a SCORM tracking record.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#saveTracks
     * @param  {Number} scoId      Sco ID.
     * @param  {Number} attempt    Attempt number.
     * @param  {Object[]} tracks   Tracking data to store.
     * @param  {Boolean} offline   True if attempt is offline, false otherwise.
     * @param  {Object} scorm      SCORM.
     * @param  {Object} [userData] User data for this attempt and SCO. If not defined, it will be retrieved from DB. Recommended.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when data is saved.
     */
    self.saveTracks = function(scoId, attempt, tracks, offline, scorm, userData, siteId) {
        siteId = siteId || $mmSite.getId();
        if (offline) {
            var promise = userData ? $q.when(userData) : self.getScormUserData(scorm.id, attempt, offline, siteId);
            return promise.then(function(userData) {
                return $mmaModScormOffline.saveTracks(siteId, scorm, scoId, attempt, tracks, userData);
            });
        } else {
            return $mmaModScormOnline.saveTracks(siteId, scorm.id, scoId, attempt, tracks).then(function() {
                // Tracks have been saved, update cached user data.
                self._updateUserDataAfterSave(siteId, scorm.id, attempt, tracks);
            });
        }
    };

    /**
     * Saves a SCORM tracking record using a synchronous call.
     * Please use this function only if synchronous is a must. It's recommended to use $mmaModScorm#saveTracks.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#saveTracksSync
     * @param  {Number} scoId      Sco ID.
     * @param  {Number} attempt    Attempt number.
     * @param  {Object[]} tracks   Tracking data to store.
     * @param  {Boolean} offline   True if attempt is offline, false otherwise.
     * @param  {Object} [scorm]    SCORM. Required if offline=true.
     * @param  {Object} [userData] User data for this attempt and SCO. Required if offline=true.
     * @return {Boolean}           In online returns true if data is inserted, false otherwise.
     *                             In offline returns true if data to insert is valid, false otherwise. True doesn't mean that the
     *                             data has been stored, this function can return true but the insertion can still fail somehow.
     */
    self.saveTracksSync = function(scoId, attempt, tracks, offline, scorm, userData) {
        if (offline) {
            return $mmaModScormOffline.saveTracksSync(scorm, scoId, attempt, tracks, userData);
        } else {
            var success = $mmaModScormOnline.saveTracksSync(scoId, attempt, tracks);
            if (success) {
                // Tracks have been saved, update cached user data.
                self._updateUserDataAfterSave($mmSite.getId(), scorm.id, attempt, tracks);
            }
            return success;
        }
    };

    /**
     * Check if the SCORM main file should be downloaded.
     * This function should only be called if the SCORM can be downloaded (not downloaded or outdated).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#shouldDownloadMainFile
     * @param  {Object} scorm         SCORM to check.
     * @param  {Boolean} [isOutdated] True if package outdated, false if not downloaded, undefined to calculate it.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with true if it should be downloaded, false otherwise.
     */
    self.shouldDownloadMainFile = function(scorm, isOutdated, siteId) {
        siteId = siteId || $mmSite.getId();

        if (typeof isOutdated == 'undefined') {
            // Calculate if it's outdated.
            return $mmFilepool.getPackageData(siteId, mmaModScormComponent, scorm.coursemodule).then(function(data) {
                var isOutdated = data.status == mmCoreOutdated ||
                        (data.status == mmCoreDownloading && data.previous == mmCoreOutdated);
                return !isOutdated || data.revision != scorm.sha1hash;
            }).catch(function() {
                //Package not found, not downloaded.
                return $q.when(true);
            });
        } else if (isOutdated) {
            // The package is outdated, but maybe the file hasn't changed.
            return $mmFilepool.getPackageRevision(siteId, mmaModScormComponent, scorm.coursemodule).then(function(revision) {
                return scorm.sha1hash != revision;
            }).catch(function() {
                //Package not found, not downloaded.
                return $q.when(true);
            });
        } else {
            return $q.when(true);
        }
    };

    /**
     * If needed, updates cached user data after saving tracks in online.
     *
     * @param  {String} siteId   Site ID.
     * @param  {Number} scormId  SCORM ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data saved.
     * @return {Promise}         Promise resolved when updated.
     * @protected
     */
    self._updateUserDataAfterSave = function(siteId, scormId, attempt, tracks) {
        if (!tracks || !tracks.length) {
            return $q.when();
        }

        // Check if we need to update. We only update if we sent some track with a dot notation.
        var needsUpdate = false;
        for (var i = 0, len = tracks.length; i < len && !needsUpdate; i++) {
            var track = tracks[i];
            if (track.element && track.element.indexOf('.') > -1) {
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            return $mmaModScormOnline.getScormUserData(siteId, scormId, attempt, true);
        }
        return $q.when();
    };

    return self;
});
