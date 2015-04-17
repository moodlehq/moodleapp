angular.module('mm.core')

.filter('mmNoTags', function() {
    return function(text) {
        return String(text).replace(/(<([^>]+)>)/ig, '');
    }
});