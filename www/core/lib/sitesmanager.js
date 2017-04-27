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

angular.module('mm.core')

.constant('mmCoreSitesStore', 'sites')
.constant('mmCoreCurrentSiteStore', 'current_site')

.config(function($mmAppProvider, mmCoreSitesStore, mmCoreCurrentSiteStore) {
    var stores = [
        {
            name: mmCoreSitesStore,
            keyPath: 'id'
        },
        {
            name: mmCoreCurrentSiteStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Sites manager service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmSitesManager
 */
.factory('$mmSitesManager', function($http, $q, $mmSitesFactory, md5, $mmLang, $mmApp, $mmUtil, $mmEvents,
            $translate, mmCoreSitesStore, mmCoreCurrentSiteStore, mmCoreEventLogin, mmCoreEventLogout, $log, mmCoreWSPrefix,
            mmCoreEventSiteUpdated, mmCoreEventSiteAdded, mmCoreEventSessionExpired, mmCoreEventSiteDeleted, $mmText,
            mmCoreConfigConstants, mmLoginSSOCode, mmLoginSSOInAppCode) {

    $log = $log.getInstance('$mmSitesManager');

    var self = {},
        services = {},
        sessionRestored = false,
        currentSite,
        sites = {};

    /**
     * Get the demo data of the siteurl if it is a demo site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getDemoSiteData
     * @param  {String} siteurl URL of the site to check.
     * @return {Object}         Site data if it's a demo site, undefined otherwise.
     */
    self.getDemoSiteData = function(siteurl) {
        var demoSites = mmCoreConfigConstants.demo_sites;
        if (typeof demoSites != 'undefined' && typeof demoSites[siteurl] != 'undefined') {
            return demoSites[siteurl];
        }
    };

    /**
     * Check if a site is valid and if it has specifics settings for authentication
     * (like force to log in using the browser).
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#checkSite
     * @param {String} siteurl  URL of the site to check.
     * @param {String} protocol Protocol to use. If not defined, use https.
     * @return {Promise}        A promise to be resolved when the site is checked. Resolve params:
     *                            {Number} code      Code to identify the authentication method to use.
     *                            {String} siteurl   Site url to use (might have changed during the process).
     *                            {String} [warning] Code of the warning message to show to the user.
     */
    self.checkSite = function(siteurl, protocol) {
        // formatURL adds the protocol if is missing.
        siteurl = $mmUtil.formatURL(siteurl);

        if (!$mmUtil.isValidURL(siteurl)) {
            return $mmLang.translateAndReject('mm.login.invalidsite');
        } else if (!$mmApp.isOnline()) {
            return $mmLang.translateAndReject('mm.core.networkerrormsg');
        } else {
            protocol = protocol || 'https://';

            return checkSite(siteurl, protocol).catch(function(error) {
                // Do not continue checking if a critical error happened.
                if (error.critical) {
                    return $q.reject(error.error);
                }

                // Retry with the other protocol.
                protocol = protocol == 'https://' ? 'http://' : 'https://';
                return checkSite(siteurl, protocol).catch(function(secondError){
                    // Site doesn't exist.
                    if (secondError.error) {
                        return $q.reject(secondError.error);
                    } else if (error.error) {
                        return $q.reject(error.error);
                    }
                    return $mmLang.translateAndReject('mm.login.checksiteversion');
                });
            });
        }
    };

    /**
     * Helper function to check if a site is valid and if it has specifics settings for authentication
     * (like force to log in using the browser).
     *
     * @param {String} siteurl       URL of the site to check.
     * @param {String} protocol      Protocol to use. If not defined, use https.
     * @return {Promise}        A promise to be resolved when the site is checked. Resolve params:
     *                            {Number} code      Code to identify the authentication method to use.
     *                            {String} siteurl   Site url to use (might have changed during the process).
     *                            {String} [warning] Code of the warning message to show to the user.
     *                            {String} service   Service used.
     *                            {Object} [config]  Site public config (if available).
     */
    function checkSite(siteurl, protocol) {
        // Now, replace the siteurl with the protocol.
        siteurl = siteurl.replace(/^http(s)?\:\/\//i, protocol);

        return self.siteExists(siteurl).catch(function(error) {
            // Do not continue checking if WS are not enabled.
            if (error.errorcode && error.errorcode == 'enablewsdescription') {
                return rejectWithCriticalError(error.error, error.errorcode);
            }

            // Site doesn't exist. Try to add or remove 'www'.
            var treatedUrl = $mmText.addOrRemoveWWW(siteurl);
            return self.siteExists(treatedUrl).then(function() {
                // Success, use this new URL as site url.
                siteurl = treatedUrl;
            }).catch(function(secondError) {
                // Do not continue checking if WS are not enabled.
                if (secondError.errorcode && secondError.errorcode == 'enablewsdescription') {
                    return rejectWithCriticalError(secondError.error, secondError.errorcode);
                }

                error = secondError || error;
                return $q.reject({error: typeof error == 'object' ? error.error : error});
            });
        }).then(function() {
            // Create a temporary site to check if local_mobile is installed.
            var temporarySite = $mmSitesFactory.makeSite(undefined, siteurl);
            return temporarySite.checkLocalMobilePlugin().then(function(data) {
                data.service = data.service || mmCoreConfigConstants.wsservice;
                services[siteurl] = data.service; // No need to store it in DB.

                if (data.coresupported || (data.code != mmLoginSSOCode && data.code != mmLoginSSOInAppCode)) {
                    // SSO using local_mobile not needed, try to get the site public config.
                    return temporarySite.getPublicConfig().then(function(config) {

                        // Check that the user can authenticate.
                        if (!config.enablewebservices) {
                            return rejectWithCriticalError($translate.instant('mm.login.webservicesnotenabled'));
                        } else if (!config.enablemobilewebservice) {
                            return rejectWithCriticalError($translate.instant('mm.login.mobileservicesnotenabled'));
                        } else if (config.maintenanceenabled) {
                            var message = $translate.instant('mm.core.sitemaintenance');
                            if (config.maintenancemessage) {
                                message += config.maintenancemessage;
                            }
                            return rejectWithCriticalError(message);
                        }

                        // Everything ok.
                        if (data.code === 0) {
                            data.code = config.typeoflogin;
                        }
                        data.config = config;
                        return data;
                    }, function(error) {
                        // Error, check if not supported.
                        if (error.available === 1) {
                            // Service supported but an error happened. Return error.
                            return $q.reject({error: error.error});
                        }

                        return data;
                    });
                }

                return data;
            }).then(function(data) {
                siteurl = temporarySite.getURL();
                return {siteurl: siteurl, code: data.code, warning: data.warning, service: data.service, config: data.config};
            });
        });

        function rejectWithCriticalError(message, errorCode) {
            return $q.reject({
                error: message,
                errorcode: errorCode,
                critical: true
            });
        }
    }

    /**
     * Check if a site exists.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#siteExists
     * @param  {String} siteurl URL of the site to check.
     * @return {Promise}        A promise to be resolved if the site exists.
     */
    self.siteExists = function(siteurl) {
        var data = {};

        if (!ionic.Platform.isWebView()) {
            // Send fake parameters for CORS. This is only needed in browser.
            data.username = 'a';
            data.password = 'b';
            data.service = 'c';
        }

        return $http.post(siteurl + '/login/token.php', data, {timeout: 30000, responseType: 'json'}).then(function(data) {
            data = data.data;

            if (data.errorcode && (data.errorcode == 'enablewsdescription' || data.errorcode == 'requirecorrectaccess')) {
                return $q.reject({errorcode: data.errorcode, error: data.error});
            } else if (data.error && data.error == 'Web services must be enabled in Advanced features.') {
                return $q.reject({errorcode: 'enablewsdescription', error: data.error});
            }
            // Other errors are not being checked because invalid login will be always raised and we cannot differ them.
            return $q.when();
        });
    };

    /**
     * Gets a user token from the server.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getUserToken
     * @param {String} siteurl   The site url.
     * @param {String} username  User name.
     * @param {String} password  Password.
     * @param {String} [service] Service to use. If not defined, it will be searched in memory.
     * @param {Boolean} retry    We are retrying with a prefixed URL.
     * @return {Promise}         A promise to be resolved when the token is retrieved. If success, returns an object
     *                           with the token, private token and the siteurl to use.
     */
    self.getUserToken = function(siteurl, username, password, service, retry) {
        retry = retry || false;

        if (!$mmApp.isOnline()) {
            return $mmLang.translateAndReject('mm.core.networkerrormsg');
        }

        if (!service) {
            service = self.determineService(siteurl);
        }

        var loginurl = siteurl + '/login/token.php';
        var data = {
            username: username,
            password: password,
            service: service
        };

        return $http.post(loginurl, data).then(function(response) {
            var data = response.data;

            if (typeof data == 'undefined') {
                return $mmLang.translateAndReject('mm.core.cannotconnect');
            } else {
                if (typeof data.token != 'undefined') {
                    return {token: data.token, siteurl: siteurl, privatetoken: data.privatetoken};
                } else {
                    if (typeof data.error != 'undefined') {
                        // We only allow one retry (to avoid loops).
                        if (!retry && data.errorcode == "requirecorrectaccess") {
                            siteurl = $mmText.addOrRemoveWWW(siteurl);
                            return self.getUserToken(siteurl, username, password, service, true);
                        } else if (typeof data.errorcode != 'undefined') {
                            return $q.reject({error: data.error, errorcode: data.errorcode});
                        } else {
                            return $q.reject(data.error);
                        }
                    } else {
                        return $mmLang.translateAndReject('mm.login.invalidaccount');
                    }
                }
            }
        }, function() {
            return $mmLang.translateAndReject('mm.core.cannotconnect');
        });
    };

    /**
     * Add a new site to the site list and authenticate the user in this site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#newSite
     * @param  {String} siteurl        The site url.
     * @param  {String} token          User's token.
     * @param  {String} [privateToken] User's private token.
     * @return {Promise}               A promise to be resolved when the site is added and the user is authenticated.
     */
    self.newSite = function(siteurl, token, privateToken) {
        privateToken = privateToken || '';

        var candidateSite = $mmSitesFactory.makeSite(undefined, siteurl, token, undefined, privateToken);

        return candidateSite.fetchSiteInfo().then(function(infos) {
            if (isValidMoodleVersion(infos)) {
                // Set site ID and infos.
                var siteId = self.createSiteID(infos.siteurl, infos.username);
                candidateSite.setId(siteId);
                candidateSite.setInfo(infos);

                // Try to get the site config.
                return getSiteConfig(candidateSite).then(function(config) {
                    candidateSite.setConfig(config);
                    // Add site to sites list.
                    self.addSite(siteId, siteurl, token, infos, privateToken, config);
                    // Turn candidate site into current site.
                    currentSite = candidateSite;
                    // Store session.
                    self.login(siteId);
                    $mmEvents.trigger(mmCoreEventSiteAdded, siteId);
                });
            } else {
                return $mmLang.translateAndReject('mm.login.invalidmoodleversion');
            }
        });
    };

    /**
     * Create a site ID based on site URL and username.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#createSiteID
     * @param {String} siteurl  The site url.
     * @param {String} username Username.
     * @return {String}         Site ID.
     */
    self.createSiteID = function(siteurl, username) {
        return md5.createHash(siteurl + username);
    };

    /**
     * Function for determine which service we should use (default or extended plugin).
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#determineService
     * @param  {String} siteurl The site URL.
     * @return {String}         The service shortname.
     */
    self.determineService = function(siteurl) {
        // We need to try siteurl in both https or http (due to loginhttps setting).

        // First http://
        siteurl = siteurl.replace("https://", "http://");
        if (services[siteurl]) {
            return services[siteurl];
        }

        // Now https://
        siteurl = siteurl.replace("http://", "https://");
        if (services[siteurl]) {
            return services[siteurl];
        }

        // Return default service.
        return mmCoreConfigConstants.wsservice;
    };

    /**
     * Check for the minimum required version (Moodle 2.4).
     *
     * @param {Array} sitefunctions List of functions of the Moodle site.
     * @return {Boolean}            True if the moodle version is valid, false otherwise.
     */
    function isValidMoodleVersion(infos) {
        if (!infos) {
            return false;
        }

        var minVersion = 2012120300, // Moodle 2.4 version.
            minRelease = "2.4";

        // Try to validate by version.
        if (infos.version) {
            var version = parseInt(infos.version);
            if (!isNaN(version)) {
                return version >= minVersion;
            }
        }

        // We couldn't validate by version number. Let's try to validate by release number.
        if (infos.release) {
            var matches = infos.release.match(/^([\d|\.]*)/);
            if (matches && matches.length > 1) {
                return matches[1] >= minRelease;
            }
        }

        // Couldn't validate by release either. Check if it uses local_mobile plugin.
        var appUsesLocalMobile = false;
        angular.forEach(infos.functions, function(func) {
            if (func.name.indexOf(mmCoreWSPrefix) != -1) {
                appUsesLocalMobile = true;
            }
        });

        return appUsesLocalMobile;
    }

    /**
     * Check if site info is valid. If it's not, return error message.
     *
     * @param {Object} infos    Site info.
     * @return {Object|Boolean} Object with error message to show and its params if info is not valid, true if info is valid.
     */
    function validateSiteInfo(infos) {
        if (!infos.firstname || !infos.lastname) {
            var moodleLink = '<a mm-link href="' + infos.siteurl + '">' + infos.siteurl + '</a>';
            return {error: 'mm.core.requireduserdatamissing', params: {'$a': moodleLink}};
        }
        return true;
    }

    /**
     * Saves a site in local DB.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#addSite
     * @param  {String} id             Site ID.
     * @param  {String} siteurl        Site URL.
     * @param  {String} token          User's token in the site.
     * @param  {Object} infos          Site's info.
     * @param  {String} [privateToken] User's private token.
     * @param  {Object} [config]       Site config (from tool_mobile_get_config).
     * @return {Promise}               Promise resolved when done.
     */
    self.addSite = function(id, siteurl, token, infos, privateToken, config) {
        privateToken = privateToken || '';
        return $mmApp.getDB().insert(mmCoreSitesStore, {
            id: id,
            siteurl: siteurl,
            token: token,
            infos: infos,
            privatetoken: privateToken,
            config: config,
            loggedout: 0
        });
    };

    /**
     * Login a user to a site from the list of sites.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#loadSite
     * @param {String} siteId ID of the site to load.
     * @return {Promise}      Promise to be resolved when the site is loaded.
     */
    self.loadSite = function(siteId) {
        $log.debug('Load site ' + siteId);

        return self.getSite(siteId).then(function(site) {
            currentSite = site;
            self.login(siteId);

            if (site.isLoggedOut()) {
                // Logged out, nothing else to do.
                return;
            }

            // Check if local_mobile was installed to Moodle.
            return site.checkIfLocalMobileInstalledAndNotUsed().then(function() {
                // Local mobile was added. Throw invalid session to force reconnect and create a new token.
                $mmEvents.trigger(mmCoreEventSessionExpired, {siteid: siteId});
            }, function() {
                // Update site info. We don't block the UI.
                self.updateSiteInfo(siteId);
            });
        });
    };

    /**
     * Get current site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getCurrentSite
     * @return {Object} Current site.
     */
    self.getCurrentSite = function() {
        return currentSite;
    };

    /**
     * Delete a site from the sites list.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#deleteSite
     * @param {String} siteid ID of the site to delete.
     * @return {Promise}      Promise to be resolved when the site is deleted.
     */
    self.deleteSite = function(siteid) {
        $log.debug('Delete site '+siteid);

        if (typeof currentSite != 'undefined' && currentSite.id == siteid) {
            self.logout();
        }

        return self.getSite(siteid).then(function(site) {
            return site.deleteDB().then(function() {
                delete sites[siteid];
                return $mmApp.getDB().remove(mmCoreSitesStore, siteid).then(function() {
                    return site.deleteFolder();
                }, function() {
                    // DB remove shouldn't fail, but we'll go ahead even if it does.
                    return site.deleteFolder();
                }).then(function() {
                    $mmEvents.trigger(mmCoreEventSiteDeleted, site);
                });
            });
        });
    };

    /**
     * Check if there are no sites stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#hasNoSites
     * @return {Promise} Promise to be resolved if there are no sites, and rejected if there is at least one.
     */
    self.hasNoSites = function() {
        return $mmApp.getDB().count(mmCoreSitesStore).then(function(count) {
            if (count > 0) {
                return $q.reject();
            }
        });
    };

    /**
     * Check if there are sites stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#hasSites
     * @return {Promise} Promise to be resolved if there is at least one site, and rejected if there aren't.
     */
    self.hasSites = function() {
        return $mmApp.getDB().count(mmCoreSitesStore).then(function(count) {
            if (count == 0) {
                return $q.reject();
            }
        });
    };

    /**
     * Returns a site object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSite
     * @param  {Number} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise}
     */
    self.getSite = function(siteId) {
        if (!siteId) {
            return currentSite ? $q.when(currentSite) : $q.reject();
        } else if (currentSite && currentSite.getId() === siteId) {
            return $q.when(currentSite);
        } else if (typeof sites[siteId] != 'undefined') {
            return $q.when(sites[siteId]);
        } else {
            return $mmApp.getDB().get(mmCoreSitesStore, siteId).then(function(data) {
                var site = $mmSitesFactory.makeSite(siteId, data.siteurl, data.token,
                        data.infos, data.privatetoken, data.config, data.loggedout);
                sites[siteId] = site;
                return site;
            });
        }
    };

    /**
     * Returns if the site is the current one.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#isCurrentSite
     * @param  {Mixed}  [site]  Site object or siteId to be compared. If not defined, use current site.
     * @return {Boolean}        If site or siteId is the current one.
     */
    self.isCurrentSite = function(site) {
        if (!site || !currentSite) {
            return !!currentSite;
        }

        var siteId = typeof site == 'object' ? site.getId() : site;
        return currentSite.getId() === siteId;
    };

    /**
     * Returns the database object of a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSiteDb
     * @param  {Number} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise}
     */
    self.getSiteDb = function(siteId) {
        return self.getSite(siteId).then(function(site) {
            return site.getDb();
        });
    };

    /**
     * Returns the site home ID of a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSiteHomeId
     * @param  {Number} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise}         Promise resolved with site home ID.
     */
    self.getSiteHomeId = function(siteId) {
        return self.getSite(siteId).then(function(site) {
            return site.getSiteHomeId();
        });
    };

    /**
     * Get the list of sites stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSites
     * @param {String[]} [ids] IDs of the sites to get. If not defined, return all sites.
     * @return {Promise}       Promise to be resolved when the sites are retrieved.
     */
    self.getSites = function(ids) {
        return $mmApp.getDB().getAll(mmCoreSitesStore).then(function(sites) {
            var formattedSites = [];
            angular.forEach(sites, function(site) {
                if (!ids || ids.indexOf(site.id) > -1) {
                    formattedSites.push({
                        id: site.id,
                        siteurl: site.siteurl,
                        fullname: site.infos.fullname,
                        sitename: site.infos.sitename,
                        avatar: site.infos.userpictureurl
                    });
                }
            });
            return formattedSites;
        });
    };

    /**
     * Get the list of IDs of sites stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSitesIds
     * @return {Promise} Promise to be resolved when the sites IDs are retrieved.
     */
    self.getSitesIds = function() {
        return $mmApp.getDB().getAll(mmCoreSitesStore).then(function(sites) {
            var ids = [];
            angular.forEach(sites, function(site) {
                ids.push(site.id);
            });
            return ids;
        });
    };

    /**
     * Login the user in a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#login
     * @param  {String} siteid ID of the site the user is accessing.
     * @return {Promise}       Promise resolved when current site is stored.
     */
    self.login = function(siteid) {
        return $mmApp.getDB().insert(mmCoreCurrentSiteStore, {
            id: 1,
            siteid: siteid
        }).then(function() {
            $mmEvents.trigger(mmCoreEventLogin);
        });
    };

    /**
     * Logout the user.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#logout
     * @return {Promise} Promise to be resolved when the user is logged out.
     */
    self.logout = function() {
        if (!currentSite) {
            // Already logged out.
            return $q.when();
        }

        var siteId = currentSite.getId(),
            siteConfig = currentSite.getStoredConfig(),
            promises = [];

        currentSite = undefined;

        if (siteConfig && siteConfig.tool_mobile_forcelogout == "1") {
            promises.push(self.setSiteLoggedOut(siteId, true));
        }

        promises.push($mmApp.getDB().remove(mmCoreCurrentSiteStore, 1));

        return $q.all(promises).finally(function() {
            $mmEvents.trigger(mmCoreEventLogout, siteId);
        });
    };

    /**
     * Restores the session to the previous one so the user doesn't has to login everytime the app is started.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#restoreSession
     * @return {Promise} Promise to be resolved if a session is restored.
     */
    self.restoreSession = function() {
        if (sessionRestored) {
            return $q.reject();
        }
        sessionRestored = true;

        return $mmApp.getDB().get(mmCoreCurrentSiteStore, 1).then(function(current_site) {
            var siteid = current_site.siteid;
            $log.debug('Restore session in site '+siteid);
            return self.loadSite(siteid);
        }, function() {
            return $q.reject(); // Reject without params.
        });
    };

    /**
     * Mark or unmark a site as logged out so the user needs to authenticate again.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#setSiteLoggedOut
     * @param  {String} siteId     ID of the site.
     * @param  {Boolean} loggedOut True to set the site as logged out, false otherwise.
     * @return {Promise}           Promise resolved when done.
     */
    self.setSiteLoggedOut = function(siteId, loggedOut) {
        return self.getSite(siteId).then(function(site) {
            site.setLoggedOut(loggedOut);

            return $mmApp.getDB().insert(mmCoreSitesStore, {
                id: siteId,
                siteurl: site.getURL(),
                token: site.getToken(),
                infos: site.getInfo(),
                privatetoken: site.getPrivateToken(),
                config: site.getStoredConfig(),
                loggedout: loggedOut ? 1 : 0
            });
        });
    };

    /**
     * Updates a site's token.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#updateSiteToken
     * @param  {String} siteUrl        Site's URL.
     * @param  {String} username       Username.
     * @param  {String} token          User's new token.
     * @param  {String} [privateToken] User's private token.
     * @return {Promise}               A promise to be resolved when the site is updated.
     */
    self.updateSiteToken = function(siteUrl, username, token, privateToken) {
        var siteId = self.createSiteID(siteUrl, username);
        return self.updateSiteTokenBySiteId(siteId, token, privateToken);
    };

    /**
     * Updates a site's token using siteId.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#updateSiteTokenBySiteId
     * @param  {String} siteId         Site Id.
     * @param  {String} token          User's new token.
     * @param  {String} [privateToken] User's private token.
     * @return {Promise}               A promise to be resolved when the site is updated.
     */
    self.updateSiteTokenBySiteId = function(siteId, token, privateToken) {
        privateToken = privateToken || '';
        return self.getSite(siteId).then(function(site) {
            site.token = token;
            site.privateToken = privateToken;
            site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

            return $mmApp.getDB().insert(mmCoreSitesStore, {
                id: siteId,
                siteurl: site.getURL(),
                token: token,
                infos: site.getInfo(),
                privatetoken: privateToken,
                config: site.getStoredConfig(),
                loggedout: 0
            });
        });
    };

    /**
     * Updates a site's info.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#updateSiteInfo
     * @param {String} siteid Site's ID.
     * @return {Promise}      A promise to be resolved when the site is updated.
     */
    self.updateSiteInfo = function(siteid) {
        return self.getSite(siteid).then(function(site) {
            return site.fetchSiteInfo().then(function(infos) {
                site.setInfo(infos);

                // Try to get the site config.
                return getSiteConfig(site).catch(function() {
                    // Error getting config, keep the current one.
                    return site.getStoredConfig();
                }).then(function(config) {
                    site.setConfig(config);

                    return $mmApp.getDB().insert(mmCoreSitesStore, {
                        id: siteid,
                        siteurl: site.getURL(),
                        token: site.getToken(),
                        infos: infos,
                        privatetoken: site.getPrivateToken(),
                        config: config,
                        loggedout: site.isLoggedOut() ? 1 : 0
                    }).finally(function() {
                        $mmEvents.trigger(mmCoreEventSiteUpdated, siteid);
                    });
                });
            });
        });
    };

    /**
     * Updates a site's info.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#updateSiteInfoByUrl
     * @param {String} siteurl  Site's URL.
     * @param {String} username Username.
     * @return {Promise}        A promise to be resolved when the site is updated.
     */
    self.updateSiteInfoByUrl = function(siteurl, username) {
        var siteid = self.createSiteID(siteurl, username);
        return self.updateSiteInfo(siteid);
    };

    /**
     * Get the site IDs a URL belongs to.
     * Someone can have more than one account in the same site, that's why this function returns an array of IDs.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSitesUrls
     * @param {String} url         URL to check.
     * @param {Boolean} prioritize True if it should prioritize current site. If the URL belongs to current site then it won't
     *                             check any other site, it will only return current site.
     * @param {String} [username]  If set, it will return only the sites where the current user has this username.
     * @return {Promise}           Promise resolved with the site IDs (array).
     */
    self.getSiteIdsFromUrl = function(url, prioritize, username) {
        // Check current site first, it has priority over the rest of sites.
        if (prioritize && currentSite && currentSite.containsUrl(url)) {
            if (!username || currentSite.getInfo().username == username) {
                return $q.when([currentSite.getId()]);
            }
        }

        // Check if URL has http(s) protocol.
        if (!url.match(/^https?:\/\//i)) {
            // URL doesn't have http(s) protocol. Check if it has any protocol.
            if (url.match(/^[^:]{2,10}:\/\//i)) {
                // It has some protocol. Return empty array.
                return $q.when([]);
            } else {
                // No protocol, probably a relative URL. Return current site.
                if (currentSite) {
                    return $q.when([currentSite.getId()]);
                } else {
                    return $q.when([]);
                }
            }
        }

        return $mmApp.getDB().getAll(mmCoreSitesStore).then(function(sites) {
            var ids = [];
            angular.forEach(sites, function(site) {
                if (!sites[site.id]) {
                    sites[site.id] = $mmSitesFactory.makeSite(
                            site.id, site.siteurl, site.token, site.infos, site.privatetoken, site.config, site.loggedout);
                }
                if (sites[site.id].containsUrl(url)) {
                    if (!username || sites[site.id].getInfo().username == username) {
                        ids.push(site.id);
                    }
                }
            });
            return ids;
        }).catch(function() {
            // Shouldn't happen.
            return [];
        });
    };

    /**
     * Get the site ID stored in DB ad current site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getStoredCurrentSiteId
     * @return {Promise} Promise resolved with the site ID.
     */
    self.getStoredCurrentSiteId = function() {
        return $mmApp.getDB().get(mmCoreCurrentSiteStore, 1).then(function(current_site) {
            return current_site.siteid;
        });
    };

    /**
     * Get the public config of a certain site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSitePublicConfig
     * @param {String} siteUrl URL of the site.
     * @return {Promise}       Promise resolved with the public config.
     */
    self.getSitePublicConfig = function(siteUrl) {
        var temporarySite = $mmSitesFactory.makeSite(undefined, siteUrl);
        return temporarySite.getPublicConfig();
    };

    /**
     * Get site config.
     *
     * @param  {Object} site The site to get the config.
     * @return {Promise}     Promise resolved with config if available.
     */
    function getSiteConfig(site) {
        if (!site.wsAvailable('tool_mobile_get_config')) {
            // WS not available, cannot get config.
            return $q.when();
        }

        return site.getConfig(false, true);
    }

    /**
     * Check if a certain feature is disabled in a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#isFeatureDisabled
     * @param  {String} name     Name of the feature to check.
     * @param  {Number} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise}         Promise resolved with true if disabled.
     */
    self.isFeatureDisabled = function(name, siteId) {
        return self.getSite(siteId).then(function(site) {
            return site.isFeatureDisabled(name);
        });
    };

    return self;

});
