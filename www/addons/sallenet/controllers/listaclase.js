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

/**
 * Agenda controller.
 *
 * @module mm.addons.sallenet
 * @ngdoc controller
 * @name mmaSallenetClasesCtrl
 */
.controller('mmaSallenetListaClaseCtrl', function($scope, $stateParams, $mmApp, $mmaSallenet, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
	
	$scope.loaded = false;
	var id_clase = $stateParams.id_clase;
	var nombre = $stateParams.nombre;
	$scope.title = "Lista de clase '"+nombre+"' ("+id_clase+")";
	function consigueListaClase(id_clase){
		return $mmaSallenet.getAlumnosClase(id_clase).then( function(salida){
			var array = [];
			var i = 1;
			angular.forEach( salida.alumnos , function(v){
				v.num = i++;
				array.push(v);
			});
			$scope.alumnos = array;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.refreshListaClase = function( ){
		$mmaSallenet.invalidarCacheAlumnosClase(id_clase).then( function(){
			return consigueClases(id_clase);
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	consigueListaClase(id_clase).finally(function(){
		$scope.loaded = true;
		$rootScope.$broadcast(mmCoreSplitViewLoad);
	});
});
