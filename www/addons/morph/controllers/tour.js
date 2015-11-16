angular.module('mm.addons.morph').controller('mmaMorphTourCtrl', function($q, $mmUtil, $scope, $stateParams, $state, $mmaMorphHandlers, $mmaMorph, $http, mmaMorphTourStore, $mmApp) {
    var courseid = $stateParams.courseid;//,
        //courseid = courseid;
   $scope.tourPages = [];
  //  $scope.course=course;
    $scope.courseid = courseid;
    $scope.skipTour = function() {
        console.log("skip tour here");
        $state.go('site.morph-mainsubmenu', {
            courseid : courseid
        });
    };
    $scope.initTour=function() {
        console.log("Init tour here");
        var pages = [];
        var courseComponents = $mmaMorph.courseComponents;
        var allTourPages = $mmaMorph.allTourPages;
        var viewedTourPages=$mmaMorph.allViewedTourPages;
        angular.forEach(allTourPages, function(page) {
            if ( typeof page.prototype !== 'undefined' && courseComponents.indexOf(page.prototype) > -1) {
              addTourPageIfNotViewed(page,viewedTourPages);
            }else{
                 addTourPageIfNotViewed(page,viewedTourPages);
            }
            
        });
        $scope.componentsInitialized = true;
        if($scope.tourPages.length>0){
            storeViewedSlide(0);
        }else{
            console.log("go to the main submenu...");
            $state.go('site.morph-mainsubmenu', {
                        courseid: courseid,
                        back: 'site.mm_courses'
                    });  
        }
        
    };
    function addTourPageIfNotViewed(page, viewedTourPages){
        if(viewedTourPages.indexOf(page.id)===-1){
            $scope.tourPages.push(page);
        }
    }

    $scope.initTour();

    $scope.reportSlideChanged = function(slideId) {
        storeViewedSlide(slideId);
    };
    function storeViewedSlide(slideId) {
        var pageViewed = $scope.tourPages[slideId];
        $mmApp.getDB().insert(mmaMorphTourStore, {
            id : pageViewed.id
        });
        $mmaMorph.addViewedTourPage(pageViewed.id);
    }
 
 
}); 