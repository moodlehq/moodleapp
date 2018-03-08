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

angular.module('mm.addons.remotestyles', [])

.constant('mmaRemoteStylesComponent', 'mmaRemoteStyles')

.config(function($mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {
    // Addons shouldn't use a priority higher than mmInitDelegateMaxAddonPriority, but this is a special case
    // because it needs to be done before the mmLogin process.
    $mmInitDelegateProvider.registerProcess('mmaRemoteStylesCurrent',
                '$mmaRemoteStyles._preloadCurrentSite', mmInitDelegateMaxAddonPriority + 250, true);
    $mmInitDelegateProvider.registerProcess('mmaRemoteStylesPreload', '$mmaRemoteStyles._preloadSites');
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventLogout, mmCoreEventSiteAdded, mmCoreEventSiteUpdated, $mmaRemoteStyles,
            $mmSite, mmCoreEventSiteDeleted, mmCoreLoginSiteCheckedEvent, mmCoreLoginSiteUncheckedEvent) {
    var addingSite,
        unloadTmpStyles;

    $mmEvents.on(mmCoreEventSiteAdded, function(siteId) {
        addingSite = siteId;

        $mmaRemoteStyles.addSite(siteId).finally(function() {
            if (addingSite == siteId) {
                addingSite = false;
            }

            if (unloadTmpStyles == siteId) {
                // This site had some tmp styles loaded, unload them.
                $mmaRemoteStyles.unloadTmpStyles();
            }
        });
    });
    $mmEvents.on(mmCoreEventSiteUpdated, function(siteId) {
        // Load only if current site was updated.
        if (siteId === $mmSite.getId()) {
            $mmaRemoteStyles.load(siteId);
        }
    });

    // Enable styles of current site on login.
    $mmEvents.on(mmCoreEventLogin, $mmaRemoteStyles.enable);

    // Disable added styles on logout.
    $mmEvents.on(mmCoreEventLogout, $mmaRemoteStyles.clear);

    // Remove site styles on logout.
    $mmEvents.on(mmCoreEventSiteDeleted, function(site) {
        $mmaRemoteStyles.removeSite(site.id);
    });

    // Load temporary styles when site config is checked in login.
    $mmEvents.on(mmCoreLoginSiteCheckedEvent, function(data) {
        $mmaRemoteStyles.loadTmpStyles(data.config.mobilecssurl);
    });

    // Unload temporary styles when site config is "unchecked" in login.
    $mmEvents.on(mmCoreLoginSiteUncheckedEvent, function(data) {
        if (data.siteid && data.siteid == addingSite) {
            // The tmp styles are from a site that is being added. Wait for the site styles to be loaded before removing
            // the tmp styles so there is no blink effect.
            unloadTmpStyles = data.siteid;
        } else {
            $mmaRemoteStyles.unloadTmpStyles();
        }
    });
});
