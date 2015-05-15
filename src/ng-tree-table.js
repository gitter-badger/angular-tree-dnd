(function () {
    angular.module('template/treeTable/treeTable.html', []).run(
        [
            '$templateCache', function ($templateCache) {
            $templateCache.put(
                'template/treeTable/treeTable.html',
                "" + "<table ng-class=\"tree_class\">\n"
                + "    <thead>\n" + "  <tr>\n"
                + "     <th ng-class=\"expandingProperty.titleClass\" ng-style=\"expandingProperty.titleStyle\">\n"
                + "         {{expandingProperty.displayName || expandingProperty.field || expandingProperty}}\n"
                + "        </th>\n"
                + "        <th ng-repeat=\"col in colDefinitions\" ng-class=\"col.titleClass\" ng-style=\"col.titleStyle\">\n"
                + "         {{col.displayName || col.field}}\n"
                + "     </th>\n"
                + "    </tr>\n"
                + "    </thead>\n"
                + " <tbody>\n"
                + "  <tr tree-table-node=\"row\" ng-repeat=\"row in tree_rows track by row.__hashKey__ \" ng-show=\"row.__visible__\"\n"
                + "     ng-class=\"(row.__selected__ ? ' active':'')\">\n"
                + "        <td ng-if=\"!expandingProperty.template\" tree-table-node-handle\n"
                + "         ng-style=\"expandingProperty.cellStyle ? expandingProperty.cellStyle : {'padding-left': $callbacks.calsIndent(row.__level__)}\"\n"
                + "          ng-click=\"onSelect(row)\" ng-class=\"expandingProperty.cellClass\"\n"
                + "            compile=\"expandingProperty.cellTemplate\">\n"
                + "              <a data-nodrag>\n"
                + "                  <i ng-class=\"$iconClass\" ng-click=\"toggleExpand(row)\"\n"
                + "                     class=\"tree-icon\"></i>\n"
                + "              </a>\n"
                + "             {{row[expandingProperty.field] || row[expandingProperty]}}\n"
                + "       </td>\n"
                + "        <td ng-if=\"expandingProperty.template\" compile=\"expandingProperty.template\"></td>\n"
                + "        <td ng-repeat=\"col in colDefinitions\" ng-class=\"col.cellClass\" ng-style=\"col.cellStyle\"\n"
                + "            compile=\"col.cellTemplate\">\n"
                + "            {{row[col.field]}}\n"
                + "       </td>\n"
                + "    </tr>\n"
                + "    </tbody>\n"
                + "</table>"
            );

            $templateCache.put(
                'template/treeTable/treeTableStatusCopy.html',
                '<label><i class="fa fa-copy"></i>&nbsp;<b>Copying</b></label>'
            );

            $templateCache.put(
                'template/treeTable/treeTableStatusMove.html',
                '<label><i class="fa fa-file-text"></i>&nbsp;<b>Moving</b></label>'
            );
        }]
    );

    angular.module('treeTable', ['template/treeTable/treeTable.html']).directive(
        'compile', [
            '$compile', function ($compile) {
                return {
                    restrict: 'A',
                    link:     function (scope, element, attrs) {
                        scope.$watch(
                            attrs.compile, function (new_val) {
                                if (new_val != null) {
                                    /*
                                     * Compile creates a linking function
                                     * that can be used with any scope.
                                     */
                                    var link = $compile(new_val);
                                    /*
                                     * Executing the linking function
                                     * creates a new element.
                                     */
                                    var new_elem = link(scope);
                                    // Which we can then append to our DOM element.
                                    element.empty().append(new_elem);
                                }
                            }
                        );
                    }
                };
            }]
    ).directive(
        'treeTable', [
            '$timeout', '$http', '$compile', '$window', '$document', 'treeTableTemplate', 'tgConfig',
            '$TreeTableHelper', '$templateCache',
            function ($timeout, $http, $compile, $window, $document, treeTableTemplate, tgConfig, $TreeTableHelper, $templateCache) {
                return {
                    restrict:   'E',
                    replace:    true,
                    scope:      {
                        treeData:   '=',
                        on_select:  '&onSelect',
                        on_click:   '&onClick',
                        tree:       '=treeControl',
                        expandOn:   '=',
                        columnDefs: '=',
                        callbacks:  '=',
                        primaryKey: '='
                    },
                    controller: [
                        '$scope', '$element', '$attrs', 'tgConfig', function ($scope, $element, $attrs, tgConfig) {
                            $scope.dragEnabled = true;
                            $scope.dragDelay = 0;
                            $scope.indent = 20;
                            $scope.indent_plus = 15;
                            $scope.indent_unit = 'px';
                            $scope.tree_class = 'table';
                            $scope.primary_key = '__uid__';
                            $scope.enabledMove = true;
                            $scope.statusMove = true;
                            $scope.enabledHotkey = false;
                            $scope.tree_data = $scope.treeData;
                            $scope.dragging = null;

                            $scope.$globals = {};

                            $scope.config = {};

                            $scope.statusElm = null;
                            $scope.placeElm = null;

                            $scope.setDragging = function (dragInfo) {
                                $scope.dragging = dragInfo;
                            }

                            $scope.toggleExpand = function (row) {
                                if (row.__children__.length > 0) {
                                    row.__expanded__ = !row.__expanded__;
                                }
                            }

                            $scope.classIcon = {};

                            $scope.$callbacks = {
                                accept:      function (dragInfo, before) {
                                    return true;
                                },
                                beforeDrag:  function (scopeDrag) {
                                    return true;
                                },
                                dragStart:   function (event) {},
                                dragMove:    function (event) {},
                                dragStop:    function (event, skiped) {},
                                beforeDrop:  function (event) {
                                    return true;
                                },
                                calsIndent:  function (level, skipUnit, skipEdge) {
                                    var unit = 0,
                                        edge = (skipEdge) ? 0 : $scope.indent_plus;
                                    if (!skipUnit) {
                                        unit = $scope.indent_unit ? $scope.indent_unit : 'px';
                                    }

                                    if (level - 1 < 1) {
                                        return edge + unit;
                                    } else {
                                        return $scope.indent * (level - 1) + edge + unit;
                                    }
                                },
                                dragEnabled: function () {
                                    return $scope.dragEnabled;
                                },
                                dropped:     function (info, pass, isMove) {
                                    var _node = info.node,
                                        _parent = info.parent || info.drag.treeData,
                                        _moveTo = info.move,
                                        _parentMoveTo = _moveTo.parent || info.scope.treeData,
                                        _swap;

                                    if (_parentMoveTo != -1) {
                                        // If drag changed!

                                        if (isMove == true) {
                                            _swap = _parent;
                                            if (_swap.__children__) {
                                                _swap = _swap.__children__;
                                            }

                                            _node = _swap.splice(_node.__index__, 1)[0];
                                        } else {
                                            _node = angular.copy(_node);
                                            _node.__uid__ = null;
                                        }
                                        // if node dragging change index in sample node parent
                                        // and index node increment 
                                        if (info.drag == info.scope &&
                                            _parent == _parentMoveTo &&
                                            _moveTo.pos >= info.node.__index__) {
                                            _moveTo.pos--;
                                        }

                                        if (_moveTo.pos > -1) {
                                            _swap = _parentMoveTo;
                                            if (_swap.__children__) {
                                                _swap = _swap.__children__;
                                            }
                                            _swap.splice(_moveTo.pos, 0, _node);
                                        } else {
                                            // todo If children need load crazy 
                                        }

                                        return true;
                                    }
                                    // Not changed!
                                    return false;
                                }
                            };

                            $scope.accept = function (info, before) {
                                return $scope.$callbacks.accept(info, before);
                            };

                            $scope.beforeDrag = function (sourceNode) {
                                return $scope.$callbacks.beforeDrag(sourceNode);
                            };

                            $scope.getPrevGlobal = function (index) {
                                if (index > 0) {
                                    return $scope.tree_rows[index - 1];
                                }
                                return null;
                            };

                            $scope.getNextGlobal = function (index) {
                                if (index > 0) {
                                    return $scope.tree_rows[index - 1];
                                }
                                return null;
                            };

                            $scope.getNode = function (index) {
                                if (index == null) {
                                    return null;
                                }
                                return $scope.tree_rows[index];
                            }

                            $scope.getHash = function (node) {
                                if ($scope.primary_key == '__uid__') {
                                    return '#' + node.__parent__ + '#' + node.__index__ + '#' + node.__uid__;
                                } else {
                                    return '#' + node.__parent__ + '#' + node.__index__ + '#' + node[$scope.primary_key];
                                }
                            };

                            $scope.setScope = function (scope, node) {
                                var _hash = $scope.getHash(node);
                                if ($scope.$globals[_hash] != scope) {
                                    $scope.$globals[_hash] = scope;
                                }
                            }

                            $scope.getScope = function (node) {
                                if (node) {
                                    return $scope.$globals[$scope.getHash(node)];
                                } else {
                                    return $scope;
                                }
                            }

                            $scope.enableMove = function (val) {
                                if ((typeof val) === "boolean") {
                                    $scope.enabledMove = val;
                                } else {
                                    $scope.enabledMove = true;
                                }
                            }

                            $scope.setPositionStatus = function (e, _scope) {
                                if ($scope.statusElm) {
                                    $scope.statusElm.css(
                                        {
                                            'left':    e.pageX + 10 + 'px',
                                            'top':     e.pageY + 15 + 'px',
                                            'z-index': 9999
                                        }
                                    );
                                    $scope.statusElm.addClass($scope.config.statusClass);
                                }
                            }

                            if ($attrs['enableStatus']) {
                                $scope.enabledStatus = false;

                                $scope.hideStatus = function () {
                                    if ($scope.statusElm) {
                                        $scope.statusElm.addClass($scope.config.hiddenClass);
                                    }
                                }

                                $scope.refreshStatus = function () {
                                    if (!$scope.dragging) {
                                        return;
                                    }

                                    if ($scope.enabledStatus) {
                                        var statusElmOld = $scope.statusElm;
                                        if ($scope.enabledMove) {
                                            $scope.statusElm = angular.element(treeTableTemplate.getMove($scope));
                                        } else {
                                            $scope.statusElm = angular.element(treeTableTemplate.getCopy($scope));
                                        }
                                        if (statusElmOld != $scope.statusElm) {
                                            if (statusElmOld) {
                                                $scope.statusElm.attr('class', statusElmOld.attr('class'));
                                                $scope.statusElm.attr('style', statusElmOld.attr('style'));
                                                statusElmOld.remove();
                                            }
                                            $document.find('body').append($scope.statusElm);

                                        }

                                        $scope.statusElm.removeClass($scope.config.hiddenClass);
                                    }
                                };
                            } else {

                                $scope.enabledStatus = null;
                            }

                            $scope.initPlace = function (element, level, dragElm) {
                                var tagName = element.prop('tagName').toLowerCase();
                                if (!$scope.placeElm) {

                                    if (tagName.toLowerCase() == 'tr') {
                                        $scope.placeElm = angular.element($window.document.createElement('tr'));
                                        var _len_down = $scope.colDefinitions.length;
                                        $scope.placeElm.append(
                                            angular.element($window.document.createElement('td'))
                                                .addClass($scope.config.emptyTreeClass)
                                                .addClass('indented')
                                                .addClass($scope.config.placeHolderClass)
                                        );
                                        while (_len_down-- > 0) {
                                            $scope.placeElm.append(
                                                angular.element($window.document.createElement('td'))
                                                    .addClass($scope.config.emptyTreeClass)
                                                    .addClass($scope.config.placeHolderClass)
                                            );
                                        }
                                    } else {
                                        $scope.placeElm = angular.element($window.document.createElement('li'))
                                            .addClass($scope.config.emptyTreeClass)
                                            .addClass($scope.config.placeHolderClass);
                                    }

                                } else {
                                    $scope.placeElm.removeClass($scope.config.hiddenClass);
                                }

                                if (tagName.toLowerCase() == 'tr') {
                                    $TreeTableHelper.replaceIndent($scope, $scope.placeElm, level);
                                }

                                element[0].parentNode.insertBefore($scope.placeElm[0], element[0]);
                                $scope.placeElm.css('height', $TreeTableHelper.height(dragElm) + 'px');

                                return $scope.placeElm;
                            }

                            $scope.hidePlace = function () {
                                if ($scope.placeElm) {
                                    $scope.placeElm.addClass($scope.config.hiddenClass);
                                }
                            }

                            $scope.showPlace = function () {
                                if ($scope.placeElm) {
                                    $scope.placeElm.removeClass($scope.config.hiddenClass);
                                }
                            }
                        }],
                    link:       function (scope, element, attrs) {
                        scope.$type = 'TreeTable';
                        scope.colDefinitions = [];
                        scope.dragging = null;

                        scope.$watch(
                            attrs['enableStatus'], function (val) {
                                if ((typeof val) === "boolean") {
                                    scope.enabledStatus = val;
                                }
                            }, true
                        );

                        scope.$watch(
                            attrs.enableMove, function (val) {
                                if ((typeof val) === "boolean") {
                                    scope.enabledMove = val;
                                    scope.statusMove = val;
                                }
                            }, true
                        );

                        if (attrs['enableStatus']) {
                            scope.$watch(
                                attrs['templateCopy'], function (val) {
                                    var _url = null;
                                    if ((typeof val) === "string" && val.trim().length > 0) {
                                        _url = val.trim();
                                    } else {
                                        _url = attrs['templateCopy'];
                                        if (_url) {
                                            _url = _url.trim();
                                            if (_url.length == 0 && !$templateCache.get(_url)) {
                                                _url = null;
                                            }
                                        }
                                    }

                                    if (_url) {
                                        if ($templateCache.get(_url)) {
                                            treeTableTemplate.setCopy(_url, scope);
                                        }
                                    }
                                }, true
                            );

                            scope.$watch(
                                attrs['templateMove'], function (val) {
                                    var _url = null;
                                    if ((typeof val) === "string" && val.trim().length > 0) {
                                        _url = val.trim();
                                    } else {
                                        _url = attrs['templateMove'];
                                        if (_url) {
                                            _url = _url.trim();
                                            if (_url.length == 0 && !$templateCache.get(_url)) {
                                                _url = null;
                                            }
                                        }
                                    }

                                    if (_url) {
                                        if ($templateCache.get(_url)) {
                                            treeTableTemplate.setMove(_url, scope);
                                        }
                                    }
                                }, true
                            );
                        }

                        if (!attrs.primaryKey) {
                            scope.primary_key == '__uid__';
                        } else {
                            scope.$watch(
                                attrs.primaryKey, function (value) {
                                    if (typeof value === "string") {
                                        scope.primary_key = value;
                                    } else {
                                        scope.primary_key = attrs.primaryKey;
                                    }
                                }, true
                            );
                        }

                        scope.$watch(
                            attrs.callbacks, function (optCallbacks) {
                                angular.forEach(
                                    optCallbacks, function (value, key) {
                                        if (typeof value === "function") {
                                            if (scope.$callbacks[key]) {
                                                scope.$callbacks[key] = value;
                                            }
                                        }
                                    }
                                );
                            }, true
                        );

                        if ((typeof attrs['class']) === 'string') {
                            scope.tree_class = attrs['class'].trim();
                        }

                        if ((typeof attrs['indentUnit']) === 'string') {
                            scope.indent_unit = attrs['indentUnit'];
                        }

                        scope.$watch(
                            attrs['enableHotkey'], function (val) {
                                if ((typeof val) === "boolean") {
                                    scope.enabledHotkey = val;
                                }

                                if (scope.enabledHotkey) {
                                    scope.enabledMove = false;
                                } else {
                                    // restore status in attr
                                    scope.enabledMove = scope.statusMove;
                                }
                            }, true
                        );

                        scope.$watch(
                            attrs['enableDrag'], function (val) {
                                if ((typeof val) === "boolean") {
                                    scope.dragEnabled = val;
                                } else {
                                    if ((typeof attrs['enableDrag']) == "boolean") {
                                        scope.indent = attrs['enableDrag'];
                                    }
                                }
                            }, true
                        );

                        scope.$watch(
                            attrs.indent, function (val) {
                                if ((typeof val) == "number") {
                                    scope.indent = val;
                                } else {
                                    if ((typeof attrs['indent']) == "number") {
                                        scope.indent = attrs['indent'];
                                    }
                                }
                            }, true
                        );

                        scope.$watch(
                            attrs['indentPlus'], function (val) {
                                if ((typeof val) == "number") {
                                    scope.indent_plus = val;
                                } else {
                                    if ((typeof attrs['indentPlus']) == "number") {
                                        scope.indent_plus = attrs['indentPlus'];
                                    }
                                }
                            }, true
                        );

                        scope.$watch(
                            attrs.dragDelay, function (val) {
                                if ((typeof val) == "number") {
                                    scope.dragDelay = val;
                                } else {
                                    if ((typeof attrs['dragDelay']) == "number") {
                                        scope.dragDelay = attrs['dragDelay'];
                                    }
                                }
                            }, true
                        );
                        // End watch
                        //
                        scope.config = {};
                        angular.extend(scope.config, tgConfig);
                        scope.$watch(
                            attrs.config, function (val) {
                                angular.extend(scope.config, val);
                            }, true
                        );

                        var expandingProperty, expand_level, n, tree;
                        scope.classIcon = {
                            '1': attrs.iconExpand ? attrs.iconExpand : 'glyphicon glyphicon-minus',
                            '0': attrs.iconCollapse ? attrs.iconCollapse : 'glyphicon glyphicon-plus',
                            '-1': attrs.iconLeaf ? attrs.iconLeaf : 'glyphicon glyphicon-file'
                        };
                        attrs.expandLevel = attrs.expandLevel ? attrs.expandLevel : '3';
                        expand_level = parseInt(attrs.expandLevel, 10);
                        if (!scope.treeData) {
                            scope.treeData = [];
                        }

                        var getExpandOn = function () {
                                if (scope.treeData.length) {
                                    var _firstRow = scope.treeData[0], _keys = Object.keys(_firstRow),
                                        regex = new RegExp("^__([a-zA-Z0-9_\-]*)__$");
                                    // Auto get first field with type is string;
                                    for (var i = 0, len = _keys.length; i < len; i++) {
                                        if (typeof (_firstRow[_keys[i]]) === 'string' && !regex.test(_keys[i])) {
                                            expandingProperty = _keys[i];
                                            break;
                                        }
                                    }

                                    // Auto get first
                                    if (!expandingProperty) {
                                        expandingProperty = _keys[0];
                                    }

                                    scope.expandingProperty = expandingProperty;
                                }
                            },
                            getColDefs = function () {
                                // Auto get Defs except attribute __level__ ....
                                if (scope.treeData.length) {
                                    var _col_defs = [], _firstRow = scope.treeData[0];
                                    var regex = new RegExp("(^__([a-zA-Z0-9_\-]*)__$|^" + expandingProperty + "$)");
                                    for (var idx in _firstRow) {
                                        if (!regex.test(idx)) {
                                            _col_defs.push(
                                                {
                                                    field: idx
                                                }
                                            );
                                        }
                                    }
                                    scope.colDefinitions = _col_defs;
                                }
                            };

                        if (attrs.expandOn) {
                            expandingProperty = scope.expandOn || [];
                            scope.expandingProperty = scope.expandOn || [];
                        }

                        if (attrs.columnDefs) {
                            if (!(angular.isArray(scope.columnDefs))) {
                                getColDefs();
                            } else {
                                scope.colDefinitions = scope.columnDefs;
                            }
                        }

                        scope.tree_rows = [];

                        var selected_branch = null,
                            for_each_branch = function (f) {
                                var do_f, _i, _len, _ref;
                                do_f = function (branch, level) {
                                    f(branch, level);
                                    if (branch.__children__ != null) {
                                        var _i, _len, _ref;
                                        _ref = branch.__children__;
                                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                                            do_f(_ref[_i], level + 1);
                                        }
                                    }
                                };
                                _ref = scope.treeData;
                                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                                    do_f(_ref[_i], 1);
                                }
                            },
                            select_branch = function (branch) {
                                if (!branch) {
                                    if (selected_branch != null) {
                                        selected_branch.__selected__ = false;
                                    }
                                    selected_branch = null;
                                    return;
                                }
                                if (branch !== selected_branch) {
                                    if (selected_branch != null) {
                                        selected_branch.__selected__ = false;
                                    }
                                    branch.__selected__ = true;
                                    selected_branch = branch;
                                    expand_all_parents(branch);
                                    if (angular.isFunction(scope.on_select)) {
                                        return $timeout(
                                            function () {
                                                return scope.on_select({branch: branch});
                                            }
                                        );
                                    }
                                }
                            },
                            get_parent = function (node) {
                                if (node.__parent_real__ !== null && node.__parent_real__ > -1 && node.__parent_real__ < scope.tree_rows.length) {
                                    return scope.tree_rows[node.__parent_real__];
                                }
                                return null;
                            },
                            for_all_ancestors = function (child, fn) {
                                var parent;
                                parent = get_parent(child);
                                if (parent != null) {
                                    fn(parent);
                                    return for_all_ancestors(parent, fn);
                                }
                            },
                            expand_all_parents = function (child) {
                                return for_all_ancestors(
                                    child, function (b) {
                                        return b.__expanded__ = true;
                                    }
                                );
                            },
                            on_treeData_change = function () {
                                if (!attrs.expandOn) {
                                    getExpandOn();
                                }

                                if (!attrs.columnDefs) {
                                    getColDefs();
                                }

                                var _len, _data;
                                _data = scope.treeData;
                                _len = _data.length;
                                var _tree_rows = [];
                                if (_len > 0) {
                                    var _i, do_f;
                                    do_f = function (branch, parent, parent_real, level, visible, index) {
                                        var _i, _len, _icon;
                                        if (!angular.isArray(branch.__children__)) {
                                            branch.__children__ = [];
                                        }

                                        branch.__parent_real__ = parent_real;
                                        branch.__parent__ = parent;
                                        _len = branch.__children__.length;

                                        if (branch.__expanded__ == null && _len > 0) {
                                            branch.__expanded__ = level < expand_level;
                                        }

                                        if (_len === 0) {
                                            _icon = -1;
                                        } else {
                                            if (branch.__expanded__) {
                                                _icon = 1;
                                            } else {
                                                _icon = 0;
                                            }
                                        }
                                        // Insert item vertically
                                        var _index_real = _tree_rows.length;
                                        branch.__index__ = index;
                                        branch.__index_real__ = _index_real;
                                        branch.__level__ = level;
                                        branch.__icon__ = _icon;
                                        branch.__visible__ = visible;

                                        if (branch.__uid__ == null) {
                                            branch.__uid__ = "" + Math.random();
                                        }

                                        _tree_rows.push(branch);

                                        // Check brach children
                                        var _dept = 1;
                                        if (_len > 0) {
                                            for (_i = 0; _i < _len; _i++) {
                                                _dept += do_f(
                                                    branch.__children__[_i],
                                                    (scope.primary_key == '__uid__') ? branch.__uid__ : branch[scope.primary_key],
                                                    _index_real,
                                                    level + 1,
                                                    visible && branch.__expanded__,
                                                    _i
                                                );
                                            }
                                        }

                                        var _hashKey;
                                        if (scope.primary_key == '__uid__') {
                                            _hashKey = '#' + parent_real + '#' + _index_real + '#' + branch.__uid__;
                                        } else {
                                            _hashKey = '#' + parent_real + '#' + _index_real + '#' + branch[scope.primary_key];
                                        }

                                        if (branch.__hashKey__ == null || branch.__hashKey__ != _hashKey) {
                                            branch.__hashKey__ = _hashKey;
                                            delete(scope.$globals[_hashKey]);
                                        }

                                        branch.__dept__ = _dept;

                                        return _dept;
                                    };

                                    var _deptTotal = 0;
                                    for (_i = 0; _i < _len; _i++) {
                                        _deptTotal += do_f(_data[_i], null, null, 1, true, _i);
                                    }

                                    // clear Element Empty
                                    var _offset, _max, _keys = Object.keys(scope.$globals), len = scope.$globals.length;
                                    _offset = len - _deptTotal;
                                    if (_offset != 0) {
                                        _max = len - _offset;
                                        _min = _max - Math.abs(_offset);
                                        for (_i = _min; _i < _max; _i++) {
                                            delete(scope.$globals[_keys[_i]]);
                                        }
                                    }

                                }
                                scope.tree_rows = _tree_rows;
                                return scope.tree_rows;
                            };

                        scope.onClick = function (branch) {
                            if (angular.isFunction(scope.on_click)) {
                                $timeout(
                                    function () {
                                        scope.on_click({branch: branch});
                                    }
                                );
                            }
                        };

                        scope.onSelect = function (branch) {
                            if (branch !== selected_branch) {
                                select_branch(branch);
                            }
                        };

                        scope.$watch('treeData', on_treeData_change, true);
                        // fix angular 1.2.x
                        on_treeData_change();

                        if (scope.tree == null || !angular.isObject(scope.tree)) {
                            scope.tree = {};
                        }

                        tree = scope.tree;
                        tree.expand_all = function () {
                            for_each_branch(
                                function (b, level) {
                                    b.__expanded__ = true;
                                }
                            );
                        };
                        tree.collapse_all = function () {
                            for_each_branch(
                                function (b, level) {
                                    b.__expanded__ = false;
                                }
                            );
                        };
                        tree.get_first_branch = function () {
                            n = scope.treeData.length;
                            if (n > 0) {
                                return scope.treeData[0];
                            }
                            return null;
                        };
                        tree.select_first_branch = function () {
                            var b;
                            b = tree.get_first_branch();
                            return tree.select_branch(b);
                        };
                        tree.get_selected_branch = function () {
                            return selected_branch;
                        };
                        tree.get_parent_branch = function (b) {
                            return get_parent(b);
                        };
                        tree.select_branch = function (b) {
                            select_branch(b);
                            return b;
                        };
                        tree.get_children = function (b) {
                            return b.__children__;
                        };
                        tree.select_parent_branch = function (b) {
                            var p;
                            if (b == null) {
                                b = tree.get_selected_branch();
                            }
                            if (b != null) {
                                p = tree.get_parent_branch(b);
                                if (p != null) {
                                    tree.select_branch(p);
                                    return p;
                                }
                            }
                        };
                        tree.add_branch = function (parent, new_branch, index) {
                            if ((typeof index) != "number") {
                                if (parent != null) {
                                    parent.__children__.push(new_branch);
                                    parent.__expanded__ = true;
                                } else {
                                    scope.treeData.push(new_branch);
                                }
                            } else {
                                if (parent != null) {
                                    parent.__children__.splice(index, 0, new_branch);
                                    parent.__expanded__ = true;
                                } else {
                                    scope.treeData.splice(index, 0, new_branch);
                                }
                            }
                            return new_branch;
                        };
                        tree.add_root_branch = function (new_branch) {
                            tree.add_branch(null, new_branch);
                            return new_branch;
                        };
                        tree.remove_branch = function (branch) {
                            branch = branch || tree.get_selected_branch();
                            if (branch) {
                                var parent;
                                if (branch.__parent_real__ !== null) {
                                    parent = tree.get_parent_branch(branch).__children__;
                                } else {
                                    parent = scope.treeData;
                                }
                                var index = parent.indexOf(branch);
                                parent.splice(index, 1);
                                selected_branch = null;
                            }
                        };
                        tree.expand_branch = function (b) {
                            if (b == null) {
                                b = tree.get_selected_branch();
                            }
                            if (b != null) {
                                b.__expanded__ = true;
                                return b;
                            }
                        };

                        tree.collapse_branch = function (b) {
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                b.__expanded__ = false;
                                return b;
                            }
                        };
                        tree.get_siblings = function (b) {
                            var p, siblings;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                p = tree.get_parent_branch(b);
                                if (p) {
                                    siblings = p.__children__;
                                } else {
                                    siblings = scope.treeData;
                                }
                                return siblings;
                            }
                        };
                        tree.get_next_sibling = function (b) {
                            var i, siblings;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                siblings = tree.get_siblings(b);
                                n = siblings.length;
                                i = siblings.indexOf(b);
                                if (i < n) {
                                    return siblings[i + 1];
                                }
                            }
                        };
                        tree.get_prev_sibling = function (b) {
                            var i, siblings;
                            if (b == null) {
                                b = selected_branch;
                            }
                            siblings = tree.get_siblings(b);
                            n = siblings.length;
                            i = siblings.indexOf(b);
                            if (i > 0) {
                                return siblings[i - 1];
                            }
                        };
                        tree.select_next_sibling = function (b) {
                            var next;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                next = tree.get_next_sibling(b);
                                if (next != null) {
                                    return tree.select_branch(next);
                                }
                            }
                        };
                        tree.select_prev_sibling = function (b) {
                            var prev;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                prev = tree.get_prev_sibling(b);
                                if (prev != null) {
                                    return tree.select_branch(prev);
                                }
                            }
                        };
                        tree.get_first_child = function (b) {
                            var _ref;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                if (((_ref = b.__children__) != null ? _ref.length : void 0) > 0) {
                                    return b.__children__[0];
                                }
                            }
                        };
                        tree.get_closest_ancestor_next_sibling = function (b) {
                            var next, parent;
                            next = tree.get_next_sibling(b);
                            if (next != null) {
                                return next;
                            } else {
                                parent = tree.get_parent_branch(b);
                                return tree.get_closest_ancestor_next_sibling(parent);
                            }
                        };
                        tree.get_next_branch = function (b) {
                            var next;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                next = tree.get_first_child(b);
                                if (next != null) {
                                    return next;
                                } else {
                                    next = tree.get_closest_ancestor_next_sibling(b);
                                    return next;
                                }
                            }
                        };
                        tree.select_next_branch = function (b) {
                            var next;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                next = tree.get_next_branch(b);
                                if (next != null) {
                                    tree.select_branch(next);
                                    return next;
                                }
                            }
                        };
                        tree.last_descendant = function (b) {
                            var last_child;
                            if (b == null) {
                                debugger;
                            }
                            n = b.__children__.length;
                            if (n === 0) {
                                return b;
                            } else {
                                last_child = b.__children__[n - 1];
                                return tree.last_descendant(last_child);
                            }
                        };
                        tree.get_prev_branch = function (b) {
                            var parent, prev_sibling;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                prev_sibling = tree.get_prev_sibling(b);
                                if (prev_sibling != null) {
                                    return tree.last_descendant(prev_sibling);
                                } else {
                                    parent = tree.get_parent_branch(b);
                                    return parent;
                                }
                            }
                        };
                        tree.reload_data = function () {
                            return on_treeData_change();
                        };
                        tree.select_prev_branch = function (b) {
                            var prev;
                            if (b == null) {
                                b = selected_branch;
                            }
                            if (b != null) {
                                prev = tree.get_prev_branch(b);
                                if (prev != null) {
                                    tree.select_branch(prev);
                                    return prev;
                                }
                            }
                        };

                        var hasTouch = 'ontouchstart' in window,
                            startPos, firstMoving, dragInfo, pos,
                            placeElm, dragElm,
                            dragDelaying = true, dragStarted = false, dragTimer = null,
                            body = document.body, html = document.documentElement,
                            document_height, document_width,
                            offsetEdge,

                            dragStart = function (e) {
                                if (!hasTouch && (e.button == 2 || e.which == 3)) {
                                    // disable right click
                                    return;
                                }
                                if (e.uiTreeDragging || (e.originalEvent && e.originalEvent.uiTreeDragging)) { // event has already fired in other scope.
                                    return;
                                }
                                // the element which is clicked.
                                var eventElm = angular.element(e.target);
                                var eventScope = eventElm.scope();
                                if (!eventScope || !eventScope.$type) {
                                    return;
                                }
                                if (eventScope.$type != 'TreeTableNode' && eventScope.$type != 'TreeTableNodeHandle') { // Check if it is a node or a handle
                                    return;
                                }
                                if (eventScope.$type != 'TreeTableNodeHandle') { // If the node has a handle, then it should be clicked by the handle
                                    return;
                                }

                                var eventElmTagName = eventElm.prop('tagName').toLowerCase(),
                                    dragScope = null;
                                if (eventElmTagName == 'input' || eventElmTagName == 'textarea' || eventElmTagName == 'button' || eventElmTagName == 'select') { // if it's a input or button, ignore it
                                    return;
                                }
                                // check if it or it's parents has a 'data-nodrag' attribute
                                while (eventElm && eventElm[0] && eventElm[0] != element) {
                                    if ($TreeTableHelper.nodrag(eventElm)) { // if the node mark as `nodrag`, DONOT drag it.
                                        return;
                                    }
                                    eventElm = eventElm.parent();
                                }

                                dragScope = eventScope.getScopeNode();
                                if (!scope.beforeDrag(dragScope)) {
                                    return;
                                }

                                e.uiTreeDragging = true; // stop event bubbling
                                if (e.originalEvent) {
                                    e.originalEvent.uiTreeDragging = true;
                                }
                                e.preventDefault();

                                var eventObj = $TreeTableHelper.eventObj(e);
                                firstMoving = true;
                                dragInfo = $TreeTableHelper.dragInfo(dragScope);
                                scope.setDragging(dragInfo);
                                var tagName = dragScope.$element.prop('tagName').toLowerCase();

                                pos = $TreeTableHelper.positionStarted(eventObj, dragScope.$element);

                                if (tagName === 'tr') {
                                    dragElm = angular.element($window.document.createElement('table'))
                                        .addClass(scope.config.treeClass)
                                        .addClass(scope.config.dragClass)
                                        .addClass(scope.tree_class);
                                } else {
                                    dragElm = angular.element($window.document.createElement('ul'))
                                        .addClass(scope.config.dragClass)
                                        .addClass('tree-table-rows')
                                        .addClass(scope.tree_class);
                                }

                                dragElm.css(
                                    {
                                        'width':   $TreeTableHelper.width(dragScope.$element) + 'px',
                                        'z-index': 9995
                                    }
                                );

                                offsetEdge = 0;
                                var _width = $TreeTableHelper.width(dragScope.$element);
                                if (tagName == 'tr') {
                                    var _tbody = angular.element($window.document.createElement('tbody'));
                                    offsetEdge = dragScope.node().__level__ - 1;
                                    var drag_descendant = function (node) {
                                        var _scope, _element, _i, _len, _nodes, _clone;

                                        _scope = scope.getScope(node);
                                        _element = _scope.$element;

                                        _clone = _element.clone();

                                        $TreeTableHelper.replaceIndent(
                                            _scope,
                                            _clone,
                                            node.__level__ - offsetEdge,
                                            'padding-left'
                                        );

                                        _tbody.append(_clone);

                                        if (scope.config.hiddenClass) {
                                            _element.addClass(scope.config.hiddenClass);
                                        }

                                        _nodes = node.__children__;
                                        _len = _nodes.length;
                                        for (_i = 0; _i < _len; _i++) {
                                            drag_descendant(_nodes[_i]);
                                        }
                                    }

                                    drag_descendant(dragScope.node());

                                    dragElm.append(_tbody);
                                } else {
                                    dragElm.append(dragScope.$element.clone());
                                    if (scope.config.hiddenClass) {
                                        dragScope.$element.addClass(scope.config.hiddenClass);
                                    }
                                }
                                dragElm.css(
                                    {
                                        'left': eventObj.pageX - pos.offsetX + scope.$callbacks.calsIndent(
                                            offsetEdge + 1,
                                            true,
                                            true
                                        )       + 'px',
                                        'top':  eventObj.pageY - pos.offsetY + 'px'
                                    }
                                );
                                // moving item with descendant
                                $document.find('body').append(dragElm);

                                placeElm = scope.initPlace(dragScope.$element, dragInfo.level, dragElm);
                                placeElm.css('width', _width);
                                if (scope.enabledStatus) {
                                    scope.refreshStatus();
                                    scope.setPositionStatus(e);
                                }
                                angular.element($document).bind('touchend', dragEndEvent);
                                angular.element($document).bind('touchcancel', dragEndEvent);
                                angular.element($document).bind('touchmove', dragMoveEvent);
                                angular.element($document).bind('mouseup', dragEndEvent);
                                angular.element($document).bind('mousemove', dragMoveEvent);
                                angular.element($document).bind('mouseleave', dragCancelEvent);

                                document_height = Math.max(
                                    body.scrollHeight,
                                    body.offsetHeight,
                                    html.clientHeight,
                                    html.scrollHeight,
                                    html.offsetHeight
                                );

                                document_width = Math.max(
                                    body.scrollWidth,
                                    body.offsetWidth,
                                    html.clientWidth,
                                    html.scrollWidth,
                                    html.offsetWidth
                                );
                            },
                            dragMove = function (e) {
                                if (!dragStarted) {
                                    if (!dragDelaying) {
                                        dragStarted = true;
                                        scope.$apply(
                                            function () {
                                                scope.$callbacks.dragStart(dragInfo);
                                            }
                                        );
                                    }
                                    return;
                                }
                                var eventObj = $TreeTableHelper.eventObj(e);
                                var prev, leftElmPos, topElmPos;
                                if (dragElm) {
                                    e.preventDefault();
                                    if ($window.getSelection) {
                                        $window.getSelection().removeAllRanges();
                                    } else if ($window.document.selection) {
                                        $window.document.selection.empty();
                                    }
                                    leftElmPos = eventObj.pageX - pos.offsetX;
                                    topElmPos = eventObj.pageY - pos.offsetY;
                                    //dragElm can't leave the screen on the left
                                    if (leftElmPos < 0) {
                                        leftElmPos = 0;
                                    }
                                    //dragElm can't leave the screen on the top
                                    if (topElmPos < 0) {
                                        topElmPos = 0;
                                    }
                                    //dragElm can't leave the screen on the bottom
                                    if ((topElmPos + 10) > document_height) {
                                        topElmPos = document_height - 10;
                                    }
                                    //dragElm can't leave the screen on the right
                                    if ((leftElmPos + 10) > document_width) {
                                        leftElmPos = document_width - 10;
                                    }
                                    dragElm.css(
                                        {
                                            'left': leftElmPos + scope.$callbacks.calsIndent(
                                                offsetEdge + 1,
                                                true,
                                                true
                                            )       + 'px',
                                            'top':  topElmPos + 'px'
                                        }
                                    );

                                    if (scope.enabledStatus) {
                                        scope.setPositionStatus(e);
                                    }

                                    var top_scroll = window.pageYOffset || $window.document.documentElement.scrollTop;
                                    var bottom_scroll = top_scroll + (window.innerHeight || $window.document.clientHeight || $window.document.clientHeight);
                                    // to scroll down if cursor y-position is greater than the bottom position the vertical scroll
                                    if (bottom_scroll < eventObj.pageY && bottom_scroll <= document_height) {
                                        window.scrollBy(0, 10);
                                    }
                                    // to scroll top if cursor y-position is less than the top position the vertical scroll
                                    if (top_scroll > eventObj.pageY) {
                                        window.scrollBy(0, -10);
                                    }
                                    $TreeTableHelper.positionMoved(e, pos, firstMoving);
                                    if (firstMoving) {
                                        firstMoving = false;
                                        return;
                                    }
                                    // check if add it as a child node first

                                    var targetX = eventObj.pageX - $window.document.body.scrollLeft;
                                    var targetY = eventObj.pageY - (window.pageYOffset || $window.document.documentElement.scrollTop);

                                    // when using elementFromPoint() inside an iframe, you have to call
                                    // elementFromPoint() twice to make sure IE8 returns the correct value
                                    // $window.document.elementFromPoint(targetX, targetY);
                                    var targetElm = angular.element(
                                            $window.document.elementFromPoint(
                                                targetX,
                                                targetY
                                            )
                                        ),
                                        targetScope = targetElm.scope(),
                                        tagName = null,
                                        isTreeDiff = false;

                                    if (targetScope && angular.isFunction(targetScope.getScopeNode)) {

                                        targetScope = targetScope.getScopeNode();

                                        tagName = targetScope.$element.prop('tagName').toLowerCase();
                                        if (dragInfo.scope !== targetScope) {
                                            // Hide place holder old
                                            dragInfo.scope.hidePlace();
                                            // Replace by place-holder new
                                            dragInfo.scope = targetScope;
                                            dragInfo.scope.showPlace();
                                            isTreeDiff = true;
                                        }
                                    }

                                    // move vertical
                                    if (!pos.dirAx || isTreeDiff) {

                                        // skip Target
                                        if (!targetScope) {
                                            return;
                                        }

                                        targetElm = targetScope.$element; // Get the element of tree-table-node

                                        var targetBefore, targetOffset = $TreeTableHelper.offset(targetElm);

                                        if (tagName == 'tr') {
                                            targetBefore = eventObj.pageY < (targetOffset.top + $TreeTableHelper.height(targetElm) / 2);
                                        } else {
                                            var _height = $TreeTableHelper.height(targetElm) - $TreeTableHelper.height(targetScope.elementChilds);
                                            if (eventObj.pageY > targetOffset.top + _height) {
                                                return;
                                            }

                                            targetBefore = eventObj.pageY < (targetOffset.top + _height / 2);
                                        }

                                        placeElm = targetScope.initPlace(
                                            targetElm,
                                            dragInfo.level,
                                            dragElm
                                        );
                                        placeElm.css('width', $TreeTableHelper.width(targetElm));

                                        if (targetScope.$callbacks.dragEnabled()) {
                                            if (targetScope.accept(dragInfo, targetBefore)) {
                                                dragInfo.level = targetScope.node().__level__;
                                                if (targetBefore) {
                                                    var _target = targetScope.node(),
                                                        _parent = targetScope.getNode(_target.__parent_real__),
                                                        _prev;

                                                    // Insert Element before Target
                                                    if (dragInfo.drag == targetScope && dragInfo.isDirty(
                                                            targetScope.node().__index_real__ - 1
                                                        )) {
                                                        _prev = targetScope.getPrevGlobal(dragInfo.node.__index_real__);
                                                    } else {
                                                        _prev = targetScope.prev();
                                                    }

                                                    dragInfo.target = _prev;
                                                    dragInfo.scope = targetScope;
                                                    if (dragInfo.drag == targetScope && _parent.__index_real__ && dragInfo.node.__parent_real__) {
                                                        // Not changed!
                                                        dragInfo.move = {
                                                            parent: -1,
                                                            pos:    -1
                                                        }
                                                    } else {
                                                        dragInfo.move = {
                                                            parent: _parent,
                                                            pos: (_parent == _prev) ? 0 : _prev.__index__ + 1
                                                        }
                                                    }

                                                    if (tagName == 'tr') {
                                                        $TreeTableHelper.replaceIndent(
                                                            targetScope,
                                                            placeElm,
                                                            dragInfo.level
                                                        );
                                                    }

                                                    // Insert Element before Target

                                                    targetElm[0].parentNode.insertBefore(
                                                        placeElm[0],
                                                        targetElm[0]
                                                    );
                                                    //placeElm.insertBefore(targetElm);
                                                } else {
                                                    var _level = dragInfo.level, _org = false;
                                                    _target = targetScope.node();

                                                    dragInfo.target = _target;
                                                    dragInfo.scope = targetScope;
                                                    if (dragInfo.drag == targetScope &&
                                                        dragInfo.parent.__index_real__ == _target.__index_real__ &&
                                                        dragInfo.node.__index__ == 0) {
                                                        _org = true;
                                                    }

                                                    if (_target.__expanded__ && !_org) {
                                                        dragInfo.level = ++_level;
                                                        dragInfo.move = {
                                                            parent: _target,
                                                            pos:    0
                                                        }
                                                        if (tagName == 'tr') {
                                                            $TreeTableHelper.replaceIndent(
                                                                targetScope,
                                                                placeElm,
                                                                _level
                                                            );
                                                            targetElm.after(placeElm);
                                                        } else {
                                                            targetScope.elementChilds.prepend(placeElm);
                                                        }
                                                    } else {
                                                        if (_org) {
                                                            dragInfo.move = {
                                                                parent: -1,
                                                                pos:    -1
                                                            }
                                                        } else {
                                                            _parent = targetScope.getNode(_target.__parent_real__);
                                                            dragInfo.move = {
                                                                parent: _parent,
                                                                pos:    _target.__index__ + 1
                                                            }
                                                        }

                                                        if (tagName == 'tr') {
                                                            $TreeTableHelper.replaceIndent(
                                                                targetScope,
                                                                placeElm,
                                                                _level
                                                            );
                                                        }
                                                        targetElm.after(placeElm);
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        targetScope = dragInfo.scope;

                                        tagName = targetScope.$element.prop('tagName').toLowerCase();
                                        // move horizontal
                                        if (pos.dirAx && pos.distAxX >= targetScope.config.levelThreshold) {
                                            pos.distAxX = 0;
                                            _target = dragInfo.target;
                                            if (_target) {
                                                // increase horizontal level if previous sibling exists and is not collapsed
                                                if (pos.distX > 0) {
                                                    var _visible = targetScope.visible(_target),
                                                        _len;

                                                    if (_visible && _visible.__level__ >= dragInfo.level) {
                                                        _parent = _visible;

                                                        while (_parent.__level__ > dragInfo.level) {
                                                            _parent = targetScope.getNode(_parent.__parent_real__);
                                                        }

                                                        _len = _parent.__children__.length;

                                                        dragInfo.level++;

                                                        if (dragInfo.drag == targetScope &&
                                                            dragInfo.parent == _parent &&
                                                            dragInfo.node.__index__ >= _len - 1
                                                        ) {
                                                            dragInfo.target = _visible;
                                                            dragInfo.move = {
                                                                parent: -1,
                                                                pos:    -1
                                                            };
                                                        } else {
                                                            dragInfo.move = {
                                                                parent: _parent,
                                                                pos:    _len
                                                            };
                                                        }

                                                        if (tagName == 'tr') {
                                                            $TreeTableHelper.replaceIndent(
                                                                targetScope,
                                                                placeElm,
                                                                dragInfo.level
                                                            );
                                                        } else {
                                                            _scope = targetScope.getScope(_visible);
                                                            _scope.elementChilds.append(placeElm);
                                                        }
                                                    }
                                                } else if (pos.distX < 0) {
                                                    var _target = dragInfo.canIndent();
                                                    _parent = targetScope.getNode(_target.__parent_real__);
                                                    if (_target == null || _target) {
                                                        dragInfo.level--;

                                                        if (dragInfo.drag == targetScope &&
                                                            dragInfo.parent == _parent &&
                                                            dragInfo.node.__index__ == _target.__index__ + 1
                                                        ) {
                                                            dragInfo.move = {
                                                                parent: -1,
                                                                pos:    -1
                                                            };
                                                        } else {
                                                            dragInfo.move = {
                                                                parent: _parent,
                                                                pos:    _target.__index__ + 1
                                                            };
                                                        }

                                                        if (tagName == 'tr') {
                                                            $TreeTableHelper.replaceIndent(
                                                                targetScope,
                                                                placeElm,
                                                                dragInfo.level
                                                            );
                                                        } else {
                                                            _scope = targetScope.getScope(_target);
                                                            _scope.$element.after(placeElm);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    scope.$apply(
                                        function () {
                                            scope.$callbacks.dragMove(dragInfo);
                                        }
                                    );
                                }
                            },
                            dragEnd = function (e) {
                                e.preventDefault();
                                if (dragElm) {
                                    var _passed = false;
                                    scope.$apply(
                                        function () {
                                            _passed = scope.$callbacks.beforeDrop(dragInfo);
                                        }
                                    );

                                    var tagName = dragInfo.drag.$element.prop('tagName').toLowerCase();
                                    if (tagName == 'tr') {
                                        var rollback_descendant = function (node) {
                                            var _scope, _element, _i, _len, _nodes;
                                            _scope = scope.getScope(node);
                                            _element = _scope.$element;
                                            if (scope.config.hiddenClass) {
                                                _element.removeClass(scope.config.hiddenClass);
                                            }
                                            _nodes = node.__children__;
                                            _len = _nodes.length;

                                            for (_i = 0; _i < _len; _i++) {
                                                rollback_descendant(_nodes[_i]);
                                            }
                                        }
                                        rollback_descendant(dragInfo.drag.node());
                                    } else {
                                        if (scope.config.hiddenClass) {
                                            dragInfo.drag.$element.removeClass(scope.config.hiddenClass);
                                        }
                                    }

                                    dragElm.remove();
                                    dragElm = null;

                                    dragInfo.scope.hidePlace();

                                    if (scope.enabledStatus !== null) {
                                        scope.hideStatus();
                                    }

                                    var _status = false;
                                    if (scope.$$apply) {
                                        scope.$apply(
                                            function () {
                                                _status = scope.$callbacks.dropped(
                                                    dragInfo,
                                                    _passed,
                                                    scope.enabledMove
                                                );
                                            }
                                        );
                                    } else {
                                        bindDrag();
                                    }

                                    scope.$apply(
                                        function () {
                                            scope.$callbacks.dragStop(dragInfo, _status);
                                        }
                                    );
                                    scope.$$apply = false;
                                    dragInfo = null;
                                    scope.setDragging(null);
                                }
                                angular.element($document).unbind('touchend', dragEndEvent); // Mobile
                                angular.element($document).unbind('touchcancel', dragEndEvent); // Mobile
                                angular.element($document).unbind('touchmove', dragMoveEvent); // Mobile
                                angular.element($document).unbind('mouseup', dragEndEvent);
                                angular.element($document).unbind('mousemove', dragMoveEvent);
                                angular.element($window.document.body).unbind('mouseleave', dragCancelEvent);
                            },
                            dragStartEvent = function (e) {
                                if (scope.$callbacks.dragEnabled()) {
                                    dragStart(e);
                                }
                            },
                            dragMoveEvent = function (e) {
                                dragMove(e);
                            },
                            dragEndEvent = function (e) {
                                scope.$$apply = true;
                                scope.dragEnd(e);
                            },
                            dragCancelEvent = function (e) {
                                scope.dragEnd(e);
                            },
                            bindDrag = function () {
                                element.bind(
                                    'touchstart mousedown', function (e) {
                                        dragDelaying = true;
                                        dragStarted = false;
                                        dragStartEvent(e);
                                        dragTimer = $timeout(
                                            function () {
                                                dragDelaying = false;
                                            }, scope.dragDelay
                                        );
                                    }
                                );
                                element.bind(
                                    'touchend touchcancel mouseup', function () {
                                        $timeout.cancel(dragTimer);
                                    }
                                );
                            },
                            keydownHandler = function (e) {
                                if (e.keyCode == 27) {
                                    if (scope.enabledStatus !== null) {
                                        scope.hideStatus();
                                    }

                                    scope.$$apply = false;
                                    scope.dragEnd(e);
                                } else {
                                    if (scope.enabledHotkey && e.shiftKey) {
                                        scope.enableMove(true);
                                        if (scope.enabledStatus) {
                                            scope.refreshStatus();
                                        }
                                    }
                                }

                            },
                            keyupHandler = function (e) {
                                if (scope.enabledHotkey && !e.shiftKey) {
                                    scope.enableMove(false);

                                    if (scope.enabledStatus) {
                                        scope.refreshStatus();
                                    }
                                }
                            };

                        scope.dragEnd = function (e) {
                            dragEnd(e);
                        };

                        bindDrag();

                        angular.element($window.document.body).bind("keydown", keydownHandler);
                        angular.element($window.document.body).bind("keyup", keyupHandler);
                        //unbind handler that retains scope
                        scope.$on(
                            '$destroy', function () {
                                angular.element($window.document.body).unbind("keydown", keydownHandler);
                                angular.element($window.document.body).unbind("keyup", keyupHandler);
                                if (scope.statusElm) {
                                    scope.statusElm.remove();
                                }

                                if (scope.placeElm) {
                                    scope.placeElm.remove();
                                }
                            }
                        );

                        $http.get(attrs.templateUrl || treeTableTemplate.getPath(), {cache: $templateCache}).success(
                            function (data) {
                                element.append($compile(data)(scope));
                            }
                        );

                    }
                };
            }]
    ).directive(
        'treeTableNode', [
            '$window', '$document', '$timeout', '$TreeTableHelper', 'treeTableTemplate',
            function ($window, $document, $timeout, $TreeTableHelper, treeTableTemplate) {
                return {
                    restrict:   'A',
                    replace:    true,
                    controller: [
                        '$scope', '$element', '$attrs', 'tgConfig', function ($scope, $element, $attrs, tgConfig) {
                            $scope.$modelValue = null;
                            $scope.$scopeChildren = null;
                            $scope.elementChilds = null;

                            $scope.prev = function () {
                                return $scope.getPrevGlobal($scope.$modelValue.__index_real__);
                            }

                            $scope.node = function () {
                                return $scope.$modelValue;
                            }

                            $scope.visible = function (node) {
                                if (node != null) {
                                    return node.__visible__ ? node : $scope.visible($scope.tree_rows[node.__parent_real__]);
                                }
                                return null;
                            }

                            $scope.setElementChilds = function (_elements) {
                                $scope.elementChilds = _elements;
                            }

                            $scope.getScopeNode = function () {
                                return $scope;
                            }

                        }],
                    link:       function (scope, element, attrs) {
                        scope.$element = element;
                        scope.$type = 'TreeTableNode';
                        scope.$iconClass = '';

                        if (scope.config.nodeClass) {
                            element.addClass(scope.config.nodeClass);
                        }

                        scope.$watch(
                            attrs['treeTableNode'], function (newValue, oldValue, scope) {
                                scope.setScope(scope, newValue);
                                scope.$modelValue = newValue;
                                scope.$iconClass = scope.classIcon[newValue.__icon__];
                            }, true
                        );

                    }
                };
            }]
    ).directive(
        'treeTableNodes', function () {
            return {
                restrict: 'A',
                replace:  true,
                link:     function (scope, element, attrs) {
                    scope.$type = 'TreeTableNodes';
                    scope.$element = element;
                    scope.datas = [];

                    if (scope.setElementChilds) {
                        scope.setElementChilds(element);
                    }

                    scope.$watch(
                        attrs['treeTableNodes'], function (newValue, oldValue, scope) {
                            scope.datas = newValue;
                        }, true
                    );

                    if (scope.config.nodesClass) {
                        element.addClass(scope.config.nodesClass);
                    }
                }
            };
        }
    ).directive(
        'treeTableNodeHandle', function () {
            return {
                restrict: 'A',
                scope:    true,
                link:     function (scope, element, attrs) {
                    scope.$element = element;
                    scope.$type = 'TreeTableNodeHandle';
                    if (scope.config.handleClass) {
                        element.addClass(scope.config.handleClass);
                    }
                }
            };
        }
    ).factory(
        'treeTableTemplate', [
            '$templateCache', function ($templateCache) {
                var templatePath = 'template/treeTable/treeTable.html';
                var copyPath = 'template/treeTable/treeTableStatusCopy.html';
                var movePath = 'template/treeTable/treeTableStatusMove.html';
                var scopes = {};
                return {
                    setMove: function (path, scope) {
                        if (!scopes[scope.$id]) {
                            scopes[scope.$id] = {};
                        }
                        scopes[scope.$id].movePath = path;
                    },
                    setCopy: function (path, scope) {
                        if (!scopes[scope.$id]) {
                            scopes[scope.$id] = {};
                        }
                        scopes[scope.$id].copyPath = path;
                    },
                    getPath: function () {
                        return templatePath;
                    },
                    getCopy: function (scope) {
                        var temp;
                        if (scopes[scope.$id] && scopes[scope.$id].copyPath &&
                            (temp = $templateCache.get(scopes[scope.$id].copyPath))) {
                            return temp;
                        }
                        return $templateCache.get(copyPath);
                    },
                    getMove: function (scope) {
                        var temp;
                        if (scopes[scope.$id] && scopes[scope.$id].movePath &&
                            (temp = $templateCache.get(scopes[scope.$id].movePath))) {
                            return temp;
                        }
                        return $templateCache.get(movePath);
                    }
                };

            }]
    ).factory(
        '$TreeTableHelper', [
            '$document', '$window', function ($document, $window) {
                return {
                    calsIndent:      null,
                    nodrag:          function (targetElm) {
                        return (typeof targetElm.attr('data-nodrag')) != "undefined";
                    },
                    eventObj:        function (e) {
                        var obj = e;
                        if (e['targetTouches'] !== undefined) {
                            obj = e['targetTouches'].item(0);
                        } else if (e.originalEvent !== undefined && e.originalEvent['targetTouches'] !== undefined) {
                            obj = e.originalEvent['targetTouches'].item(0);
                        }
                        return obj;
                    },
                    dragInfo:        function (scope) {
                        var _node = scope.node();
                        return {
                            node:      _node,
                            parent:    scope.getNode(_node.__parent_real__),
                            level:     _node.__level__,
                            target:    scope.prev(),
                            scope:     scope,
                            drag:      scope,
                            move:      {
                                parent: -1,
                                pos:    -1
                            },
                            isDirty:   function (index) {
                                return this.node.__index_real__ <= index && index <= this.node.__index_real__ + this.node.__dept__ - 1;
                            },
                            canIndent: function () {
                                if (this.level == 1) {
                                    return false;
                                }
                                var _target = this.target;
                                var _node = _target;
                                while (_target) {
                                    if (_target.__level__ < this.level) {
                                        if (_target.__expanded__) {
                                            if (_target.__children__.length == 0) {
                                                return _target;
                                            } else if (
                                                (_target.__index_real__ == this.target.__parent_real__ &&
                                                 _target.__children__.length - 1 == this.target.__index__)
                                                || (_target.__index_real__ == _node.__parent_real__ &&
                                                    _target.__children__.length - 1 == _node.__index__)
                                                || (this.drag == this.scope && _target.__index_real__ == this.node.__parent_real__ &&
                                                    _target.__children__.length - 1 == this.node.__index__)) {
                                                return _target;
                                            }
                                            return false;
                                        }
                                        return _target;
                                    } else if (_target.__parent_real__ == null) {
                                        return null;
                                    } else {
                                        _node = _target;
                                        _target = this.scope.tree_rows[_target.__parent_real__];
                                    }
                                }
                                return false;
                            },
                            canInsert: function (_target) {
                                if (_target.__children__.length == 0) {
                                    return true;
                                } else if ((_target.__index_real__ == this.target.__parent_real__ && _target.__children__.length - 1 == this.target.__index__) || (_target.__index_real__ == this.node.__parent_real__ && _target.__children__.length - 1 == this.node.__index__)) {
                                    return _target;
                                }
                                return false;
                            }
                        };
                    },
                    height:          function (element) {
                        return element.prop('scrollHeight');
                    },
                    width:           function (element) {
                        return element.prop('scrollWidth');
                    },
                    offset:          function (element) {
                        var boundingClientRect = element[0].getBoundingClientRect();
                        return {
                            width:  element.prop('offsetWidth'),
                            height: element.prop('offsetHeight'),
                            top:    boundingClientRect.top + ($window.pageYOffset || $document[0].body.scrollTop || $document[0].documentElement.scrollTop),
                            left:   boundingClientRect.left + ($window.pageXOffset || $document[0].body.scrollLeft || $document[0].documentElement.scrollLeft)
                        };
                    },
                    positionStarted: function (e, target) {
                        var pos = {};
                        pos.offsetX = e.pageX - this.offset(target).left;
                        pos.offsetY = e.pageY - this.offset(target).top;
                        pos.startX = pos.lastX = e.pageX;
                        pos.startY = pos.lastY = e.pageY;
                        pos.nowX = pos.nowY = pos.distX = pos.distY = pos.dirAx = 0;
                        pos.dirX = pos.dirY = pos.lastDirX = pos.lastDirY = pos.distAxX = pos.distAxY = 0;
                        return pos;
                    },
                    positionMoved:   function (e, pos, firstMoving) {
                        // mouse position last events
                        pos.lastX = pos.nowX;
                        pos.lastY = pos.nowY;
                        // mouse position this events
                        pos.nowX = e.pageX;
                        pos.nowY = e.pageY;
                        // distance mouse moved between events
                        pos.distX = pos.nowX - pos.lastX;
                        pos.distY = pos.nowY - pos.lastY;
                        // direction mouse was moving
                        pos.lastDirX = pos.dirX;
                        pos.lastDirY = pos.dirY;
                        // direction mouse is now moving (on both axis)
                        pos.dirX = pos.distX === 0 ? 0 : pos.distX > 0 ? 1 : -1;
                        pos.dirY = pos.distY === 0 ? 0 : pos.distY > 0 ? 1 : -1;
                        // axis mouse is now moving on
                        var newAx = Math.abs(pos.distX) > Math.abs(pos.distY) ? 1 : 0;
                        // do nothing on first move
                        if (firstMoving) {
                            pos.dirAx = newAx;
                            pos.moving = true;
                            return;
                        }
                        // calc distance moved on this axis (and direction)
                        if (pos.dirAx !== newAx) {
                            pos.distAxX = 0;
                            pos.distAxY = 0;
                        } else {
                            pos.distAxX += Math.abs(pos.distX);
                            if (pos.dirX !== 0 && pos.dirX !== pos.lastDirX) {
                                pos.distAxX = 0;
                            }
                            pos.distAxY += Math.abs(pos.distY);
                            if (pos.dirY !== 0 && pos.dirY !== pos.lastDirY) {
                                pos.distAxY = 0;
                            }
                        }
                        pos.dirAx = newAx;
                    },
                    replaceIndent:   function (scope, element, indent, attr) {
                        attr = attr ? attr : 'left';
                        angular.element(element.children()[0]).css(attr, scope.$callbacks.calsIndent(indent));
                    }
                };
            }]
    ).factory(
        '$TreeTableConvert', function () {
            return {
                line2tree: function (data, primaryKey, parentKey) {
                    if (!data || data.length == 0 || !primaryKey || !parentKey) {
                        return [];
                    }
                    var tree = [], rootIds = [], item = data[0], _primary = item[primaryKey], treeObjs = {}, parentId, parent, len = data.length, i = 0;
                    while (i < len) {
                        item = data[i++];
                        _primary = item[primaryKey];
                        treeObjs[_primary] = item;
                        parentId = item[parentKey];
                        if (parentId) {
                            parent = treeObjs[parentId];
                            if (parent.__children__) {
                                parent.__children__.push(item);
                            } else {
                                parent.__children__ = [item];
                            }
                        } else {
                            rootIds.push(_primary);
                        }
                    }
                    len = rootIds.length;
                    for (i = 0; i < len; i++) {
                        tree.push(treeObjs[rootIds[i]]);
                    }
                    return tree;
                },
                tree2tree: function (data, parentKey) {
                    var access_child = function (data) {
                        var _tree = [];
                        var _i, _len = data.length, _copy, _child;
                        for (_i = 0; _i < _len; _i++) {
                            _copy = angular.copy(data[_i]);
                            if (angular.isArray(_copy[parentKey]) && _copy[parentKey].length > 0) {
                                _child = access_child(_copy[parentKey]);
                                delete(_copy[parentKey]);
                                _copy.__children__ = _child;
                            }
                            _tree.push(_copy);
                        }
                        return _tree;
                    }
                    return access_child(data);
                }
            }
        }
    ).constant(
        'tgConfig', {
            treeClass:        'tree-table',
            emptyTreeClass:   'tree-table-empty',
            hiddenClass:      'tree-table-hidden',
            nodeClass:        'tree-table-row',
            nodesClass:       'tree-table-rows',
            handleClass:      'tree-table-handle',
            placeHolderClass: 'tree-table-placeholder',
            dragClass:        'tree-table-drag',
            statusClass:      'tree-table-status',
            levelThreshold:   30
        }
    );
}).call(window);