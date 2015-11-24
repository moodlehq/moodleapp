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
 * @name mmaSallenetIncidenciasCtrl
 */
.controller('mmaSallenetIncidenciasCtrl', function($scope, $stateParams, $mmApp, $mmaSallenet, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
	$scope.loaded = false;
	var id_hijo = $stateParams.id_hijo;
	var id_moodle = $stateParams.id_moodle;
	var nombre = $stateParams.nombre;
	var numero = 10,desde=0;
	
	var todas_incidencias = [];
	
	$scope.title = "Incidencias de "+nombre;
	function consigueIncidencias(id_moodle,numero,desde){
		return $mmaSallenet.getIncidenciasUsuario(id_moodle,numero,desde).then( function(evs){
			var array = [];
			todas_incidencias = evs.incidencias;
			var d = new Date();
			angular.forEach( todas_incidencias , function(v){
				v.ahora = Math.floor(d.getTime()/1000);
				array.push(v);
			});
			$scope.incidencias = array;
		},function(error){
			if ( typeof error === 'string' ){
				 $mmUtil.showErrorModal(error);
			}else{
				$mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
			}
		});
	}
	$scope.refreshIncidencias = function( ){
		$mmaSallenet.invalidarCacheIncidencias(id_moodle).then( function(){
			return consigueIncidencias(id_moodle,numero,desde);
		}).finally(function(){
			$scope.$broadcast('scroll.refreshComplete');
		});
	};
	// Comprobar que la aplicación esta onLine
	$scope.isAppOnLine = function(){
		return $mmApp.isOnline();
	}
	// Mensaje de justificacion
	$scope.justifica = function(id_inc,texto){
		var justificacion;
		if ( !$mmApp.isOnline() ){
			// Por si acaso se ha colado algo
			return;
		} else if ( !texto.trim() ){
			// Esto también es por si se colado este mensaje o si el fulano solo pone espacios ;-)
			return;
		}
		
		// Cambio saltos de linea y esas cosas a br
		texto = texto.replace(/(?:\r\n|\r|\n)/g, '<br />');
		
		$mmaSallenet.EnviaJustificacion( id_inc , id_moodle , texto ).then(
			function(){
				var array = [];
				var d = new Date();
				angular.forEach( todas_incidencias , function(v){
					v.ahora = Math.floor(d.getTime()/1000);
					if ( v.id_asis == id_inc ){
						v.justificacion = texto;
					}
//					v.justificacion = "v.id_asis='"+v.id_asis+"'; id_inc='"+id_inc+"'; texto='"+texto+"'";
					array.push(v);
				});
				$scope.incidencias = array;
				// Todo ha ido bien
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
	
	consigueIncidencias(id_moodle,numero,desde).finally(function(){
		$scope.loaded = true;
		$rootScope.$broadcast(mmCoreSplitViewLoad);
	});
});
