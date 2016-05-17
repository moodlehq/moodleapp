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

angular.module('mm.addons.qtype_ddmarker')

/**
 * This is the class for ddmarker question rendering.
 *
 * @module mm.addons.qtype_ddmarker
 * @ngdoc service
 * @name $mmaQtypeDdmarkerRender
 */
.factory('$mmaQtypeDdmarkerRender', function($mmUtil, $timeout) {
    var self = {};

    function question_instance(question, readonly, dropzones) {
        var instance = this;
        this.doc = null;
        this.afterimageloaddone = false;
        this.drops = null;
        this.readonly = readonly;
        this.topnode = null;
        this.dropzones = dropzones;
        this.colours = ['#FFFFFF', '#B0C4DE', '#DCDCDC', '#D8BFD8', '#87CEFA','#DAA520', '#FFD700', '#F0E68C'];
        this.nextcolourindex = 0;
        this.proportion = 1;
        this.shapes = [];
        this.selected = null;

        function GraphicsAPI () {
            this.dropzone = null;
            var NS="http://www.w3.org/2000/svg";

            this.addShape = function(shapeAttribs, coords) {
                var SVGObj= document.createElementNS(NS, shapeAttribs.type);
                var shape = angular.element(SVGObj)
                    .attr('fill', shapeAttribs.color)
                    .attr('fill-opacity', 0.5)
                    .attr('stroke', 'black');
                for (var x in coords) {
                    shape.attr(x, coords[x]);
                }

                this.dropzone.append(shape);
                return shape;
            };

            this.clear = function() {
                var bgimg = instance.doc.bg_img();
                var position = $mmUtil.getElementXY(bgimg, null, 'ddarea');
                var dropzones = instance.doc.top_node().querySelector("div.ddarea div.dropzones");

                dropzones = angular.element(dropzones);
                dropzones.css('left', position[0] + 'px')
                    .css('top', position[1] + 'px')
                    .css('width', bgimg.width + 'px')
                    .css('height', bgimg.height + 'px');

                var markertexts = angular.element(instance.doc.marker_texts());
                markertexts.css('left', position[0] + 'px')
                    .css('top', position[1] + 'px')
                    .css('width', bgimg.width + 'px')
                    .css('height', bgimg.height + 'px');

                if (!this.dropzone) {
                    this.dropzone = document.createElementNS(NS, "svg");
                    this.dropzone = angular.element(this.dropzone);
                    dropzones.append(this.dropzone);
                } else {
                    this.dropzone.empty();
                }
                this.dropzone.css('width', bgimg.width + 'px').css('height', bgimg.height + 'px');

                instance.shapes = [];
            };
        }

        var graphics = new GraphicsAPI();

        this.initializer = function(question) {
            this.doc = this.doc_structure(question.slot);

            // Wait the DOM to be rendered.
            $timeout(function() {
                instance.poll_for_image_load();
            });

            ionic.on('resize', function() {
                instance.redraw_drags_and_drops();
            });
        };

        this.poll_for_image_load = function () {
            if (this.afterimageloaddone) {
                return;
            }
            var bgimg = angular.element(this.doc.bg_img());
            bgimg.on('load', function() {
                bgimg.off('load');

                instance.make_image_dropable();

                $timeout(function() {
                    instance.redraw_drags_and_drops();
                });
                instance.afterimageloaddone = true;
                question.loaded = true;
            });
            $timeout(function() {
                instance.poll_for_image_load();
            }, 500);
        };

        /**
         * Object to encapsulate operations on dd area.
         */
        this.doc_structure = function(slot) {
            var topnode = document.querySelector("#mma-mod_quiz-question-" + slot + ' .mma-qtype-ddmarker-container');
            var dragitemsarea = topnode.querySelector('div.dragitems');
            return {
                top_node : function() {
                    return topnode;
                },
                bg_img : function() {
                    return topnode.querySelector('.dropbackground');
                },
                drag_itemsarea : function() {
                    return dragitemsarea;
                },
                drag_items : function() {
                    return dragitemsarea.querySelectorAll('.dragitem');
                },
                drag_items_for_choice : function(choiceno) {
                    return dragitemsarea.querySelectorAll('span.dragitem.choice' + choiceno);
                },
                drag_item_for_choice : function(choiceno, itemno) {
                    return dragitemsarea.querySelector('span.dragitem.choice' + choiceno +
                                            '.item' + itemno);
                },
                drag_item_being_dragged : function(choiceno) {
                    return dragitemsarea.querySelector('span.dragitem.beingdragged.choice' + choiceno);
                },
                drag_item_home : function (choiceno) {
                    return dragitemsarea.querySelector('span.draghome.choice' + choiceno);
                },
                drag_item_homes : function() {
                    return dragitemsarea.querySelectorAll('span.draghome');
                },
                get_classname_numeric_suffix : function(node, prefix) {
                    node = angular.element(node);

                    var classes = node.attr('class');
                    if (classes !== '') {
                        var classesarr = classes.split(' ');
                        var patt1 = new RegExp('^' + prefix + '([0-9])+$');
                        var patt2 = new RegExp('([0-9])+$');
                        for (var index = 0; index < classesarr.length; index++) {
                            if (patt1.test(classesarr[index])) {
                                var match = patt2.exec(classesarr[index]);
                                return Number(match[0]);
                            }
                        }
                    }
                    return null;
                },
                inputs_for_choices : function () {
                    return topnode.querySelectorAll('input.choices');
                },
                input_for_choice : function (choiceno) {
                    return topnode.querySelector('input.choice' + choiceno);
                },
                marker_texts : function () {
                    return topnode.querySelector('div.markertexts');
                }
            };
        };

        this.restart_colours = function () {
            this.nextcolourindex = 0;
        };

        this.get_next_colour = function () {
            var colour = this.colours[this.nextcolourindex];
            this.nextcolourindex++;
            if (this.nextcolourindex === this.colours.length) {
                this.nextcolourindex = 0;
            }
            return colour;
        };

        this.convert_to_window_xy = function (bgimgxy) {
            var bgimg = this.doc.bg_img();
            var position = $mmUtil.getElementXY(bgimg, null, 'ddarea');

            // Render the position related to the current image dimensions.
            bgimgxy[0] *= this.proportion;
            bgimgxy[1] *= this.proportion;

            // The +1 seems rather odd, but seems to give the best results in
            // the three main browsers at a range of zoom levels.
            return [Number(bgimgxy[0]) + position[0], Number(bgimgxy[1]) + position[1]];
        };

        this.draw_drop_zone = function (dropzoneno, markertext, shape, coords, colour, link) {
            var existingmarkertext;

            var marker_texts = this.doc.marker_texts();
            if (link) {
                existingmarkertext = marker_texts.querySelector('span.markertext' + dropzoneno + ' a');
            } else {
                existingmarkertext = marker_texts.querySelector('span.markertext' + dropzoneno);
            }

            if (existingmarkertext) {
                existingmarkertext = angular.element(existingmarkertext);
                if (markertext !== '') {
                    existingmarkertext.html(markertext);
                } else {
                    existingmarkertext.remove();
                }
            } else if (markertext !== '') {
                var classnames = 'markertext markertext' + dropzoneno;
                marker_texts = angular.element(marker_texts);
                if (link) {
                    marker_texts.append('<span class="' + classnames + '"><a href="#">' + markertext + '</a></span>');
                } else {
                    marker_texts.append('<span class="' + classnames + '">' + markertext + '</span>');
                }
            }
            var drawfunc = 'draw_shape_' + shape;
            if (this[drawfunc] instanceof Function){
                var xyfortext = this[drawfunc](dropzoneno, coords, colour);
                if (xyfortext !== null) {
                    var markerspan = this.doc.top_node().querySelector('div.ddarea div.markertexts span.markertext' + dropzoneno);
                    if (markerspan !== null) {
                        xyfortext[0] = (xyfortext[0] - markerspan.offsetWidth / 2) * this.proportion;
                        xyfortext[1] = (xyfortext[1] - markerspan.offsetHeight / 2) * this.proportion;
                        var markerspanAng = angular.element(markerspan);
                        markerspanAng.css('opacity', '0.6').css('left', xyfortext[0] + 'px').css('top', xyfortext[1] + 'px');
                        var markerspananchor = markerspan.querySelector('a');
                        if (markerspananchor !== null) {
                            markerspananchor = angular.element(markerspananchor);
                            markerspananchor.on('click', function (e) {
                                angular.forEach(instance.shapes, function(elem) {
                                    elem.css('fill-opacity', 0.5);
                                });
                                instance.shapes[dropzoneno].css('fill-opacity', 1);
                                $timeout(function() {
                                    instance.shapes[dropzoneno].css('fill-opacity', 0.5);
                                }, 2000);
                                e.preventDefault();
                                e.stopPropagation();
                            });
                            markerspananchor.attr('tabIndex', 0);
                       }
                   }
               }
            }
        };

        this.draw_shape_circle = function (dropzoneno, coords, colour) {
            var coordsparts = coords.match(/(\d+),(\d+);(\d+)/);
            if (coordsparts && coordsparts.length === 4) {
                coordsparts.shift();
                coordsparts = coordsparts.map(function(i) {
                   return Number(i);
                });
                var circleLimit = [coordsparts[0] - coordsparts[2], coordsparts[1] - coordsparts[2]];
                if (this.coords_in_img(circleLimit)) {
                    this.shapes[dropzoneno] = graphics.addShape({
                        type: 'circle',
                        color: colour
                    }, {
                        cx: coordsparts[0] * instance.proportion,
                        cy: coordsparts[1] * instance.proportion,
                        r: coordsparts[2] * instance.proportion
                    });

                    // Return the center.
                    return [coordsparts[0], coordsparts[1]];
                }
            }
            return null;
        };

        this.draw_shape_rectangle = function (dropzoneno, coords, colour) {
            var coordsparts = coords.match(/(\d+),(\d+);(\d+),(\d+)/);
            if (coordsparts && coordsparts.length === 5) {
                coordsparts.shift();
                coordsparts = coordsparts.map(function(i) {
                   return Number(i);
                });
                var rectLimits = [coordsparts[0] + coordsparts[2], coordsparts[1] + coordsparts[3]];
                if (this.coords_in_img(rectLimits)) {
                    this.shapes[dropzoneno] = graphics.addShape({
                        type: 'rect',
                        color: colour
                    }, {
                        x: coordsparts[0] * instance.proportion,
                        y: coordsparts[1] * instance.proportion,
                        width: coordsparts[2] * instance.proportion,
                        height: coordsparts[3] * instance.proportion
                    });

                    // Return the center.
                    return [coordsparts[0] + coordsparts[2] / 2, coordsparts[1] + coordsparts[3] / 2];
                }
            }
            return null;

        };

        this.draw_shape_polygon = function (dropzoneno, coords, colour) {
            var coordsparts = coords.split(';');
            var points = [];

            var maxxy = [0, 0];
            var bgimg = this.doc.bg_img();
            var minxy = [bgimg.width, bgimg.height];
            for (var i in coordsparts) {
                var parts = coordsparts[i].match(/^(\d+),(\d+)$/);
                if (parts !== null && this.coords_in_img([parts[1], parts[2]])) {
                    parts[1] *= this.proportion;
                    parts[2] *= this.proportion;

                    // Calculate min and max points to find center to show marker on.
                    minxy[0] = Math.min(parts[1], minxy[0]);
                    minxy[1] = Math.min(parts[2], minxy[1]);
                    maxxy[0] = Math.max(parts[1], maxxy[0]);
                    maxxy[1] = Math.max(parts[2], maxxy[1]);
                    points.push(parts[1] + ',' + parts[2]);
                }
            }
            if (points.length > 2) {
                this.shapes[dropzoneno] = graphics.addShape({
                    type: "polygon",
                    color: colour
                }, {
                    points: points.join(' ')
                });
                return [(minxy[0] + maxxy[0]) / 2, (minxy[1] + maxxy[1]) / 2];
            }
            return null;
        };

        this.coords_in_img = function (coords) {
            return (coords[0] * this.proportion <= this.doc.bg_img().width && coords[1] * this.proportion <= this.doc.bg_img().height);
        };

        /** DDMARKER_QUESTION */

        this.clone_new_drag_item = function (draghome, itemno) {
            var marker = draghome.querySelector('span.markertext');
            angular.element(marker).css('opacity', 0.6);
            draghome = angular.element(draghome);
            var drag = draghome.clone(true);
            drag.removeClass('draghome');
            drag.addClass('dragitem');
            drag.addClass('item' + itemno);
            draghome.after(drag);
            if (!this.readonly) {
                this.draggable(drag);
            }
            return drag;
        };

        this.draggable = function (drag) {
            drag.on('click', function(e) {

                // Drop it instead of selecting.
                var dragging = instance.selected;
                if (dragging && !drag.hasClass('unplaced')) {
                    var position = $mmUtil.getElementXY(e.target, null, 'ddarea');
                    var img = instance.doc.bg_img();
                    var imgpos = $mmUtil.getElementXY(img, null, 'ddarea');

                    position[0] = position[0] - imgpos[0] + e.offsetX;
                    position[1] = position[1] - imgpos[1] + e.offsetY;

                    // Ensure the we click on a placed dragitem.
                    if (position[0] <= img.width && position[1] <= img.height) {
                        instance.deselect_drags();
                        instance.drop_drag(dragging, position);
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }

                if (drag.hasClass('beingdragged')) {
                    instance.deselect_drags();
                } else {
                    instance.select_drag(drag);
                }
                e.preventDefault();
                e.stopPropagation();
            });
        };

        this.make_image_dropable = function() {
            if (this.readonly) {
                return;
            }

            var bgimg = angular.element(this.doc.bg_img());
            bgimg.on('click', function(e) {

                var drag = instance.selected;
                if (!drag) {
                    return false;
                }

                var position = [e.offsetX, e.offsetY];

                instance.deselect_drags();
                instance.drop_drag(drag, position);
                e.preventDefault();
                e.stopPropagation();
            });

            var home = angular.element(this.doc.drag_itemsarea());
            home.on('click', function(e) {
                var drag = instance.selected;
                if (!drag) {
                    return false;
                }

                // Not placed yet, deselect.
                if (drag.hasClass('unplaced')) {
                    instance.deselect_drags();
                    return false;
                }

                instance.deselect_drags();
                instance.drop_drag(drag, null);
                e.preventDefault();
                e.stopPropagation();
            });
        };

        this.select_drag = function(drag) {
            this.deselect_drags();

            this.selected = drag;
            drag.addClass('beingdragged');

            var itemno = this.get_itemno_for_node(drag);
            if (itemno !== null) {
                drag.removeClass('item' + itemno);
            }
        };

        this.deselect_drags = function() {
            var drags = this.doc.drag_items();
            angular.element(drags).removeClass('beingdragged');
            this.selected = null;
        };

        this.drop_drag = function(drag, position) {
            var choiceno = this.get_choiceno_for_node(drag);

            if (position) {
                // Set the position related to the natural image dimensions.
                if (this.proportion < 1) {
                    position[0] = Math.round(position[0] / this.proportion);
                }

                if (this.proportion < 1) {
                    position[1] = Math.round(position[1] / this.proportion);
                }
            }

            this.save_all_xy_for_choice(choiceno, drag, position);
            this.redraw_drags_and_drops();
        };

        this.save_all_xy_for_choice = function (choiceno, dropped, position) {
            var coords = [];
            var bgimgxy;

            // Calculate the coords for the choice.
            for (var i = 0; i < this.doc.drag_items_for_choice(choiceno).length; i++) {
                var dragitem = this.doc.drag_item_for_choice(choiceno, i);
                if (dragitem) {
                    var dragitemAng = angular.element(dragitem);
                    dragitemAng.removeClass('item' + i);
                    bgimgxy = this.get_drag_xy(dragitem);
                    dragitemAng.addClass('item' + coords.length);
                    coords.push(bgimgxy);
                }
            }

            if (position !== null){
                dropped.removeClass('unplaced');
                dropped.addClass('item' + coords.length);
                coords.push(position);
            } else {
                dropped.addClass('unplaced');
            }

            if (coords.length > 0) {
                this.set_form_value(choiceno, coords.join(';'));
            } else {
                this.reset_drag_xy(choiceno);
            }
        };

        this.get_drag_xy = function(dragitem) {
            var position = $mmUtil.getElementXY(dragitem, null, 'ddarea');

            var bgimg = this.doc.bg_img();
            var bgimgxy = $mmUtil.getElementXY(bgimg, null, 'ddarea');

            position[0] -= bgimgxy[0];
            position[1] -= bgimgxy[1];

            // Set the position related to the natural image dimensions.
            if (this.proportion < 1) {
                position[0] = Math.round(position[0] / this.proportion);
            }

            if (this.proportion < 1) {
                position[1] = Math.round(position[1] / this.proportion);
            }

            return position;
        };

        this.reset_drag_xy = function (choiceno) {
            this.set_form_value(choiceno, '');
        };

        this.set_form_value = function (choiceno, value) {
            this.doc.input_for_choice(choiceno).setAttribute('value', value);
        };

        // Calculate image proportion to make easy conversions.
        this.calculate_img_proportion = function() {
            var bgimg = this.doc.bg_img();
            // Render the position related to the current image dimensions.
            this.proportion = 1;
            if (bgimg.width != bgimg.naturalWidth) {
                this.proportion = bgimg.width / bgimg.naturalWidth;
            }
        };

        this.redraw_drags_and_drops = function() {
            var drags = this.doc.drag_items();
            angular.element(drags).addClass('unneeded');
            angular.element(drags).addClass('unplaced');

            this.calculate_img_proportion();

            var inputs = this.doc.inputs_for_choices();
            for (var x = 0; x < inputs.length; x++) {
                var input = angular.element(inputs[x]);
                var choiceno = this.get_choiceno_for_node(input);
                var coords = this.get_coords(input);
                var dragitemhome = this.doc.drag_item_home(choiceno);
                var homeposition = this.drag_home_xy(choiceno);
                for (var i = 0; i < coords.length; i++) {
                    var dragitem = this.doc.drag_item_for_choice(choiceno, i);
                    if (dragitem) {
                        dragitem = angular.element(dragitem);
                    }
                    if (!dragitem || dragitem.hasClass('beingdragged')) {
                        dragitem = this.clone_new_drag_item(dragitemhome, i);
                    } else {
                        dragitem.removeClass('unneeded');
                    }

                    // Remove the class only if is placed on the image.
                    if (homeposition[0] != coords[i][0] || homeposition[1] != coords[i][1]) {
                        dragitem.removeClass('unplaced');
                    }
                    dragitem.css('left', coords[i][0] + 'px').css('top', coords[i][1] + 'px');
                }
            }
            for (var y = 0; y < drags.length; y++) {
                var item = angular.element(drags[y]);
                if (item.hasClass('unneeded') && !item.hasClass('beingdragged')) {
                    item.remove(true);
                }
            }

            if (this.dropzones.length !== 0) {
                graphics.clear();
                this.restart_colours();
                for (var dropzoneno in this.dropzones) {
                    var colourfordropzone = this.get_next_colour();
                    var d = this.dropzones[dropzoneno];
                    this.draw_drop_zone(dropzoneno, d.markertext, d.shape, d.coords, colourfordropzone, true);
                }
            }
        };

        /**
         * Determine what drag items need to be shown and
         * return coords of all drag items except any that are currently being dragged
         * based on contents of hidden inputs and whether drags are 'infinite' or how many drags should be shown.
         */
        this.get_coords = function (input) {
            var choiceno = this.get_choiceno_for_node(input);
            var fv = input.attr('value');
            var infinite = input.hasClass('infinite');
            var noofdrags = this.get_noofdrags_for_node(input);
            var dragging = (null !== this.doc.drag_item_being_dragged(choiceno));
            var coords = [];
            if (fv !== '' && typeof fv != 'undefined') {
                var coordsstrings = fv.split(';');
                for (var i = 0; i < coordsstrings.length; i++) {
                    coords[coords.length] = this.convert_to_window_xy(coordsstrings[i].split(','));
                }
            }
            var displayeddrags = coords.length + (dragging ? 1 : 0);
            if (infinite || (displayeddrags < noofdrags)) {
                coords[coords.length] = this.drag_home_xy(choiceno);
            }
            return coords;
        };
        this.drag_home_xy = function (choiceno) {
            var dragitemhome = this.doc.drag_item_home(choiceno);
            var position = $mmUtil.getElementXY(dragitemhome, null, 'ddarea');
            return [position[0], position[1]];
        };
        this.get_choiceno_for_node = function(node) {
            return Number(this.doc.get_classname_numeric_suffix(node, 'choice'));
        };
        this.get_itemno_for_node = function(node) {
            return Number(this.doc.get_classname_numeric_suffix(node, 'item'));
        };
        this.get_noofdrags_for_node = function(node) {
            return Number(this.doc.get_classname_numeric_suffix(node, 'noofdrags'));
        };

        this.initializer(question);
    }


    self.init_question = function(question, readonly, dropzones) {
        var qi = new question_instance(question, readonly, dropzones);
        return qi;
    };

    return self;
});