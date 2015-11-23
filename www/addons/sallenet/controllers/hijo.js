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

angular.module('mm.addons.sallenet')

.controller('mmaSallenetHijoController', function($scope, $stateParams, $mmApp, $mmaSallenet, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
	$scope.loaded = false;
	var id_hijo = $stateParams.id_hijo;
	var id_moodle = $stateParams.id_moodle;
	var nombre = $stateParams.nombre;
	$scope.title = ""+nombre;
	function consigueHijos( ){
		return $mmaSallenet.getTipoUsuario().then( function(salida){
			var array = [];
			angular.forEach( salida.hijos , function(v){
				if ( v.id == id_hijo){
					array.push(v);
				}
			});
			$scope.hijos = array;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.refreshHijos = function( ){
		$mmaSallenet.invalidarCacheTipoUsuario( ).then( function(){
			return consigueHijos( );
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	consigueHijos().finally(function(){
		$scope.loaded = true;
//		$rootScope.$broadcast(mmCoreSplitViewLoad);
	});
});
