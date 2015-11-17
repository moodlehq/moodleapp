angular.module('mm.addons.morph')

.constant('mmaMorphWalkthroughStore', 'morph_walkthrough_store')
.config(function($mmAppProvider, mmaMorphWalkthroughStore) {
    var stores = [
        {
            name: mmaMorphWalkthroughStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})
.factory('$mmaWalkthrough', function($mmApp,mmaMorphWalkthroughStore) {
    'use strict';
     var self = {};
    self.walkthroughViewed = function(walkthroughid) {
        $mmApp.getDB().insert(mmaMorphWalkthroughStore, {
            id : walkthroughid
        });
    };
    self.isWalkthoughViewed=function(walkthroughid){
        return $mmApp.getDB().get(mmaMorphWalkthroughStore, walkthroughid).then(function(walkthrough) {
                if (typeof walkthrough === 'undefined'){
                    var walkthroughObj={id:walkthroughid,passed:false,active:false}; 
                  }else{
                    var walkthroughObj={id:walkthroughid,passed:true,active:false}; 
                   }
                return walkthroughObj;
                 
            },function(){
                 var walkthroughObj={id:walkthroughid,passed:false,active:false};
                return walkthroughObj;
           
        });
    };
    
    return self;
});