## v3.0.0
* Renamed 
    * module `treeTable` to `ntt.TreeDnD`
    * `angular-tree-table` to `angular-tree-dnd`:
    * `tree-table` to `tree-dnd`.
    * `tree-table-node` to `tree-dnd-node`.
    * `tree-table-nodes` to `tree-dnd-nodes`.
    * `datas` in `tree-table-nodes` to `nodes`.
    * `branch` to `node`.
    
## v2.1.1
* Fix call function 'on-click', 'on-select'
* Fix `status` dragging.
* Fix `factory Template`

## v2.1.0
* Fix __hashKey__
* Able Drag data in tree-table different *(supported)*
* Removed:
    * `__tree_icon__` *(in Tree_Data)*: changed to `__icon__` *(-1: leaf, 0: collect, 1: expaned)*
* Added `$iconClass` replace for `__tree_icon__` *(avoid conflict when create tree-table use one `tree-data`)*
* Add function:
    * re-Add function `dropped` in `$callbaks` *(used to copying or remove node old)*:
        * 
        ```html
            dropped:     function (info, pass, isMove);
        ```
        * With param:
            * info: 
                * drag: Scope of Node dragging.
                * tree: Scope of Node Target.
                * node: Node dragging.
                * parent: Parent containd Node Dragging.
                * move:
                    * parent: Node parent to move node dragging to.
                    * pos: Position insert.
                * target: Data node Target *(able skip, not important)*
             * pass: bypass resutl in `$callback.beforeDrop:`.
             * isMove: status Moving or Copying.
    * 'onSelect': Select and callback function `on-select` *(created in `directive`)*
    * 'onClick': callback function `on-click`. *(created in `directive`)*
    * 'column-defs': `null` will auto get colDefinitions *(sample with `empty`)*.
    * 'toggleExpand': use toggle Expand;
* Next Feature:
    * Allow load Children dynamic with '$http'.

## v2.0.1
* Fix remove indent when drag elemnt with level > 1;
* Fix drag not two tree-table different *(development, not support)*.
* Add attributes
    * enable-move: `true`: To move node, `false`: to copy node *(default `true`)*
    * enable-hotkey: `true`: press 'shift' to move node, unpress 'shift' to copy node. *(default `false`)*
    * enable-drag: to Enable-drag *(default `true`)*
    * enable-status: to show status moving, copying *(default `false`)*
    * template-copy: to add url template of `Status Copy` *(can bypass string or variable in controller, but just only get $templateCache, if not exist will get default)*;
    * template-move: to add url template of `Status Move` *(can bypass string or variable in controller, but just only get $templateCache, if not exist will get default)*;
    * Example:
```html
<tree-table class="tree-table table table-hover b-b b-light" tree-data="tree_data" tree-control="my_tree"
    primary-key="primaryKey" 
    callbacks="callbacks" 
    
    enable-drag="true"
    enable-status="true" 
    enable-move="true" 
    icon-leaf="none" 
    icon-expand="fa fa-fw fa-angle-right"
    icon-collapse="fa fa-fw fa-angle-down" 
    
    column-defs="col_defs" 
    expand-on="expanding_property"
    
    template-url="tree-table-template.html" 
    template-move="'tree-table-template.html'"
    template-copy="tree-table-template.html"

    data-indent="30"
    data-indent-unit="px"
    data-indent-plus="15"
></tree-table>

```
## v2.0.0
* Fix any bug.
* Can use & display ListTree and TableTree
* Combinding with list-tree.

```html
<script type="text/ng-template" id="tree-table-template-render.html">
    <ul tree-table-nodes="tree_data" class="tree-table-rows">
        <li tree-table-node="row" ng-repeat="row in datas track by row.__hashKey__" ng-show="row.__visible__"
            ng-class="(row.__selected__ ? ' active':'')"
            ng-style="expandingProperty.cellStyle ? expandingProperty.cellStyle : {}" ng-click="user_clicks_branch(row)"
            ng-class="expandingProperty.cellClass" compile="expandingProperty.cellTemplate"
            ng-include="'tree-table-template-fetch.html'"></li>
    </ul>
</script>
<script type="text/ng-template" id="tree-table-template-fetch.html">
    <a tree-table-node-handle class="btn btn-default"> - </a>{{row[expandingProperty.field] || row[expandingProperty]}}
    <a ng-if="row.__expanded__ != null" class="btn btn-default"
       ng-click="expand(row)"> {{ (row.__expanded__) ? '-' : '+' }} </a>
    <ul tree-table-nodes="row.__children__" class="tree-table-rows">
        <li tree-table-node="row" ng-repeat="row in datas track by row.__hashKey__" ng-show="row.__visible__"
            ng-class="(row.__selected__ ? ' active':'')"
            ng-style="expandingProperty.cellStyle ? expandingProperty.cellStyle : {}" ng-click="user_clicks_branch(row)"
            ng-class="[expandingProperty.cellClass]" compile="expandingProperty.cellTemplate"
            ng-include="'tree-table-template-fetch.html'"></li>
    </ul>
</script>
<tree-table tree-data="tree_data" tree-control="my_tree" drag-enabled="true" column-defs="[]"
            expand-on="expanding_property" on-select="my_tree_handler(branch)" on-click="my_tree_handler(branch)"
            template-url="tree-table-template-render.html"></tree-table>
```

## v1.1.0
* Fix any bug.
* Fix not refresh data
* Fix error in Angular 1.3
* Combinding with list-tree *(ol,ul, li, present not compatible - beta)*
* Add infomation node into Node Target after DropStop:
```js
    scope.$callbacks.dragStop(dragInfo, _status);
```

    * _status: Status changed pos of node, Drag succeed!
    * dragInfo:
        * node:          scope.node(), // Data node dragged
        * scope:         scope, // Scope node
        * level:         scope.node().__level__, // Level indent
        * target:        scope.prev(), // Node prev
        * move:
            * parent: -1, // -1: Dragged failed, null: node root, > 0: node normal
            * pos:    -1 // Position new Note moveTo


* Add 'data' to TreeTableNode  `tree-table-node=data` in template;
```html
<tr tree-table-node="row" ng-repeat="row in tree_rows track by hashedTree(row)"
                            ng-show="row.__visible__" ng-class="(row.__selected__ ? ' active':'')" class="ng-animate ">
    ....
</tr>
```
* Add class for tree-table *(auto render to `tree_class` add to <table ng-class="tree_table">)*
```html
    <tree-table
        class="tree-table table table-hover b-b b-light"
        tree-data="tree_data" tree-control="my_tree">
    </tree-table>
```

## v1.0.3

* Add attribute 'primaryKey' to filter & reload data in repeat best (instead of default __uid__ = now())
* Add function `hashedTree` to `track by` on ng-repeat
* Fix any error when drag.
* Add demo new.
```js
    	<tree-table 
    		tree-data="tree_data" 
    		tree-control="my_tree" 
    		primary-key="primaryKey" 
    		callbacks="callbacks"
                drag-enabled="true" 
                icon-leaf="none" 
                icon-expand="fa fa-fw fa-angle-right"
                icon-collapse="fa fa-fw fa-angle-down" 
                column-defs="col_defs" 
                expand-on="expanding_property"
                template-url="tree-table-template.html" 
                on-select="my_tree_handler(branch)"
                on-click="my_tree_handler(branch)" 
                data-indent="30" data-indent-unit="px"
                data-indent-plus="15">
        </tree-table>
```

## V1.0.2
###Add function $TreeTableConvert.line2tree -> convert data line to tree vaild.

**Desciption**

```js
line2tree(data, keyPrimary, keyParent);
```

**Example:**
```js
var data = [
	{
		id: 1, 
		parent: null
	},
	{id: 2},
	{id: 3},
	{id: 4},
	{
		id: 5,
		parent: 4
	}
]

*$scope.tree_data = $TreeTableConvert.line2tree(data, 'id', 'parent');

```

***

###Add function $TreeTableConvert.tree2tree -> convert data tree to tree vaild.

**Desciption**
```js
line2tree(data, keyChildren);
```

**Example:**

```js
var data = [
	id: 1
	children: [
		{id: 2},
		{id: 3},
		{id: 4}
		{
			id: 5,
			children: []
		}
	]
];

$scope.tree_data = $TreeTableConvert.tree2tree(data, 'children');
```

***

**Result data tree vaild**
```js
   data = [
	id: 1
	__children__: [
		{id: 2},
		{id: 3},
		{id: 4}
		{
			id: 5,
			__children__: []
		}
	]
]
```
