angular.module('mm.addons.morph')
.constant('mmaMorphTourStore', 'morph_tour_store')
.config(function($mmAppProvider, mmaMorphTourStore) {
    var stores = [
        {
            name: mmaMorphTourStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})
.factory('$mmaMorph', function($mmSite, $mmCourse, $stateParams, $log, $q, $mmUser,$http,mmaMorphTourStore, $mmApp) {
    console.log("INIT MMA MORPH");
    var courseid = 0;
    $log = $log.getInstance('$mmaMorph');
    var self = {};
    self.componentsInitialized = false;
    self.allTourPages=[];
    self.allViewedTourPages=[];
    console.log("INIT MMA MORPH 2");
    $http.get('addons/morph/files/tours.json').then(function(response){
      self.allTourPages=response.data; 
    });
console.log("INIT MMA MORPH 3");
    $mmApp.getDB().getAll(mmaMorphTourStore).then(function(viewedPages){
       angular.forEach(viewedPages, function(viewedPage){
           self.allViewedTourPages.push(viewedPage.id);
       }) ;
    });
    console.log("INIT MMA MORPH 4");
    // self.courseComponents=[];
    self.isPluginMorphEnabled = function() {
        var infos;
        return true;
    };
    self.isEnabledForCourse = function() {
        return true;
    };
    self.isComponentsInitialized = function() {
        return self.componentsInitialized;
    };
    self.readCourseComponents = function(courseId) {
        var params = {
            courseid : courseId
        },
            options = {};
        return $mmSite.read('get_morph_components_course', params, options);
    };
    self.getCurrentCourseComponents=function(){
       return self.courseComponents; 
    };

    self.fetchComponents = function(courseid) {
        console.log("MMA MORPH FETCH COMPONENTS");
        self.componentsInitialized = false;
        var components = [];
        var promises = [];
        var promise = self.readCourseComponents(courseid).then(function(answer) {
            var data = {
                count : 0
            };
            angular.forEach(answer.components, function(value, key) {

                components.push(value.name);
                data.count = data.count + 1;
            });
            self.courseComponents = components;
            self.componentsInitialized = true;
        }, function(error) {
            console.log("ERROR:" + JSON.stringify(error));
        }, function(progress) {
            console.log("PROGRESS:" + JSON.stringify(progress));
        });
        promises.push(promise);
        self.componentsInitialized = true;
        return $q.all(promises).then(function() {
            return components;
        });
    };
    self.addViewedTourPage=function(pageId){
       self.allViewedTourPages.push(pageId);
    };

    //fetchComponents(courseid);

    return self;
}); 