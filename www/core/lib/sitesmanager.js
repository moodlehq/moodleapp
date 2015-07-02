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
.factory('$mmSitesManager', function($http, $q, $mmSitesFactory, md5, $mmLang, $mmConfig, $mmApp, $mmWS, $mmUtil, $mmFS, $mmEvents,
            mmCoreSitesStore, mmCoreCurrentSiteStore, mmCoreEventLogin, mmCoreEventLogout, $log, mmCoreEventSiteUpdated,
            mmCoreEventSiteAdded) {

    $log = $log.getInstance('$mmSitesManager');

    var self = {},
        services = {},
        db = $mmApp.getDB(),
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
     * @return {Promise}        Promise to be resolved with the site data if it's a demo site.
     *                          If it's not a demo site, the promise is rejected.
     */
    self.getDemoSiteData = function(siteurl) {
        return $mmConfig.get('demo_sites').then(function(demo_sites) {
            if (typeof(demo_sites) !== 'undefined' && typeof(demo_sites[siteurl]) !== 'undefined') {
                return demo_sites[siteurl];
            } else {
                return $q.reject();
            }
        });
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
     *                            {
     *                                code: Authentication code.
     *                                siteurl: Site url to use (might have changed during the process).
     *                            }
     */
    self.checkSite = function(siteurl, protocol) {

        var deferred = $q.defer();

        // formatURL adds the protocol if is missing.
        siteurl = $mmUtil.formatURL(siteurl);

        if (siteurl.indexOf('://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            $mmLang.translateErrorAndReject(deferred, 'mm.login.invalidsite');
        } else {

            protocol = protocol || "https://";

            // Now, replace the siteurl with the protocol.
            siteurl = siteurl.replace(/^http(s)?\:\/\//i, protocol);

            self.siteExists(siteurl).then(function() {

                checkMobileLocalPlugin(siteurl).then(function(code) {
                    deferred.resolve({siteurl: siteurl, code: code});
                }, function(error) {
                    deferred.reject(error);
                });

            }, function(error) {
                // Site doesn't exist.

                if (siteurl.indexOf("https://") === 0) {
                    // Retry without HTTPS.
                    self.checkSite(siteurl, "http://").then(deferred.resolve, deferred.reject);
                } else{
                    $mmLang.translateErrorAndReject(deferred, 'mm.core.cannotconnect');
                }
            });

        }

        return deferred.promise;

    };

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
        return $http.head(siteurl + '/login/token.php', {timeout: 15000});
    };

    /**
     * Check if the local_mobile plugin is installed in the Moodle site.
     * This plugin provide extended services.
     *
     * @param  {String} siteurl The Moodle SiteURL.
     * @return {Promise}        Promise to be resolved if the local_mobile plugin is installed. The promise is resolved
     *                          with an authentication code to identify the authentication method to use.
     */
    function checkMobileLocalPlugin(siteurl) {

        var deferred = $q.defer();

        delete services[siteurl]; // Delete service stored.

        $mmConfig.get('wsextservice').then(function(service) {

            $http.post(siteurl + '/local/mobile/check.php', {service: service} )
                .success(function(response) {
                    if (typeof(response.code) == "undefined") {
                        $mmLang.translateErrorAndReject(deferred, 'mm.core.unexpectederror');
                        return;
                    }

                    var code = parseInt(response.code, 10);
                    if (response.error) {
                        switch (code) {
                            case 1:
                                // Site in maintenance mode.
                                $mmLang.translateErrorAndReject(deferred, 'mm.login.siteinmaintenance');
                                break;
                            case 2:
                                // Web services not enabled.
                                $mmLang.translateErrorAndReject(deferred, 'mm.login.webservicesnotenabled');
                                break;
                            case 3:
                                // Extended service not enabled, but the official is enabled.
                                deferred.resolve(0);
                                break;
                            case 4:
                                // Neither extended or official services enabled.
                                $mmLang.translateErrorAndReject(deferred, 'mm.login.mobileservicesnotenabled');
                                break;
                            default:
                                $mmLang.translateErrorAndReject(deferred, 'mm.core.unexpectederror');
                        }
                    } else {
                        services[siteurl] = service; // No need to store it in DB.
                        deferred.resolve(code);
                    }
                })
                .error(function(data) {
                    deferred.resolve(0);
                });

        }, function() {
            deferred.resolve(0);
        });

        return deferred.promise;
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
     * @param {Boolean} retry    We are retrying with a prefixed URL.
     * @return {Promise}         A promise to be resolved when the token is retrieved.
     */
    self.getUserToken = function(siteurl, username, password, retry) {
        retry = retry || false;
        var deferred = $q.defer();

        determineService(siteurl).then(function(service) {

            var loginurl = siteurl + '/login/token.php';
            var data = {
                username: username,
                password: password,
                service: service
            };

            $http.post(loginurl, data).success(function(response) {

                if (typeof(response.token) != 'undefined') {
                    deferred.resolve(response.token);
                } else {

                    if (typeof(response.error) != 'undefined') {
                        // We only allow one retry (to avoid loops).
                        if (!retry && response.errorcode == "requirecorrectaccess") {
                            siteurl = siteurl.replace("https://", "https://www.");
                            siteurl = siteurl.replace("http://", "http://www.");
                            logindata.siteurl = siteurl;

                            self.getUserToken(siteurl, username, password, true).then(deferred.resolve, deferred.reject);
                        } else {
                            deferred.reject(response.error);
                        }
                    } else {
                        $mmLang.translateErrorAndReject(deferred, 'mm.login.invalidaccount');
                    }
                }
            }).error(function(data) {
                $mmLang.translateErrorAndReject(deferred, 'mm.core.cannotconnect');
            });

        }, deferred.reject);

        return deferred.promise;
    };

    /**
     * Add a new site to the site list and authenticate the user in this site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#newSite
     * @param {String} siteurl  The site url.
     * @param {String} token    User's token.
     * @return {Promise}        A promise to be resolved when the site is added and the user is authenticated.
     */
    self.newSite = function(siteurl, token) {
        var deferred = $q.defer();

        var candidateSite = $mmSitesFactory.makeSite(undefined, siteurl, token);

        candidateSite.fetchSiteInfo().then(function(infos) {
            if (isValidMoodleVersion(infos.functions)) {
                if (isValidInfo(infos)) {
                    var siteid = self.createSiteID(infos.siteurl, infos.username);
                    // Add site to sites list.
                    self.addSite(siteid, siteurl, token, infos);
                    // Turn candidate site into current site.
                    candidateSite.setId(siteid);
                    candidateSite.setInfo(infos);
                    currentSite = candidateSite;
                    // Store session.
                    self.login(siteid);
                    $mmEvents.trigger(mmCoreEventSiteAdded);
                    deferred.resolve();
                } else {
                    $mmLang.translateErrorAndReject(deferred, 'mm.login.cannotdownloadfiles');
                }
            } else {
                $mmLang.translateErrorAndReject(deferred, 'mm.login.invalidmoodleversion');
            }
        }, function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
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
     * @param  {String} siteurl The site URL.
     * @return {String}         The service shortname.
     */
    function determineService(siteurl) {
        // We need to try siteurl in both https or http (due to loginhttps setting).

        var deferred = $q.defer();

        // First http://
        siteurl = siteurl.replace("https://", "http://");
        if (services[siteurl]) {
            deferred.resolve(services[siteurl]);
            return deferred.promise;
        }

        // Now https://
        siteurl = siteurl.replace("http://", "https://");
        if (services[siteurl]) {
            deferred.resolve(services[siteurl]);
            return deferred.promise;
        }

        // Return default service.
        $mmConfig.get('wsservice').then(deferred.resolve, deferred.reject);

        return deferred.promise;
    };

    /**
     * Check for the minimum required version. We check for WebServices present, not for Moodle version.
     * This may allow some hacks like using local plugins for adding missing functions in previous versions.
     *
     * @param {Array} sitefunctions List of functions of the Moodle site.
     * @return {Boolean}            True if the moodle version is valid, false otherwise.
     */
    function isValidMoodleVersion(sitefunctions) {
        for(var i = 0; i < sitefunctions.length; i++) {
            if (sitefunctions[i].name.indexOf("component_strings") > -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if site info is valid (downloadfiles enabled).
     *
     * @param {Object} infos Site info.
     * @return {Boolean}     True if the site info is valid, false otherwise.
     */
    function isValidInfo(infos) {
        return typeof infos.downloadfiles == 'undefined' || infos.downloadfiles === 1;
    }

    /**
     * Saves a site in local DB.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#addSite
     * @param {String} id      Site ID.
     * @param {String} siteurl Site URL.
     * @param {String} token   User's token in the site.
     * @param {Object} infos   Site's info.
     */
    self.addSite = function(id, siteurl, token, infos) {
        db.insert(mmCoreSitesStore, {
            id: id,
            siteurl: siteurl,
            token: token,
            infos: infos
        });
    };

    /**
     * Login a user to a site from the list of sites.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#loadSite
     * @param {String} siteid ID of the site to load.
     * @return {Promise}      Promise to be resolved when the site is loaded.
     */
    self.loadSite = function(siteid) {
        $log.debug('Load site '+siteid);

        var deferred = $q.defer();

        self.getSite(siteid).then(function(site) {
            currentSite = site;
            self.login(siteid);
            // Update site info. Resolve the promise even if the update fails.
            self.updateSiteInfo(siteid).finally(function() {
                var infos = site.getInfo();
                if (!isValidInfo(infos)) {
                    $mmLang.translateErrorAndReject(deferred, 'mm.login.cannotdownloadfiles');
                    self.logout();
                } else {
                    deferred.resolve();
                }
            });
        }, deferred.reject);

        return deferred.promise;
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
                return db.remove(mmCoreSitesStore, siteid).then(function() {
                    return site.deleteFolder();
                }, function() {
                    // DB remove shouldn't fail, but we'll go ahead even if it does.
                    return site.deleteFolder();
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
        return db.count(mmCoreSitesStore).then(function(count) {
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
        return db.count(mmCoreSitesStore).then(function(count) {
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
     * @param  {Number} siteId The site ID.
     * @return {Promise}
     */
    self.getSite = function(siteId) {
        var deferred = $q.defer();

        if (currentSite && currentSite.getId() === siteId) {
            deferred.resolve(currentSite);
        } else if (typeof sites[siteId] != 'undefined') {
            deferred.resolve(sites[siteId]);
        } else {
            db.get(mmCoreSitesStore, siteId).then(function(site) {
                var site = $mmSitesFactory.makeSite(siteId, site.siteurl, site.token, site.infos);
                sites[siteId] = site;
                deferred.resolve(site);
            }, deferred.reject);
        }

        return deferred.promise;
    };

    /**
     * Returns the database object of a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSiteDb
     * @param  {Number} siteId The site ID.
     * @return {Promise}
     */
    self.getSiteDb = function(siteId) {
        return self.getSite(siteId).then(function(site) {
            return site.getDb();
        });
    };

    /**
     * Get the list of sites stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#getSites
     * @return {Promise} Promise to be resolved when the sites are retrieved.
     */
    self.getSites = function() {
        return db.getAll(mmCoreSitesStore).then(function(sites) {
            var formattedSites = [];
            angular.forEach(sites, function(site) {
                formattedSites.push({
                    id: site.id,
                    siteurl: site.siteurl,
                    fullname: site.infos.fullname,
                    sitename: site.infos.sitename,
                    avatar: site.infos.userpictureurl
                });
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
        return db.getAll(mmCoreSitesStore).then(function(sites) {
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
     */
    self.login = function(siteid) {
        db.insert(mmCoreCurrentSiteStore, {
            id: 1,
            siteid: siteid
        });
        $mmEvents.trigger(mmCoreEventLogin);
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
        currentSite = undefined;
        $mmEvents.trigger(mmCoreEventLogout);
        return db.remove(mmCoreCurrentSiteStore, 1);
    }

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

        return db.get(mmCoreCurrentSiteStore, 1).then(function(current_site) {
            var siteid = current_site.siteid;
            $log.debug('Restore session in site '+siteid);
            return self.loadSite(siteid);
        }, function() {
            return $q.reject(); // Reject without params.
        });
    };

    /**
     * Updates a site's token.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSitesManager#updateSiteToken
     * @param {String} siteurl  Site's URL.
     * @param {String} username Username.
     * @param {String} token    User's new token.
     * @return {Promise}        A promise to be resolved when the site is updated.
     */
    self.updateSiteToken = function(siteurl, username, token) {
        var siteid = self.createSiteID(siteurl, username);
        return self.getSite(siteid).then(function(site) {
            site.token = token;

            return db.insert(mmCoreSitesStore, {
                id: siteid,
                siteurl: site.getURL(),
                token: token,
                infos: site.getInfo()
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
                return db.insert(mmCoreSitesStore, {
                    id: siteid,
                    siteurl: site.getURL(),
                    token: site.getToken(),
                    infos: infos
                }).finally(function() {
                    $mmEvents.trigger(mmCoreEventSiteUpdated);
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

    return self;

});
