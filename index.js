var requireLike = require('require-like');
var stackTrace = require('stack-trace');
var Module = require('module');
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var sanboxed_module = require('sandboxed-module');
var vm = require('vm');

module.exports = Scoff;

function Scoff() {

  this.id = null;
  this.filename = null;
  this.module = null;
  this.globals = {};
  this.locals = {};
  this.required = {};

  this._knownGlobals = [];
  this._options = {};
  this._mock = null;
}


Scoff.wrap = function(thing, options) {
  if (typeof(thing) === 'string') {
    var scoff = new Scoff();
    var trace = stackTrace.get(Scoff.wrap);
    scoff._init_module_sandbox(thing, trace, options);
    scoff.module.exports.mock = sinon.mock(scoff.module.exports);
    return scoff.module.exports;
  } else if (typeof(thing) === 'object') {
    thing.mock = sinon.mock(thing);
    return thing;
  }
};

/* Originally from @felixge's Node-sanboxed-module
 * https://github.com/felixge/node-sandboxed-module
 */
Scoff.prototype.getGlobalLeaks = function() {
  var self = this;
  return Object.keys(this.globals).filter(function(variable) {
    return self._knownGlobals.indexOf(variable) === -1;
  });
};

Scoff.prototype.__defineGetter__('exports', function() {
  return this.module.exports;
});


Scoff.prototype._init_module_sandbox = function(moduleId, trace, options) {
  this.id = moduleId;
  this._resolveFilename(trace);

  this._options = options || {};

  var module = new Module(this.filename);
  module.filename = this.filename;

  this.module = module;

  this.locals = this._getLocals();
  this.globals = this._getGlobals();
  for (var key in this.globals) {
    this._knownGlobals.push(key);
  }

  this._compile();
};

Scoff.prototype._resolveFilename = function(trace) {
  var originPath = trace[0].getFileName();
  this.filename = requireLike(originPath).resolve(this.id);
};

Scoff.prototype._getLocals = function() {
  var locals = {
    require: this._requireInterceptor(),
    __filename: this.filename,
    __dirname: path.dirname(this.filename),
    module: this.module,
    exports: this.exports,
  };

  for (var key in this._options.locals) {
    locals[key] = this._options.locals[key];
  }

  return locals;
};

Scoff.prototype._getGlobals = function() {
  var globals = {};

  for (var key in global) {
    globals[key] = global[key];
  }

  for (var key in this._options.globals) {
    globals[key] = this._options.globals[key];
  }

  return globals;
};

Scoff.prototype._requireInterceptor = function() {
  var requireProxy = requireLike(this.filename, true)
  var inject = this._options.requires;
  var self = this;

  function requireInterceptor(request) {
    var exports;
    if (inject && (request in inject)) {
      exports = inject[request];
    } else {
      try {
        exports = requireProxy(request);
      } catch(e) {
        console.log("FFFFFFFFF");
      }
    }
    return self.required[request] = exports;
  }

  for (var key in requireProxy) {
    requireInterceptor[key] = requireProxy[key];
  }

  return requireInterceptor;
};

Scoff.prototype._compile = function() {
  var compile = this._getCompileInfo();
  var compiledWrapper = vm.runInNewContext(
    compile.source,
    this.globals,
    this.filename
  );

  this.globals = compiledWrapper.apply(this.exports, compile.parameters);
};

Scoff.prototype._getCompileInfo = function() {
  var localVariables = [];
  var localValues = [];

  for (var localVariable in this.locals) {
    localVariables.push(localVariable);
    localValues.push(this.locals[localVariable]);
  }

  var source =
    '(function(' + localVariables.join(', ')  + ') { ' +
    'global = GLOBAL = root = (function() { return this; })();' +
    fs.readFileSync(this.filename, 'utf8') +
    '\n' +
    'return global;\n' +
    '});';

  return {source: source, parameters: localValues};
};
