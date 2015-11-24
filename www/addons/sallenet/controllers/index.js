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

.controller('mmaSallenetIndexController', function($scope, $mmaSallenet, $mmSite, $mmUtil, $mmApp, $state) {
	$scope.loaded = false;
	function consigueHijos( ){
		return $mmaSallenet.getTipoUsuario().then( function(salida){
			var hijos = [];
			$scope.ispadre = salida.padre;
			$scope.isprofesor = salida.profesor;
			$scope.isalumno = salida.alumno;
			$scope.id = salida.id;
			$scope.id_moodle = $mmSite.getUserId();
			$scope.nombre = salida.nombre;
			angular.forEach( salida.hijos , function(v){
				hijos.push(v);
			});
			$scope.hijos = hijos;
			var clases = [];
			angular.forEach( salida.clases , function(v){
				clases.push(v);
			});
			$scope.clases = clases;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.refreshSallenet = function( ){
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
