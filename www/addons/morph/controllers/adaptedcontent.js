angular.module('mm.addons.morph')

/**
 * Morph mainsubmenu view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaAdaptedContentCtrl', function($mmaAdaptedCourse,$mmSite,  $mmUtil, $scope, $state, $stateParams,$translate) {
    var courseid = $stateParams.courseid,
    userid = $stateParams.userid || $mmSite.getUserId();
        //courseid = course.id;
    $scope.courseid = courseid;
    $scope.fullname="MY sample course name";
    function loadSections(refresh) {
        return $mmaAdaptedCourse.getAdaptedSections(courseid, userid).then(function(sections) {
             $translate('mma.morph.showall').then(function(str) {
                // Adding fake first section.
                var result = [{
                    name: str,
                    id: -1
                }].concat(sections);
                $scope.sections = result;
            });
             
   
        }, function(error) {
            $mmUtil.showErrorModal('mm.course.couldnotloadsections', true);
        });
    }
    $scope.doRefresh = function() {
        loadSections(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    loadSections().finally(function() {

        $scope.sectionsLoaded = true;
    });
    $scope.navigateToCourseSection=function(courseid, sectionid){

        $state.go('site.morph_course-section', {
          courseid: courseid,
          sectionid: sectionid
        });
    };
     $scope.navigateBack=function(){
      $state.go('site.morph_mainsubmenu', {
          courseid: courseid
        });
       
   };
});