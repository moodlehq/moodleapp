angular.module('mm.addons.morph')

/**
 * Morph dashboard view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaDashboardCtrl', function($scope, $stateParams) {
    "use strict";
     $scope.courseid = $stateParams.courseid;
         //courseid = course.id;
     //$scope.courseid = courseid;
     
});