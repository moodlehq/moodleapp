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

angular.module('mm.addons.mod_resource')

/**
 * Helper to gather some common resouce functions.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResourceHelper
 */
.factory('$mmaModResourceHelper', function($mmUtil, $mmaModResource, $mmCourse) {

    var self = {};

    /**
     * Opens a file of the resource activity.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourceHelper#openFile
     * @param  {String} module        Module where to get the contents.
     * @param  {String} courseId      Course Id, used for completion purposes.
     * @return {Promise}              Resolved when done.
     */
    self.openFile = function(module, courseId) {
        var modal = $mmUtil.showModalLoading();

        return $mmaModResource.openFile(module.contents, module.id).then(function() {
            $mmaModResource.logView(module.instance).then(function() {
                $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_resource.errorwhileloadingthecontent', true);
        }).finally(function() {
            modal.dismiss();
        });
    };

    return self;
});