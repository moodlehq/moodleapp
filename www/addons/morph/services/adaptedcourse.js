angular.module('mm.addons.morph')
.factory('$mmaAdaptedCourse', function($mmSite, $mmCourse, $stateParams, $log, $q, $mmUser) {
 self.getAdaptedSections = function(courseid, userid) {
 	console.log("GET ADAPTED SECTIONS FOR COURSE:"+courseid+" and user:"+userid);
        var presets = {
            cacheKey: getSectionsCacheKey(courseid)
        };
        return $mmSite.read('adaptedcourse_get_contents', {
            courseid: courseid,
            userid: userid,
            options: []
        }, presets);
    };
     /**
     * Get cache key for section WS call.
     *
     * @param  {Number} courseid Course ID.
     * @return {String}          Cache key.
     */
    function getSectionsCacheKey(courseid) {
        return 'mmCourse:sections:' + courseid;
    }
    
return self;
});