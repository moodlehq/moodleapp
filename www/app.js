// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('mm', ['ionic', 'mm.core', 'mm.core.login', 'angular-md5'])

.run(function($ionicPlatform, $rootScope, $state, $mmSite, $ionicBody, $window) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
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
      // We are not logged in.
      event.preventDefault();
      console.log('Redirect to login page, request was: ' + toState.name);
      $state.transitionTo('mm_login.index');
    } else if (toState.name.substr(0, 8) === 'mm_login' && $mmSite.isLoggedIn()) {
      // We are logged in and requested the login page.
      event.preventDefault();
      console.log('Redirect to course page, request was: ' + toState.name);
      $state.transitionTo('site.index');
    }

  });


})

.config(function($stateProvider, $urlRouterProvider, $provide, $ionicConfigProvider, 
                  $httpProvider, $mmUtilProvider) {

  // Set tabs to bottom on Android.
  $ionicConfigProvider.platform.android.tabs.position('bottom');

  // Decorate $ionicPlatform.
  $provide.decorator('$ionicPlatform', ['$delegate', '$window', function($delegate, $window) {
      $delegate.isTablet = function() {
        return $window.matchMedia('(min-width:600px)').matches;
      };
      return $delegate;
  }]);


  // Ugly hack to "decorate" the $stateProvider.state() method.
  // This allows us to automagically define 'tablet' states which use split views.
  // We can probably do this better, or define our own $stateProvider to clean this up.
  var $mmStateProvider = {
    state: function(name, stateConfig) {
      function setupTablet(state) {
        if (!state.tablet) {
          return;
        }

        // Support shorthand tablet definition.
        if (angular.isString(state.tablet)) {
          state.tablet = {
            parent: state.tablet
          }
        }

        var params = state.tablet,
            parent = params.parent,
            node = params.node || 'tablet',
            config = {};

        // Remove any trace from the state object.
        delete state['tablet'];

        // Prepare the default parameters for the tablet.
        delete params['node'];
        delete params['parent'];
        angular.copy(state, config);
        angular.extend(config, params);

        // We can only support 1 view at the moment.
        if (config.views.length > 1) {
          console.log('Cannot guess the view data to use for tablet state of ' + name);
          return;
        }

        // Find view name.
        var viewName, viewData;
        angular.forEach(config.views, function(v, k) {
          viewName = k;
          viewData = v;
        }, this);

        // Delete the original view and replace with the new one.
        delete config.views[viewName];
        config.views['tablet'] = viewData;

        // Define the new tablet state.
        $stateProvider.state.apply($stateProvider, [parent + '.' + node, config]);
      }

      setupTablet.apply(this, [stateConfig]);
      $stateProvider.state.apply($stateProvider, [name, stateConfig]);
      return this;
    }
  }

  // $mmStateProvider

  //   .state('site', {
  //     url: '/site',
  //     abstract: true,
  //     onEnter: function($ionicHistory) {
  //       // Remove the login page from the history stack.
  //       $ionicHistory.clearHistory();
  //     }
  //   })

  //   .state('site.index', {
  //     url: '/index'
  //   });

  // Default redirect to the login page.
  $urlRouterProvider.otherwise(function($injector, $location) {
    var $state = $injector.get('$state');
    $state.go('mm_login.index');
  });

  // This code is to be able to get data sent with $http.post using $_POST variable.
  // Otherwise all the data ends up in php://input and seems like local/mobile/check.php doesn't like it.
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
  $httpProvider.defaults.transformRequest = [function(data) {
      return angular.isObject(data) && String(data) !== '[object File]' ? $mmUtilProvider.param(data) : data;
  }];

})
