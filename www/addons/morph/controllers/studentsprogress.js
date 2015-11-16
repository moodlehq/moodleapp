angular.module('mm.addons.morph')

/**
 * Morph studentprogress view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaDashboardWMCStudentsProgressCtrl', function($scope, $stateParams, $mmaMORPHDashboard,$http, $mmaWalkthrough) {
    "use strict";
    $scope.courseid = $stateParams.courseid;
    $scope.students = $mmaMORPHDashboard.getStudents($scope.courseid, 0);
    
    
    /**Setting up walkthrough with several steps*/
    
    $scope.walkthroughs=['studentprogress1','studentprogress2'];
     
    $scope.isWalkthroughActive=function(walkthroughid){
        for(i=0;i<$scope.activeWalkthroughs.length;i++){
            if($scope.activeWalkthroughs.id===walkthroughid){
                return $scope.activeWalkthrough.active;
            }
        }
        return false;
    };
    
    $scope.checkActiveWalkthroughs=function(){
        $scope.activeWalkthroughs=[];
        var hasActive=false;
        angular.forEach($scope.walkthroughs, function(key){
              $mmaWalkthrough.isWalkthoughViewed(key).then(function(result){
                 $scope.activeWalkthroughs.push(result);
                if(result.passed===true){
                    $scope[key]=false;
                }else{
                    if(!hasActive){
                        $scope[key]=true;
                        hasActive=true;
                    }else{
                        $scope[key]=false;
                    }
                }
            });          
        });
    };
    $scope.checkActiveWalkthroughs();

  $scope.onWalkthroughHideFunction=function(walkthroughid){
      $scope[walkthroughid]=false;
      for(i=0;i<$scope.walkthroughs.length;i++){
          if($scope.walkthroughs[i]===walkthroughid){
              if(i<$scope.walkthroughs.length-1){
                  var nextKey=$scope.walkthroughs[i+1];
                  $scope[nextKey]=true;                  
              }
          }
      }
  };
 /**End of walkthrough*/
    
    $scope.load = function() {
        $http.get('https://api.bitcoinaverage.com/ticker/all').success(function(tickers) {
            angular.forEach($scope.students, function(student) {
                student.ticker = tickers[student.code];
               // student.ticker.timestamp = new Date(student.ticker.timestamp);
            });
        });
    };

    $scope.load();

});