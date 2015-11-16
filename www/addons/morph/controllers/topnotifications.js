 angular.module('mm.addons.morph')

/**
 * Morph mainsubmenu view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaTopNotifications', function($scope, $stateParams,$translate, ionicToast) {
    $scope.expanded=false;
    
     $scope.notifications=[
                {alerttype:'info',
                header:'Heads up!',
                content:'You have one more activity to pass in order to successfuly pass this topic. This activity is critical to you overal success, and you should reach at least 80% success in order to qualify for next level.'},
                {alerttype:'warning',
                header:'Be careful!',
                content:'You are approaching deadline for sending your assessment.'},
                {alerttype:'error',
                header:'Error!',
                content:'You failed to pass this topic. Please review all relevant sections before moving on next topic.'},
                {alerttype:'success',
                header:'Well done!',
                content:'You achieved excellent score on this topic.'}
               
  
];
$scope.getAlertClass=function(alerttype){
    return 'alert-'+alerttype;
};
$scope.setLastTopNotification=function(){
     $scope.lastTopNotification=$scope.notifications[0];
};
$scope.setLastTopNotification();
$scope.dismissNotification = function (index) {
   $scope.notifications.splice(index,1);
   $scope.setLastTopNotification();
  };
  $scope.hasNotifications=function(){
     if($scope.notifications.length>0){
         return true;
     }else{
         return false;
     }
  };
  $scope.toggleExpanded=function(){
    if($scope.expanded===false){
        $scope.expanded=true;
    }else $scope.expanded=false;
    
  };
  $scope.viewItem=function(index){
      if(index===0){
          console.log("VIEWING LAST NOTIFICATION...");
          $scope.lastTopNotification.alerttype =$scope.lastTopNotification.alerttype+'-expanded';
      }
  };
  $scope.showToast = function(){
 console.log("showint toast");
  ionicToast.show('This is a toast at the bottom.', 'bottom', true, 2500);
};
$scope.showToast();
});