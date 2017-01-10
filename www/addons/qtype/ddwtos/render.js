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

angular.module('mm.addons.qtype_ddwtos')

/**
 * This is the class for ddwtos question rendering.
 *
 * @module mm.addons.qtype_ddwtos
 * @ngdoc service
 * @name $mmaQtypeDdwtosRender
 */
.factory('$mmaQtypeDdwtosRender', function($mmUtil, $timeout) {
    var self = {};

    function question_instance(question, readonly, inputIds) {
        var instance = this;
        this.selectors = null;
        this.nextdragitemno = 1;
        this.placed = null;
        this.readonly = readonly;
        this.inputids = inputIds;
        this.selected = null;

        this.resizeFunction = function() {
            instance.position_drag_items();
        };

        this.destroy = function() {
            ionic.off('resize', this.resizeFunction, window);
        };

        this.initializer = function(question) {
            this.selectors = this.css_selectors(question.slot);

            var container = document.querySelector(this.selectors.top_node());
            container = angular.element(container);
            if (this.readonly) {
                container.addClass('readonly');
            } else {
                container.addClass('notreadonly');
            }

            this.set_padding_sizes_all();
            this.clone_drag_items();
            this.initial_place_of_drag_items();
            this.make_drop_zones();

            // Wait the DOM to be rendered.
            $timeout(function() {
                instance.position_drag_items();
            });

            ionic.on('resize', this.resizeFunction, window);
        };

        /**
         * put all our selectors in the same place so we can quickly find and change them later
         * if the structure of the document changes.
         */
        this.css_selectors = function(slot) {
            var topnode = "#mma-mod_quiz-question-" + slot + ' .mma-qtype-ddwtos-container';
            return {
                top_node : function() {
                    return topnode;
                },
                drag_container : function() {
                    return topnode + ' div.drags';
                },
                drags : function() {
                    return this.drag_container() + ' span.drag';
                },
                drag : function(no) {
                    return this.drags() + '.no' + no;
                },
                drags_in_group : function(groupno) {
                    return this.drags() + '.group' + groupno;
                },
                unplaced_drags_in_group : function(groupno) {
                    return this.drags_in_group(groupno) + '.unplaced';
                },
                drags_for_choice_in_group : function(choiceno, groupno) {
                    return this.drags_in_group(groupno) + '.choice' + choiceno;
                },
                unplaced_drags_for_choice_in_group : function(choiceno, groupno) {
                    return this.unplaced_drags_in_group(groupno) + '.choice' + choiceno;
                },
                drops : function() {
                    return topnode + ' span.drop';
                },
                drop_for_place : function(placeno) {
                    return this.drops() + '.place' + placeno;
                },
                drops_in_group : function(groupno) {
                    return this.drops() + '.group' + groupno;
                },
                drag_homes : function() {
                    return topnode + ' span.draghome';
                },
                drag_homes_group : function(groupno) {
                    return topnode + ' .draggrouphomes' + groupno + ' span.draghome';
                },
                drag_home : function(groupno, choiceno) {
                    return topnode + ' .draggrouphomes' + groupno + ' span.draghome.choice' + choiceno;
                },
                drops_group : function(groupno) {
                    return topnode + ' span.drop.group' + groupno;
                }
            };
        };

        this.set_padding_sizes_all = function() {
            for (var groupno = 1; groupno <= 8; groupno++) {
                this.set_padding_size_for_group(groupno);
            }
        };

        this.set_padding_size_for_group = function(groupno) {
            var groupItems = document.querySelectorAll(this.selectors.drag_homes_group(groupno));

            if (groupItems.length !== 0) {
                var maxwidth = 0;
                var maxheight = 0;
                //find max height and width
                angular.forEach(groupItems, function(item) {
                    maxwidth = Math.max(maxwidth, Math.ceil(item.offsetWidth));
                    maxheight = Math.max(maxheight, Math.ceil(item.offsetHeight));
                });
                maxwidth += 8;
                maxheight += 2;
                angular.forEach(groupItems, function(item) {
                    pad_to_width_height(item, maxwidth, maxheight);
                });

                var dropsGroup = document.querySelectorAll(this.selectors.drops_group(groupno));
                angular.forEach(dropsGroup, function(item) {
                    pad_to_width_height(item, maxwidth + 2, maxheight + 2);
                });
            }
        };

        function pad_to_width_height(node, width, height) {
            node.style.width = width + 'px';
            node.style.height = height + 'px';
            node.style.lineHeight = height + 'px';
        }

        /**
         * Invisible 'drag homes' are output by the renderer. These have the same properties
         * as the drag items but are invisible. We clone these invisible elements to make the
         * actual drag items.
         */
        this.clone_drag_items = function () {
            var dragHomes = document.querySelectorAll(this.selectors.drag_homes());
            for (var x = 0; x < dragHomes.length; x++) {
                this.clone_drag_items_for_one_choice(dragHomes[x]);
            }
        };

        this.clone_drag_items_for_one_choice = function(draghome) {
            draghome = angular.element(draghome);
            if (draghome.hasClass('infinite')) {
                var groupno = this.get_group(draghome);
                var noofdrags = document.querySelectorAll(this.selectors.drops_in_group(groupno)).length;
                for (var x = 0; x < noofdrags; x++) {
                    this.clone_drag_item(draghome);
                }
            } else {
                this.clone_drag_item(draghome);
            }
        };

        this.clone_drag_item = function(draghome) {
            var drag = draghome.clone(true);
            drag.removeClass('draghome');
            drag.addClass('drag');
            drag.addClass('no' + this.nextdragitemno);
            this.nextdragitemno++;
            drag.css('visibility', 'visible').css('position', 'absolute');
            var container = document.querySelector(this.selectors.drag_container());
            container = angular.element(container);
            container.append(drag);
            if (!this.readonly) {
                this.make_draggable(drag);
            }
        };

        this.get_classname_numeric_suffix = function(node, prefix) {
            node = angular.element(node);

            var classes = node.attr('class');
            if (classes !== '' && typeof classes !== 'undefined') {
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
            throw 'Prefix "' + prefix + '" not found in class names.';
        };

        this.get_choice = function(node) {
            return this.get_classname_numeric_suffix(node, 'choice');
        };

        this.get_group = function(node) {
            return this.get_classname_numeric_suffix(node, 'group');
        };

        this.get_place = function(node) {
            return this.get_classname_numeric_suffix(node, 'place');
        };

        this.get_no = function(node) {
            return this.get_classname_numeric_suffix(node, 'no');
        };

        this.initial_place_of_drag_items = function() {
            var inputid, inputnode, choiceno, drop, drag, groupno, placeno,
                drags = document.querySelectorAll(this.selectors.drags());

            drags = angular.element(drags);
            drags.addClass('unplaced');
            this.placed = [];
            for (placeno in this.inputids) {
                inputid = this.inputids[placeno];
                inputnode = document.querySelector('input#' + inputid);
                choiceno = Number(inputnode.getAttribute('value'));
                if (choiceno !== 0) {
                    drop = document.querySelector(this.selectors.drop_for_place(parseInt(placeno) + 1));
                    groupno = this.get_group(drop);
                    drag = document.querySelector(this.selectors.unplaced_drags_for_choice_in_group(choiceno, groupno));
                    this.place_drag_in_drop(drag, drop);
                    this.position_drag_item(drag);
                }
            }
        };

        this.make_draggable = function (drag) {
            drag.on('click', function() {
                if (drag.hasClass('selected')) {
                    instance.deselect_drags();
                } else {
                    instance.select_drag(drag);
                }
            });
        };

        this.select_drag = function(drag) {
            this.deselect_drags();

            drag = angular.element(drag);
            this.selected = drag;
            drag.addClass('selected');
        };

        this.deselect_drags = function() {
            var drags;
            drags = document.querySelectorAll(instance.selectors.drags());
            angular.element(drags).removeClass('selected');
            this.selected = null;
        };

        this.make_drop_zones = function () {
            if (this.readonly) {
                return;
            }

            var drops = document.querySelectorAll(this.selectors.drops());
            for (var x = 0; x < drops.length; x++) {
                this.make_drop_zone(drops[x]);
            }

            // If home answer area is clicked, return drag home.
            var home = document.querySelector(this.selectors.top_node() + ' .answercontainer');
            home = angular.element(home);

            home.on('click', function() {
                var drag = instance.selected;
                if (!drag) {
                    return false;
                }

                // Not placed yet, deselect.
                if (drag.hasClass('unplaced')) {
                    instance.deselect_drags();
                    return false;
                }

                // Remove, deselect and move back home in this order.
                instance.remove_drag_from_drop(drag);
                instance.deselect_drags();
                instance.position_drag_item(drag);
            });
        };

        this.make_drop_zone = function (drop) {
            drop = angular.element(drop);
            drop.on('click', function() {
                var drag = instance.selected;

                if (!drag) {
                    return false;
                }

                // Place it only if the same group is selected.
                if (instance.get_group(drag) === instance.get_group(drop)) {
                    instance.place_drag_in_drop(drag, drop);
                    instance.deselect_drags();
                    instance.position_drag_item(drag);
                }
            });
        };

        this.place_drag_in_drop = function (drag, drop) {
            var placeno, inputid, inputnode;

            placeno = this.get_place(drop);
            inputid = this.inputids[placeno - 1];
            inputnode = document.querySelector('input#' + inputid);

            // Null drag, deselects and place back home.
            if (drag !== null) {
                inputnode.setAttribute('value', this.get_choice(drag));
            } else {
                inputnode.setAttribute('value', '0');
            }

            for (var alreadytheredragno in this.placed) {
                if (this.placed[alreadytheredragno] === placeno) {
                    delete this.placed[alreadytheredragno];
                }
            }

            if (drag !== null) {
                this.placed[this.get_no(drag)] = placeno;
            }
        };

        this.remove_drag_from_drop = function (drag) {
            var placeno = this.placed[this.get_no(drag)];
            var drop = document.querySelector(this.selectors.drop_for_place(placeno));
            this.place_drag_in_drop(null, drop);
        };

        /**
         * Postition, or reposition, all the drag items.
         * @param pendingid (optional) if given, then mark the js task complete after the
         * items are all positioned.
         * @param dotimeout (optional) if true, continually re-position the items so
         * they stay in place. Else, if an integer, reposition this many times before stopping.
         */
        this.position_drag_items = function () {
            var drags = document.querySelectorAll(this.selectors.drags());
            for (var x = 0; x < drags.length; x++) {
                this.position_drag_item(drags[x]);
            }
        };

        this.position_drag_item = function (drag) {
            var groupno, choiceno, position, placeno;
            dragAng = angular.element(drag);

            placeno = this.placed[this.get_no(drag)];
            if (!placeno) {
                groupno = this.get_group(drag);
                choiceno = this.get_choice(drag);
                // Home position.
                position = $mmUtil.getElementXY(document, this.selectors.drag_home(groupno, choiceno), 'answercontainer');
                dragAng.addClass('unplaced');
            } else {
                // Drop position.
                position = $mmUtil.getElementXY(document, this.selectors.drop_for_place(placeno), 'mma-qtype-ddwtos-container');
                dragAng.removeClass('unplaced');
            }

            if (position) {
                dragAng.css('left', position[0] + 'px').css('top', position[1] + 'px');
            }
        };

        this.initializer(question);
    }


    self.init_question = function(question, readonly, inputIds) {
        var qi = new question_instance(question, readonly, inputIds);
        return qi;
    };

    return self;
});