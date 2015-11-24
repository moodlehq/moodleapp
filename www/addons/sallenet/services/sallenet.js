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

.config(function($mmAppProvider) {
    var stores = [
        {
        	name: 'sallenet',
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

.factory('$mmaSallenet', function($mmSite, $mmUtil, $mmFS, $mmWS, $q, $timeout, $log, $mmSitesManager, $mmApp, $ionicPlatform, $mmText, $mmCourse , $mmCourses, $translate, md5) {

    $log = $log.getInstance('$mmaSallenet');

    var self = {},
        defaultParams = {
            "contextid": 0,
            "component": "",
            "filearea": "",
            "itemid": 0,
            "filepath": "",
            "filename": ""
        };

    /**
     * Check if core_sallenet_get_sallenet WS call is available.
     *
     * @module mm.addons.sallenet
     * @ngdoc method
     * @name $mmaSallenet#canAccessSallenet
     * @return {Boolean} True if WS is available, false otherwise.
     */
    self.canAccessSallenet = function() {
        return $mmSite.wsAvailable('sallenetapp_getTipoUsuario');
    };
    
    self.isPluginEnabled = function(){
    	return true;
    	if (!$mmSite.isLoggedIn()) {
    		return false;
    	}else if ( !$mmSite.wsAvailable('sallenetapp_getTipoUsuario') ){
    		return false;
    	}
    	return true;
    };
    
    self.getLunes = function(fecha){
    	var d = new Date( fecha );
    	var dia_semana = d.getDay( );
    	d.setDate( d.getDate( ) - d.getDay( ) + 1 );
    	d.setMinutes(0);
    	d.setSeconds(0);
    	d.setHours(0);
    	d.setMilliseconds(0);
    	return Math.floor( d.getTime( ) / 1000 );
    };
    
    // Get Eventos u Horario
    
    self._getCacheKeyForEventos = function(userId,fecha){
    	return "mmaSallenet:Eventos-"+userId+"-"+fecha;
    };
    self.invalidarCacheEventos = function(userId){
    	var d = new Date();
    	var lunes = self.getLunes( d.getTime() );
    	return $mmSite.invalidateWsCacheForKey( self._getCacheKeyForEventos( userId , lunes ) );
    };
    self._geteventosusuario = function(params,presets){
    	return $mmSite.read('sallenetapp_getEventosUsuario',params,presets );
    };
    
    self.getEventosUsuario = function(userId){
    	var d = new Date();
    	var lunes = self.getLunes( d.getTime() );
    	var presets = {
    			cacheKey: self._getCacheKeyForEventos( $mmSite.getUserId() , lunes )	
    		},
        	params = {
    			userid: userId,
    			fecha: lunes
    		};
    	return self._geteventosusuario(params,presets);
    };
    
    // Get Incidencias de un usuario
    
    self._getCacheKeyForIncidencias = function(userId){
    	return "mmaSallenet:Incidencias-"+userId;
    };
    self.invalidarCacheIncidencias = function(userId){
    	var d = new Date();
    	return $mmSite.invalidateWsCacheForKey( self._getCacheKeyForIncidencias( userId ) );
    };
    self._getincidenciasusuario = function(params,presets){
    	return $mmSite.read('sallenetapp_getIncidenciasUsuario',params,presets );
    };
    
    self.getIncidenciasUsuario = function(userId,numero,desde){
    	var d = new Date();
    	var presets = {
    			cacheKey: self._getCacheKeyForIncidencias( userId )	
    		},
        	params = {
    			userid: userId,
    			numero: numero,
    			desde: desde
    		};
    	return self._getincidenciasusuario(params,presets);
    };
    
    // Get el tipo de usuario

    self._getCacheKeyForUsuario = function(userId){ 
    	return "mmaSallenet:Usuario-"+userId;
    };
    self.invalidarCacheTipoUsuario = function(){
    	var userId = $mmSite.getUserId( );
    	return $mmSite.invalidateWsCacheForKey( self._getCacheKeyForUsuario( userId ) );
    };
    self._gettipousuario = function(params,presets){
    	return $mmSite.read('sallenetapp_getTipoUsuario',params,presets);
    };
    self.getTipoUsuario = function(){
    	var presets = {
    		cacheKey: self._getCacheKeyForUsuario( $mmSite.getUserId() )
    	},params = {
    		userid: $mmSite.getUserId()
    	};
    	return self._gettipousuario(params,presets);
    };
    
    // Distribución de la clase
    self.invalidarCacheDistribucionClase = function( id_clase ){
    	var userId = $mmSite.getUserId( );
    	return $mmSite.invalidateWsCacheForKey( self._getCacheKeyForDistribucionClase( userId , id_clase ) );
    };
    self._getCacheKeyForDistribucionClase = function(userId,id_clase){
    	return "mmaSallenet:Distribucion-"+userId+"-"+id_clase;
    };
    self._getdistribucionclase = function(params,presets){
    	return $mmSite.read('sallenetapp_getDistribucionClase',params,presets);
    };
    self.getDistribucionClase = function(id_clase,id_evento){
    	var userId = $mmSite.getUserId( );
    	var presets = {
    		cacheKey: self._getCacheKeyForDistribucionClase(userId,id_clase)
    	},params = {
    		userid: userId,
    		id_clase: id_clase,
    		id_evento: id_evento
    	};
    	return self._getdistribucionclase(params,presets);
    };
    
    // Consigue los alumnos de una clase
    self.invalidarCacheAlumnosClase = function( id_clase ){
    	return $mmSite.invalidateWsCacheForKey( self._getCacheKeyForAlumnosClase( id_clase ) );
    };
    self._getCacheKeyForAlumnosClase = function(id_clase){
    	return "mmaSallenet:Distribucion-"+id_clase;
    };
    self._getalumnosclase = function(params,presets){
    	return $mmSite.read('sallenetapp_getAlumnosClase',params,presets);
    };
    self.getAlumnosClase = function(id_clase){
    	var presets = {
    		cacheKey: self._getCacheKeyForAlumnosClase(id_clase)
    	},params = {
    		id_clase: id_clase
    	};
    	return self._getalumnosclase(params,presets);
    };
    
    // Envio de justificaciones
    self.EnviaJustificacion = function(id,id_hijo, texto) {
        return $mmSite.write('sallenetapp_setJustificacion', {
            userid: $mmSite.getUserId(),
            texto: texto,
            id: id
        }).then(function(response) {
            if (response && response[0] && response[0].msgid === -1) {
                // There was an error, and it should be translated already.
                return $q.reject(response[0].errormessage);
            }
            return self.invalidarCacheIncidencias(id_hijo);
        });
    };
    
    // Establece una incidencia
    self.setIncidencia = function( alumnos , id_evento , id_clase , id_item , tipo , id_profesor , texto ){
    	return $mmSite.write('sallenetapp_setIncidencia',{id_evento:id_evento,id_item:id_item,tipo:tipo,alumnos:alumnos,id_clase:id_clase,id_profesor:id_profesor,texto:texto}).then(function(response){
    		if (response && response[0] && response[0].msgid === -1) {
                // There was an error, and it should be translated already.
                return $q.reject(response[0].errormessage);
            }
            return self.invalidarCacheDistribucionClase(id_clase);
    	});
    }
    
    // Establece inforamción para un evento
    self.setEventoInformacion = function(texto,tipo,id_evento) {
        return $mmSite.write('sallenetapp_setEventoInformacion', {
            userid: $mmSite.getUserId(),
            texto: texto,
            id_evento: id_evento,
            tipo: tipo
        }).then(function(response) {
            if (response && response[0] && response[0].msgid === -1) {
                // There was an error, and it should be translated already.
                return $q.reject(response[0].errormessage);
            }
            return 1;
        });
    };
    
    // **************************************************
    // ESTO ES UNA COPIA DE LOS GRADES DEL ADDON GRADES
    // **************************************************
    self.getGradesTable = function(courseid, userid, refresh) {

        $log.debug('Get grades for course ' + courseid + ' and user ' + userid);

        var data = {
                courseid : courseid,
                userid   : userid
            },
            presets = {};
        if (refresh) {
            presets.getFromCache = false;
        }

        return $mmSite.read('sallenetapp_get_notas_alumno', data, presets).then(function(table) {
            table = formatGradesTable(table, !$ionicPlatform.isTablet());
            return translateGradesTable(table);
        });
    };
    
    function formatGradesTable(table, showSimple) {
        var formatted = {
            columns: [],
            rows: []
        };

        if (!table || !table.tables) {
            return formatted;
        }

        // Columns, by order.
        var columns = [ "itemname", "weight", "grade", "range", "percentage", "lettergrade", "rank",
                        "average", "feedback", "contributiontocoursetotal"];
        var returnedColumns = [];

        var tabledata = [];
        var maxDepth = 0;
        // Check columns returned (maybe some of the above).
        if (table.tables && table.tables[0] && table.tables[0]['tabledata']) {
            tabledata = table.tables[0]['tabledata'];
            maxDepth = table.tables[0]['maxdepth'];
            for (var el in tabledata) {
                // This is a typical row.
                if (!angular.isArray(tabledata[el]) && typeof(tabledata[el]["leader"]) === "undefined") {
                    for (var col in tabledata[el]) {
                        returnedColumns.push(col);
                    }
                    break;
                }
            }
        }

        if (returnedColumns.length > 0) {

            // Reduce the returned columns for phone version.
            if (showSimple) {
                returnedColumns = ["itemname", "grade"];
            }

            for (var el in columns) {
                var colName = columns[el];
                if (returnedColumns.indexOf(colName) > -1) {
                    var width = colName == "itemname" ? maxDepth : 1;
                    var column = {
                        id: colName,
                        name: colName,
                        width: width
                    };
                    formatted.columns.push(column);
                }
            }

            var name, rowspan, tclass, colspan, content, celltype, id, headers,j, img, colspanVal;

            var len = tabledata.length;
            for (var i = 0; i < len; i++) {
                var row = '';
                if (typeof(tabledata[i]['leader']) != "undefined") {
                    rowspan = tabledata[i]['leader']['rowspan'];
                    tclass = tabledata[i]['leader']['class'];
                    row += '<td class="' + tclass + '" rowspan="' + rowspan + '"></td>';
                }
                for (el in returnedColumns) {
                    name = returnedColumns[el];

                    if (typeof(tabledata[i][name]) != "undefined") {
                        tclass = (typeof(tabledata[i][name]['class']) != "undefined")? tabledata[i][name]['class'] : '';
                        colspan = (typeof(tabledata[i][name]['colspan']) != "undefined")? "colspan='"+tabledata[i][name]['colspan']+"'" : '';
                        content = (typeof(tabledata[i][name]['content']) != "undefined")? tabledata[i][name]['content'] : null;
                        celltype = (typeof(tabledata[i][name]['celltype']) != "undefined")? tabledata[i][name]['celltype'] : 'td';
                        id = (typeof(tabledata[i][name]['id']) != "undefined")? "id='" + tabledata[i][name]['id'] +"'" : '';
                        headers = (typeof(tabledata[i][name]['headers']) != "undefined")? "headers='" + tabledata[i][name]['headers'] + "'" : '';

                        if (typeof(content) != "undefined") {
                            img = getImgHTML(content);
                            content = content.replace(/<\/span>/gi, "\n");
                            content = $mmText.cleanTags(content);
                            content = content.replace("\n", "<br />");
                            content = img + " " + content;

                            row += "<" + celltype + " " + id + " " + headers + " " + "class='"+ tclass +"' " + colspan +">";
                            row += content;
                            row += "</" + celltype + ">";
                        }
                    }
                }
                formatted.rows.push(row);
            }
        }

        return formatted;
    };
    
    function translateGradesTable(table) {
        var columns = angular.copy(table.columns),
        promises = [];

    columns.forEach(function(column) {
        var promise = $translate('mma.grades.'+column.name).then(function(translated) {
            column.name = translated;
        });
        promises.push(promise);
    });

    return $q.all(promises).then(function() {
        return {
            columns: columns,
            rows: table.rows
        };
    });
};

	function getImgHTML(text) {
	    var img = '';
	
	    if (text.indexOf("/agg_mean") > -1) {
	        img = '<img src="addons/grades/img/agg_mean.png" width="16">';
	    } else if (text.indexOf("/agg_sum") > -1) {
	        img = '<img src="addons/grades/img/agg_sum.png" width="16">';
	    } else if (text.indexOf("/outcomes") > -1) {
	        img = '<img src="addons/grades/img/outcomes.png" width="16">';
	    } else if (text.indexOf("i/folder") > -1) {
	        img = '<img src="addons/grades/img/folder.png" width="16">';
	    } else if (text.indexOf("/manual_item") > -1) {
	        img = '<img src="addons/grades/img/manual_item.png" width="16">';
	    } else if (text.indexOf("/mod/") > -1) {
	        var module = text.match(/mod\/([^\/]*)\//);
	        if (typeof module[1] != "undefined") {
	            var moduleSrc = $mmCourse.getModuleIconSrc(module[1]);
	            img = '<img src="' + moduleSrc + '" width="16">';
	        }
	    }
	    if (img) {
	        img = '<span class="app-ico">' + img + '</span>';
	    }
	    return img;
	};
    
    return self;
});
