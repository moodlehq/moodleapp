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

.constant('mmSitesStore', 'sites')

.config(function($mmAppProvider, mmSitesStore) {
    var stores = [
        {
            name: mmSitesStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

.factory('$mmSitesManager', function($http, $q, $mmSite, md5, $translate, $mmConfig, $mmApp, $mmUtil, mmSitesStore, $log) {

    var self = {},
        services = {},
        db = $mmApp.getDB();

    /**
     * Get the demo data of the siteurl if it is a demo site.
     * @param  {String} siteurl URL of the site to check.
     * @return {Object}         Demo data if the site is a demo site, undefined otherwise.
     */
    self.getDemoSiteData = function(siteurl) {
        return $mmConfig.get('demo_sites').then(function(demo_sites) {
            for (var i = 0; i < demo_sites.length; i++) {
                if (siteurl == demo_sites[i].key) {
                    return demo_sites[i];
                }
            }

            return $q.reject();
        });
    };

    /**
     * Check if a site is valid and if it has specifics settings for authentication
     * (like force to log in using the browser)
     *
     * @param {string} siteurl URL of the site to check.
     * @param {string} protocol Protocol to use. If not defined, use https.
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

        if (siteurl.indexOf('http://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            $translate('mm.core.login.invalidsite').then(function(value) {
                deferred.reject(value);
            });
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
                    $translate('cannotconnect').then(function(value) {
                        deferred.reject(value);
                    });
                }
            });

        }

        return deferred.promise;

    };

    /**
     * Check if a site exists.
     * @param  {String} siteurl URL of the site to check.
     * @return {Promise}        A promise to be resolved when the check finishes.
     */
    self.siteExists = function(siteurl) {
        return $http.head(siteurl + '/login/token.php', {timeout: 15000});
    };

    /**
     * Check if the local_mobile plugin is installed in the Moodle site
     * This plugin provide extended services
     * @param  {string} siteurl         The Moodle SiteURL
     */
    function checkMobileLocalPlugin(siteurl) {

        var deferred = $q.defer();

        $mmConfig.get('wsextservice').then(function(service) {

            $http.post(siteurl + '/local/mobile/check.php', {service: service} )
                .success(function(response) {
                    if (typeof(response.code) == "undefined") {
                        $translate('unexpectederror').then(function(value) {
                            deferred.reject(value);
                        });
                        return;
                    }

                    var code = parseInt(response.code, 10);
                    if (response.error) {
                        switch (code) {
                            case 1:
                                // Site in maintenance mode.
                                $translate('mm.core.login.siteinmaintenance').then(function(value) {
                                    deferred.reject(value);
                                });
                                break;
                            case 2:
                                // Web services not enabled.
                                $translate('mm.core.login.webservicesnotenabled').then(function(value) {
                                    deferred.reject(value);
                                });
                                break;
                            case 3:
                                // Extended service not enabled, but the official is enabled.
                                deferred.resolve(0);
                                break;
                            case 4:
                                // Neither extended or official services enabled.
                                $translate('mm.core.login.mobileservicesnotenabled').then(function(value) {
                                    deferred.reject(value);
                                });
                                break;
                            default:
                                $translate('unexpectederror').then(function(value) {
                                    deferred.reject(value);
                                });
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
     * @param {string} siteurl   The site url.
     * @param {string} username  User name.
     * @param {string} password  Password.
     * @param {bool}   retry     We are retrying with a prefixed URL.
     * @return {Promise}         A promise to be resolved when the site is checked.
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
                        $translate('mm.core.login.invalidaccount').then(function(value) {
                            deferred.reject(value);
                        });
                    }
                }
            }).error(function(data) {
                $translate('cannotconnect').then(function(value) {
                    deferred.reject(value);
                });
            });

        }, deferred.reject);

        return deferred.promise;
    };

    self.newSite = function(siteurl, username, token) {
        var deferred = $q.defer();

        var siteid = md5.createHash(siteurl + username);
        $mmSite.setSite(siteid, siteurl, token);

        $mmSite.getSiteInfo().then(function(infos) {
            if (isValidMoodleVersion(infos.functions)) {
                self.addSite(siteid, siteurl, token, infos);
                deferred.resolve();
            } else {
                $translate('mm.core.login.invalidmoodleversion').then(function(value) {
                    deferred.reject(value);
                });
                $mmSite.deleteCurrentSite();
            }
        }, function(error) {
            deferred.reject(error);
            $mmSite.deleteCurrentSite();
        });
        return deferred.promise;
    }

    /**
     * Function for determine which service we should use (default or extended plugin).
     * @param  {string} siteurl The site URL
     * @return {string}         The service shortname
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
     * @return {Boolean}            True if t
     */
    function isValidMoodleVersion(sitefunctions) {
        for(var i = 0; i < sitefunctions.length; i++) {
            if (sitefunctions[i].name.indexOf("component_strings") > -1) {
                return true;
            }
        }
        return false;
    };

    /**
     * Saves the site in local DB.
     * @param  {Object} site  Moodle site data returned from the server.
     */
    self.addSite = function(id, siteurl, token, infos) {
        db.insert(mmSitesStore, {
            id: id,
            siteurl: siteurl,
            token: token,
            infos: infos
        });
    };

    /**
     * Login a user to a site from the list of sites.
     * @param  {Number} index  Position of the site in the list of stored sites.
     */
    self.loadSite = function(siteid) {
        return db.get(mmSitesStore, siteid).then(function(site) {
            console.log(site);
            $mmSite.setSite(site.siteid, site.siteurl, site.token, site.infos);
        });
    };

    self.deleteSite = function(siteid) {
        $log.debug('Delete site '+siteid);
        return $mmSite.deleteSite(siteid).then(function() {
            return db.remove(mmSitesStore, siteid);
        });
    };

    self.noSites = function() {
        return db.count(mmSitesStore).then(function(count) {
            if(count > 0) {
                return $q.reject();
            }
        });
    };

    self.hasSites = function() {
        return db.count(mmSitesStore).then(function(count) {
            if(count == 0) {
                return $q.reject();
            }
        });
    };

    self.getSites = function() {
        return db.getAll(mmSitesStore).then(function(sites) {
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

    return self;

});
