// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

angular.module('mm.addons.morph', ['chart.js','ng-walkthrough', 'ionic-toast'])
  .constant('mmaMorphPriority', 800)
  .constant('mmaMorphMainSubmenuStateName','site.morph-mainsubmenu')
   .constant('mmaMorphAdaptedContent','site.morph-adaptedcontent')

.config(function($stateProvider,$mmCoursesDelegateProvider, mmaMorphPriority,$urlRouterProvider,mmaMorphMainSubmenuStateName, mmaMorphAdaptedContent) {
    "use strict";
    $stateProvider
      .state('site.morph-tour', {
        url: '/morph-tour',
        params: {
           courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/tour.html',
                controller: 'mmaMorphTourCtrl'
            }
        }
   })
    .state(mmaMorphMainSubmenuStateName, {
        url: '/morph-mainsubmenu',
         params: {
            sectionid: null,
            courseid: null,
            back: null
        }, 
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/mainsubmenu.html',
                controller: 'mmaMorphSubmenuCtrl'
            }
        }
   })
	.state(mmaMorphAdaptedContent, {
        url: '/morph-adaptedcontent',
        params: {
            sectionid: null,
            courseid: null,
            userid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/adaptedcontent.html',
                controller: 'mmaAdaptedContentCtrl'
            }
        }
   })
   .state('site.morph-coursecontent', {
        url: '/morph-coursecontent',
        params: {
            sectionid: null,
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/coursecontent.html',
                controller: 'mmaCourseContentCtrl'
            }
        }
   })
    .state('site.morph_course-section', {
        url: '/morph_course-section',
        params: {
            sectionid: null,
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/section.html',
                controller: 'mmMorphSectionCtrl'
            }
        }
    })
	.state('site.morph-dashboard', {
        url: '/morph-dashboard',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/dashboard.html',
                controller: 'mmaDashboardCtrl'
            }
        }
   })
   .state('site.morph-dashboard-wmc_progress', {
        url: '/morph-dashboard-wmc_progress',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/wmc-progress.html',
                controller: 'mmaDashboardWmcProgressCtrl'
            }
        }
   })
 
 .state('site.morph-dashboard-wmc_capacity', {
        url: '/morph-dashboard-wmc_capacity',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/wmc-capacity.html',
                controller: 'mmaDashboardWmcCapacityCtrl'
            }
        }
   })

   .state('site.morph-dashboard-student_learning_styles', {
        url: '/morph-dashboard-student_learning_styles',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/student_learning_styles.html',
                controller: 'mmaDashboardStudentLearningStylesCtrl'
            }
        }
   })
   .state('site.morph-dashboard-learning_styles', {
        url: '/morph-dashboard-learning_styles',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/learning_styles.html',
                controller: 'mmaDashboardLearningStylesCtrl'
            }
        }
   }).state('site.morph-dashboard-studentsprogress', {
        url: '/studentprogress-tabs/morph-dashboard-studentsprogress',
        params: {
            courseid: null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/studentsprogress-tabs.html',
                controller: 'mmaDashboardWMCStudentsProgressCtrl'
            }
        }
   }).state('site.morph-dashboard-studentsprogress-charts', {
        url: '/studentprogress-tabs/morph-dashboard-studentsprogress-charts',
        params: {
            courseid: null,
            studentid: null,
            student:null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/studentsprogress-charts.html',
                controller: 'mmaDashboardWMCStudentChartCtrl'
            }
           }
     }).state('site.morph-dashboard-studentsprogress-settings', {
        url: '/studentprogress-tabs/morph-dashboard-studentsprogress-settings',
        params: {
            courseid: null
 
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/studentsprogress-settings.html',
                controller: 'mmaDashboardWMCSettingsCtrl'
            }
           }
     }).state('site.morph-dashboard-student_details', {
        url: '/morph-dashboard-student_details',
        params: {
            student: null,
            courseid:null
        },
        views: {
            'site': {
                templateUrl: 'addons/morph/templates/dashboard/student_details.html',
                controller: 'mmaDashboardWMCStudentDetailsCtrl'
            }
        }
   });
 //  $urlRouterProvider.otherwise('/studentprogress-tabs/morph-dashboard-studentsprogress');

  // Register courses handler.
    $mmCoursesDelegateProvider.registerNavHandler('mmaMorph', '$mmaMorphHandlers.coursesNav', mmaMorphPriority);
});

/*
.run(function($mmUserDelegate,$mmaMorphHandlers, $mmCoursesDelegate, $mmaMorph,mmaMorphPriority) {
    $mmCoursesDelegate.registerPlugin('mmaMorph', function() {
      if ($mmaMorph.isPluginMorphEnabled() && $mmaMorph.isEnabledForCourse()) {
            return {
                icon: 'ion-ios-list',
                state: 'site.morph-mainsubmenu',
                title: 'mma.morph.morphtitle'
            };
      }
    }, mmaMorphPriority);
 
 

});
*/