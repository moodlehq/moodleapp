# angular-ckeditor

[![Build Status](https://travis-ci.org/lemonde/angular-ckeditor.svg?branch=master)](https://travis-ci.org/lemonde/angular-ckeditor)
[![Dependency Status](https://david-dm.org/lemonde/angular-ckeditor.svg?theme=shields.io)](https://david-dm.org/lemonde/angular-ckeditor)
[![devDependency Status](https://david-dm.org/lemonde/angular-ckeditor/dev-status.svg?theme=shields.io)](https://david-dm.org/lemonde/angular-ckeditor#info=devDependencies)

CKEditor directive for Angular.


## Install

### Using bower

```sh
bower install angular-ckeditor
```

Note : obviously this plugin expects the presence of AngularJS and CKEditor.


## Usage

### Example

HTML:

```html
<!-- Load files. -->
<script src="angular.js"></script>
<script src="ckeditor.js"></script>
<script src="angular-ckeditor.js"></script>

<div ng-controller="CkeditorCtrl">
  <div ckeditor="options" ng-model="content" ready="onReady()"></div>
</div>
```

JavaScript:

```js
angular.module('controllers.ckeditor', ['ckeditor'])
.controller('CkeditorCtrl', ['$scope', function ($scope) {

  // Editor options.
  $scope.options = {
    language: 'en',
    allowedContent: true,
    entities: false
  };

  // Called when the editor is completely ready.
  $scope.onReady = function () {
    // ...
  };
}]);
```

### "ckeditor" directive

- "ckeditor" editor options. Accepts an Object.
- "ng-model" bound scope variable.
- "ready" (optional) callback called when the editor is completely ready. Accepts an Angular expression.
- "contenteditable" (optional) if set to true, inline editing mode is enabled

**IMPORTANT NOTICE**
Angular-ckeditor uses `ng-model`. If you add an `ng-if` on the element to whom this directive is attached, changes in the editor won't be forwarded to your code anymore, due to the extra scope created by `ng-if`. A solution is to explicitely bypass the extra scope : `ng-model="$parent.model"`. See http://stackoverflow.com/questions/18342917/angularjs-ng-model-doesnt-work-inside-ng-if


## Advanced usage

### getting internal ckeditor instance
Internally, CKEditor gives a name to its instances, either **the id of the element it's on** or automatic name (editor1, editor2...). If you plan to look for your instances programmatically via `CKEditor.istances`, be sure to give them a unique id="..." (Beware of re-usable directives).

In a directive on the same element, you can also use :
```javascript
link: function (scope, element) {
  var ckeditorController = element.controller('ckeditor'); // angular-ckeditor controller
  var ckeditorInstance = ckeditorController.instance;
```


## See also
You may find this other directive useful : https://github.com/lemonde/angular-ckeditor-placeholder


## License

MIT


## Contributing
* clone repo
* ensure your editor is decent and pick up the `.editorconfig` and `.jshintrc` files
* `npm install`
* `npm test`
* add tests, add features
* `grunt` (to generate minified version)
* send a PR

Thanks !
