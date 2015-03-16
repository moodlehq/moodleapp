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
 * Factory to provide some global functionalities, like access to the global app database.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmApp
 */
.factory('$mmApp', function($q, $log) {

    /** Define the app storage schema. */
    var app_schema = {
        autoSchema: true,
        stores: [
            {
                name: 'settings',
                keyPath: 'name'
            },
            {
                name: 'sites',
                keyPath: 'id'
            },
            {
                name: 'cache',
                keyPath: 'id',
                indexes: [
                    {
                        name: 'type'
                    }
                ]
            },
            {
                name: 'services',
                keyPath: 'id'
            }
        ]
    };

    var db = mmDB.getDB('MoodleMobile', app_schema),
        self = {};

    /**
     * Get the application global database.
     * @return {Object} App's DB.
     */
    self.getDB = function() {
        return db;
    };

    return self;

});
