angular.module('mm.core.login')

.factory('$mmSitesManager', function($http, $q, $mmSite, md5, $mmConfig, $mmUtil) {

    var self = {};
    var store = window.sessionStorage;

    var logindata = {
        siteurl: ''
    };

    /**
     * Get the login's data.
     * @return {Object} Login data with siteurl, username and password.
     */
    self.getLoginData = function() {
        return logindata;
    };

    /**
     * Get the login's siteurl.
     * @return {String} Login's siteurl.
     */
    self.getLoginURL = function() {
        return logindata.siteurl;
    };

    /**
     * Clear the login data.
     */
    self.clearLoginData = function() {
        logindata.siteurl = '';
    };

    /**
     * Check if the siteurl belongs to a demo site.
     * @param  {String}  siteurl URL of the site to check.
     * @return {Boolean}         True if it is a demo site, false otherwise.
     */
    self.isDemoSite = function(siteurl) {
        return typeof(self.getDemoSiteData(siteurl)) != 'undefined';
    };

    /**
     * Get the demo data of the siteurl if it is a demo site.
     * @param  {String} siteurl URL of the site to check.
     * @return {Object}         Demo data if the site is a demo site, undefined otherwise.
     */
    self.getDemoSiteData = function(siteurl) {
        var demo_sites = $mmConfig.get('demo_sites');
        console.log(demo_sites);

        for(var i = 0; i < demo_sites.length; i++) {
            if(siteurl == demo_sites[i].key) {
                return demo_sites[i];
            }
        }

        return undefined;
    };

    /**
     * Check if a site is valid and if it has specifics settings for authentication
     * (like force to log in using the browser)
     *
     * @param {string} siteurl URL of the site to check.
     * @param {string} protocol Protocol to use. If not defined, use https.
     * @return {Promise}        A promise to be resolved when the site is checked.
     */
    self.checkSite = function(siteurl, protocol) {

        var deferred = $q.defer();

        // formatURL adds the protocol if is missing.
        siteurl = $mmUtil.formatURL(siteurl);
        if (siteurl.indexOf('http://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            deferred.reject('siteurlrequired');
            return deferred.promise;
        }

        protocol = protocol || "https://";

        // Now, replace the siteurl with the protocol.
        siteurl = siteurl.replace(/^http(s)?\:\/\//i, protocol);

        self.siteExists(siteurl).then(function() {

            logindata.siteurl = siteurl;

            self.checkMobileLocalPlugin(siteurl).then(function(code) {
                deferred.resolve(code);
            }, function(error) {
                deferred.reject(error);
            });

        }, function(error) {
            // Site doesn't exist.

            if (siteurl.indexOf("https://") === 0) {
                // Retry
                self.checkSite(siteurl, "http://").then(deferred.resolve, deferred.reject);
            }
            else{
                deferred.reject('cannotconnect');
                //var error = MM.lang.s('cannotconnect');
                // if (error.status == 404) {
                    //error = MM.lang.s('invalidscheme');
                // }
                //MM.popErrorMessage(error);
            }
        });

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
    self.checkMobileLocalPlugin = function(siteurl) {

        var deferred = $q.defer();
        var service = $mmConfig.get('wsextservice');

        // First check if is disabled by config.
        if (!service) {
            deferred.resolve(0);
            return deferred.promise;
        }

        $http.post(siteurl + '/local/mobile/check.php', {service: service} )
            .success(function(response) {
                if (typeof(response.code) == "undefined") {
                    deferred.reject("unexpectederror");
                    return;
                }

                var code = parseInt(response.code, 10);
                if (response.error) {
                    switch (code) {
                        case 1:
                            // Site in maintenance mode.
                            deferred.reject("siteinmaintenance");
                            break;
                        case 2:
                            // Web services not enabled.
                            deferred.reject("webservicesnotenabled");
                            break;
                        case 3:
                            // Extended service not enabled, but the official is enabled.
                            deferred.resolve(0);
                            break;
                        case 4:
                            // Neither extended or official services enabled.
                            deferred.reject("mobileservicesnotenabled");
                            break;
                        default:
                            deferred.reject("unexpectederror");
                    }
                } else {
                    // Now we store here the service used by this site.
                    // var service = {
                    //     id: hex_md5(siteurl),
                    //     siteurl: siteurl,
                    //     service: MM.config.wsextservice
                    // };
                    // MM.db.insert("services", service);
                    // TODO: Store service
                    store.setItem('service'+siteurl, service);

                    deferred.resolve(code);
                }
            })
            .error(function(data) {
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

        var loginurl = siteurl + '/login/token.php';
        var data = {
            username: username,
            password: password,
            service: self.determineService(siteurl)
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
                    deferred.reject('invalidaccount');
                }
            }
        }).error(function(data) {
            // var error = MM.lang.s('cannotconnect');
            // if (xhr.status == 404) {
            //     error = MM.lang.s('invalidscheme');
            // }
            // MM.popErrorMessage(error);
            deferred.reject('cannotconnect');
        });

        return deferred.promise;
    };

    /**
     * Function for determine which service we should use (default or extended plugin).
     * @param  {string} siteurl The site URL
     * @return {string}         The service shortname
     */
    self.determineService = function(siteurl) {
        // We need to try siteurl in both https or http (due to loginhttps setting).

        // First http://
        siteurl = siteurl.replace("https://", "http://");
        var service = store.getItem('service'+siteurl);
        if (service) {
            return service;
        }

        // Now https://
        siteurl = siteurl.replace("http://", "https://");
        var service = store.getItem('service'+siteurl);
        if (service) {
            return service;
        }

        // Return default service.
        return mmConfig.get('wsservice');
    };

    /**
     * Saves the site in local DB.
     * @param  {Object} site  Moodle site data returned from the server.
     */
    self.addSite = function(site) {
        var sites = self.getSites();
        sites.push(site);
        store.sites = JSON.stringify(sites);
    };

    /**
     * Login a user to a site from the list of sites.
     * @param  {Number} index  Position of the site in the list of stored sites.
     */
    self.loadSite = function(index) {
        $mmSite.loadSite(self.getSite(index));
    };

    self.deleteSite = function(index) {
        var sites = self.getSites();
        sites.splice(index, 1);
        store.sites = JSON.stringify(sites);
    };

    self.hasSites = function() {
        var sites = self.getSites();
        return sites.length > 0;
    };

    self.getSites = function() {
        var sites = store.sites;
        if (!sites) {
            return [];
        }
        return JSON.parse(sites);
    };

    self.getSite = function(index) {
        var sites = self.getSites();
        return sites[index];
    };

    return self;

});

