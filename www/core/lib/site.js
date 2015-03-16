angular.module('mm.core')

.factory('$mmSite', function($http, $q, $mmWS, md5) {

    function Site(id, siteurl, username, token) {
        this.id = id;
        this.siteurl = siteurl;
        this.username = username;
        this.token = token;
    };

    var self = {},
        currentSite;

    // self.setSiteURL = function(siteurl) {
    //     currentSite = new Site();
    //     currentSite.siteurl = siteurl;
    // }

    /**
     * Save the token retrieved and load the full siteinfo object.
     * @param  {string} siteurl The site URL
     * @param  {str} token      The user token
     * @return {Promise}        A promise to be resolved when the token is saved.
     */
    self.newSite = function(siteurl, token) {

        var deferred = $q.defer();

        var preSets = {
            wstoken: token,
            siteurl: siteurl,
            silently: true,
            getFromCache: false,
            saveToCache: true
        };

        function siteDataRetrieved(site) {
            if(self.isValidMoodleVersion(site.functions)) {

                var siteid = md5.createHash(site.siteurl + site.username);

                currentSite = new Site(siteid, siteurl, site.username, token);

                site.token = token;
                site.id = siteid;

                deferred.resolve(site);
            } else {
                deferred.reject('invalidmoodleversion'+'2.4');
            }
        }

        // We have a valid token, try to get the site info.
        self.readWS('moodle_webservice_get_siteinfo', {}, preSets).then(siteDataRetrieved, function(error) {
            self.readWS('core_webservice_get_site_info', {}, preSets).then(siteDataRetrieved, function(error) {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    };

    /**
     * Check for the minimum required version. We check for WebServices present, not for Moodle version.
     * This may allow some hacks like using local plugins for adding missing functions in previous versions.
     * @param {Array} sitefunctions List of functions of the Moodle site.
     * @return {Boolean}            True if t
     */
    self.isValidMoodleVersion = function(sitefunctions) {
        for(var i = 0; i < sitefunctions.length; i++) {
            if (sitefunctions[i].name.indexOf("component_strings") > -1) {
                return true;
            }
        }
        return false;
    };

    self.loadSite = function(site) {
        currentSite = new Site(site.id, site.siteurl, site.username, site.token);
    }

    self.getCurrentSite = function() {
        if(typeof(currentSite) != 'undefined' && currentSite.token == '') {
            return undefined;
        }

        return currentSite;
    }

    self.getCurrentToken = function() {
        if(typeof(currentSite) != 'undefined') {
            return currentSite.token;
        }
        return undefined;
    }

    self.getCurrentSiteURL = function() {
        if(typeof(currentSite) != 'undefined') {
            return currentSite.siteurl;
        }
        return undefined;
    }

    self.isLoggedIn = function() {
        return typeof(currentSite) != 'undefined' && typeof(currentSite.token) != 'undefined';
    }

    /**
     * Logout a user.
     */
    self.logout = function() {
        delete currentSite;
    }

    self.readWS = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 1;
        preSets.readFromCache = 1;

        return self.requestWS(method, data, preSets);
    }

    self.writeWS = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 1;
        preSets.readFromCache = 1;

        return self.requestWS(method, data, preSets);
    }

    self.requestWS = function(method, data, preSets) {
        var deferred = $q.defer();

        preSets = self.verifyPresets(preSets);

        if(!preSets) {
            deferred.reject("unexpectederror");
            return deferred.promise;
        }

        $mmWS.moodleWSCall(method, data, preSets).then(function(data) {
            deferred.resolve(data);
        }, function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    self.verifyPresets = function(preSets) {
        if (typeof(preSets) == 'undefined' || preSets == null) {
            preSets = {};
        }

        if (typeof(preSets.getFromCache) == 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) == 'undefined') {
            preSets.saveToCache = 1;
        }

        if (typeof(preSets.wstoken) == 'undefined') {
            preSets.wstoken = self.getCurrentToken();
            if (!preSets.wstoken) {
                return false;
            }
        }

        if (typeof(preSets.siteurl) == 'undefined') {
            preSets.siteurl = self.getCurrentSiteURL();
            if (!preSets.siteurl) {
                return false;
            }
        }

        if(typeof(preSets.functions) == 'undefined') {
            var current_site = self.getCurrentSite();
            if (!current_site || !current_site.functions) {
                preSets.wsfunctions = [];
            } else {
                preSets.wsfunctions = current_site.functions;
            }
        }

        return preSets;
    };

    return self;
});