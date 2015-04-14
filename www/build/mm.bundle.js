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

angular.module('mm', ['ionic', 'mm.core', 'mm.core.courses', 'mm.core.login', 'mm.core.sidemenu', 'ngCordova', 'angular-md5', 'pascalprecht.translate'])
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
});

angular.module('mm.core', ['pascalprecht.translate'])
.config(function($stateProvider, $provide, $ionicConfigProvider, $httpProvider, $urlRouterProvider, $mmUtilProvider) {
    $ionicConfigProvider.platform.android.tabs.position('bottom');
    $provide.decorator('$ionicPlatform', ['$delegate', '$window', function($delegate, $window) {
        $delegate.isTablet = function() {
            var mq = 'only screen and (min-width: 768px) and (-webkit-min-device-pixel-ratio: 1)';
            return $window.matchMedia(mq).matches;
        };
        return $delegate;
    }]);
    var $mmStateProvider = {
        state: function(name, stateConfig) {
            function setupTablet(state) {
                if (!state.tablet) {
                    return;
                }
                if (angular.isString(state.tablet)) {
                    state.tablet = {
                        parent: state.tablet
                    }
                }
                var params = state.tablet,
                    parent = params.parent,
                    node = params.node || 'tablet',
                    config = {};
                delete state['tablet'];
                delete params['node'];
                delete params['parent'];
                angular.copy(state, config);
                angular.extend(config, params);
                if (config.views.length > 1) {
                    console.log('Cannot guess the view data to use for tablet state of ' + name);
                    return;
                }
                var viewName, viewData;
                angular.forEach(config.views, function(v, k) {
                    viewName = k;
                    viewData = v;
                }, this);
                delete config.views[viewName];
                config.views['tablet'] = viewData;
                $stateProvider.state.apply($stateProvider, [parent + '.' + node, config]);
            }
            setupTablet.apply(this, [stateConfig]);
            $stateProvider.state.apply($stateProvider, [name, stateConfig]);
            return this;
        }
    };
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    $httpProvider.defaults.transformRequest = [function(data) {
        return angular.isObject(data) && String(data) !== '[object File]' ? $mmUtilProvider.param(data) : data;
    }];
    $urlRouterProvider.otherwise(function($injector, $location) {
        var $state = $injector.get('$state');
        $state.go('mm_login.index');
    });
})
.run(function($ionicPlatform, $ionicBody, $window) {
    $ionicPlatform.ready(function() {
        var checkTablet = function() {
            $ionicBody.enableClass($ionicPlatform.isTablet(), 'tablet');
        };
        ionic.on('resize', checkTablet, $window);
        checkTablet();
    });
});

angular.module('mm.core')
.provider('$mmApp', function() {
        var DBNAME = 'MoodleMobile',
        dbschema = {
            autoSchema: true,
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
        var db = $mmDB.getDB(DBNAME, dbschema),
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
.constant('mmCoreConfigStore', 'config')
.config(function($mmAppProvider, mmCoreConfigStore) {
    var stores = [
        {
            name: mmCoreConfigStore,
            keyPath: 'name'
        }
    ];
    $mmAppProvider.registerStores(stores);
})
.factory('$mmConfig', function($http, $q, $log, $mmApp, mmCoreConfigStore) {
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
                $mmApp.getDB().get(mmCoreConfigStore, name).then(function(entry) {
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
                return $mmApp.getDB().insert(mmCoreConfigStore, {name: name, value: value});
            }
            $log.error('Cannot save static config setting \'' + name + '\'.');
            deferred = $q.defer()
            deferred.reject();
            return deferred.promise;
        }
    };
        self.delete = function(name) {
        if (!initialized) {
            return init().then(function() {
                return deleteConfig(name);
            }, function() {
                $log.error('Failed to initialize $mmConfig.');
                return $q.reject();
            });
        }
        return deleteConfig(name);
        function deleteConfig(name) {
            var deferred,
                fromStatic = self.config[name];
            if (typeof(fromStatic) === 'undefined') {
                return $mmApp.getDB().remove(mmCoreConfigStore, name);
            }
            $log.error('Cannot delete static config setting \'' + name + '\'.');
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
        try {
            if (typeof(db) != 'undefined') {
                db[func].apply(db, Array.prototype.slice.call(arguments, 2)).then(function(result) {
                    if (typeof(result) == 'undefined') {
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
        function callWhere(db, store, field_name, op, value, op2, value2) {
        var deferred = $q.defer();
        try {
            if (typeof(db) != 'undefined') {
                db.from(store).where(field_name, op, value, op2, value2).list().then(function(list) {
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
        function callWhereEqual(db, store, field_name, value) {
        var deferred = $q.defer();
        try {
            if (typeof(db) != 'undefined') {
                db.from(store).where(field_name, '=', value).list().then(function(list) {
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
        function callEach(db, store, callback) {
        var deferred = $q.defer();
        callDBFunction(db, 'values', store, undefined, 99999999).then(function(entries) {
            for (var i = 0; i < entries.length; i++) {
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
                        get: function(store, id) {
                return callDBFunction(db, 'get', store, id);
            },
                        getAll: function(store) {
                return callDBFunction(db, 'values', store, undefined, 99999999);
            },
                        count: function(store) {
                return callDBFunction(db, 'count', store);
            },
                        insert: function(store, value) {
                return callDBFunction(db, 'put', store, value);
            },
                        remove: function(store, id) {
                return callDBFunction(db, 'remove', store, id);
            },
                        where: function(store, field_name, op, value, op2, value2) {
                return callWhere(db, store, field_name, op, value, op2, value2);
            },
                        whereEqual: function(store, field_name, value) {
                return callWhereEqual(db, store, field_name, value);
            },
                        each: function(store, callback) {
                return callEach(db, store, callback);
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
            } else if (ionic.Platform.isIOS()) {
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
    };
        self.removeExternalFile = function(fullPath) {
        var directory = fullPath.substring(0, fullPath.lastIndexOf('/') );
        var filename = fullPath.substr(fullPath.lastIndexOf('/') + 1);
        return $cordovaFile.removeFile(directory, filename);
    };
        self.getBasePath = function() {
        return self.init().then(function() {
            if (basePath.slice(-1) == '/') {
                return basePath;
            } else {
                return basePath + '/';
            }
        });
    };
    return self;
});

angular.module('mm.core')
.factory('$mmLang', function($translate, $translatePartialLoader, $mmConfig) {
    var self = {};
        self.registerLanguageFolder = function(path) {
        $translatePartialLoader.addPart(path);
    };
    self.changeCurrentLanguage = function(language) {
        $translate.use(language);
        $mmConfig.set('current_language', language);
    };
        self.translateErrorAndReject = function(deferred, errorkey) {
        $translate(errorkey).then(function(errorMessage) {
            deferred.reject(errorMessage);
        }, function() {
            deferred.reject(errorkey);
        });
    };
    return self;
})
.config(function($translateProvider, $translatePartialLoaderProvider) {
    $translateProvider.useLoader('$translatePartialLoader', {
      urlTemplate: '{part}/{lang}.json'
    });
    $translatePartialLoaderProvider.addPart('build/lang');
    $translateProvider.fallbackLanguage('en');
    $translateProvider.preferredLanguage('en');
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
.value('mmCoreWSPrefix', 'local_mobile_')
.constant('mmCoreWSCacheStore', 'wscache')
.config(function($mmSiteProvider, mmCoreWSCacheStore) {
    var stores = [
        {
            name: mmCoreWSCacheStore,
            keyPath: 'id'
        }
    ];
    $mmSiteProvider.registerStores(stores);
})
.provider('$mmSite', function() {
        var siteSchema = {
        autoSchema: true,
        stores: []
    };
        this.registerStore = function(store) {
        if (typeof(store.name) === 'undefined') {
            console.log('$mmSite: Error: store name is undefined.');
            return;
        } else if (storeExists(store.name)) {
            console.log('$mmSite: Error: store ' + store.name + ' is already defined.');
            return;
        }
        siteSchema.stores.push(store);
    };
        this.registerStores = function(stores) {
        var self = this;
        angular.forEach(stores, function(store) {
            self.registerStore(store);
        });
    };
        function storeExists(name) {
        var exists = false;
        angular.forEach(siteSchema.stores, function(store) {
            if (store.name === name) {
                exists = true;
            }
        });
        return exists;
    }
    this.$get = function($http, $q, $mmWS, $mmDB, $mmConfig, $log, md5, $cordovaNetwork, $mmLang, $mmUtil,
        mmCoreWSCacheStore, mmCoreWSPrefix) {
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
                function Site(id, siteurl, token, infos) {
            this.id = id;
            this.siteurl = siteurl;
            this.token = token;
            this.infos = infos;
            if (this.id) {
                this.db = $mmDB.getDB('Site-' + this.id, siteSchema);
            }
        };
                self.fetchSiteInfo = function() {
            var deferred = $q.defer();
            if (!self.isLoggedIn()) {
                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.notloggedin');
                return deferred.promise;
            }
            function siteDataRetrieved(infos) {
                currentSite.infos = infos;
                deferred.resolve(infos);
            }
            var preSets = {
                getFromCache: 0,
                saveToCache: 0
            };
            self.read('core_webservice_get_site_info', {}, preSets).then(siteDataRetrieved, function(error) {
                self.read('moodle_webservice_get_site_info', {}, preSets).then(siteDataRetrieved, function(error) {
                    deferred.reject(error);
                });
            });
            return deferred.promise;
        };
                self.isLoggedIn = function() {
            return typeof(currentSite) != 'undefined' && typeof(currentSite.token) != 'undefined' && currentSite.token != '';
        };
                self.logout = function() {
            currentSite = undefined;
        };
                self.setCandidateSite = function(siteurl, token) {
            currentSite = new Site(undefined, siteurl, token);
        };
                self.deleteCandidateSite = function() {
            currentSite = undefined;
        };
                self.setSite = function(id, siteurl, token, infos) {
            currentSite = new Site(id, siteurl, token, infos);
        };
                self.deleteSite = function(siteid) {
            if (typeof(currentSite) !== 'undefined' && currentSite.id == siteid) {
                self.logout();
            }
            return $mmDB.deleteDB('Site-' + siteid);
        };
                self.read = function(method, data, preSets) {
            preSets = preSets || {};
            if (typeof(preSets.getFromCache) === 'undefined') {
                preSets.getFromCache = 1;
            }
            if (typeof(preSets.saveToCache) === 'undefined') {
                preSets.saveToCache = 1;
            }
            if (typeof(preSets.sync) === 'undefined') {
                preSets.sync = 0;
            }
            return self.request(method, data, preSets);
        };
                self.write = function(method, data, preSets) {
            preSets = preSets || {};
            if (typeof(preSets.getFromCache) === 'undefined') {
                preSets.getFromCache = 0;
            }
            if (typeof(preSets.saveToCache) === 'undefined') {
                preSets.saveToCache = 0;
            }
            if (typeof(preSets.sync) === 'undefined') {
                preSets.sync = 0;
            }
            return self.request(method, data, preSets);
        };
                self.request = function(method, data, preSets) {
            var deferred = $q.defer();
            if (!self.isLoggedIn()) {
                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.notloggedin');
                return deferred.promise;
            }
            method = checkDeprecatedFunction(method);
            if (self.getInfo() && !self.wsAvailable(method, false)) {
                if (self.wsAvailable(mmCoreWSPrefix + method, false)) {
                    $log.info("Using compatibility WS method '" + mmCoreWSPrefix + method + "'");
                    method = mmCoreWSPrefix + method;
                } else {
                    $log.error("WS function '" + method + "' is not available, even in compatibility mode.");
                    $mmLang.translateErrorAndReject(deferred, 'wsfunctionnotavailable');
                    return deferred.promise;
                }
            }
            preSets = preSets || {};
            preSets.wstoken = currentSite.token;
            preSets.siteurl = currentSite.siteurl;
            getFromCache(method, data, preSets).then(function(data) {
                deferred.resolve(data);
            }, function() {
                var mustSaveToCache = preSets.saveToCache;
                delete preSets.getFromCache;
                delete preSets.saveToCache;
                delete preSets.omitExpires;
                $mmWS.call(method, data, preSets).then(function(response) {
                    if (mustSaveToCache) {
                        saveToCache(method, data, response);
                    }
                    deferred.resolve(response);
                }, function(error) {
                    $log.debug('WS call failed. Try to get the value from the cache.');
                    preSets.omitExpires = true;
                    getFromCache(method, data, preSets).then(function(data) {
                        deferred.resolve(data);
                    }, function() {
                        deferred.reject(error);
                    });
                });
            });
            return deferred.promise;
        };
                self.wsAvailable = function(method, checkPrefix) {
            checkPrefix = (typeof checkPrefix === 'undefined') ? true : checkPrefix;
            if (!self.isLoggedIn() || typeof(currentSite.infos) == 'undefined') {
                return false;
            }
            for (var i = 0; i < currentSite.infos.functions.length; i++) {
                var f = currentSite.infos.functions[i];
                if (f.name == method) {
                    return true;
                }
            }
            if (checkPrefix) {
                return self.wsAvailable(mmCoreWSPrefix + method, false);
            }
            return false;
        };
                self.getId = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.id) !== 'undefined') {
                return currentSite.id;
            } else {
                return undefined;
            }
        };
                self.getURL = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.siteurl) !== 'undefined') {
                return currentSite.siteurl;
            } else {
                return undefined;
            }
        };
                self.getToken = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.token) !== 'undefined') {
                return currentSite.token;
            } else {
                return undefined;
            }
        };
                self.getInfo = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.infos) !== 'undefined') {
                return currentSite.infos;
            } else {
                return undefined;
            }
        };
                self.getUserId = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.infos) !== 'undefined'
                    && typeof(currentSite.infos.userid) !== 'undefined') {
                return currentSite.infos.userid;
            } else {
                return undefined;
            }
        };
                self.fixPluginfileURL = function(url, token) {
            if (!token) {
                token = self.getToken();
            }
            return $mmUtil.fixPluginfileURL(url, token);
        };
                function checkDeprecatedFunction(method) {
            if (typeof deprecatedFunctions[method] !== "undefined") {
                if (self.wsAvailable(deprecatedFunctions[method])) {
                    $log.warn("You are using deprecated Web Services: " + method +
                        " you must replace it with the newer function: " + deprecatedFunctions[method]);
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
                deferred = $q.defer(),
                key;
            if (!db) {
                deferred.reject();
                return deferred.promise;
            } else if (!preSets.getFromCache) {
                deferred.reject();
                return deferred.promise;
            }
            key = md5.createHash(method + ':' + JSON.stringify(data));
            db.get(mmCoreWSCacheStore, key).then(function(entry) {
                var now = new Date().getTime();
                try {
                    preSets.omitExpires = preSets.omitExpires || $cordovaNetwork.isOffline();
                } catch(err) {}
                if (!preSets.omitExpires) {
                    if (now > entry.expirationtime) {
                        $log.debug('Cached element found, but it is expired');
                        deferred.reject();
                        return;
                    }
                }
                if (typeof(entry) !== 'undefined' && typeof(entry.data) !== 'undefined') {
                    var expires = (entry.expirationtime - now) / 1000;
                    $log.info('Cached element found, id: ' + key + ' expires in ' + expires + ' seconds');
                    deferred.resolve(entry.data);
                    return;
                }
                deferred.reject();
            }, function() {
                deferred.reject();
            });
            return deferred.promise;
        }
                function saveToCache(method, data, response) {
            var db = currentSite.db,
                deferred = $q.defer(),
                key = md5.createHash(method + ':' + JSON.stringify(data));
            if (!db) {
                deferred.reject();
            } else {
                $mmConfig.get('cache_expiration_time').then(function(cacheExpirationTime) {
                    var entry = {
                        id: key,
                        data: response
                    };
                    entry.expirationtime = new Date().getTime() + cacheExpirationTime;
                    db.insert(mmCoreWSCacheStore, entry);
                    deferred.resolve();
                }, deferred.reject);
            }
            return deferred.promise;
        }
        return self;
    };
});

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
.factory('$mmSitesManager', function($http, $q, $mmSite, md5, $mmLang, $mmConfig, $mmApp, $mmWS, $mmUtil, $mmFS,
                                     $cordovaNetwork, mmCoreSitesStore, mmCoreCurrentSiteStore, $log) {
    var self = {},
        services = {},
        db = $mmApp.getDB(),
        sessionRestored = false;
        self.getDemoSiteData = function(siteurl) {
        return $mmConfig.get('demo_sites').then(function(demo_sites) {
            if (typeof(demo_sites) !== 'undefined' && typeof(demo_sites[siteurl]) !== 'undefined') {
                return demo_sites[siteurl];
            } else {
                return $q.reject();
            }
        });
    };
        self.checkSite = function(siteurl, protocol) {
        var deferred = $q.defer();
        siteurl = $mmUtil.formatURL(siteurl);
        if (siteurl.indexOf('://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            $mmLang.translateErrorAndReject(deferred, 'mm.core.login.invalidsite');
        } else {
            protocol = protocol || "https://";
            siteurl = siteurl.replace(/^http(s)?\:\/\//i, protocol);
            self.siteExists(siteurl).then(function() {
                checkMobileLocalPlugin(siteurl).then(function(code) {
                    deferred.resolve({siteurl: siteurl, code: code});
                }, function(error) {
                    deferred.reject(error);
                });
            }, function(error) {
                if (siteurl.indexOf("https://") === 0) {
                    self.checkSite(siteurl, "http://").then(deferred.resolve, deferred.reject);
                } else{
                    $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
                }
            });
        }
        return deferred.promise;
    };
        self.siteExists = function(siteurl) {
        return $http.head(siteurl + '/login/token.php', {timeout: 15000});
    };
        function checkMobileLocalPlugin(siteurl) {
        var deferred = $q.defer();
        $mmConfig.get('wsextservice').then(function(service) {
            $http.post(siteurl + '/local/mobile/check.php', {service: service} )
                .success(function(response) {
                    if (typeof(response.code) == "undefined") {
                        $mmLang.translateErrorAndReject(deferred, 'unexpectederror');
                        return;
                    }
                    var code = parseInt(response.code, 10);
                    if (response.error) {
                        switch (code) {
                            case 1:
                                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.siteinmaintenance');
                                break;
                            case 2:
                                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.webservicesnotenabled');
                                break;
                            case 3:
                                deferred.resolve(0);
                                break;
                            case 4:
                                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.mobileservicesnotenabled');
                                break;
                            default:
                                $mmLang.translateErrorAndReject(deferred, 'unexpectederror');
                        }
                    } else {
                        services[siteurl] = service;
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
                        if (!retry && response.errorcode == "requirecorrectaccess") {
                            siteurl = siteurl.replace("https://", "https://www.");
                            siteurl = siteurl.replace("http://", "http://www.");
                            logindata.siteurl = siteurl;
                            self.getUserToken(siteurl, username, password, true).then(deferred.resolve, deferred.reject);
                        } else {
                            deferred.reject(response.error);
                        }
                    } else {
                        $mmLang.translateErrorAndReject(deferred, 'mm.core.login.invalidaccount');
                    }
                }
            }).error(function(data) {
                $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
            });
        }, deferred.reject);
        return deferred.promise;
    };
        self.newSite = function(siteurl, token) {
        var deferred = $q.defer();
        $mmSite.setCandidateSite(siteurl, token);
        $mmSite.fetchSiteInfo().then(function(infos) {
            if (isValidMoodleVersion(infos.functions)) {
                var siteid = md5.createHash(siteurl + infos.username);
                self.addSite(siteid, siteurl, token, infos);
                $mmSite.setSite(siteid, siteurl, token, infos);
                self.login(siteid);
                deferred.resolve();
            } else {
                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.invalidmoodleversion');
                $mmSite.deleteCandidateSite();
            }
        }, function(error) {
            deferred.reject(error);
            $mmSite.deleteCandidateSite();
        });
        return deferred.promise;
    }
        function determineService(siteurl) {
        var deferred = $q.defer();
        siteurl = siteurl.replace("https://", "http://");
        if (services[siteurl]) {
            deferred.resolve(services[siteurl]);
            return deferred.promise;
        }
        siteurl = siteurl.replace("http://", "https://");
        if (services[siteurl]) {
            deferred.resolve(services[siteurl]);
            return deferred.promise;
        }
        $mmConfig.get('wsservice').then(deferred.resolve, deferred.reject);
        return deferred.promise;
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
        db.insert(mmCoreSitesStore, {
            id: id,
            siteurl: siteurl,
            token: token,
            infos: infos
        });
    };
        self.loadSite = function(siteid) {
        $log.debug('Load site '+siteid);
        return db.get(mmCoreSitesStore, siteid).then(function(site) {
            $mmSite.setSite(siteid, site.siteurl, site.token, site.infos);
            self.login(siteid);
        });
    };
        self.deleteSite = function(siteid) {
        $log.debug('Delete site '+siteid);
        return $mmSite.deleteSite(siteid).then(function() {
            return db.remove(mmCoreSitesStore, siteid);
        });
    };
        self.hasNoSites = function() {
        return db.count(mmCoreSitesStore).then(function(count) {
            if (count > 0) {
                return $q.reject();
            }
        });
    };
        self.hasSites = function() {
        return db.count(mmCoreSitesStore).then(function(count) {
            if (count == 0) {
                return $q.reject();
            }
        });
    };
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
        self.getMoodleFilePath = function (fileurl, courseId, siteId) {
        if (!fileurl) {
            return $q.reject();
        }
        if (!courseId) {
            courseId = 1;
        }
        if (!siteId) {
            siteId = $mmSite.getId();
            if (typeof(siteId) === 'undefined') {
                return $q.reject();
            }
        }
        return db.get(mmCoreSitesStore, siteId).then(function(site) {
            var downloadURL = $mmUtil.fixPluginfileURL(fileurl, site.token);
            var extension = "." + fileurl.split('.').pop();
            if (extension.indexOf(".php") === 0) {
                extension = "";
            }
            var filename = md5.createHash(fileurl) + extension;
            var path = {
                directory: siteId + "/" + courseId,
                file:      siteId + "/" + courseId + "/" + filename
            };
            return $mmFS.getFile(path.file).then(function(fileEntry) {
                $log.debug('File ' + downloadURL + ' already downloaded.');
                return fileEntry.toInternalURL();
            }, function() {
                try {
                    if ($cordovaNetwork.isOnline()) {
                        $log.debug('File ' + downloadURL + ' not downloaded. Lets download.');
                        return $mmWS.downloadFile(downloadURL, path.file);
                    } else {
                        $log.debug('File ' + downloadURL + ' not downloaded, but the device is offline.');
                        return downloadURL;
                    }
                } catch(err) {
                    $log.debug('File ' + downloadURL + ' not downloaded, but cordova is not available.');
                    return downloadURL;
                }
            });
        });
    };
        self.login = function(siteid) {
        db.insert(mmCoreCurrentSiteStore, {
            id: 1,
            siteid: siteid
        });
    };
        self.logout = function() {
        $mmSite.logout();
        return db.remove(mmCoreCurrentSiteStore, 1);
    }
        self.restoreSession = function() {
        if (sessionRestored) {
            return $q.reject();
        }
        sessionRestored = true;
        return db.get(mmCoreCurrentSiteStore, 1).then(function(current_site) {
            var siteid = current_site.siteid;
            $log.debug('Restore session in site '+siteid);
            return self.loadSite(siteid);
        });
    };
        self.getSiteURL = function(siteid) {
        var deferred = $q.defer();
        if (typeof(siteid) === 'undefined') {
            deferred.resolve($mmSite.getURL());
        } else {
            db.get(mmCoreSitesStore, siteid).then(function(site) {
                deferred.resolve(site.siteurl);
            }, function() {
                deferred.resolve(undefined);
            });
        }
        return deferred.promise;
    };
    return self;
});

angular.module('mm.core')
.factory('$mmURLDelegate', function($log) {
    var observers = {},
        self = {};
        self.register = function(name, callback) {
        $log.debug("Register observer '"+name+"' for custom URL.");
        observers[name] = callback;
    };
        self.notify = function(url) {
        var treated = false;
        angular.forEach(observers, function(callback, name) {
            if (!treated && typeof(callback) === 'function') {
                treated = callback(url);
            }
        });
    };
    return self;
})
.run(function($mmURLDelegate, $log) {
    window.handleOpenURL = function(url) {
        $log.debug('App launched by URL.');
        $mmURLDelegate.notify(url);
    };
});

angular.module('mm.core')
.factory('$mmUserDelegate', function($log) {
    var plugins = {},
        self = {},
        data,
        controllers = [];
        self.registerPlugin = function(name, callback) {
        $log.debug("Register plugin '"+name+"' in user.");
        plugins[name] = callback;
    };
        self.updatePluginData = function(name) {
        $log.debug("Update plugin '"+name+"' data in user.");
        var pluginData = plugins[name]();
        if (typeof(pluginData) !== 'undefined') {
            data[name] = pluginData;
        }
    };
        self.getData = function() {
        if (typeof(data) == 'undefined') {
            data = {};
            angular.forEach(plugins, function(callback, plugin) {
                self.updatePluginData(plugin);
            });
        }
        return data;
    };
    return self;
});

angular.module('mm.core')
.provider('$mmUtil', function() {
        this.param = function(obj) {
        var query = '', name, value, fullSubName, subName, subValue, innerObj, i;
        for (name in obj) {
            value = obj[name];
            if (value instanceof Array) {
                for (i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += this.param(innerObj) + '&';
                }
            }
            else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += this.param(innerObj) + '&';
                }
            }
            else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }
        return query.length ? query.substr(0, query.length - 1) : query;
    };
    function mmUtil($ionicLoading, $ionicPopup, $translate, $http) {
        var mimeTypes = {};
        $http.get('core/assets/mimetypes.json').then(function(response) {
            mimeTypes = response.data;
        }, function() {
        });
                this.formatURL = function(url) {
            url = url.trim();
            if (! /^http(s)?\:\/\/.*/i.test(url)) {
                url = "https://" + url;
            }
            url = url.replace(/^http/i, 'http');
            url = url.replace(/^https/i, 'https');
            url = url.replace(/\/$/, "");
            return url;
        };
                this.getFileExtension = function(filename) {
            var dot = filename.lastIndexOf("."),
                ext;
            if (dot > -1) {
                ext = filename.substr(dot + 1).toLowerCase();
            }
            return ext;
        };
                this.getFileIcon = function(filename) {
            var ext = this.getFileExtension(filename),
                icon;
            if (ext && mimeTypes[ext] && mimeTypes[ext].icon) {
                icon = mimeTypes[ext].icon + '-64.png';
            } else {
                icon = 'unknown-64.png';
            }
            return 'img/files/' + icon;
        };
                this.getFolderIcon = function() {
            return 'img/files/folder-64.png';
        };
                this.isValidURL = function(url) {
            return /^http(s)?\:\/\/([\da-zA-Z\.-]+)\.([\da-zA-Z\.]{2,6})([\/\w \.-]*)*\/?/i.test(url);
        };
                this.fixPluginfileURL = function(url, token) {
            if (!url) {
                return '';
            }
            if (url.indexOf('token=') != -1) {
                return url;
            }
            if (url.indexOf('pluginfile') == -1) {
                return url;
            }
            if (!token) {
                return '';
            }
            if (url.indexOf('?file=') != -1) {
                url += '&';
            } else {
                url += '?';
            }
            url += 'token=' + token;
            if (url.indexOf('/webservice/pluginfile') == -1) {
                url = url.replace('/pluginfile', '/webservice/pluginfile');
            }
            return url;
        };
                this.showModalLoading = function(text) {
            $ionicLoading.show({
                template: '<i class="icon ion-load-c">'+text
            });
        };
                this.closeModalLoading = function() {
            $ionicLoading.hide();
        };
                this.showErrorModal = function(errorMessage, needsTranslate) {
            var langKeys = ['error'];
            if (needsTranslate) {
                langKeys.push(errorMessage);
            }
            $translate(langKeys).then(function(translations) {
                $ionicPopup.alert({
                    title: translations.error,
                    template: needsTranslate ? translations[errorMessage] : errorMessage
                });
            });
        };
                this.cleanTags = function(text) {
            text = text.replace(/(<([^>]+)>)/ig,"");
            text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
            return text;
        };
    }
    this.$get = function($ionicLoading, $ionicPopup, $translate, $http) {
        return new mmUtil($ionicLoading, $ionicPopup, $translate, $http);
    };
});

angular.module('mm.core')
.factory('$mmWS', function($http, $q, $log, $mmLang, $cordovaFileTransfer, $cordovaNetwork, $mmFS) {
    var self = {};
        self.call = function(method, data, preSets) {
        var deferred = $q.defer(),
            siteurl;
        data = convertValuesToString(data);
        if (typeof(preSets) === 'undefined' || preSets == null ||
                typeof(preSets.wstoken) === 'undefined' || typeof(preSets.siteurl) === 'undefined') {
            $mmLang.translateErrorAndReject(deferred, 'unexpectederror');
            return deferred.promise;
        }
        try {
            if ($cordovaNetwork.isOffline()) {
                $mmLang.translateErrorAndReject(deferred, 'networkerrormsg');
                return deferred.promise;
            }
        } catch(err) {}
        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';
        var ajaxData = data;
        $http.post(siteurl, ajaxData).then(function(data) {
            if (!data && !data.data && !preSets.responseExpected) {
                data = {};
            } else {
                data = data.data;
            }
            if (!data) {
                $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
                return;
            }
            if (typeof(data.exception) !== 'undefined') {
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {
                    $log.error("Critical error: " + JSON.stringify(data));
                    $mmLang.translateErrorAndReject(deferred, 'lostconnection');
                } else {
                    deferred.reject(data.message);
                }
                return;
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
        }, function(error) {
            $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
        });
        return deferred.promise;
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
        self.downloadFile = function(url, path, background) {
        $log.debug('Download file '+url);
        return $mmFS.getBasePath().then(function(basePath) {
            var absolutePath = basePath + path;
            return $cordovaFileTransfer.download(url, absolutePath, {}, true).then(function(result) {
                $log.debug('Success downloading file ' + url + ' to '+absolutePath);
                return result.toInternalURL();
            }, function(err) {
                $log.error('Error downloading file '+url);
                $log.error(err);
                return $q.reject();
            });
        });
    };
    return self;
});

angular.module('mm.core')
.filter('mmNoTags', function() {
    return function(text) {
        return String(text).replace(/(<([^>]+)>)/ig, '');
    }
});
angular.module('mm.core')
.directive('mmFormatText', function($interpolate) {
    return {
        restrict: 'E',
        scope: true,
        transclude: true,
        controller: function($q, md5, $mmSite, $mmSitesManager, $mmUtil) {
                        this.formatText = function(text, siteId, clean, courseId) {
                var deferred = $q.defer();
                if (!text) {
                    deferred.reject();
                    return deferred.promise;
                }
                if (!courseId) {
                    courseId = 1;
                }
                text = text.replace(/<a([^>]+)>/g,"<a target=\"_blank\" $1>");
                text = text.replace(/ng-src/g, 'src');
                return $mmSitesManager.getSiteURL(siteId).then(function(siteurl) {
                    var ft = text.match(/\$\$(.+?)\$\$/);
                    if (ft && typeof(siteurl) !== 'undefined') {
                        text = text.replace(/\$\$(.+?)\$\$/g, function(full, match) {
                            if (!match) {
                                return '';
                            }
                            var md5 = md5.createHash(match);
                            return '<img src="' + siteurl + "/filter/tex/pix.php/" + md5 + '">';
                        });
                    }
                    if (typeof(siteurl) === 'undefined') {
                        deferred.resolve(text);
                        return deferred.promise;
                    }
                    var urlToMatch = siteurl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/http(s)?/, 'http(s)?');
                    var expr = new RegExp(urlToMatch + "[^\"']*pluginfile[^\"']*", "gi");
                    var matches = text.match(expr);
                    var promises = [];
                    angular.forEach(matches, function(match) {
                        var promise = $mmSitesManager.getMoodleFilePath(match, courseId, siteId);
                        promises.push(promise);
                        promise.then(function(url) {
                            text = text.replace(match, url);
                        });
                    });
                    function cleanTextIfNeeded() {
                        if (clean) {
                            return $mmUtil.cleanTags(text);
                        } else {
                            return text;
                        }
                    }
                    return $q.all(promises).then(function() {
                        return cleanTextIfNeeded();
                    }, function() {
                        return cleanTextIfNeeded();
                    });
                });
            };
        },
        compile: function(element, attrs, transclude) {
            return function(scope, linkElement, linkAttrs, ctrl) {
                transclude(scope, function(clone) {
                    var content = angular.element('<div>').append(clone).html();
                    var interpolated = $interpolate(content)(scope);
                    var siteid = attrs.siteid;
                    if (typeof(siteid) !== 'undefined') {
                        siteid = $interpolate(siteid)(scope);
                    }
                    ctrl.formatText(interpolated, siteid, attrs.clean, attrs.courseid).then(function(text) {
                        linkElement.replaceWith(text);
                    });
                });
            }
        }
    };
});
angular.module('mm.core')
.directive('mmNoInputValidation', function() {
    return {
        restrict: 'A',
        priority: 500,
        compile: function(el, attrs) {
            attrs.$set('type',
                null,               
                false               
            );
        }
    }
});
angular.module('mm.core.courses', [])
.value('mmCoursesFrontPage', {
    'id': 1,
    'shortname': '',
    'fullname': '',
    'enrolledusercount': 0,
    'idnumber': '',
    'visible': 1
})
.config(function($stateProvider) {
    $stateProvider
    .state('site.mm_courses', {
        url: '/mm_courses',
        views: {
            'site': {
                templateUrl: 'core/components/courses/templates/list.html',
                controller: 'mmCoursesListCtrl'
            }
        },
        cache: false
    });
});

angular.module('mm.core.login', [])
.constant('mmLoginLaunchSiteURL', 'mmLoginLaunchSiteURL')
.constant('mmLoginLaunchPassport', 'mmLoginLaunchPassport')
.constant('mmLoginSSOCode', 2)
.config(function($stateProvider) {
    $stateProvider
    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/base.html',
        cache: false,  
        onEnter: function($ionicHistory, $state, $mmSitesManager, $mmSite) {
            $ionicHistory.clearHistory();
            $mmSitesManager.restoreSession().then(function() {
                if ($mmSite.isLoggedIn()) {
                    $state.go('site.mm_courses');
                }
            });
        }
    })
    .state('mm_login.index', {
        url: '/index',
        templateUrl: 'core/components/login/templates/sites.html',
        controller: 'mmLoginSitesCtrl',
        onEnter: function($state, $mmSitesManager) {
            $mmSitesManager.hasNoSites().then(function() {
                $state.go('mm_login.site');
            });
        }
    })
    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/site.html',
        controller: 'mmLoginSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $ionicHistory, $mmSitesManager) {
            $mmSitesManager.hasNoSites().then(function() {
                $ionicNavBarDelegate.showBackButton(false);
                $ionicHistory.clearHistory();
            });
        }
    })
    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/credentials.html',
        controller: 'mmLoginCredentialsCtrl',
        params: {
            siteurl: ''
        },
        onEnter: function($state, $stateParams) {
            if (!$stateParams.siteurl) {
              $state.go('mm_login.index');
            }
        }
    });
})
.run(function($log, $q, $state, $mmUtil, $translate, $mmSitesManager, $rootScope, $mmSite, $mmURLDelegate, $mmConfig,
                mmLoginLaunchSiteURL, mmLoginLaunchPassport, md5) {
    $mmURLDelegate.register('mmLoginSSO', function(url) {
        var ssoScheme = 'moodlemobile://token=';
        if (url.indexOf(ssoScheme) == -1) {
            return false;
        }
        $log.debug('Login: App launched by URL');
        $translate('mm.core.login.authenticating').then(function(authenticatingString) {
            $mmUtil.showModalLoading(authenticatingString);
        });
        url = url.replace(ssoScheme, '');
        try {
            url = atob(url);
        } catch(err) {
            $log.error('Error decoding parameter received for login SSO');
            return false;
        }
        validateBrowserSSOLogin(url).then(function(sitedata) {
            $mmSitesManager.newSite(sitedata.siteurl, sitedata.token).then(function() {
                $state.go('site.mm_courses');
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        }, function(errorMessage) {
            $mmUtil.closeModalLoading();
            if (typeof(errorMessage) === 'string' && errorMessage != '') {
                $mmUtil.showErrorModal(errorMessage);
            }
        });
        return true;
    });
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name.substr(0, 8) !== 'mm_login' && !$mmSite.isLoggedIn()) {
            event.preventDefault();
            $log.debug('Redirect to login page, request was: ' + toState.name);
            $state.transitionTo('mm_login.index');
        } else if (toState.name.substr(0, 8) === 'mm_login' && $mmSite.isLoggedIn()) {
            event.preventDefault();
            $log.debug('Redirect to course page, request was: ' + toState.name);
            $state.transitionTo('site.mm_courses');
        }
    });
    function validateBrowserSSOLogin(url) {
        var params = url.split(":::");
        return $mmConfig.get(mmLoginLaunchSiteURL).then(function(launchSiteURL) {
            return $mmConfig.get(mmLoginLaunchPassport).then(function(passport) {
                $mmConfig.delete(mmLoginLaunchSiteURL);
                $mmConfig.delete(mmLoginLaunchPassport);
                var signature = md5.createHash(launchSiteURL + passport);
                if (signature != params[0]) {
                    if (launchSiteURL.indexOf("https://") != -1) {
                        launchSiteURL = launchSiteURL.replace("https://", "http://");
                    } else {
                        launchSiteURL = launchSiteURL.replace("http://", "https://");
                    }
                    signature = md5.createHash(launchSiteURL + passport);
                }
                if (signature == params[0]) {
                    $log.debug('Signature validated');
                    return { siteurl: launchSiteURL, token: params[1] };
                } else {
                    $log.debug('Inalid signature in the URL request yours: ' + params[0] + ' mine: '
                                    + signature + ' for passport ' + passport);
                    return $translate('unexpectederror').then(function(errorString) {
                        return $q.reject(errorString);
                    });
                }
            });
        });
    };
});

angular.module('mm.core.sidemenu', [])
.config(function($stateProvider) {
    $stateProvider
    .state('site', {
        url: '/site',
        templateUrl: 'core/components/sidemenu/templates/menu.html',
        controller: 'mmSideMenuCtrl',
        abstract: true,
        cache: false,
        onEnter: function($ionicHistory, $state, $mmSite) {
            $ionicHistory.clearHistory();
            if (!$mmSite.isLoggedIn()) {
                $state.go('mm_login.index');
            }
        }
    });
});

angular.module('mm.core.courses')
.controller('mmCoursesListCtrl', function($scope, $mmCourses, $mmCoursesDelegate, $mmUtil, $translate) {
    $translate('loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });
    $mmCourses.getUserCourses().then(function(courses) {
        $scope.courses = courses;
        $scope.filterText = '';
    }, function(error) {
        if (typeof(error) !== 'undefined' && error != '') {
            $mmUtil.showErrorModal(error);
        } else {
            $mmUtil.showErrorModal('mm.core.courses.errorloadcourses', true);
        }
    }).finally(function() {
        $mmUtil.closeModalLoading();
    });
    $scope.plugins = $mmCoursesDelegate.getData();
});

angular.module('mm.core.courses')
.run(function($translate, mmCoursesFrontPage) {
    $translate('mm.core.courses.frontpage').then(function(value) {
        mmCoursesFrontPage.shortname = value;
        mmCoursesFrontPage.fullname = value;
    });
})
.factory('$mmCourses', function($q, $log, $mmSite, mmCoursesFrontPage) {
    var self = {};
    self.getUserCourses = function() {
        var userid = $mmSite.getUserId();
        if (typeof(userid) === 'undefined') {
            return $q.reject();
        }
        var data = {userid: userid};
        return $mmSite.read('core_enrol_get_users_courses', data).then(function(courses) {
            return courses;
        });
    }
    return self;
});

angular.module('mm.core.courses')
.factory('$mmCoursesDelegate', function($log) {
    var plugins = {},
        self = {},
        data,
        controllers = [];
        self.registerPlugin = function(name, callback) {
        $log.debug("Register plugin '"+name+"' in course.");
        plugins[name] = callback;
    };
        self.updatePluginData = function(name) {
        $log.debug("Update plugin '"+name+"' data in course.");
        var pluginData = plugins[name]();
        if (typeof(pluginData) !== 'undefined') {
            data[name] = pluginData;
        }
    };
        self.getData = function() {
        if (typeof(data) == 'undefined') {
            data = {};
            angular.forEach(plugins, function(callback, plugin) {
                self.updatePluginData(plugin);
            });
        }
        return data;
    };
    return self;
});

angular.module('mm.core.login')
.controller('mmLoginCredentialsCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmUtil, $translate) {
    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {};
    $scope.login = function() {
        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;
        if (!username) {
            $mmUtil.showErrorModal('mm.core.login.usernamerequired', true);
            return;
        }
        if (!password) {
            $mmUtil.showErrorModal('mm.core.login.passwordrequired', true);
            return;
        }
        $translate('loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });
        $mmSitesManager.getUserToken(siteurl, username, password).then(function(token) {
            $mmSitesManager.newSite(siteurl, token).then(function() {
                delete $scope.credentials;
                $state.go('site.mm_courses');
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        }, function(error) {
            $mmUtil.closeModalLoading();
            $mmUtil.showErrorModal(error);
        });
    };
});

angular.module('mm.core.login')
.controller('mmLoginSiteCtrl', function($scope, $state, $mmSitesManager, $mmUtil, $ionicPopup, $translate, $ionicModal,
                                        $mmConfig, mmLoginLaunchSiteURL, mmLoginLaunchPassport, mmLoginSSOCode) {
    $scope.siteurl = '';
    $scope.isInvalidUrl = true;
    $scope.validate = function(url) {
        if (!url) {
            $scope.isInvalidUrl = true;
            return;
        }
        $mmSitesManager.getDemoSiteData(url).then(function() {
            $scope.isInvalidUrl = false;
        }, function() {
            var formattedurl = $mmUtil.formatURL(url);
            $scope.isInvalidUrl = formattedurl.indexOf('://localhost') == -1 && !$mmUtil.isValidURL(formattedurl);
        });
    };
    $scope.connect = function(url) {
        if (!url) {
            $mmUtil.showErrorModal('mm.core.login.siteurlrequired', true);
            return;
        }
        $translate('loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });
        $mmSitesManager.getDemoSiteData(url).then(function(sitedata) {
            $mmSitesManager.getUserToken(sitedata.url, sitedata.username, sitedata.password).then(function(token) {
                $mmSitesManager.newSite(sitedata.url, token).then(function() {
                    $state.go('site.mm_courses');
                }, function(error) {
                    $mmUtil.showErrorModal(error);
                }).finally(function() {
                    $mmUtil.closeModalLoading();
                });
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });
        }, function() {
            $mmSitesManager.checkSite(url).then(function(result) {
                if (result.code == mmLoginSSOCode) {
                    $ionicPopup.confirm({template: $translate('mm.core.login.logininsiterequired')})
                        .then(function(confirmed) {
                            if (confirmed) {
                                $mmConfig.get('wsextservice').then(function(service) {
                                    var passport = Math.random() * 1000;
                                    var loginurl = result.siteurl + "/local/mobile/launch.php?service=" + service;
                                    loginurl += "&passport=" + passport;
                                    $mmConfig.set(mmLoginLaunchSiteURL, result.siteurl);
                                    $mmConfig.set(mmLoginLaunchPassport, passport);
                                    window.open(loginurl, "_system");
                                    if (navigator.app) {
                                        navigator.app.exitApp();
                                    }
                                });
                            }
                        }
                    );
                } else {
                    $state.go('mm_login.credentials', {siteurl: result.siteurl});
                }
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        });
    };
    $ionicModal.fromTemplateUrl('core/components/login/templates/help-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(helpModal) {
        $scope.showHelp = function() {
            helpModal.show();
        };
        $scope.closeHelp = function() {
            helpModal.hide();
        };
        $scope.$on('$destroy', function() {
            helpModal.remove();
        });
    });
});

angular.module('mm.core.login')
.controller('mmLoginSitesCtrl', function($scope, $state, $mmSitesManager, $ionicPopup, $log, $translate) {
    $mmSitesManager.getSites().then(function(sites) {
        $scope.sites = sites;
        $scope.data = {
            hasSites: sites.length > 0,
            showDetele: false
        };
    });
    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };
    $scope.onItemDelete = function(e, index) {
        e.stopPropagation();
        var site = $scope.sites[index];
        $ionicPopup.confirm({template: $translate('mm.core.login.confirmdeletesite', {sitename: site.sitename})})
            .then(function(confirmed) {
                if (confirmed) {
                    $mmSitesManager.deleteSite(site.id).then(function() {
                        $scope.sites.splice(index, 1);
                        $mmSitesManager.hasNoSites().then(function() {
                            $state.go('mm_login.site');
                        });
                    }, function(error) {
                        $log.error('Delete site failed');
                        $mmUtil.showErrorModal('mm.core.login.errordeletesite', true);
                    });
                }
            });
    };
    $scope.login = function(index) {
        var siteid = $scope.sites[index].id;
        $mmSitesManager.loadSite(siteid).then(function() {
            $state.go('site.mm_courses');
        }, function(error) {
            $log.error('Error loading site '+siteid);
            $mmUtil.showErrorModal('mm.core.login.errorloadsite', true);
        });
    };
    $scope.add = function() {
        $state.go('mm_login.site');
    };
});

angular.module('mm.core.sidemenu')
.controller('mmSideMenuCtrl', function($scope, $state, $mmSideMenuDelegate, $mmSitesManager, $mmSite, $mmConfig) {
    $scope.plugins = $mmSideMenuDelegate.getData();
    $scope.siteinfo = $mmSite.getInfo();
    $scope.logout = function() {
        $mmSitesManager.logout().finally(function() {
            $state.go('mm_login.index');
        });
    };
    $scope.docsurl = 'http://docs.moodle.org/en/Mobile_app';
    if (typeof($scope.siteinfo) !== 'undefined' && typeof($scope.siteinfo.release) === 'string') {
        var release = $scope.siteinfo.release.substr(0, 3).replace(".", "");
        if (parseInt(release) >= 24) {
            $scope.docsurl = $scope.docsurl.replace("http://docs.moodle.org/", "http://docs.moodle.org/" + release + "/");
        }
    }
    $mmConfig.get('current_language').then(function(lang) {
        $mmConfig.get('languages').then(function(languages) {
            if (languages.indexOf(lang) > -1) {
                $scope.docsurl = 'http://docs.moodle.org/' + lang + '/Mobile_app';
            }
        });
    });
});

angular.module('mm.core.sidemenu')
.factory('$mmSideMenuDelegate', function($log) {
    var plugins = {},
        self = {},
        data,
        controllers = [];
        self.registerPlugin = function(name, callback) {
        $log.debug("Register plugin '"+name+"' in side menu.");
        plugins[name] = callback;
    };
        self.updatePluginData = function(name) {
        $log.debug("Update plugin '"+name+"' data in side menu.");
        var pluginData = plugins[name]();
        if (typeof(pluginData) !== 'undefined') {
            data[name] = pluginData;
        }
    };
        self.getData = function() {
        if (typeof(data) == 'undefined') {
            data = {};
            angular.forEach(plugins, function(callback, plugin) {
                self.updatePluginData(plugin);
            });
        }
        return data;
    }
    return self;
});
