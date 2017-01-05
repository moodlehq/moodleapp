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
 * Common synchronization blocking service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmSyncBlock
 */
.factory('$mmSyncBlock', function($log, $mmSite) {

    $log = $log.getInstance('$mmSyncBlock');

    var self = {
        blockedItems: {} // Store blocked sync objects.
    };

    /**
     * Check if an object is blocked.
     * One block can have different operations. Here we check how many operations are being blocking the object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSyncBlock#isBlocked
     * @param  {String} component   Component name.
     * @param  {Number} id          Unique sync identifier per component.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Boolean}            True if blocked, false otherwise.
     */
    self.isBlocked = function(component, id, siteId) {
        siteId = siteId || $mmSite.getId();
        var uniqueId = getUniqueSyncBlockId(component, id);
        if (!self.blockedItems[siteId]) {
            return false;
        }
        if (!self.blockedItems[siteId][uniqueId]) {
            return false;
        }

        return Object.keys(self.blockedItems[siteId][uniqueId]).length > 0;
    };

    /**
     * Add a block to an object so it cannot be synced.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSyncBlock#blockOperation
     * @param  {String} component   Component name.
     * @param  {Number} id          Unique sync identifier per component.
     * @param  {String} [operation] Operation name. If not defined, a default text is used.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     */
    self.blockOperation = function(component, id, operation, siteId) {
        siteId = siteId || $mmSite.getId();
        var uniqueId = getUniqueSyncBlockId(component, id);

        if (!self.blockedItems[siteId]) {
            self.blockedItems[siteId] = {};
        }

        if (!self.blockedItems[siteId][uniqueId]) {
            self.blockedItems[siteId][uniqueId] = {};
        }

        operation = operation || '-';

        self.blockedItems[siteId][uniqueId][operation] = true;
    };

    /**
     * Release a block to an object. If there aren't more operations blocking it can be synced.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSyncBlock#unblockOperation
     * @param  {String} component   Component name.
     * @param  {Number} id          Unique sync identifier per component.
     * @param  {String} [operation] Operation name. If not defined, a default text is used.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     */
    self.unblockOperation = function(component, id, operation, siteId) {
        siteId = siteId || $mmSite.getId();
        var uniqueId = getUniqueSyncBlockId(component, id);

        if (self.blockedItems[siteId]) {
            if (self.blockedItems[siteId][uniqueId]) {
                operation = operation || '-';
                delete self.blockedItems[siteId][uniqueId][operation];
            }
        }
    };

    /**
     * Clear blocked objects for all operations for a uniqueid.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSyncBlock#clearBlock
     * @param  {String} component   Component name.
     * @param  {Number} id          Unique sync identifier per component.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     */
    self.clearBlock = function(component, id, iteId) {
        siteId = siteId || $mmSite.getId();
        var uniqueId = getUniqueSyncBlockId(component, id);

        if (self.blockedItems[siteId]) {
            delete self.blockedItems[siteId][uniqueId];
        }
    };

    /**
     * Clear blocked objects.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSyncBlock#clearAllBlocks
     * @param   {String} [siteId]     If set, clear the blocked objects only for this site. Otherwise clear all objects.
     */
    self.clearAllBlocks = function(siteId) {
        if (siteId) {
            delete self.blockedItems[siteId];
        } else {
            self.blockedItems = {};
        }
    };

    // Convenience function to create unique identifiers from component and current id.
    function getUniqueSyncBlockId(component, id) {
        return component + '#' + id;
    }

    return self;
})

.run(function($mmSyncBlock, $mmEvents, mmCoreEventLogout) {
    // Unblock all blocks on logout.
    $mmEvents.on(mmCoreEventLogout, function(siteId) {
        $mmSyncBlock.clearAllBlocks(siteId);
    });
});