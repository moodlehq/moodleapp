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
.controller('mmaSallenetClasesCtrl', function($q, $state, $scope, $mmUtil, $mmaSallenet, $rootScope, $mmEvents,mmCoreSplitViewLoad) {
	$scope.loaded = false;
	function consigueClases( ){
		return $mmaSallenet.getTipoUsuario().then( function(salida){
			var array = [];
			angular.forEach( salida.clases , function(v){
				array.push(v);
			});
			$scope.clases = array;
			$scope.userid = salida.id_usuario;
			$scope.id_moodle = salida.id_moodle;
			$scope.profesor = salida.profesor;
			$scope.nombre = salida.fullname;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.refreshClases = function( ){
		$mmaSallenet.invalidarCacheTipoUsuario( ).then( function(){
			return consigueClases( );
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	consigueClases().finally(function(){
		$scope.loaded = true;
		$rootScope.$broadcast(mmCoreSplitViewLoad);
	});
});
