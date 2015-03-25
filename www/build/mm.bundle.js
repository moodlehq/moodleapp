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

angular.module('mm', ['ionic', 'mm.core', 'ngCordova'])
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

angular.module('mm.core', ['pascalprecht.translate']);

angular.module('mm.core')
.provider('$mmApp', function() {
        var DBNAME = 'MoodleMobile',
        dboptions = {
            autoSchema: true
        },
        dbschema = {
            stores: []
        };
        this.registerStore = function(store) {
        if (typeof(store.name) === 'undefined') {
            console.log('$mmApp: Error: store name is undefined.');
            return;
        } else if (storeExists(store.name)) {
            console.log('$mmApp: Error: store ' + store.name + ' is already defined.');
            return;
        }
        dbschema.stores.push(store);
    }
        this.registerStores = function(stores) {
        var self = this;
        angular.forEach(stores, function(store) {
            self.registerStore(store);
        })
    }
        function storeExists(name) {
        var exists = false;
        angular.forEach(dbschema.stores, function(store) {
            if (store.name === name) {
                exists = true;
            }
        });
        return exists;
    }
    this.$get = function($mmDB) {
        var db = $mmDB.getDB(DBNAME, dbschema, dboptions),
            self = {};
                self.getDB = function() {
            return db;
        };
                self.getSchema = function() {
            return dbschema;
        }
        return self;
    }
});

angular.module('mm.core')
.constant('mmConfigStore', 'config')
.config(function($mmAppProvider, mmConfigStore) {
    var stores = [
        {
            name: mmConfigStore,
            keyPath: 'name'
        }
    ];
    $mmAppProvider.registerStores(stores);
})
.factory('$mmConfig', function($http, $q, $log, $mmApp, mmConfigStore) {
    var initialized = false,
        self = {
            config: {}
        };
    function init() {
        var deferred = $q.defer();
        $http.get('config.json').then(function(response) {
            var data = response.data;
            for (var name in data) {
                self.config[name] = data[name];
            }
            initialized = true;
            deferred.resolve();
        }, deferred.reject);
        return deferred.promise;
    };
        self.get = function(name) {
        if (!initialized) {
            return init().then(function() {
                return getConfig(name);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }
        return getConfig(name);
        function getConfig(name) {
            var deferred = $q.defer(),
                value = self.config[name];
            if (typeof(value) == 'undefined') {
                $mmApp.getDB().get(mmConfigStore, name).then(function(entry) {
                    deferred.resolve(entry.value);
                }, deferred.reject);
            } else {
                deferred.resolve(value);
            }
            return deferred.promise;
        }
    };
        self.set = function(name, value) {
        if (!initialized) {
            return init().then(function() {
                return setConfig(name, value);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }
        return setConfig(name, value);
        function setConfig(name, value) {
            var deferred,
                fromStatic = self.config[name];
            if (typeof(fromStatic) === 'undefined') {
                return $mmApp.getDB().insert(mmConfigStore, {name: name, value: value});
            }
            $log.error('Cannot save static config setting \'' + name + '\'.');
            deferred = $q.defer()
            deferred.reject();
            return deferred.promise;
        }
    };
    return self;
});

angular.module('mm.core')
.factory('$mmDB', function($q, $log) {
    var self = {};
        function callDBFunction(db, func) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db[func].apply(db, Array.prototype.slice.call(arguments, 2)).then(function(result) {
                    if(typeof(result) == 'undefined') {
                        deferred.reject();
                    } else {
                        deferred.resolve(result);
                    }
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error executing function '+func+' to DB '+db.getName());
            $log.error(ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callWhere(db, table, field_name, op, value, op2, value2) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db.from(table).where(field_name, op, value, op2, value2).list().then(function(list) {
                    deferred.resolve(list);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error querying db '+db.getName()+'. '+ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callWhereEqual(db, table, field_name, value) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db.from(table).where(field_name, '=', value).list().then(function(list) {
                    deferred.resolve(list);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error getting where equal from db '+db.getName()+'. '+ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callEach(db, table, callback) {
        var deferred = $q.defer();
        callDBFunction(db, 'values', table, undefined, 99999999).then(function(entries) {
            for(var i = 0; i < entries.length; i++) {
                callback(entries[i]);
            }
            deferred.resolve();
        }, function() {
            deferred.reject();
        });
        return deferred.promise;
    };
        self.getDB = function(name, schema) {
        var db = new ydn.db.Storage(name, schema);
        return {
            getName: function() {
                return db.getName();
            },
            get: function(table, id) {
                return callDBFunction(db, 'get', table, id);
            },
            getAll: function(table) {
                return callDBFunction(db, 'values', table, undefined, 99999999);
            },
            count: function(table) {
                return callDBFunction(db, 'count', table);
            },
            insert: function(table, value) {
                return callDBFunction(db, 'put', table, value);
            },
            remove: function(table, id) {
                return callDBFunction(db, 'remove', table, id);
            },
            where: function(table, field_name, op, value, op2, value2) {
                return callWhere(db, table, field_name, op, value, op2, value2);
            },
            whereEqual: function(table, field_name, value) {
                return callWhereEqual(db, table, field_name, value);
            },
            each: function(table, callback) {
                return callEach(db, table, callback);
            },
            close: function() {
                db.close();
                db = undefined;
            }
        };
    };
        self.deleteDB = function(name) {
        return ydn.db.deleteDatabase(name);
    };
    return self;
});

angular.module('mm.core')
.factory('$mmFS', function($ionicPlatform, $cordovaFile, $log, $q) {
    var self = {},
        initialized = false,
        basePath = '';
    self.FORMATTEXT         = 0;
    self.FORMATDATAURL      = 1;
    self.FORMATBINARYSTRING = 2;
    self.FORMATARRAYBUFFER  = 3;
        self.init = function() {
        var deferred = $q.defer();
        if (initialized) {
            deferred.resolve();
            return deferred.promise;
        }
        $ionicPlatform.ready(function() {
            if (ionic.Platform.isAndroid()) {
                basePath = cordova.file.externalApplicationStorageDirectory;
            } else if(ionic.Platform.isIOS()) {
                basePath = cordova.file.documentsDirectory;
            } else {
                $log.error('Error getting device OS.');
                deferred.reject();
                return;
            }
            initialized = true;
            $log.debug('FS initialized: '+basePath);
            deferred.resolve();
        });
        return deferred.promise;
    };
        self.getFile = function(path) {
        return self.init().then(function() {
            $log.debug('Get file: '+path);
            return $cordovaFile.checkFile(basePath, path);
        });
    };
        self.getDir = function(path) {
        return self.init().then(function() {
            $log.debug('Get directory: '+path);
            return $cordovaFile.checkDir(basePath, path);
        });
    };
        function create(isDirectory, path, failIfExists, base) {
        return self.init().then(function() {
            base = base || basePath;
            if (path.indexOf('/') == -1) {
                if (isDirectory) {
                    $log.debug('Create dir ' + path + ' in ' + base);
                    return $cordovaFile.createDir(base, path, !failIfExists);
                } else {
                    $log.debug('Create file ' + path + ' in ' + base);
                    return $cordovaFile.createFile(base, path, !failIfExists);
                }
            } else {
                var firstDir = path.substr(0, path.indexOf('/'));
                var restOfPath = path.substr(path.indexOf('/') + 1);
                $log.debug('Create dir ' + firstDir + ' in ' + base);
                return $cordovaFile.createDir(base, firstDir, true).then(function(newDirEntry) {
                    return create(isDirectory, restOfPath, failIfExists, newDirEntry.toURL());
                }, function(error) {
                    $log.error('Error creating directory ' + firstDir + ' in ' + base);
                    return $q.reject(error);
                });
            }
        });
    }
        self.createDir = function(path, failIfExists) {
        failIfExists = failIfExists || false;
        return create(true, path, failIfExists);
    };
        self.createFile = function(path, failIfExists) {
        failIfExists = failIfExists || false;
        return create(false, path, failIfExists);
    };
        self.removeDir = function(path) {
        return self.init().then(function() {
            $log.debug('Remove directory: ' + path);
            return $cordovaFile.removeRecursively(basePath, path);
        });
    };
        self.removeFile = function(path) {
        return self.init().then(function() {
            $log.debug('Remove file: ' + path);
            return $cordovaFile.removeFile(basePath, path);
        });
    };
        self.getDirectoryContents = function(path) {
        $log.debug('Get contents of dir: ' + path);
        return self.getDir(path).then(function(dirEntry) {
            var deferred = $q.defer();
            var directoryReader = dirEntry.createReader();
            directoryReader.readEntries(deferred.resolve, deferred.reject);
            return deferred.promise;
        });
    };
        function getSize(entry) {
        var deferred = $q.defer();
        if (entry.isDirectory) {
            var directoryReader = entry.createReader();
            directoryReader.readEntries(function(entries) {
                var promises = [];
                for (var i = 0; i < entries.length; i++) {
                    promises.push(getSize(entries[i]));
                }
                $q.all(promises).then(function(sizes) {
                    var directorySize = 0;
                    for (var i = 0; i < sizes.length; i++) {
                        var fileSize = parseInt(sizes[i]);
                        if (isNaN(fileSize)) {
                            deferred.reject();
                            return;
                        }
                        directorySize += fileSize;
                    }
                    deferred.resolve(directorySize);
                }, deferred.reject);
            }, deferred.reject);
        } else if (entry.isFile) {
            entry.file(function(file) {
                deferred.resolve(file.size);
            }, deferred.reject);
        }
        return deferred.promise;
    }
        self.getDirectorySize = function(path) {
        $log.debug('Get size of dir: ' + path);
        return self.getDir(path).then(function(dirEntry) {
           return getSize(dirEntry);
        });
    };
        self.getFileSize = function(path) {
        $log.debug('Get size of file: ' + path);
        return self.getFile(path).then(function(fileEntry) {
           return getSize(fileEntry);
        });
    };
        self.calculateFreeSpace = function() {
        return $cordovaFile.getFreeDiskSpace();
    };
        self.normalizeFileName = function(filename) {
        filename = decodeURIComponent(filename);
        return filename;
    };
        self.readFile = function(path, format) {
        format = format || self.FORMATTEXT;
        $log.debug('Read file ' + path + ' with format '+format);
        switch (format) {
            case self.FORMATDATAURL:
                return $cordovaFile.readAsDataURL(basePath, path);
            case self.FORMATBINARYSTRING:
                return $cordovaFile.readAsBinaryString(basePath, path);
            case self.FORMATARRAYBUFFER:
                return $cordovaFile.readAsArrayBuffer(basePath, path);
            case self.FORMATTEXT:
            default:
                return $cordovaFile.readAsText(basePath, path);
        }
    };
        self.writeFile = function(path, data) {
        $log.debug('Write file: ' + path);
        return self.init().then(function() {
            return $cordovaFile.writeFile(basePath, path, data, true);
        });
    };
        self.getExternalFile = function(fullPath) {
        return $cordovaFile.checkFile(fullPath, '');
    }
        self.removeExternalFile = function(fullPath) {
        var directory = fullPath.substring(0, fullPath.lastIndexOf('/') );
        var filename = fullPath.substr(fullPath.lastIndexOf('/') + 1);
        return $cordovaFile.removeFile(directory, filename);
    }
    return self;
});

angular.module('mm.core')
.factory('$mmLang', function($translate, $translatePartialLoader, $mmConfig) {
    var self = {};
        self.registerLanguageFolder = function(path) {
        $translatePartialLoader.addPart(path);
    }
    self.changeCurrentLanguage = function(language) {
        $translate.use(language);
        $mmConfig.set('current_language', language);
    }
    return self;
})
.config(function($translateProvider, $translatePartialLoaderProvider) {
    $translateProvider.useLoader('$translatePartialLoader', {
      urlTemplate: '{part}/{lang}.json'
    });
    $translatePartialLoaderProvider.addPart('build/lang');
    $translateProvider.fallbackLanguage('en');
})
.run(function($ionicPlatform, $translate, $cordovaGlobalization, $mmConfig) {
    $ionicPlatform.ready(function() {
        $mmConfig.get('current_language').then(function(language) {
            $translate.use(language);
        }, function() {
            $cordovaGlobalization.getPreferredLanguage().then(function(result) {
                var language = result.value;
                if (language.indexOf('-') > -1) {
                    language = language.substr(0, language.indexOf('-'));
                }
                $translate.use(language);
            }, function() {
                $translate.use('en');
            });
        });
    });
});
angular.module('mm.core')
.factory('$mmSite', function($http, $q, $mmWS, $log, md5) {
    var deprecatedFunctions = {
        "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
        "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
        "moodle_notes_create_notes": "core_notes_create_notes",
        "moodle_message_send_instantmessages": "core_message_send_instant_messages",
        "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
        "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
    };
    var self = {},
        currentSite;
        self.getSiteInfo = function() {
        var deferred = $q.defer();
        if (!self.isLoggedIn()) {
            deferred.reject('notloggedin');
            return deferred.promise;
        }
        function siteDataRetrieved(infos) {
            deferred.resolve(infos);
        }
        self.read('moodle_webservice_get_siteinfo', {}).then(siteDataRetrieved, function(error) {
            self.read('core_webservice_get_site_info', {}).then(siteDataRetrieved, function(error) {
                deferred.reject(error);
            });
        });
        return deferred.promise;
    };
    self.isLoggedIn = function() {
        return typeof(currentSite) != 'undefined' && typeof(currentSite.token) != 'undefined' && currentSite.token != '';
    }
    self.logout = function() {
        delete currentSite;
    }
    self.setSite = function(site) {
        currentSite = site;
    }
    self.read = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 1;
        preSets.saveToCache = 1;
        return self.request(method, data, preSets);
    }
    self.write = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 0;
        preSets.saveToCache = 0;
        return self.request(method, data, preSets);
    }
        self.request = function(method, data, preSets) {
        var deferred = $q.defer();
        if (!self.isLoggedIn()) {
            deferred.reject('notloggedin');
        }
        method = checkDeprecatedFunction(method);
        preSets = preSets || {};
        preSets.wstoken = currentSite.token;
        preSets.siteurl = currentSite.siteurl;
        getFromCache(method, data, preSets).then(function(data) {
            deferred.resolve(data);
        }, function() {
            var saveToCache = preSets.saveToCache;
            delete preSets.getFromCache;
            delete preSets.saveToCache;
            delete preSets.omitExpires;
            $mmWS.call(method, data, preSets).then(function(data) {
                if (saveToCache) {
                    db.set('wscache', key, data);
                }
                deferred.resolve(data);
            }, function(error) {
                deferred.reject(error);
            });
        });
        return deferred.promise;
    }
    self.wsAvailable = function(method) {
        if (!self.isLoggedIn()) {
            return false;
        }
        for(var i = 0; i < currentSite.infos.functions; i++) {
            var f = functions[i];
            if (f.name == method) {
                return true;
            }
        }
        return false;
    }
    function checkDeprecatedFunction(method) {
        if (typeof deprecatedFunctions[method] !== "undefined") {
            if (self.wsAvailable(deprecatedFunctions[method])) {
                $log.warn("You are using deprecated Web Services: " + method +
                    " you must replace it with the newer function: " + MM.deprecatedFunctions[method]);
                return deprecatedFunctions[method];
            } else {
                $log.warn("You are using deprecated Web Services. " +
                    "Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
            }
        }
        return method;
    }
    function getFromCache(method, data, preSets) {
        var result,
            db = currentSite.db,
            deferred = $q.defer();
            key;
        if (!db) {
            deferred.reject();
            return deferred.promise;
        } else if (!preSets.getFromCache) {
            deferred.reject();
            return deferred.promise;
        }
        key = method + ':' + JSON.stringify(data);
        db.get('wscache', key).then(function(data) {
            var d = new Date(),
                now = d.getTime();
            if (!omitExpires) {
                if (now > cache.mmcacheexpirationtime) {
                    deferred.reject();
                    return;
                }
            }
            if (typeof data !== 'undefined') {
                var expires = (cache.mmcacheexpirationtime - now) / 1000;
                $log.info('Cached element found, id: ' + key + ' expires in ' + expires + ' seconds');
                deferred.resolve(data);
                return;
            }
            deferred.reject();
        }, function() {
            deferred.reject();
        });
        return deferred.promise;
    }
    return self;
});

angular.module('mm.core')
.factory('$mmSitesManager', function($http, $q, $mmSite, md5, $mmConfig, $mmUtil) {
    var self = {};
    var store = window.sessionStorage;
    var siteSchema = {
        wscache: {
        }
    };
    function Site(id, siteurl, token, infos) {
        this.id = id;
        this.siteurl = siteurl;
        this.token = token;
        this.infos = infos;
        if (this.id) {
            this.db = new $mmDB('Site-' + this.id, siteSchema);
        }
    };
        self.isDemoSite = function(siteurl) {
        return typeof(self.getDemoSiteData(siteurl)) != 'undefined';
    };
        self.getDemoSiteData = function(siteurl) {
        var demo_sites = $mmConfig.get('demo_sites');
        for (var i = 0; i < demo_sites.length; i++) {
            if (siteurl == demo_sites[i].key) {
                return demo_sites[i];
            }
        }
        return undefined;
    };
        self.checkSite = function(siteurl, protocol) {
        var deferred = $q.defer();
        siteurl = $mmUtil.formatURL(siteurl);
        if (siteurl.indexOf('http://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            deferred.reject('siteurlrequired');
            return deferred.promise;
        }
        protocol = protocol || "https://";
        siteurl = siteurl.replace(/^http(s)?\:\/\//i, protocol);
        self.siteExists(siteurl).then(function() {
            checkMobileLocalPlugin(siteurl).then(function(code) {
                deferred.resolve(code);
            }, function(error) {
                deferred.reject(error);
            });
        }, function(error) {
            if (siteurl.indexOf("https://") === 0) {
                self.checkSite(siteurl, "http://").then(deferred.resolve, deferred.reject);
            } else{
                deferred.reject('cannotconnect');
            }
        });
        return deferred.promise;
    };
        self.siteExists = function(siteurl) {
        return $http.head(siteurl + '/login/token.php', {timeout: 15000});
    };
        function checkMobileLocalPlugin(siteurl) {
        var deferred = $q.defer();
        var service = $mmConfig.get('wsextservice');
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
                            deferred.reject("siteinmaintenance");
                            break;
                        case 2:
                            deferred.reject("webservicesnotenabled");
                            break;
                        case 3:
                            deferred.resolve(0);
                            break;
                        case 4:
                            deferred.reject("mobileservicesnotenabled");
                            break;
                        default:
                            deferred.reject("unexpectederror");
                    }
                } else {
                    store.setItem('service'+siteurl, service);
                    deferred.resolve(code);
                }
            })
            .error(function(data) {
                deferred.resolve(0);
            });
        return deferred.promise;
    };
        self.getUserToken = function(siteurl, username, password, retry) {
        retry = retry || false;
        var deferred = $q.defer();
        var loginurl = siteurl + '/login/token.php';
        var data = {
            username: username,
            password: password,
            service: determineService(siteurl)
        };
        $http.post(loginurl, data).success(function(response) {
            if (typeof(response.token) != 'undefined') {
                deferred.resolve(response.token);
            } else {
                if (typeof(response.error) != 'undefined') {
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
            deferred.reject('cannotconnect');
        });
        return deferred.promise;
    };
    self.newSite = function(siteurl, token) {
        var deferred = $q.defer();
        $mmSite.setSite(new Site(null, siteurl, token));
        $mmSite.getSiteInfo().then(function(infos) {
            if (isValidMoodleVersion(infos.functions)) {
                var siteid = md5.createHash(siteurl + infos.username);
                self.addSite(id, siteurl, token, infos);
                deferred.resolve(siteid);
            } else {
                deferred.reject('invalidmoodleversion'+'2.4');
            }
            $mmSite.logout();
        }, function(error) {
            deferred.reject(error);
            $mmSite.logout();
        });
        return deferred.promise;
    }
        function determineService(siteurl) {
        siteurl = siteurl.replace("https://", "http://");
        var service = store.getItem('service'+siteurl);
        if (service) {
            return service;
        }
        siteurl = siteurl.replace("http://", "https://");
        var service = store.getItem('service'+siteurl);
        if (service) {
            return service;
        }
        return mmConfig.get('wsservice');
    };
        function isValidMoodleVersion(sitefunctions) {
        for(var i = 0; i < sitefunctions.length; i++) {
            if (sitefunctions[i].name.indexOf("component_strings") > -1) {
                return true;
            }
        }
        return false;
    };
        self.addSite = function(id, siteurl, token, infos) {
        var sites = self.getSites();
        sites.push(new Site(id, siteurl, token, infos));
        store.sites = JSON.stringify(sites);
    };
        self.loadSite = function(index) {
        var site = self.getSite(index);
        $mmSite.setSite(Site);
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

angular.module('mm.core')
.factory('$mmWS', function($http, $q, $log) {
    var self = {};
        self.call = function(method, data, preSets) {
        var deferred = $q.defer(),
            siteurl;
        data = convertValuesToString(data);
        preSets = self.verifyPresets(preSets);
        if (!preSets) {
            deferred.reject("unexpectederror");
            return;
        }
        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';
        var ajaxData = data;
        $http.post(siteurl, ajaxData).success(function(data) {
            if (!data && !preSets.responseExpected) {
                data = {};
            }
            if (!data) {
                deferred.reject('cannotconnect');
                return;
            }
            if (typeof(data.exception) !== 'undefined') {
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {
                    $log.error("Critical error: " + JSON.stringify(data));
                    deferred.reject('lostconnection');
                    return;
                } else {
                    deferred.reject(data.message);
                    return;
                }
            }
            if (typeof(data.debuginfo) != 'undefined') {
                deferred.reject('Error. ' + data.message);
                return;
            }
            $log.info('WS: Data received from WS ' + typeof(data));
            if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
                $log.info('WS: Data number of elements '+ data.length);
            }
            deferred.resolve(angular.copy(data));
        }).error(function(data) {
            deferred.reject('cannotconnect');
            return;
        });
        return deferred.promise;
    };
         function verifyPresets(preSets) {
        if (typeof(preSets) === 'undefined' || preSets == null) {
            preSets = {};
        }
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        if (typeof(preSets.sync) === 'undefined') {
            preSets.sync = 0;
        }
        if (typeof(preSets.omitExpires) === 'undefined') {
            preSets.omitExpires = false;
        }
        if (typeof(preSets.wstoken) === 'undefined') {
            return false;
        }
        if (typeof(preSets.siteurl) === 'undefined') {
            return false;
        }
        return preSets;
    };
        function convertValuesToString(data) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = convertValuesToString(data[el]);
            } else {
                result[el] = data[el] + '';
            }
        }
        return result;
    };
    return self;
});
