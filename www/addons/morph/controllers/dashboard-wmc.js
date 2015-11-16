angular.module('mm.addons.morph')

/**
 * Morph dashboard view controller.
 *
 * @module
 * @ngdoc controller
 * @name
 */
.controller('mmaDashboardWmcProgressCtrl', function($scope, $stateParams) {
    "use strict";
	$scope.courseid = $stateParams.courseid;
	$scope.labels = ['2006', '2007', '2008', '2009', '2010', '2011', '2012'];
	$scope.series = ['Series A', 'Series B'];

	$scope.data = [[65, 59, 80, 81, 56, 55, 40], [28, 48, 40, 19, 86, 27, 90]];
}).controller('mmaDashboardWmcCapacityCtrl', function($scope, $stateParams) {
    "use strict";
	$scope.courseid = $stateParams.courseid;
	$scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
	$scope.series = ['Series A', 'Series B'];
	$scope.data = [[65, 59, 80, 81, 56, 55, 40], [28, 48, 40, 19, 86, 27, 90]];
	$scope.onClick = function(points, evt) {
		console.log(points, evt);
	};
})

.controller('mmaDashboardStudentLearningStylesCtrl', function($scope, $stateParams,$ionicActionSheet,$mmaMORPHDashboard, $ionicModal) {
    "use strict";
	$scope.courseid = $stateParams.courseid;//,
 
    $scope.students = $mmaMORPHDashboard.getStudents($scope.courseid, 0);
	//    courseid = course.id;
	//$scope.courseid = courseid;
	$scope.labels = ["Sensing", "Visual", "Inductive", "Active", "Sequential", "Intuitive", "Verbal"];
 var barHeight = document.getElementsByTagName('ion-header-bar')[0].clientHeight;
  $scope.getWidth = function () {
    return window.innerWidth + 'px';
  };
  $scope.getTotalHeight = function () {
    return parseInt(parseInt($scope.getHeight()) * 2) + 'px';
  };
  $scope.getHeight = function () {
    return parseInt(window.innerHeight - barHeight) + 'px';
  };
	$scope.data = [[65, 59, 90, 81, 56, 55, 40], [28, 48, 40, 19, 96, 27, 100]];
	$scope.tableData=[{title:"Sensing",value:65,value2:28},
	{title:"Visual",value:59,value2:48},
	{title:"Inductive",value:90,value2:40},
	{title:"Active",value:81,value2:19},
	{title:"Sequential",value:56,value2:96},
	{title:"Intuitive",value:55,value2:27},
	{title:"Verbal",value:40,value2:100}];
$scope.showOptions = function () {
    var sheet = $ionicActionSheet.show({
      buttons: [
        {text: 'Sort by title'},
        {text: 'Sort by average value'},
        {text: 'Select student'}
      ],
      cancelText: 'Cancel',
      buttonClicked: function (index) {
        if (index === 0) {
          Locations.toggle($stateParams);
        }
        if (index === 1) {
          Locations.primary($stateParams);
        }
        if (index === 2) {
          $scope.showModal();
        }
        return true;
      }
    });
  };
   $scope.showModal = function () {
    if ($scope.modal) {
      $scope.modal.show();
    } else {
      $ionicModal.fromTemplateUrl('addons/morph/templates/dashboard/select_student.html', {
        scope: $scope
      }).then(function (modal) {
        $scope.modal = modal;
        var days = [];
        var day = Date.now();
        for (i = 0; i < 365; i++) {
          day += 1000 * 60 * 60 * 24;
          //days.push(SunCalc.getTimes(day, $scope.params.lat, $scope.params.lng));
        }
        $scope.chart = days;
        $scope.modal.show();
      });
    }
  };
  $scope.hideModal = function () {
    $scope.modal.hide();
  };
  $scope.selectStudent=function(studentid){
       $scope.modal.hide();
  };
  
})

.controller('mmaDashboardLearningStylesCtrl', function($scope, $stateParams) {
    "use strict";
	$scope.courseid = $stateParams.courseid;
	$scope.labels = ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
	$scope.data = [300, 500, 100];
})




.controller('mmaDashboardWMCStudentDetailsCtrl', function($scope, $stateParams, $http) {
    "use strict";
	$scope.student=$stateParams.student;

})

.controller('mmaDashboardWMCStudentChartCtrl', function ($scope, $http, $state, $stateParams,$mmaMORPHDashboard) {
  "use strict";

$scope.students = $mmaMORPHDashboard.getStudents($scope.courseid, 0);
if(typeof $scope.selectedStudent==='undefined'){
   $scope.selectedStudent=$scope.students[0]; 
}

$scope.history = {
    studentid: $stateParams.studentid || 'USD',
    student: $stateParams.student
  };
$scope.changeStudent=function(){
     for(i=0;i<$scope.students.length;i++){
         var checkstudent=$scope.students[i];
      
         if(checkstudent.code===$scope.history.student){
             $scope.selectedStudent=checkstudent;
             $scope.history.student=checkstudent.code;
             $scope.history.studentid=checkstudent.id;
         }
     }
    $state.go('site.morph-dashboard-studentsprogress-charts',{courseid:$stateParams.courseid, studentid:$scope.selectedStudent.code, student:$scope.selectedStudent});
   
};

  var studentname="Selected student";
   $scope.labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    $scope.series = [studentname, 'Average'];
    $scope.data = [
      [65, 59, 80, 81, 56, 55, 40],
      [28, 48, 40, 19, 86, 27, 90]
    ];
 
})

.controller('mmaDashboardWMCSettingsCtrl', function ($scope) {

  $scope.test="TEST VALUE";
  $scope.state = {
    reordering: false
  };

  $scope.$on('$stateChangeStart', function () {
    $scope.state.reordering = false;
  });

  $scope.move = function(currency, fromIndex, toIndex) {
    $scope.currencies.splice(fromIndex, 1);
    $scope.currencies.splice(toIndex, 0, currency);
  };
  $scope.settings=[
{ id:1, title: 'Logins',  selected: true },
{id:2, title: 'Logouts',  selected: false },
{id:3,  title: 'Discussions', selected: true },
{id:4, title: 'Blogs', selected: false },
{id:5, title: 'Private messages', selected: true},
{id:6, title: 'Chats',  selected: true },
{id:7, title: 'Modules views',  selected: true },
{id:8, title: 'Quiz attempts',  selected: false },
{id:9, title: 'Asignments post',  selected: false },
{id:10, title: 'Forum posts',  selected: true }
 
];
 $scope.defaultcomparison='average';
 $scope.days=8;
  
});

