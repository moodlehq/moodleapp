angular.module('mm.addons.morph')
.factory('$mmaMorphHandlers', function($mmaMorph, $mmSite, $translate, $ionicLoading, $ionicModal, $mmUtil) {
    'use strict';
    var self = {};
	 
        
    /**
     * Course nav handler.
     *
     * @module mm.addons.morph
     * @ngdoc method
     * @name $mmaNotesHandlers#coursesNav
     */
 
    self.coursesNav = function() {
		
        var self = {};
        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            console.log("CALLING IS ENABLED...");
            return $mmaMorph.isPluginMorphEnabled();
        };

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} courseId Course ID.
         * @return {Boolean}        True if handler is enabled, false otherwise.
         */
        self.isEnabledForCourse = function(courseId) {
        var enabled=false;
        var data = {
                courseid : courseId
            },
            presets = {};
            console.log("CHECKING IF MORPH IS ACTIVATED...");
            return $mmSite.read('is_morph_activated', data, presets).then(function(response) {
                console.log("Is morph activated..."+JSON.stringify(response));
            if (response) {return response[0].activated;}else{return false;}
            });
        };
    

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(courseId) {

            /**
             * Courses nav handler controller.
             *
             * @module mm.addons.notes
             * @ngdoc controller
             * @name $mmaNotesHandlers#coursesNav:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-ios-list';
                $scope.title = 'mma.morph.morphtitle';
                  $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                     $mmaMorph.fetchComponents(course.id).then(function(components){
                       $mmaMorph.courseComponents=components;  
                      if($mmaMorph.isComponentsInitialized()){
                          $state.go('site.morph-tour', {
                        courseid: course.id
                     });
                      }else{
                            $state.go('site.morph.mainsubmenu', {
                        course: course
                    });  
                      }
                       
                    });
                };
            };
        };

        return self;
    };
    
    return self;
});
