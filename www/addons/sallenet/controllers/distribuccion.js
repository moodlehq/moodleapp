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
 * @name mmaSallenetDistribucionClaseCtrl
 */
.controller('mmaSallenetDistribucionClaseCtrl', function($scope, $stateParams, $mmApp, $mmaSallenet, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
	$scope.loaded = false;
	var id_clase = $stateParams.id_clase;
	var nombre = $stateParams.nombre;
	$scope.title = "Distribución de la clase "+nombre;
	$scope.seleccionados = [];
	$scope.sel = false;
	$scope.ancho = window.screen.width - 20;
	$scope.alto = window.screen.height;
	$scope.ancho_foto = 100;
	$scope.alto_min = 0;
	
	var id_evento = $scope.id_evento = $stateParams.id_evento;
//	alert( "Ventana: '"+$window.screen.width+"'-'"+$window.screen.height+"'" );
	function consigueDistribuccionClase(id_clase,id_evento){
		return $mmaSallenet.getDistribucionClase(id_clase,id_evento).then( function(salida){
			$scope.ancho = window.screen.width - 20;
			$scope.alto = window.screen.height;
			$scope.proporcion = $scope.ancho / ( salida.pos_max - salida.pos_min );
			if ( $scope.proporcion > 1 ) $scope.proporcion = 1;
			$scope.ancho_foto = 100 * $scope.proporcion;
			$scope.retroceso = salida.pos_min;
			$scope.alto_min = salida.top_min;
			var pupitres = [];
			var alumnos = [];
			var items_actitud = [];
			var items_asistencia = [];
			angular.forEach( salida.pupitre , function(v){
				angular.forEach( v.alumnos , function(vv){
					$scope.seleccionados[vv.id] = false;
				} );
				pupitres.push(v);
			});
			angular.forEach( salida.alumnos , function(v){
				alumnos.push(v);
				$scope.seleccionados[v.id] = false;
			});
			$scope.pupitres = pupitres;
			$scope.alumnos = alumnos;
			
			angular.forEach( salida.actitud , function(v){
				items_actitud.push(v);
			} );
			angular.forEach( salida.asistencia , function(v){
				items_asistencia.push(v);
			} );
			$scope.items_actitud = items_actitud;
			$scope.items_asistencia = items_asistencia;
			
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.seleccionar = function(id_alumno){
		$scope.seleccionados[id_alumno] = !$scope.seleccionados[id_alumno];
		$scope.sel = !$scope.sel;
	};
	$scope.refreshDistribucion = function( ){
		$mmaSallenet.invalidarCacheDistribucionClase(id_clase).then( function(){
			return consigueDistribuccionClase(id_clase,id_evento);
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	
	// Comprobar que la aplicación esta onLine
	$scope.isAppOnLine = function(){
		return $mmApp.isOnline();
	}
	
	// Establece incidencia
	$scope.setIncidencia = function(id_evento,id_item,tipo,texto, texto_inc ){
		if ( !$mmApp.isOnline() ){
			// Por si acaso se ha colado algo
			return;
		} else if ( !( tipo == 2 || tipo == 1 ) ){
			// Tiene que ser uno de los dos tipos
			return;
		}
		var alumnos = [];
		var entrado = false;
		for ( id_alumno in $scope.seleccionados ){
			if ( $scope.seleccionados[id_alumno] ){
				alumnos.push({userid: id_alumno});
				entrado = true;
			}
		}
		texto = "";
		if ( entrado ) $mmaSallenet.setIncidencia( alumnos , id_evento , id_clase , id_item , tipo , $mmSite.getUserId() , texto ).then(
			function (){
				
				// Si es correcto tendré que poner en algún sitio algo
				for ( id_alumno in $scope.seleccionados ){
					if ( $scope.seleccionados[id_alumno] ){
						for ( var i = 0 ; i < $scope.alumnos.length ; i++ ){
							if ( !$scope.alumnos[i] ) break;
							if ( $scope.alumnos[i]["id"] == id_alumno ){
								$scope.alumnos[i]["incidencia"] = texto_inc;
							}
							
						}
						for ( var i = 0 ; i < $scope.pupitres.length ; i++ ){
							if ( !$scope.pupitres[i] ) break;
							for ( var j = 0 ; j < $scope.pupitres[i]["alumnos"].length ; j++ ){
								if ( $scope.pupitres[i]["alumnos"][j]["id"] == id_alumno ){
									$scope.pupitres[i]["alumnos"][j]["incidencia"] = texto_inc;
								}
							}
						}
					}
				}
			} ,
			function (error){
				$mmApp.closeKeyboard();

	            if (typeof error === 'string') {
	                $mmUtil.showErrorModal(error);
	            } else {
	                $mmUtil.showErrorModal('mma.messages.messagenotsent', true);
	            }
			}
		);
	};
	
//	$mmaSallenet.invalidarCacheDistribucionClase(id_clase).then(function(){
		consigueDistribuccionClase(id_clase,id_evento).finally(function(){
			$scope.loaded = true;
			$rootScope.$broadcast(mmCoreSplitViewLoad);
		});
//	});
});
