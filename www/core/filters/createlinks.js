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

angular.module('mm.core')

/**
 * Filter to search URLs that are not inside <a> tags and add the corresponding <a> tags.
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmCreateLinks
 */
.filter('mmCreateLinks', function() {
    var replacePattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])(?![^<]*>|[^<>]*<\/)/gim;
    return function(text) {
        return text.replace(replacePattern, '<a href="$1">$1</a>');
    };

});