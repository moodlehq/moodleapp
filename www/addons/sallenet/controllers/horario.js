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
 * @name mmaSallenetHorarioCtrl
 */
.controller('mmaSallenetHorarioCtrl', function($scope, $stateParams, $mmApp, $mmaSallenet, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
	$scope.loaded = false;
	var id = $stateParams.id;
	var id_moodle = $stateParams.id_moodle;
	var nombre = $stateParams.nombre;
	var id_clase = $stateParams.id_clase;
	$scope.profesor = $stateParams.profesor;
	$scope.alumno = $stateParams.alumno;
	$scope.title = "Horario";
	
	function consigueEventos( ){
		return $mmaSallenet.getEventosUsuario(id_moodle).then( function(evs){
			var array = [];
			var d = new Date();
			angular.forEach( evs.eventos , function(v){
				if ( id_clase > 0 && id_clase != v.id_clase ){
					// No se hace nada
				}else{
					v.ahora = Math.floor(d.getTime()/1000);
					array.push(v);
				}
			});
			$scope.eventos = array;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.setInformacionEventos = function( id_evento , tipo , texto ){
		if ( !texto ) texto = "";
		var texto = prompt('mma.sallenet.introducetexto',texto.trim());
		if ( !$mmApp.isOnline() ){
			// Por si acaso se ha colado algo
			return;
		} else if ( !texto || !texto.trim() ){
			// Esto también es por si se colado este mensaje o si el fulano solo pone espacios ;-)
			return;
		}
		// Cambio saltos de linea y esas cosas a br
		texto = texto.replace(/(?:\r\n|\r|\n)/g, '<br />');
		
		$mmaSallenet.setEventoInformacion( texto , tipo , id_evento ).then(
			function(){
				for ( var i = 0 ; i < $scope.eventos.length ; i++ ){
					if ( !$scope.eventos[i] ) break;
					if ( $scope.eventos[i]["id"] == id_evento ){
						if ( tipo == 1 ) {
							$scope.eventos[i]["tarea"] = texto;
						}else if ( tipo == 0 ){
							$scope.eventos[i]["planificacion"] = texto;
						}else if ( tipo == 2 ){
							$scope.eventos[i]["notas"] = texto;
						}
					}
				}
			},function(error){
				$mmApp.closeKeyboard();

	            if (typeof error === 'string') {
	                $mmUtil.showErrorModal(error);
	            } else {
	                $mmUtil.showErrorModal('mma.messages.messagenotsent', true);
	            }
			}
		);
		
		
		
	};
	$scope.refreshEventos = function( ){
		$mmaSallenet.invalidarCacheEventos(id_moodle).then( function(){
			return consigueEventos(id_moodle);
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	consigueEventos(id_moodle).finally(function(){
		$scope.loaded = true;
		$rootScope.$broadcast(mmCoreSplitViewLoad);
	});
});
