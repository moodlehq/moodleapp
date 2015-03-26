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

angular.module('mm', ['ionic', 'mm.core', 'mm.core.login', 'ngCordova', 'angular-md5'])
.run(function($ionicPlatform, $rootScope, $state, $mmSite, $ionicBody, $window) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
    var checkTablet = function() {
      $ionicBody.enableClass($ionicPlatform.isTablet(), 'tablet');
    };
    ionic.on('resize', checkTablet, $window);
    checkTablet();
  });
  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    if (toState.name.substr(0, 8) !== 'mm_login' && !$mmSite.isLoggedIn()) {
      event.preventDefault();
      console.log('Redirect to login page, request was: ' + toState.name);
      $state.transitionTo('mm_login.index');
    } else if (toState.name.substr(0, 8) === 'mm_login' && $mmSite.isLoggedIn()) {
      event.preventDefault();
      console.log('Redirect to course page, request was: ' + toState.name);
      $state.transitionTo('site.index');
    }
  });
})
.config(function($stateProvider, $urlRouterProvider, $provide, $ionicConfigProvider, 
                  $httpProvider, $mmUtilProvider) {
  $ionicConfigProvider.platform.android.tabs.position('bottom');
  $provide.decorator('$ionicPlatform', ['$delegate', '$window', function($delegate, $window) {
      $delegate.isTablet = function() {
        return $window.matchMedia('(min-width:600px)').matches;
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
  }
  $urlRouterProvider.otherwise(function($injector, $location) {
    var $state = $injector.get('$state');
    $state.go('mm_login.index');
  });
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
  $httpProvider.defaults.transformRequest = [function(data) {
      return angular.isObject(data) && String(data) !== '[object File]' ? $mmUtilProvider.param(data) : data;
  }];
})

angular.module('mm.core', ['pascalprecht.translate']);

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
.factory('$mmSite', function($http, $q, $mmWS, $mmDB, $mmConfig, $log, md5) {
    var deprecatedFunctions = {
        "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
        "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
        "moodle_notes_create_notes": "core_notes_create_notes",
        "moodle_message_send_instantmessages": "core_message_send_instant_messages",
        "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
        "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
    };
    var self = {},
        currentSite,
        siteSchema = {
            autoSchema: true,
            stores: [
                {
                    name: 'wscache',
                    keyPath: 'id'
                }
            ]
        };
    function Site(id, siteurl, token, infos) {
        this.id = id;
        this.siteurl = siteurl;
        this.token = token;
        this.infos = infos;
        if (this.id) {
            this.db = $mmDB.getDB('Site-' + this.id, siteSchema);
        }
    };
        self.getSiteInfo = function() {
        var deferred = $q.defer();
        if (!self.isLoggedIn()) {
            $translate('mm.core.login.notloggedin').then(function(value) {
                deferred.reject(value);
            });
            return deferred.promise;
        }
        function siteDataRetrieved(infos) {
            currentSite.infos = infos;
            deferred.resolve(infos);
        }
        self.read('core_webservice_get_site_info', {}).then(siteDataRetrieved, function(error) {
            self.read('moodle_webservice_get_site_info', {}).then(siteDataRetrieved, function(error) {
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
    self.setSite = function(id, siteurl, token, infos) {
        currentSite = new Site(id, siteurl, token, infos);
    }
    self.deleteSite = function(siteid) {
        if(typeof(currentSite) !== 'undefined' && currentSite.id == siteid) {
            self.logout();
        }
        return $mmDB.deleteDB('Site-' + siteid);
    }
    self.read = function(method, data, preSets) {
        preSets = preSets || {};
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        return self.request(method, data, preSets);
    }
    self.write = function(method, data, preSets) {
        preSets = preSets || {};
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        return self.request(method, data, preSets);
    }
        self.request = function(method, data, preSets) {
        var deferred = $q.defer();
        if (!self.isLoggedIn()) {
            $translate('mm.core.login.notloggedin').then(function(value) {
                deferred.reject(value);
            });
            return deferred.promise;
        }
        method = checkDeprecatedFunction(method);
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
                deferred.reject(error);
            });
        });
        return deferred.promise;
    }
    self.wsAvailable = function(method) {
        if (!self.isLoggedIn() || typeof(currentSite.infos) == 'undefined') {
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
    self.getCurrentSiteURL = function() {
        if (typeof(currentSite) !== 'undefined' && typeof(currentSite.siteurl) !== 'undefined') {
            return currentSite.siteurl;
        } else {
            return undefined;
        }
    };
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
            deferred = $q.defer(),
            key;
        if (!db) {
            deferred.reject();
            return deferred.promise;
        } else if (!preSets.getFromCache) {
            deferred.reject();
            return deferred.promise;
        }
        key = method + ':' + JSON.stringify(data);
        db.get('wscache', key).then(function(entry) {
            var now = new Date().getTime();
            if (!preSets.omitExpires) {
                if (now > entry.expirationtime) {
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
            key = method + ':' + JSON.stringify(data);
        if (!db) {
            deferred.reject();
        } else {
            $mmConfig.get('cache_expiration_time').then(function(cacheExpirationTime) {
                var entry = {
                    id: key,
                    data: response
                };
                entry.expirationtime = new Date().getTime() + cacheExpirationTime;
                db.insert('wscache', entry);
                deferred.resolve();
            }, deferred.reject);
        }
        return deferred.promise;
    }
    return self;
});

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
        self.checkSite = function(siteurl, protocol) {
        var deferred = $q.defer();
        siteurl = $mmUtil.formatURL(siteurl);
        if (siteurl.indexOf('http://localhost') == -1 && !$mmUtil.isValidURL(siteurl)) {
            $translate('mm.core.login.invalidsite').then(function(value) {
                deferred.reject(value);
            });
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
                    $translate('cannotconnect').then(function(value) {
                        deferred.reject(value);
                    });
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
                        $translate('unexpectederror').then(function(value) {
                            deferred.reject(value);
                        });
                        return;
                    }
                    var code = parseInt(response.code, 10);
                    if (response.error) {
                        switch (code) {
                            case 1:
                                $translate('mm.core.login.siteinmaintenance').then(function(value) {
                                    deferred.reject(value);
                                });
                                break;
                            case 2:
                                $translate('mm.core.login.webservicesnotenabled').then(function(value) {
                                    deferred.reject(value);
                                });
                                break;
                            case 3:
                                deferred.resolve(0);
                                break;
                            case 4:
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
        db.insert(mmSitesStore, {
            id: id,
            siteurl: siteurl,
            token: token,
            infos: infos
        });
    };
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
    function mmUtil($mmSite, $ionicLoading, $ionicPopup, $translate) {
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
                this.isValidURL = function(url) {
            return /^http(s)?\:\/\/([\da-zA-Z\.-]+)\.([\da-zA-Z\.]{2,6})([\/\w \.-]*)*\/?/i.test(url);
        };
                this.getMoodleFilePath = function (fileurl, courseId, siteId, token) {
            return fileurl;
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
    }
    this.$get = function($mmSite, $ionicLoading, $ionicPopup, $translate) {
        return new mmUtil($mmSite, $ionicLoading, $ionicPopup, $translate);
    };
});

angular.module('mm.core')
.factory('$mmWS', function($http, $q, $injector) {
    var deprecatedFunctions = {
        "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
        "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
        "moodle_notes_create_notes": "core_notes_create_notes",
        "moodle_message_send_instantmessages": "core_message_send_instant_messages",
        "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
        "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
    };
    var self = {};
        self.moodleWSCall = function(method, data, preSets) {
        var deferred = $q.defer();
        data = self.convertValuesToString(data);
        preSets = self.verifyPresets(preSets);
        if(!preSets) {
            deferred.reject("unexpectederror");
            return;
        }
        if (typeof deprecatedFunctions[method] != "undefined") {
            if (self.wsAvailable(preSets.wsfunctions, deprecatedFunctions[method])) {
                method = deprecatedFunctions[method];
            } else {
            }
        }
        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        preSets.siteurl += '/webservice/rest/server.php?moodlewsrestformat=json';
        var ajaxData = data;
        $http.post(preSets.siteurl, ajaxData).success(function(data) {
            if (!data && !preSets.responseExpected) {
                data = {};
            }
            if (!data) {
                deferred.reject('cannotconnect');
                return;
            }
            if (typeof(data.exception) != 'undefined') {
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {
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
            deferred.resolve(angular.copy(data));
        }).error(function(data) {
            deferred.reject('cannotconnect');
        });
        return deferred.promise;
    };
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
        if (typeof(preSets.sync) == 'undefined') {
            preSets.sync = 0;
        }
        if (typeof(preSets.silently) == 'undefined') {
            preSets.silently = false;
        }
        if (typeof(preSets.omitExpires) == 'undefined') {
            preSets.omitExpires = false;
        }
        if (typeof(preSets.wstoken) == 'undefined') {
            return false;
        }
        if (typeof(preSets.siteurl) == 'undefined') {
            return false;
        }
        return preSets;
    };
        self.convertValuesToString = function(data) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = self.convertValuesToString(data[el]);
            } else {
                result[el] = data[el] + '';
            }
        }
        return result;
    };
        self.wsAvailable = function(functions, wsName) {
        if (!functions) {
            return false;
        }
        for(var i = 0; i < functions.length; i++) {
            var f = functions[i];
            if (f.name == wsName) {
                return true;
            }
        }
        return false;
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
        preSets = verifyPresets(preSets);
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

angular.module('mm.core')
.filter('formatText', function(md5, $mmSite, $mmUtil) {
    return function(text) {
        if (!text) {
            return '';
        }
        text = text.replace(/<a([^>]+)>/g,"<a target=\"_blank\" $1>");
        var currentSiteURL = $mmSite.getCurrentSiteURL();
        var ft = text.match(/\$\$(.+?)\$\$/);
        if (ft && typeof(currentSiteURL) !== 'undefined') {
            text = text.replace(/\$\$(.+?)\$\$/g, function(full, match) {
                if (!match) {
                    return "";
                }
                var md5 = md5.createHash(match);
                return '<img src="' + currentSiteURL + "/filter/tex/pix.php/" + md5 + '">';
            });
        }
        if (typeof(currentSiteURL) === 'undefined') {
            return text;
        }
        var url = currentSiteURL.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var expr = new RegExp(url + "[^\"']*", "gi");
        text = text.replace(expr, function(match) {
            if (!courseId) {
                courseId = 1;
            }
            return $mmUtil.getMoodleFilePath(match, courseId);
        });
        return text;
    }
});
angular.module('mm.core')
.filter('noTags', function() {
    return function(text) {
        return String(text).replace(/(<([^>]+)>)/ig, '');
    }
});
angular.module('mm.core')
.directive('noInputValidation', function() {
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
angular.module('mm.core.login', [])
.config(function($stateProvider) {
    $stateProvider
    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/login.html',
        cache: false,  
        onEnter: function($ionicHistory) {
            $ionicHistory.clearHistory();
        }
    })
    .state('mm_login.index', {
        url: '/index',
        templateUrl: 'core/components/login/templates/login-index.html',
        controller: 'mmAuthLoginCtrl',
        onEnter: function($state, $mmSitesManager) {
            $mmSitesManager.noSites().then(function() {
                $state.go('mm_login.site');
            });
        },
        resolve: {
            sites: function($mmSitesManager) {
                return $mmSitesManager.getSites();
            }
          }
    })
    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/login-site.html',
        controller: 'mmAuthSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $ionicHistory, $mmSitesManager) {
            $mmSitesManager.noSites().then(function() {
                $ionicNavBarDelegate.showBackButton(false);
                $ionicHistory.clearHistory();
            });
        }
    })
    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/login-credentials.html',
        controller: 'mmAuthCredCtrl',
        params: {
            siteurl: ''
        },
        onEnter: function($state, $stateParams) {
            if (!$stateParams.siteurl) {
              $state.go('mm_login.index');
            }
        }
    });
});

angular.module('mm.core.login')
.controller('mmAuthCredCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmUtil, $translate) {
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
        if(!password) {
            $mmUtil.showErrorModal('mm.core.login.passwordrequired', true);
            return;
        }
        $translate('loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });
        $mmSitesManager.getUserToken(siteurl, username, password).then(function(token) {
            $mmSitesManager.newSite(siteurl, username, token).then(function() {
                $mmUtil.closeModalLoading();
                delete $scope.credentials;
                $state.go('site.index');
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });
        }, function(error) {
            $mmUtil.closeModalLoading();
            $mmUtil.showErrorModal(error);
        });
    };
});

angular.module('mm.core.login')
.controller('mmAuthLoginCtrl', function($scope, $state, $mmSitesManager, $ionicPopup, $log, sites, $translate) {
    $scope.sites = sites;
    $scope.data = {
        hasSites: sites.length > 0,
        showDetele: false
    };
    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };
    $scope.onItemDelete = function(e, index) {
        e.stopPropagation();
        var site = $scope.sites[index];
        $ionicPopup.confirm({template: $translate('mm.core.login.confirmdeletesite', {sitename: site.sitename})})
            .then(function(confirmed) {
                if(confirmed) {
                    $mmSitesManager.deleteSite(site.id).then(function() {
                        $scope.sites.splice(index, 1);
                        $mmSitesManager.noSites().then(function() {
                            $state.go('mm_login.site');
                        });
                    }, function(error) {
                        $log.error('Delete site failed');
                        $mmUtil.showErrorModal('mm.core.login.errordeletesite', true);
                    });
                }
            });
    }
    $scope.login = function(index) {
        var siteid = $scope.sites[index].id;
        $mmSitesManager.loadSite(siteid).then(function() {
            $state.go('site.index');
        }, function(error) {
            $log.error('Error loading site.');
            $mmUtil.showErrorModal('mm.core.login.errorloadsite', true);
        });
    };
    $scope.add = function() {
        $state.go('mm_login.site');
    };
});
angular.module('mm.core.login')
.controller('mmAuthSiteCtrl', function($scope, $state, $mmSitesManager, $mmSite, $mmUtil, $ionicPopup, $translate, $ionicModal) {
    $scope.siteurl = '';
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
                $mmSitesManager.newSite(sitedata.url, sitedata.username, token).then(function() {
                    $mmUtil.closeModalLoading();
                    $state.go('site.index');
                }, function(error) {
                    $mmUtil.closeModalLoading();
                    $mmUtil.showErrorModal(error);
                });
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });
        }, function() {
            $mmSitesManager.checkSite(url).then(function(result) {
                $mmUtil.closeModalLoading();
                $state.go('mm_login.credentials', {siteurl: result.siteurl});
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });
        });
    };
    $ionicModal.fromTemplateUrl('core/components/login/templates/login-help-modal.html', {
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
