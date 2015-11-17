angular.module('mm.addons.morph')

/**
 * Morph mainsubmenu view controller.
 *
 * @module  
 * @ngdoc controller
 * @name  
 */
.controller('mmaCourseContentCtrl', function($mmCourse,  $mmUtil, $scope, $stateParams,$translate) {
    $scope.courseid = $stateParams.courseid;
    	
       //courseid = course.id;
   // $scope.courseid = courseid;
    $scope.fullname="MY sample course name";
    function loadSections(refresh) {
        return $mmCourse.getSections($scope.courseid,refresh).then(function(sections) {
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
    	console.log("load regular sections calling...");
        $scope.sectionsLoaded = true;
    });
});