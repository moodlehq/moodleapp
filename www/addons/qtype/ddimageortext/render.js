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

angular.module('mm.addons.qtype_ddimageortext')

/**
 * This is the class for ddimageortext question rendering.
 *
 * @module mm.addons.qtype_ddimageortext
 * @ngdoc service
 * @name $mmaQtypeDdimageortextRender
 */
.factory('$mmaQtypeDdimageortextRender', function($mmUtil, $timeout) {
    var self = {};

    function question_instance(question, readonly, drops) {
        var instance = this;
        this.toload = 0;
        this.doc = null;
        this.afterimageloaddone = false;
        this.readonly = readonly;
        this.topnode = null;
        this.drops = drops;
        this.proportion = 1;
        this.selected = null;

        this.resizeFunction = function() {
            instance.reposition_drags_for_question();
        };

        this.destroy = function() {
            this.stop_polling();
            ionic.off('resize', this.resizeFunction, window);
        };

        this.initializer = function(question) {
            this.doc = this.doc_structure(question.slot);

            if (this.readonly) {
                var container = angular.element(this.doc.top_node());
                container.addClass('readonly');
            }

            // Wait the DOM to be rendered.
            $timeout(function() {
                var bgimg = instance.doc.bg_img();
                // On iOS, complete is mistakenly true, check also naturalWidth for compatibility.
                if (!bgimg.complete || !bgimg.naturalWidth) {
                    instance.toload++;
                    angular.element(bgimg).on('load', function() {
                        instance.toload--;
                    });
                }

                var item_homes = instance.doc.drag_item_homes();
                angular.forEach(item_homes, function(item) {
                    if (item.tagName == 'IMG') {
                        // On iOS, complete is mistakenly true, check also naturalWidth for compatibility.
                        if (!item.complete || !item.naturalWidth) {
                            instance.toload++;
                            angular.element(item).on('load', function() {
                                instance.toload--;
                            });
                        }
                    }
                });

                instance.poll_for_image_load();
            });

            ionic.on('resize', this.resizeFunction, window);
        };

        this.poll_for_image_load = function () {
            if (this.afterimageloaddone) {
                return;
            }

            if (this.toload <= 0) {
                this.create_all_drag_and_drops();
                this.afterimageloaddone = true;
                question.loaded = true;
            }

            $timeout(function() {
                instance.poll_for_image_load();
            }, 1000);
        };

        this.stop_polling = function() {
            this.afterimageloaddone = true;
        };

        /**
         * Object to encapsulate operations on dd area.
         */
        this.doc_structure = function(slot) {
            var topnode = document.querySelector("#mma-mod_quiz-question-" + slot + ' .mma-qtype-ddimageortext-container');
            var dragitemsarea = topnode.querySelector('div.dragitems');
            return {
                top_node : function() {
                    return topnode;
                },
                drag_itemsarea : function() {
                    return dragitemsarea;
                },
                drag_items : function() {
                    return dragitemsarea.querySelectorAll('.drag');
                },
                drop_zones : function() {
                    return topnode.querySelectorAll('div.dropzones div.dropzone');
                },
                drop_zone_group : function(groupno) {
                    return topnode.querySelectorAll('div.dropzones div.group' + groupno);
                },
                drag_items_cloned_from : function(dragitemno) {
                    return dragitemsarea.querySelectorAll('.dragitems' + dragitemno);
                },
                drag_item : function(draginstanceno) {
                    return dragitemsarea.querySelector('.draginstance' + draginstanceno);
                },
                drag_items_in_group : function(groupno) {
                    return dragitemsarea.querySelectorAll('.drag.group' + groupno);
                },
                drag_item_homes : function() {
                    return dragitemsarea.querySelectorAll('.draghome');
                },
                bg_img : function() {
                    return topnode.querySelector('.dropbackground');
                },
                drag_item_home : function (dragitemno) {
                    return dragitemsarea.querySelector('.dragitemhomes' + dragitemno);
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
                                return + match[0];
                            }
                        }
                    }
                    throw 'Prefix "' + prefix + '" not found in class names.';
                },
                clone_new_drag_item : function (draginstanceno, dragitemno) {
                    var drag, divdrag;
                    var draghome = this.drag_item_home(dragitemno);
                    if (draghome === null) {
                        return null;
                    }

                    var draghomeimg = draghome.querySelector('img');

                    // Images need to be inside a div element to admit padding with width and height.
                    if (draghomeimg) {
                        draghomeimg = angular.element(draghomeimg);
                        draghome = angular.element(draghome);

                        drag = draghomeimg.clone(true);
                        divdrag = angular.element('<div>');

                        divdrag.append(drag);
                        divdrag.attr('class', draghome.attr('class'));
                        drag.attr('class', '');
                    } else {
                        draghome = angular.element(draghome);
                        divdrag = draghome.clone(true);
                    }

                    divdrag.removeClass('dragitemhomes' + dragitemno);
                    divdrag.removeClass('draghome');
                    divdrag.addClass('dragitems' + dragitemno);
                    divdrag.addClass('draginstance' + draginstanceno);
                    divdrag.addClass('drag');

                    divdrag.css('visibility', 'inherit').css('position', 'absolute');
                    divdrag.attr('draginstanceno', draginstanceno);
                    divdrag.attr('dragitemno', dragitemno);
                    draghome.after(divdrag);
                    return divdrag;
                }
            };
        };

        this.draggable_for_question = function (drag, group, choice) {
            drag.attr('group', group);
            drag.attr('choice', choice);
            drag.on('click', function(e) {

                if (drag.hasClass('beingdragged')) {
                    instance.deselect_drags();
                } else {
                    instance.select_drag(drag);
                }

                e.preventDefault();
                e.stopPropagation();
            });
        };

        this.select_drag = function(drag) {
            this.deselect_drags();

            this.selected = drag;
            drag.addClass('beingdragged');
        };

        this.deselect_drags = function() {
            var drags = this.doc.drag_items();
            angular.element(drags).removeClass('beingdragged');
            this.selected = null;
        };

        this.make_drag_area_clickable = function() {
            if (this.readonly) {
                return;
            }

            var home = angular.element(this.doc.drag_itemsarea());
            home.on('click', function(e) {
                var drag = instance.selected;
                if (!drag) {
                    return false;
                }

                instance.deselect_drags();
                instance.remove_drag_from_drop(drag);
                e.preventDefault();
                e.stopPropagation();
            });
        };

        this.update_padding_sizes_all = function () {
            for (var groupno = 1; groupno <= 8; groupno++) {
                this.update_padding_size_for_group(groupno);
            }
        };

        this.update_padding_size_for_group = function (groupno) {
            var originalpadding, img, width, height;
            var groupitems = this.doc.top_node().querySelectorAll('.draghome.group' + groupno);
            if (groupitems.length !== 0) {
                var maxwidth = 0;
                var maxheight = 0;
                for (var x = 0; x < groupitems.length; x++) {
                    img = groupitems[x].querySelector('img');
                    if (img) {
                        maxwidth = Math.max(maxwidth, Math.round(this.proportion * img.naturalWidth));
                        maxheight = Math.max(maxheight, Math.round(this.proportion * img.naturalHeight));
                    } else {
                        originalpadding = angular.element(groupitems[x]).css('padding');
                        angular.element(groupitems[x]).css('padding', '');
                        // Text is not affected by the proportion.
                        maxwidth = Math.max(maxwidth, Math.round(groupitems[x].clientWidth));
                        maxheight = Math.max(maxheight, Math.round(groupitems[x].clientHeight));
                        angular.element(groupitems[x]).css('padding', originalpadding);
                    }
                }

                if (maxwidth <= 0 || maxheight <= 0) {
                    return;
                }

                // Add a variable padding to the image or text.
                maxwidth = Math.round(maxwidth + this.proportion * 8);
                maxheight = Math.round(maxheight + this.proportion * 8);

                for (var y = 0; y < groupitems.length; y++) {
                    var item = groupitems[y];
                    img = item.querySelector('img');
                    if (img) {
                        width = Math.round(img.naturalWidth * this.proportion);
                        height = Math.round(img.naturalHeight * this.proportion);
                    } else {
                        originalpadding = angular.element(item).css('padding');
                        angular.element(item).css('padding', '');
                        width = Math.round(item.clientWidth);
                        height = Math.round(item.clientHeight);
                        angular.element(item).css('padding', originalpadding);
                    }

                    var margintopbottom = Math.round((maxheight - height) / 2);
                    var marginleftright = Math.round((maxwidth - width) / 2);

                    // Correction for the roundings.
                    var widthcorrection = maxwidth - (width + marginleftright * 2);
                    var heightcorrection = maxheight - (height + margintopbottom * 2);

                    angular.element(item).css('padding', margintopbottom + 'px ' + marginleftright + 'px ' +
                        (margintopbottom + heightcorrection) + 'px ' + (marginleftright + widthcorrection) + 'px');

                    var dragitemno = Number(this.doc.get_classname_numeric_suffix(item, 'dragitemhomes'));
                    var drags = this.doc.top_node().querySelectorAll('.drag.group' + groupno + '.dragitems' + dragitemno);
                    angular.element(drags).css('padding', margintopbottom + 'px ' + marginleftright + 'px ' +
                        (margintopbottom + heightcorrection) + 'px ' + (marginleftright + widthcorrection) + 'px');
                }
                // It adds the border of 1px to the width.
                angular.element(this.doc.drop_zone_group(groupno))
                    .css('width', maxwidth + 2 + 'px ').css('height', maxheight + 2 + 'px ');
            }
        };

        this.convert_to_window_xy = function (bgimgxy) {
            var position = $mmUtil.getElementXY(this.doc.bg_img(), null, 'ddarea');
            bgimgxy = bgimgxy.split(',');

            // Render the position related to the current image dimensions.
            bgimgxy[0] *= this.proportion;
            bgimgxy[1] *= this.proportion;

            return [Number(bgimgxy[0]) + position[0] + 1, Number(bgimgxy[1]) + position[1] + 1];
        };

        this.create_all_drag_and_drops = function () {
            this.init_drops();

            angular.element(this.doc.drag_itemsarea()).addClass('clearfix');
            this.make_drag_area_clickable();

            var i = 0;
            var dragitemhomes = this.doc.drag_item_homes();
            for (var x = 0; x < dragitemhomes.length; x++) {
                var dragitemhome = dragitemhomes[x];
                var dragitemno = Number(this.doc.get_classname_numeric_suffix(dragitemhome, 'dragitemhomes'));
                var choice = + this.doc.get_classname_numeric_suffix(dragitemhome, 'choice');
                var group = + this.doc.get_classname_numeric_suffix(dragitemhome, 'group');

                // Images need to be inside a div element to admit padding with width and height.
                if (dragitemhome.tagName == 'IMG') {
                    var dragitemhomeAng = angular.element(dragitemhome);
                    var wrap = angular.element('<div>');
                    wrap.addClass(dragitemhomeAng.attr('class'));
                    dragitemhomeAng.attr('class', '');
                    dragitemhomeAng.wrap(wrap);
                }

                var dragnode = this.doc.clone_new_drag_item(i, dragitemno);
                i++;
                if (!this.readonly) {
                    this.draggable_for_question(dragnode, group, choice);
                }
                if (dragnode.hasClass('infinite')) {
                    var groupsize = this.doc.drop_zone_group(group).length;
                    var dragstocreate = groupsize - 1;
                    while (dragstocreate > 0) {
                        dragnode = this.doc.clone_new_drag_item(i, dragitemno);
                        i++;
                        if (!this.readonly) {
                            this.draggable_for_question(dragnode, group, choice);
                        }
                        dragstocreate--;
                    }
                }
            }
            this.reposition_drags_for_question();
            if (!this.readonly) {
                var dropzones = this.doc.drop_zones();
                angular.element(dropzones).attr('tabIndex', 0);
            }
        };

        this.drop_click = function (dropnode) {
            var drag = instance.selected;
            if (!drag) {
                return false;
            }
            this.deselect_drags();

            dropnodeAng = angular.element(dropnode);
            if (Number(dropnodeAng.attr('group')) === Number(drag.attr('group'))) {
                this.place_drag_in_drop(drag, dropnode);
            }
        };

        this.remove_drag_from_drop = function (drag) {
            var inputid = drag.attr('inputid');
            if (inputid) {
                var inputnode = angular.element(this.doc.top_node().querySelector('input#' + inputid));
                inputnode.attr('value', '');
            }

            var dragitemhome = this.doc.drag_item_home(drag.attr('dragitemno'));
            var position = $mmUtil.getElementXY(dragitemhome, null, 'ddarea');

            drag.css('left', position[0] + 'px').css('top', position[1] + 'px');
            drag.removeClass('placed');

            drag.attr('inputid', '');
        };

        this.place_drag_in_drop = function (drag, drop) {
            var targetinputid = angular.element(drop).attr('inputid');
            var inputnode = angular.element(this.doc.top_node().querySelector('input#' + targetinputid));

            var origininputid = drag.attr('inputid');
            if (origininputid && origininputid != targetinputid) {
                // Remove it from the previous place.
                var origininputnode = angular.element(this.doc.top_node().querySelector('input#' + origininputid));
                origininputnode.attr('value', '');
            }

            var position = $mmUtil.getElementXY(drop, null, 'ddarea');
            drag.css('left', position[0] - 1 + 'px').css('top', position[1] - 1 + 'px');
            drag.addClass('placed');

            inputnode.attr('value', drag.attr('choice'));
            drag.attr('inputid', targetinputid);
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

        this.reposition_drags_for_question = function() {
            var dragitem;
            var drag_items = this.doc.drag_items();
            angular.element(drag_items).removeClass('placed').attr('inputid', '');

            this.calculate_img_proportion();

            var dragitemhomes = this.doc.drag_item_homes();
            for (var x = 0; x < dragitemhomes.length; x++) {
                var dragitemhome = dragitemhomes[x];
                var dragitemhomeimg = dragitemhome.querySelector('img');
                if (dragitemhomeimg && dragitemhomeimg.naturalWidth > 0) {
                    var widthheight = [Math.round(dragitemhomeimg.naturalWidth * this.proportion),
                        Math.round(dragitemhomeimg.naturalHeight * this.proportion)];
                    angular.element(dragitemhomeimg).css('width', widthheight[0] + 'px').css('height', widthheight[1] + 'px');

                    var dragitemno = Number(this.doc.get_classname_numeric_suffix(dragitemhome, 'dragitemhomes'));
                    var groupno = this.doc.get_classname_numeric_suffix(dragitemhome, 'group');
                    var dragsimg = this.doc.top_node().querySelectorAll('.drag.group' + groupno + '.dragitems' + dragitemno + '  img');
                    angular.element(dragsimg).css('width', widthheight[0] + 'px').css('height', widthheight[1] + 'px');
                }
            }

            this.update_padding_sizes_all();

            var drop_zones = this.doc.drop_zones();
            for (var y = 0; y < drop_zones.length; y++) {
                var dropzone = drop_zones[y];
                var dropzoneAng = angular.element(dropzone);
                var relativexy = instance.convert_to_window_xy(dropzoneAng.attr('xy'));
                dropzoneAng.css('left', relativexy[0] + 'px').css('top', relativexy[1] + 'px');

                // Re-place items got from the inputs.
                var inputcss = 'input#' + dropzoneAng.attr('inputid');
                var input = instance.doc.top_node().querySelector(inputcss);
                var choice = Number(input.value);
                if (choice > 0) {
                    dragitem = instance.get_unplaced_choice_for_drop(choice, dropzoneAng);
                    if (dragitem !== null) {
                        instance.place_drag_in_drop(dragitem, dropzone);
                    }
                }
            }

            // Re-place items not placed items.
            for (var z = 0; z < drag_items.length; z++) {
                dragitem = angular.element(drag_items[z]);
                if (!dragitem.hasClass('placed') && !dragitem.hasClass('beingdragged')) {
                    instance.remove_drag_from_drop(dragitem);
                }
            }
        };

        this.get_choices_for_drop = function(choice, drop) {
            var group = drop.attr('group');
            return this.doc.top_node().querySelectorAll('div.dragitemgroup' + group + ' .choice' + choice + '.drag');
        };

        this.get_unplaced_choice_for_drop = function(choice, drop) {
            var dragitems = this.get_choices_for_drop(choice, drop);
            var dragitem;
            for (var x = 0; x < dragitems.length; x++) {
                dragitem = angular.element(dragitems[x]);
                if (instance.readonly || (!dragitem.hasClass('placed') && !dragitem.hasClass('beingdragged'))) {
                    return dragitem;
                }
            }
            return null;
        };

        this.init_drops = function () {
            var dropareas = this.doc.top_node().querySelector('div.dropzones');
            dropareas = angular.element(dropareas);
            var groupnodes = {};
            for (var groupno = 1; groupno <= 8; groupno++) {
                var groupnode = angular.element('<div class = "dropzonegroup' + groupno + '"></div>');
                dropareas.append(groupnode);
                groupnodes[groupno] = groupnode;
            }

            for (var dropno in this.drops) {
                var drop = this.drops[dropno];
                var nodeclass = 'dropzone group' + drop.group + ' place' + dropno;
                var title = drop.text.replace('"', '\"');
                var dropnodehtml = '<div title="' + title + '" class="' + nodeclass + '">&nbsp;</div>';
                var dropnode = angular.element(dropnodehtml);
                groupnodes[drop.group].append(dropnode);
                dropnode.css('opacity', 0.5);
                dropnode.attr('xy', drop.xy);
                dropnode.attr('aria-label', drop.text);
                dropnode.attr('place', dropno);
                dropnode.attr('inputid', drop.fieldname.replace(':', '_'));
                dropnode.attr('group', drop.group);

                dropnode.on('click', function(e) {
                    instance.drop_click(this);
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        };

        this.initializer(question);
    }

    self.init_question = function(question, readonly, drops) {
        var qi = new question_instance(question, readonly, drops);
        return qi;
    };

    return self;
});