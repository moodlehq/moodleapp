angular.module('mm.addons.morph')

/**
 * Morph mainsubmenu view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaMorphSubmenuCtrl', function($q, $mmUtil,$scope, $stateParams, $state, $mmaMorphHandlers, $mmaMorph,$ionicHistory) {
     var courseid = $stateParams.courseid;
        //courseid = course.id;
    $scope.back=$stateParams.back;
    $scope.courseid = courseid;
    console.log("MORPH SUBMENU courseid:"+courseid+" scope course id:"+$scope.courseid+" back:"+$scope.back);
    $scope.coursesComponents=$mmaMorph.getCurrentCourseComponents();
	$scope.componentsInitialized=false;
 
    
  //  fetchComponents($scope.courseid);
    $scope.isSubmenuAvailableInCourse=function(submenu){
   	for(i=0;i<$scope.coursesComponents.length;i++){
   		if($scope.coursesComponents[i]===submenu){
   			return true;
   		}
   	}
   	return false;
   };
    $scope.navigateToAdaptedContent=function(){
        console.log("MORPH SUBMENU navigate to adapted content courseid:"+courseid+" scope course id:"+$scope.courseid);
        $state.go('site.morph-adaptedcontent', {
          courseid: $scope.courseid
        });
    };
    $scope.navigateToCourseContent=function(){
        $state.go('site.morph-coursecontent', {
          courseid: $scope.courseid
        });
    };
    $scope.navigateToDashboard = function(){
    	$state.go('site.morph-dashboard', {
          courseid: $scope.courseid
        });
   };
   $scope.navigateBack=function(){
       if($scope.back && typeof $scope.back !== 'undefined'){
           console.log("navigate back from scope back:"+$scope.back);
         $state.go($scope.back,{
             courseid: $scope.courseid
         }
             
             );
           
       }else{
           console.log("navigate back from history");
           $ionicHistory.goBack();
           //$state.go('site.mm_courses');
       }
       
   };
 
});