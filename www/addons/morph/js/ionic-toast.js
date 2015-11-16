//By Rajeshwar Patlolla
//https://github.com/rajeshwarpatlolla/ionic-toast
//rajeshwar.patlolla@gmail.com

'use strict';
angular.module('ionic-toast', ['ionic'])

.run(['$templateCache', function ($templateCache) {
  var toastTemplate = '<div class="ionic_toast" ng-class="ionicToast.toastClass" ng-style="ionicToast.toastStyle">' +
    '<span class="ionic_toast_close" ng-click="hide()"><i class="ion-close-round toast_close_icon"></i></span>' +
    '<span ng-bind-html="ionicToast.toastMessage"></span>' +
    '</div>';

  $templateCache.put('ionic-toast/templates/ionic-toast.html', toastTemplate);
}])

.provider('ionicToast', function () {

  this.$get = ['$compile', '$document', '$interval', '$rootScope', '$templateCache', '$timeout',
    function ($compile, $document, $interval, $rootScope, $templateCache, $timeout) {

      var defaultScope = {
        toastClass: '',
        toastMessage: '',
        toastStyle: {
          display: 'none',
          opacity: 0
        }
      };

      var toastTimeout;

      var toastPosition = {
        top: 'ionic_toast_top',
        middle: 'ionic_toast_middle',
        bottom: 'ionic_toast_bottom'
      };

      var toastScope = $rootScope.$new();
      var toastTemplate = $compile($templateCache.get('ionic-toast/templates/ionic-toast.html'))(toastScope);

      toastScope.ionicToast = defaultScope;

      $document.find('body').append(toastTemplate);

      var toggleDisplayOfToast = function (display, opacity, callback) {
        toastScope.ionicToast.toastStyle = {
          display: display,
          opacity: opacity
        };
        toastScope.ionicToast.toastStyle.opacity = opacity;
        if (callback) {
          callback();
        }
      };

      toastScope.hide = function () {
        toggleDisplayOfToast('none', 0, function () {
          // console.log('toast hidden');
          $rootScope.$broadcast('ionicToastDismissed');
        });
      };

      return {

        show: function (message, position, closeBtn, duration) {

          if (!message || !position || !duration) return;
          $timeout.cancel(toastTimeout);
          if (duration > 5000) duration = 5000;

          angular.extend(toastScope.ionicToast, {
            toastClass: toastPosition[position] + ' ' + (closeBtn ? 'ionic_toast_sticky' : ''),
            toastMessage: message
          });

          toggleDisplayOfToast('block', 1, function () {
            if (closeBtn) return;

            toastTimeout = $timeout(function () {
                console.log("TOAST TIMEOUT function...");
              toastScope.hide();
            }, duration);
          });
        },

        hide: function () {
            console.log("TOAST HIDE TRIGGERED...");
          toastScope.hide();
        }
      };

    }
  ];
});
