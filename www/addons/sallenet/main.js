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

angular.module('mm.addons.sallenet', ['mm.core'])

.constant('mmaSallenetPriority', 1004)

.config(function($stateProvider, $mmSideMenuDelegateProvider, mmaSallenetPriority) {

    $stateProvider
        .state('site.sallenet', {
            url: '/sallenet',
            views: {
                'site': {
                    controller: 'mmaSallenetIndexController',
                    templateUrl: 'addons/sallenet/templates/index.html'
                }
            }
        })
        
        // COSAS DEL PADRE
        
        .state('site.sallenet-hijo', {
            url: '/sallenet-hijo',
            views: {
                'site': {
                    controller: 'mmaSallenetHijoController',
                    templateUrl: 'addons/sallenet/templates/hijo.html'
                }
            },
            params:{
            	id_hijo: null,
            	id_moodle: null,
            	nombre: null
            }
        })
        .state('site.sallenet-horario',{
        	url: '/sallenet-horario',
        	params: {
        		id: null,
        		id_moodle: null,
        		nombre: null,
        		profesor:false,
        		alumno:false,
        		id_clase:0
        	},
        	views: {
        		'site': {
        			controller: 'mmaSallenetHorarioCtrl',
        			templateUrl: 'addons/sallenet/templates/horario.html'
        		}
        	}
        })
        
        .state('site.sallenet-incidencias',{
        	url: '/sallenet-incidencias',
        	params: {
        		id_hijo: null,
        		id_moodle: null,
        		nombre: null
        	},
        	views: {
        		'site': {
        			controller: 'mmaSallenetIncidenciasCtrl',
        			templateUrl: 'addons/sallenet/templates/incidencias.html'
        		}
        	}
        })
        
        // Cosas del PROFESOR
        .state('site.sallenet-distribucion',{
        	url: '/sallenet-distribucion',
        	params: {
        		id_clase: null,
        		nombre: null,
        		id_evento: 0
        	},
        	views: {
        		'site': {
        			controller: 'mmaSallenetDistribucionClaseCtrl',
        			templateUrl: 'addons/sallenet/templates/distribucion.html'
        		}
        	}
        })
        
        .state('site.sallenet-clases',{
        	url: '/sallenet-clases',
        	views: {
        		'site': {
        			controller: 'mmaSallenetClasesCtrl',
        			templateUrl: 'addons/sallenet/templates/clases.html'
        		}
        	}
        })
        .state('site.sallenet-listaclase',{
        	url: '/sallenet-listaclase',
        	params: {
        		id_clase: null,
        		nombre: null
        	},
        	views: {
        		'site': {
        			controller: 'mmaSallenetListaClaseCtrl',
        			templateUrl: 'addons/sallenet/templates/listaclase.html'
        		}
        	}
        })
        
         .state('site.sallenet-grades',{
        	url: '/sallenet-grades',
        	params: {
        		course: null,
                userid: null
        	},
        	views: {
        		'site': {
        			controller: 'mmaSallenetGradesCtrl',
        			templateUrl: 'addons/sallenet/templates/grade.html'
        		}
        	}
        })
        ;

    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaSallenet', '$mmaSallenetHandlers.sideMenuNav', mmaSallenetPriority);

})

.run(function($mmaSallenet, $state, $mmSitesManager, $mmUtil, $mmaSallenetHelper, $ionicPlatform, $mmApp) {
});
