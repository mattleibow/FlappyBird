

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};



// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;




// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

var nodeFS;
var nodePath;

if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/';
  } else {
    scriptDirectory = __dirname + '/';
  }




  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8');
  };

  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };




  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  process['on']('unhandledRejection', abort);

  quit_ = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };



} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status);
    };
  }

  if (typeof print !== 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console === 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr !== 'undefined' ? printErr : print);
  }


} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }


  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {




  read_ = function shell_read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
  };

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = function readBinary(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };




  }

  setWindowTitle = function(title) { document.title = title };
} else
{
}


// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
if (Module['arguments']) arguments_ = Module['arguments'];
if (Module['thisProgram']) thisProgram = Module['thisProgram'];
if (Module['quit']) quit_ = Module['quit'];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message





// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

function dynamicAlloc(size) {
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = Number(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}








// Wraps a JS function as a wasm function with a given signature.
function convertJsFunctionToWasm(func, sig) {

  // If the type reflection proposal is available, use the new
  // "WebAssembly.Function" constructor.
  // Otherwise, construct a minimal wasm module importing the JS function and
  // re-exporting it.
  if (typeof WebAssembly.Function === "function") {
    var typeNames = {
      'i': 'i32',
      'j': 'i64',
      'f': 'f32',
      'd': 'f64'
    };
    var type = {
      parameters: [],
      results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
    };
    for (var i = 1; i < sig.length; ++i) {
      type.parameters.push(typeNames[sig[i]]);
    }
    return new WebAssembly.Function(type, func);
  }

  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  var typeSection = [
    0x01, // id: section,
    0x00, // length: 0 (placeholder)
    0x01, // count: 1
    0x60, // form: func
  ];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {
    'i': 0x7f, // i32
    'j': 0x7e, // i64
    'f': 0x7d, // f32
    'd': 0x7c, // f64
  };

  // Parameters, length + signatures
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  }

  // Return values, length + signatures
  // With no multi-return in MVP, either 0 (void) or 1 (anything else)
  if (sigRet == 'v') {
    typeSection.push(0x00);
  } else {
    typeSection = typeSection.concat([0x01, typeCodes[sigRet]]);
  }

  // Write the overall length of the type section back into the section header
  // (excepting the 2 bytes for the section id and length)
  typeSection[1] = typeSection.length - 2;

  // Rest of the module is static
  var bytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
    0x01, 0x00, 0x00, 0x00, // version: 1
  ].concat(typeSection, [
    0x02, 0x07, // import section
      // (import "e" "f" (func 0 (type 0)))
      0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
    0x07, 0x05, // export section
      // (export "f" (func 0 (type 0)))
      0x01, 0x01, 0x66, 0x00, 0x00,
  ]));

   // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {
    'e': {
      'f': func
    }
  });
  var wrappedFunc = instance.exports['f'];
  return wrappedFunc;
}

var freeTableIndexes = [];

// Weak map of functions in the table to their indexes, created on first use.
var functionsInTableMap;

// Add a wasm function to the table.
function addFunctionWasm(func, sig) {
  var table = wasmTable;

  // Check if the function is already in the table, to ensure each function
  // gets a unique index. First, create the map if this is the first use.
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap();
    for (var i = 0; i < table.length; i++) {
      var item = table.get(i);
      // Ignore null values.
      if (item) {
        functionsInTableMap.set(item, i);
      }
    }
  }
  if (functionsInTableMap.has(func)) {
    return functionsInTableMap.get(func);
  }

  // It's not in the table, add it now.


  var ret;
  // Reuse a free index if there is one, otherwise grow.
  if (freeTableIndexes.length) {
    ret = freeTableIndexes.pop();
  } else {
    ret = table.length;
    // Grow the table
    try {
      table.grow(1);
    } catch (err) {
      if (!(err instanceof RangeError)) {
        throw err;
      }
      throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
    }
  }

  // Set the new value.
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    table.set(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    var wrapped = convertJsFunctionToWasm(func, sig);
    table.set(ret, wrapped);
  }

  functionsInTableMap.set(func, ret);

  return ret;
}

function removeFunctionWasm(index) {
  functionsInTableMap.delete(wasmTable.get(index));
  freeTableIndexes.push(index);
}

// 'sig' parameter is required for the llvm backend but only when func is not
// already a WebAssembly function.
function addFunction(func, sig) {

  return addFunctionWasm(func, sig);
}

function removeFunction(index) {
  removeFunctionWasm(index);
}



var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}







function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

/** @param {Array=} args */
function dynCall(sig, ptr, args) {
  if (args && args.length) {
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    return Module['dynCall_' + sig].call(null, ptr);
  }
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
  tempRet0 = value;
};

var getTempRet0 = function() {
  return tempRet0;
};


// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;





// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
var noExitRuntime;if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];


if (typeof WebAssembly !== 'object') {
  err('no native wasm support detected');
}




// In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
// In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

/** @param {number} ptr
    @param {number} value
    @param {string} type
    @param {number|boolean=} noSafe */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @param {number} ptr
    @param {string} type
    @param {number|boolean=} noSafe */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}






// Wasm globals

var wasmMemory;

// In fastcomp asm.js, we don't need a wasm Table at all.
// In the wasm backend, we polyfill the WebAssembly object,
// so this creates a (non-native-wasm) table for us.
var wasmTable = new WebAssembly.Table({
  'initial': 7849,
  'element': 'anyfunc'
});


//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

// C calling interface.
/** @param {string|null=} returnType
    @param {Array=} argTypes
    @param {Arguments|Array=} args
    @param {Object=} opts */
function ccall(ident, returnType, argTypes, args, opts) {
  // For fast lookup of conversion functions
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };

  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);

  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

/** @param {string=} returnType
    @param {Array=} argTypes
    @param {Object=} opts */
function cwrap(ident, returnType, argTypes, opts) {
  argTypes = argTypes || [];
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = argTypes.every(function(type){ return type === 'number'});
  var numericRet = returnType !== 'string';
  if (numericRet && numericArgs && !opts) {
    return getCFunc(ident);
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_DYNAMIC = 2; // Cannot be freed except through sbrk
var ALLOC_NONE = 3; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc,
    stackAlloc,
    dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}




// runtime_strings.js: Strings related runtime functions that are part of both MINIMAL_RUNTIME and regular runtime.

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr));
  } else {
    var str = '';
    // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = heap[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = heap[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = heap[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   heap: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 0xC0 | (u >> 6);
      heap[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 0xE0 | (u >> 12);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 0xF0 | (u >> 18);
      heap[outIdx++] = 0x80 | ((u >> 12) & 63);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) ++len;
    else if (u <= 0x7FF) len += 2;
    else if (u <= 0xFFFF) len += 3;
    else len += 4;
  }
  return len;
}





// runtime_strings_extra.js: Strings related runtime functions that are available only in regular runtime.

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAPU8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;

function UTF16ToString(ptr, maxBytesToRead) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  var maxIdx = idx + maxBytesToRead / 2;
  // If maxBytesToRead is not passed explicitly, it will be undefined, and this
  // will always evaluate to true. This saves on code size.
  while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0 || i == maxBytesToRead / 2) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr, maxBytesToRead) {
  var i = 0;

  var str = '';
  // If maxBytesToRead is not passed explicitly, it will be undefined, and this
  // will always evaluate to true. This saves on code size.
  while (!(i >= maxBytesToRead / 4)) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0) break;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
  return str;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated
    @param {boolean=} dontAddNull */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}

/** @param {boolean=} dontAddNull */
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}



// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}

var STATIC_BASE = 1024,
    STACK_BASE = 6557792,
    STACKTOP = STACK_BASE,
    STACK_MAX = 1314912,
    DYNAMIC_BASE = 6557792,
    DYNAMICTOP_PTR = 1314736;



var TOTAL_STACK = 5242880;

var INITIAL_INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 134217728;









// In non-standalone/normal mode, we create the memory here.



// Create the main memory. (Note: this isn't used in STANDALONE_WASM mode since the wasm
// memory is created in the wasm, not in JS.)

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE
      ,
      'maximum': 2147483648 / WASM_PAGE_SIZE
    });
  }


if (wasmMemory) {
  buffer = wasmMemory.buffer;
}

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['INITIAL_MEMORY'].
INITIAL_INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;














function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback(Module); // Pass the module as the first argument.
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;
  if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
TTY.init();
PIPEFS.root = FS.mount(PIPEFS, {}, null);
SOCKFS.root = FS.mount(SOCKFS, {}, null);
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  FS.ignorePermissions = false;
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  runtimeExited = true;
}

function postRun() {

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

/** @param {number|boolean=} ignore */
function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
/** @param {number|boolean=} ignore */
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}




// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;



// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data

/** @param {string|number=} what */
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what += '';
  out(what);
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';

  // Throw a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  throw new WebAssembly.RuntimeError(what);
}


var memoryInitializer = null;












function hasPrefix(str, prefix) {
  return String.prototype.startsWith ?
      str.startsWith(prefix) :
      str.indexOf(prefix) === 0;
}

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return hasPrefix(filename, dataURIPrefix);
}

var fileURIPrefix = "file://";

// Indicates whether filename is delivered via file protocol (as opposed to http/https)
function isFileURI(filename) {
  return hasPrefix(filename, fileURIPrefix);
}




var wasmBinaryFile = 'dotnet.wasm';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary);
    }

    if (readBinary) {
      return readBinary(wasmBinaryFile);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // If we don't have the binary yet, and have the Fetch api, use that;
  // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function'
      // Let's not use fetch to get objects over file:// as it's most likely Cordova which doesn't support fetch for file://
      && !isFileURI(wasmBinaryFile)
      ) {
    return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
      if (!response['ok']) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
      }
      return response['arrayBuffer']();
    }).catch(function () {
      return getBinary();
    });
  }
  // Otherwise, getBinary should be able to get it synchronously
  return new Promise(function(resolve, reject) {
    resolve(getBinary());
  });
}



// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': asmLibraryArg,
    'wasi_snapshot_preview1': asmLibraryArg
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate');
  }
  // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');


  function receiveInstantiatedSource(output) {
    // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(output['instance']);
  }


  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
  }

  // Prefer streaming instantiation if available.
  function instantiateAsync() {
    if (!wasmBinary &&
        typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) &&
        // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
        !isFileURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            return instantiateArrayBuffer(receiveInstantiatedSource);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource);
    }
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}


// Globals used by JS i64 conversions
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = {
  1345: function($0, $1) {MONO.string_decoder.decode($0, $0 + $1, true);},  
 1722: function($0, $1, $2) {var str = MONO.string_decoder.decode ($0, $0 + $1); try { var res = eval (str); if (res === null || res == undefined) return 0; res = res.toString (); setValue ($2, 0, "i32"); } catch (e) { res = e.toString (); setValue ($2, 1, "i32"); if (res === null || res === undefined) res = "unknown exception"; } var buff = Module._malloc((res.length + 1) * 2); stringToUTF16 (res, buff, (res.length + 1) * 2); return buff;},  
 2242: function() {var err = new Error(); console.log ("Stacktrace: \n"); console.log (err.stack);},  
 694665: function($0, $1, $2) {MONO.mono_wasm_add_typed_value ('pointer', $0, { ptr_addr: $1, klass_addr: $2 });},  
 694758: function($0, $1, $2) {MONO.mono_wasm_add_typed_value ('array', $0, { objectId: $1, length: $2 });},  
 1179160: function() {return STACK_MAX;},  
 1179182: function() {return TOTAL_STACK;}
};

function _emscripten_asm_const_iii(code, sigPtr, argbuf) {
  var args = readAsmConstArgs(sigPtr, argbuf);
  return ASM_CONSTS[code].apply(null, args);
}function compile_function(snippet_ptr,len,is_exception){ try { var data = MONO.string_decoder.decode (snippet_ptr, snippet_ptr + len); var wrapper = '(function () { ' + data + ' })'; var funcFactory = eval(wrapper); var func = funcFactory(); if (typeof func !== 'function') { throw new Error('Code must return an instance of a JavaScript function. ' + 'Please use `return` statement to return a function.'); } setValue (is_exception, 0, "i32"); return BINDING.js_to_mono_obj (func); } catch (e) { res = e.toString (); setValue (is_exception, 1, "i32"); if (res === null || res === undefined) res = "unknown exception"; return BINDING.js_to_mono_obj (res); } }
function mono_wasm_timezone_get_local_name(){ var res = "UTC"; try { res = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {} var buff = Module._malloc((res.length + 1) * 2); stringToUTF16 (res, buff, (res.length + 1) * 2); return buff; }



// STATICTOP = STATIC_BASE + 1313888;
/* global initializers */  __ATINIT__.push({ func: function() { ___wasm_call_ctors() } });




/* no memory initializer */
// {{PRE_LIBRARY}}


  function demangle(func) {
      return func;
    }

  function demangleAll(text) {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }

  function jsStackTrace() {
      var err = new Error();
      if (!err.stack) {
        // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
        // so try that as a special-case.
        try {
          throw new Error();
        } catch(e) {
          err = e;
        }
        if (!err.stack) {
          return '(no stack trace available)';
        }
      }
      return err.stack.toString();
    }

  function stackTrace() {
      var js = jsStackTrace();
      if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
      return demangleAll(js);
    }

  function ___assert_fail(condition, filename, line, func) {
      abort('Assertion failed: ' + UTF8ToString(condition) + ', at: ' + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    }

  
  
  var _emscripten_get_now;if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = function() {
      var t = process['hrtime']();
      return t[0] * 1e3 + t[1] / 1e6;
    };
  } else if (typeof dateNow !== 'undefined') {
    _emscripten_get_now = dateNow;
  } else _emscripten_get_now = function() { return performance.now(); }
  ;
  
  var _emscripten_get_now_is_monotonic=true;;
  
  function setErrNo(value) {
      HEAP32[((___errno_location())>>2)]=value;
      return value;
    }function _clock_gettime(clk_id, tp) {
      // int clock_gettime(clockid_t clk_id, struct timespec *tp);
      var now;
      if (clk_id === 0) {
        now = Date.now();
      } else if ((clk_id === 1 || clk_id === 4) && _emscripten_get_now_is_monotonic) {
        now = _emscripten_get_now();
      } else {
        setErrNo(28);
        return -1;
      }
      HEAP32[((tp)>>2)]=(now/1000)|0; // seconds
      HEAP32[(((tp)+(4))>>2)]=((now % 1000)*1000*1000)|0; // nanoseconds
      return 0;
    }function ___clock_gettime(a0,a1
  ) {
  return _clock_gettime(a0,a1);
  }

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  
  function _atexit(func, arg) {
      __ATEXIT__.unshift({ func: func, arg: arg });
    }function ___cxa_atexit(a0,a1
  ) {
  return _atexit(a0,a1);
  }

  
  var ___exception_infos={};
  
  var ___exception_caught= [];
  
  function ___exception_addRef(ptr) {
      if (!ptr) return;
      var info = ___exception_infos[ptr];
      info.refcount++;
    }
  
  function ___exception_deAdjust(adjusted) {
      if (!adjusted || ___exception_infos[adjusted]) return adjusted;
      for (var key in ___exception_infos) {
        var ptr = +key; // the iteration key is a string, and if we throw this, it must be an integer as that is what we look for
        var adj = ___exception_infos[ptr].adjusted;
        var len = adj.length;
        for (var i = 0; i < len; i++) {
          if (adj[i] === adjusted) {
            return ptr;
          }
        }
      }
      return adjusted;
    }function ___cxa_begin_catch(ptr) {
      var info = ___exception_infos[ptr];
      if (info && !info.caught) {
        info.caught = true;
        __ZSt18uncaught_exceptionv.uncaught_exceptions--;
      }
      if (info) info.rethrown = false;
      ___exception_caught.push(ptr);
      ___exception_addRef(___exception_deAdjust(ptr));
      return ptr;
    }

  
  var ___exception_last=0;
  
  
  function ___cxa_free_exception(ptr) {
        return _free(ptr);
    }function ___exception_decRef(ptr) {
      if (!ptr) return;
      var info = ___exception_infos[ptr];
      info.refcount--;
      // A rethrown exception can reach refcount 0; it must not be discarded
      // Its next handler will clear the rethrown flag and addRef it, prior to
      // final decRef and destruction here
      if (info.refcount === 0 && !info.rethrown) {
        if (info.destructor) {
          // In Wasm, destructors return 'this' as in ARM
          Module['dynCall_ii'](info.destructor, ptr);
        }
        delete ___exception_infos[ptr];
        ___cxa_free_exception(ptr);
      }
    }function ___cxa_end_catch() {
      // Clear state flag.
      _setThrew(0);
      // Call destructor if one is registered then clear it.
      var ptr = ___exception_caught.pop();
      if (ptr) {
        ___exception_decRef(___exception_deAdjust(ptr));
        ___exception_last = 0; // XXX in decRef?
      }
    }

  function ___cxa_find_matching_catch_2() {
      var thrown = ___exception_last;
      if (!thrown) {
        // just pass through the null ptr
        return ((setTempRet0(0),0)|0);
      }
      var info = ___exception_infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((setTempRet0(0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = ___cxa_is_pointer_type(throwntype);
      // can_catch receives a **, add indirection
      var buffer = 1314896;
      HEAP32[((buffer)>>2)]=thrown;
      thrown = buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && ___cxa_can_catch(typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted.push(thrown);
          return ((setTempRet0(typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((setTempRet0(throwntype),thrown)|0);
    }

  function ___cxa_find_matching_catch_3() {
      var thrown = ___exception_last;
      if (!thrown) {
        // just pass through the null ptr
        return ((setTempRet0(0),0)|0);
      }
      var info = ___exception_infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((setTempRet0(0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = ___cxa_is_pointer_type(throwntype);
      // can_catch receives a **, add indirection
      var buffer = 1314896;
      HEAP32[((buffer)>>2)]=thrown;
      thrown = buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && ___cxa_can_catch(typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted.push(thrown);
          return ((setTempRet0(typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((setTempRet0(throwntype),thrown)|0);
    }


  function ___cxa_rethrow() {
      var ptr = ___exception_caught.pop();
      ptr = ___exception_deAdjust(ptr);
      if (!___exception_infos[ptr].rethrown) {
        // Only pop if the corresponding push was through rethrow_primary_exception
        ___exception_caught.push(ptr);
        ___exception_infos[ptr].rethrown = true;
      }
      ___exception_last = ptr;
      throw ptr;
    }

  function ___cxa_throw(ptr, type, destructor) {
      ___exception_infos[ptr] = {
        ptr: ptr,
        adjusted: [ptr],
        type: type,
        destructor: destructor,
        refcount: 0,
        caught: false,
        rethrown: false
      };
      ___exception_last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exceptions = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exceptions++;
      }
      throw ptr;
    }

  function ___cxa_uncaught_exceptions() {
      return __ZSt18uncaught_exceptionv.uncaught_exceptions;
    }

  function ___map_file(pathname, size) {
      setErrNo(63);
      return -1;
    }

  function ___resumeException(ptr) {
      if (!___exception_last) { ___exception_last = ptr; }
      throw ptr;
    }

  
  
  var PATH={splitPath:function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function(parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function(path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function(path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function(path) {
        return PATH.splitPath(path)[3];
      },join:function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function(l, r) {
        return PATH.normalize(l + '/' + r);
      }};
  
  
  var PATH_FS={resolve:function() {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function(from, to) {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function(stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function(stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function(tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              try {
                bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null);
              } catch(e) {
                // Cross-platform differences: on Windows, reading EOF throws an exception, but on other OSes,
                // reading EOF returns 0. Uniformize behavior by treating the EOF exception to return 0.
                if (e.toString().indexOf('EOF') != -1) bytesRead = 0;
                else throw e;
              }
  
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
            } else
            if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function(mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function(node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
        return;
      },resizeFileStorage:function(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function(parent, name) {
          throw FS.genericErrors[44];
        },mknod:function(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function(old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function(parent, name) {
          delete parent.contents[name];
        },rmdir:function(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
        },readdir:function(node) {
          var entries = ['.', '..'];
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        }},stream_ops:{read:function(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function(stream, buffer, offset, length, position, canOwn) {
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to do copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },llseek:function(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },allocate:function(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function(stream, address, length, position, prot, flags) {
          // We don't currently support location hints for the address of the mapping
          assert(address === 0);
  
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            HEAP8.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function(stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function() {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function(mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function(mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function(name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        if (!req) {
          return callback("Unable to connect to IndexedDB");
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function(mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { 'timestamp': stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function(mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          try {
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
            transaction.onerror = function(e) {
              callback(this.error);
              e.preventDefault();
            };
  
            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            var index = store.index('timestamp');
  
            index.openKeyCursor().onsuccess = function(event) {
              var cursor = event.target.result;
  
              if (!cursor) {
                return callback(null, { type: 'remote', db: db, entries: entries });
              }
  
              entries[cursor.primaryKey] = { 'timestamp': cursor.key };
  
              cursor.continue();
            };
          } catch (e) {
            return callback(e);
          }
        });
      },loadLocalEntry:function(path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { 'timestamp': stat.mtime, 'mode': stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { 'timestamp': stat.mtime, 'mode': stat.mode, 'contents': node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function(path, entry, callback) {
        try {
          if (FS.isDir(entry['mode'])) {
            FS.mkdir(path, entry['mode']);
          } else if (FS.isFile(entry['mode'])) {
            FS.writeFile(path, entry['contents'], { canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry['mode']);
          FS.utime(path, entry['timestamp'], entry['timestamp']);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function(path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function(store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function(store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function(store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function(src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e['timestamp'] > e2['timestamp']) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err && !errored) {
            errored = true;
            return callback(err);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        transaction.oncomplete = function(e) {
          if (!errored) {
            callback(null);
          }
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,handleFSError:function(e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return setErrNo(e.errno);
      },lookupPath:function(path, opts) {
        path = PATH_FS.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(32);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function(parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function(node) {
        FS.hashRemoveNode(node);
      },isRoot:function(node) {
        return node === node.parent;
      },isMountpoint:function(node) {
        return !!node.mounted;
      },isFile:function(mode) {
        return (mode & 61440) === 32768;
      },isDir:function(mode) {
        return (mode & 61440) === 16384;
      },isLink:function(mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function(mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function(mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function(mode) {
        return (mode & 61440) === 4096;
      },isSocket:function(mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function(str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return 2;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return 2;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },mayLookup:function(dir) {
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },mayCreate:function(dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },mayOpen:function(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function(fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },getStream:function(fd) {
        return FS.streams[fd];
      },createStream:function(stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = /** @constructor */ function(){};
          FS.FSStream.prototype = {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          };
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function(fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function() {
          throw new FS.ErrnoError(70);
        }},major:function(dev) {
        return ((dev) >> 8);
      },minor:function(dev) {
        return ((dev) & 0xff);
      },makedev:function(ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function(dev) {
        return FS.devices[dev];
      },getMounts:function(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function(populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err('warning: ' + FS.syncFSRequests + ' FS.syncfs operations in flight at once, probably just doing extra work');
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function(type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1);
      },lookup:function(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function(path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function(path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdirTree:function(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },mkdev:function(path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(10);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          err("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          err("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          err("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          err("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },unlink:function(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          err("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          err("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },lstat:function(path) {
        return FS.stat(path, true);
      },chmod:function(path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function(path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function(fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        FS.chmod(stream.node, mode);
      },chown:function(path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function(fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function(fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },utime:function(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function(path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            err("FS.trackingDelegate error on read file: " + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          err("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },isClosed:function(stream) {
        return stream.fd === null;
      },llseek:function(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position !== 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position !== 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          err("FS.trackingDelegate['onWriteToFile']('"+stream.path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function(stream, address, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        return stream.stream_ops.mmap(stream, address, length, position, prot, flags);
      },msync:function(stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function(stream) {
        return 0;
      },ioctl:function(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function(path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function(path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data === 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },cwd:function() {
        return FS.currentPath;
      },chdir:function(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto === 'object' && typeof crypto['getRandomValues'] === 'function') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else
        if (ENVIRONMENT_IS_NODE) {
          // for nodejs with or without crypto support included
          try {
            var crypto_module = require('crypto');
            // nodejs has crypto support
            random_device = function() { return crypto_module['randomBytes'](1)[0]; };
          } catch (e) {
            // nodejs doesn't have crypto support
          }
        } else
        {}
        if (!random_device) {
          // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
          random_device = function() { abort("random_device"); };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 511 /* 0777 */, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(8);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function() {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        var stdout = FS.open('/dev/stdout', 'w');
        var stderr = FS.open('/dev/stderr', 'w');
      },ensureErrnoError:function() {
        if (FS.ErrnoError) return;
        FS.ErrnoError = /** @this{Object} */ function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = /** @this{Object} */ function(errno) {
            this.errno = errno;
          };
          this.setErrno(errno);
          this.message = 'FS error';
  
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [44].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function() {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
        };
      },init:function(input, output, error) {
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function() {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function(canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function(parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function(relative, base) {
        return PATH_FS.resolve(base, relative);
      },standardizePath:function(path) {
        return PATH.normalize(path);
      },findObject:function(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          setErrNo(ret.error);
          return null;
        }
      },analyzePath:function(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function(parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function(parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function(parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function(parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function(parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (read_) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(read_(obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) setErrNo(29);
        return success;
      },createLazyFile:function(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        /** @constructor */
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = /** @this{Object} */ function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        };
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: /** @this{Object} */ function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: /** @this{Object} */ function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: /** @this {FSNode} */ function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(29);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(29);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init(); // XXX perhaps this method should move onto Browser?
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function() {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function() {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function(paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          out('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function(paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={mappings:{},DEFAULT_POLLMASK:5,umask:511,calculateAt:function(dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(8);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function(func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -54;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        (tempI64 = [stat.size>>>0,(tempDouble=stat.size,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(40))>>2)]=tempI64[0],HEAP32[(((buf)+(44))>>2)]=tempI64[1]);
        HEAP32[(((buf)+(48))>>2)]=4096;
        HEAP32[(((buf)+(52))>>2)]=stat.blocks;
        HEAP32[(((buf)+(56))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(76))>>2)]=0;
        (tempI64 = [stat.ino>>>0,(tempDouble=stat.ino,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(80))>>2)]=tempI64[0],HEAP32[(((buf)+(84))>>2)]=tempI64[1]);
        return 0;
      },doMsync:function(addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },doMkdir:function(path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function(path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -28;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function(path, buf, bufsize) {
        if (bufsize <= 0) return -28;
        var ret = FS.readlink(path);
  
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf+len];
        stringToUTF8(ret, buf, bufsize+1);
        // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
        // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
        HEAP8[buf+len] = endChar;
  
        return len;
      },doAccess:function(path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -28;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        if (!node) {
          return -44;
        }
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -2;
        }
        return 0;
      },doDup:function(path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:undefined,get:function() {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },getStreamFromFD:function(fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream;
      },get64:function(low, high) {
        return low;
      }};function ___sys__newselect(nfds, readfds, writefds, exceptfds, timeout) {try {
  
      // readfds are supported,
      // writefds checks socket open status
      // exceptfds not supported
      // timeout is always 0 - fully async
  
      var total = 0;
      
      var srcReadLow = (readfds ? HEAP32[((readfds)>>2)] : 0),
          srcReadHigh = (readfds ? HEAP32[(((readfds)+(4))>>2)] : 0);
      var srcWriteLow = (writefds ? HEAP32[((writefds)>>2)] : 0),
          srcWriteHigh = (writefds ? HEAP32[(((writefds)+(4))>>2)] : 0);
      var srcExceptLow = (exceptfds ? HEAP32[((exceptfds)>>2)] : 0),
          srcExceptHigh = (exceptfds ? HEAP32[(((exceptfds)+(4))>>2)] : 0);
  
      var dstReadLow = 0,
          dstReadHigh = 0;
      var dstWriteLow = 0,
          dstWriteHigh = 0;
      var dstExceptLow = 0,
          dstExceptHigh = 0;
  
      var allLow = (readfds ? HEAP32[((readfds)>>2)] : 0) |
                   (writefds ? HEAP32[((writefds)>>2)] : 0) |
                   (exceptfds ? HEAP32[((exceptfds)>>2)] : 0);
      var allHigh = (readfds ? HEAP32[(((readfds)+(4))>>2)] : 0) |
                    (writefds ? HEAP32[(((writefds)+(4))>>2)] : 0) |
                    (exceptfds ? HEAP32[(((exceptfds)+(4))>>2)] : 0);
  
      var check = function(fd, low, high, val) {
        return (fd < 32 ? (low & val) : (high & val));
      };
  
      for (var fd = 0; fd < nfds; fd++) {
        var mask = 1 << (fd % 32);
        if (!(check(fd, allLow, allHigh, mask))) {
          continue;  // index isn't in the set
        }
  
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
  
        var flags = SYSCALLS.DEFAULT_POLLMASK;
  
        if (stream.stream_ops.poll) {
          flags = stream.stream_ops.poll(stream);
        }
  
        if ((flags & 1) && check(fd, srcReadLow, srcReadHigh, mask)) {
          fd < 32 ? (dstReadLow = dstReadLow | mask) : (dstReadHigh = dstReadHigh | mask);
          total++;
        }
        if ((flags & 4) && check(fd, srcWriteLow, srcWriteHigh, mask)) {
          fd < 32 ? (dstWriteLow = dstWriteLow | mask) : (dstWriteHigh = dstWriteHigh | mask);
          total++;
        }
        if ((flags & 2) && check(fd, srcExceptLow, srcExceptHigh, mask)) {
          fd < 32 ? (dstExceptLow = dstExceptLow | mask) : (dstExceptHigh = dstExceptHigh | mask);
          total++;
        }
      }
  
      if (readfds) {
        HEAP32[((readfds)>>2)]=dstReadLow;
        HEAP32[(((readfds)+(4))>>2)]=dstReadHigh;
      }
      if (writefds) {
        HEAP32[((writefds)>>2)]=dstWriteLow;
        HEAP32[(((writefds)+(4))>>2)]=dstWriteHigh;
      }
      if (exceptfds) {
        HEAP32[((exceptfds)>>2)]=dstExceptLow;
        HEAP32[(((exceptfds)+(4))>>2)]=dstExceptHigh;
      }
      
      return total;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_access(path, amode) {try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doAccess(path, amode);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_chdir(path) {try {
  
      path = SYSCALLS.getStr(path);
      FS.chdir(path);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_chmod(path, mode) {try {
  
      path = SYSCALLS.getStr(path);
      FS.chmod(path, mode);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_dup(fd) {try {
  
      var old = SYSCALLS.getStreamFromFD(fd);
      return FS.open(old.path, old.flags, 0).fd;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_dup2(oldfd, suggestFD) {try {
  
      var old = SYSCALLS.getStreamFromFD(oldfd);
      if (old.fd === suggestFD) return suggestFD;
      return SYSCALLS.doDup(old.path, old.flags, suggestFD);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_fadvise64_64(fd, offset, len, advice) {
      return 0; // your advice is important to us (but we can't use it)
    }

  function ___sys_fcntl64(fd, cmd, varargs) {SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -28;
          }
          var newStream;
          newStream = FS.open(stream.path, stream.flags, 0, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 12:
        /* case 12: Currently in musl F_GETLK64 has same value as F_GETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */ {
          
          var arg = SYSCALLS.get();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)]=2;
          return 0;
        }
        case 13:
        case 14:
        /* case 13: Currently in musl F_SETLK64 has same value as F_SETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */
        /* case 14: Currently in musl F_SETLKW64 has same value as F_SETLKW, so omitted to avoid duplicate case blocks. If that changes, uncomment this */
          
          
          return 0; // Pretend that the locking is successful.
        case 16:
        case 8:
          return -28; // These are for sockets. We don't have them fully implemented yet.
        case 9:
          // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fnctl() returns that, and we set errno ourselves.
          setErrNo(28);
          return -1;
        default: {
          return -28;
        }
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_fstat64(fd, buf) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      return SYSCALLS.doStat(FS.stat, stream.path, buf);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_ftruncate64(fd, zero, low, high) {try {
  
      var length = SYSCALLS.get64(low, high);
      FS.ftruncate(fd, length);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_getcwd(buf, size) {try {
  
      if (size === 0) return -28;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd);
      if (size < cwdLengthInBytes + 1) return -68;
      stringToUTF8(cwd, buf, size);
      return buf;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_getdents64(fd, dirp, count) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd)
      if (!stream.getdents) {
        stream.getdents = FS.readdir(stream.path);
      }
  
      var struct_size = 280;
      var pos = 0;
      var off = FS.llseek(stream, 0, 1);
  
      var idx = Math.floor(off / struct_size);
  
      while (idx < stream.getdents.length && pos + struct_size <= count) {
        var id;
        var type;
        var name = stream.getdents[idx];
        if (name[0] === '.') {
          id = 1;
          type = 4; // DT_DIR
        } else {
          var child = FS.lookupNode(stream.node, name);
          id = child.id;
          type = FS.isChrdev(child.mode) ? 2 :  // DT_CHR, character device.
                 FS.isDir(child.mode) ? 4 :     // DT_DIR, directory.
                 FS.isLink(child.mode) ? 10 :   // DT_LNK, symbolic link.
                 8;                             // DT_REG, regular file.
        }
        (tempI64 = [id>>>0,(tempDouble=id,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((dirp + pos)>>2)]=tempI64[0],HEAP32[(((dirp + pos)+(4))>>2)]=tempI64[1]);
        (tempI64 = [(idx + 1) * struct_size>>>0,(tempDouble=(idx + 1) * struct_size,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((dirp + pos)+(8))>>2)]=tempI64[0],HEAP32[(((dirp + pos)+(12))>>2)]=tempI64[1]);
        HEAP16[(((dirp + pos)+(16))>>1)]=280;
        HEAP8[(((dirp + pos)+(18))>>0)]=type;
        stringToUTF8(name, dirp + pos + 19, 256);
        pos += struct_size;
        idx += 1;
      }
      FS.llseek(stream, idx * struct_size, 0);
      return pos;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_getegid32() {
      return 0;
    }

  function ___sys_geteuid32(
  ) {
  return ___sys_getegid32();
  }

  function ___sys_getpid() {
      return 42;
    }

  function ___sys_getpriority() {
      return 0;
    }

  
  function ___sys_getresgid32(ruid, euid, suid) {
      HEAP32[((ruid)>>2)]=0;
      HEAP32[((euid)>>2)]=0;
      HEAP32[((suid)>>2)]=0;
      return 0;
    }function ___sys_getresuid32(a0,a1,a2
  ) {
  return ___sys_getresgid32(a0,a1,a2);
  }

  function ___sys_getrusage(who, usage) {try {
  
      _memset(usage, 0, 136);
      HEAP32[((usage)>>2)]=1; // fake some values
      HEAP32[(((usage)+(4))>>2)]=2;
      HEAP32[(((usage)+(8))>>2)]=3;
      HEAP32[(((usage)+(12))>>2)]=4;
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_getuid32(
  ) {
  return ___sys_getegid32();
  }

  function ___sys_ioctl(fd, op, varargs) {SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509:
        case 21505: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21510:
        case 21511:
        case 21512:
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_lstat64(path, buf) {try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doStat(FS.lstat, path, buf);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_mkdir(path, mode) {try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doMkdir(path, mode);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function syscallMmap2(addr, len, prot, flags, fd, off) {
      off <<= 12; // undo pgoffset
      var ptr;
      var allocated = false;
  
      // addr argument must be page aligned if MAP_FIXED flag is set.
      if ((flags & 16) !== 0 && (addr % 16384) !== 0) {
        return -28;
      }
  
      // MAP_ANONYMOUS (aka MAP_ANON) isn't actually defined by POSIX spec,
      // but it is widely used way to allocate memory pages on Linux, BSD and Mac.
      // In this case fd argument is ignored.
      if ((flags & 32) !== 0) {
        ptr = _memalign(16384, len);
        if (!ptr) return -48;
        _memset(ptr, 0, len);
        allocated = true;
      } else {
        var info = FS.getStream(fd);
        if (!info) return -8;
        var res = FS.mmap(info, addr, len, off, prot, flags);
        ptr = res.ptr;
        allocated = res.allocated;
      }
      SYSCALLS.mappings[ptr] = { malloc: ptr, len: len, allocated: allocated, fd: fd, prot: prot, flags: flags, offset: off };
      return ptr;
    }function ___sys_mmap2(addr, len, prot, flags, fd, off) {try {
  
      return syscallMmap2(addr, len, prot, flags, fd, off);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_msync(addr, len, flags) {try {
  
      var info = SYSCALLS.mappings[addr];
      if (!info) return 0;
      SYSCALLS.doMsync(addr, FS.getStream(info.fd), len, info.flags, 0);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function syscallMunmap(addr, len) {
      if ((addr | 0) === -1 || len === 0) {
        return -28;
      }
      // TODO: support unmmap'ing parts of allocations
      var info = SYSCALLS.mappings[addr];
      if (!info) return 0;
      if (len === info.len) {
        var stream = FS.getStream(info.fd);
        if (info.prot & 2) {
          SYSCALLS.doMsync(addr, stream, len, info.flags, info.offset);
        }
        FS.munmap(stream);
        SYSCALLS.mappings[addr] = null;
        if (info.allocated) {
          _free(info.malloc);
        }
      }
      return 0;
    }function ___sys_munmap(addr, len) {try {
  
      return syscallMunmap(addr, len);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_open(path, flags, varargs) {SYSCALLS.varargs = varargs;
  try {
  
      var pathname = SYSCALLS.getStr(path);
      var mode = SYSCALLS.get();
      var stream = FS.open(pathname, flags, mode);
      return stream.fd;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  
  var ERRNO_CODES={EPERM:63,ENOENT:44,ESRCH:71,EINTR:27,EIO:29,ENXIO:60,E2BIG:1,ENOEXEC:45,EBADF:8,ECHILD:12,EAGAIN:6,EWOULDBLOCK:6,ENOMEM:48,EACCES:2,EFAULT:21,ENOTBLK:105,EBUSY:10,EEXIST:20,EXDEV:75,ENODEV:43,ENOTDIR:54,EISDIR:31,EINVAL:28,ENFILE:41,EMFILE:33,ENOTTY:59,ETXTBSY:74,EFBIG:22,ENOSPC:51,ESPIPE:70,EROFS:69,EMLINK:34,EPIPE:64,EDOM:18,ERANGE:68,ENOMSG:49,EIDRM:24,ECHRNG:106,EL2NSYNC:156,EL3HLT:107,EL3RST:108,ELNRNG:109,EUNATCH:110,ENOCSI:111,EL2HLT:112,EDEADLK:16,ENOLCK:46,EBADE:113,EBADR:114,EXFULL:115,ENOANO:104,EBADRQC:103,EBADSLT:102,EDEADLOCK:16,EBFONT:101,ENOSTR:100,ENODATA:116,ETIME:117,ENOSR:118,ENONET:119,ENOPKG:120,EREMOTE:121,ENOLINK:47,EADV:122,ESRMNT:123,ECOMM:124,EPROTO:65,EMULTIHOP:36,EDOTDOT:125,EBADMSG:9,ENOTUNIQ:126,EBADFD:127,EREMCHG:128,ELIBACC:129,ELIBBAD:130,ELIBSCN:131,ELIBMAX:132,ELIBEXEC:133,ENOSYS:52,ENOTEMPTY:55,ENAMETOOLONG:37,ELOOP:32,EOPNOTSUPP:138,EPFNOSUPPORT:139,ECONNRESET:15,ENOBUFS:42,EAFNOSUPPORT:5,EPROTOTYPE:67,ENOTSOCK:57,ENOPROTOOPT:50,ESHUTDOWN:140,ECONNREFUSED:14,EADDRINUSE:3,ECONNABORTED:13,ENETUNREACH:40,ENETDOWN:38,ETIMEDOUT:73,EHOSTDOWN:142,EHOSTUNREACH:23,EINPROGRESS:26,EALREADY:7,EDESTADDRREQ:17,EMSGSIZE:35,EPROTONOSUPPORT:66,ESOCKTNOSUPPORT:137,EADDRNOTAVAIL:4,ENETRESET:39,EISCONN:30,ENOTCONN:53,ETOOMANYREFS:141,EUSERS:136,EDQUOT:19,ESTALE:72,ENOTSUP:138,ENOMEDIUM:148,EILSEQ:25,EOVERFLOW:61,ECANCELED:11,ENOTRECOVERABLE:56,EOWNERDEAD:62,ESTRPIPE:135};var PIPEFS={BUCKET_BUFFER_SIZE:8192,mount:function (mount) {
        // Do not pollute the real root directory or its child nodes with pipes
        // Looks like it is OK to create another pseudo-root node not linked to the FS.root hierarchy this way
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createPipe:function () {
        var pipe = {
          buckets: []
        };
  
        pipe.buckets.push({
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0
        });
  
        var rName = PIPEFS.nextname();
        var wName = PIPEFS.nextname();
        var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
        var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
  
        rNode.pipe = pipe;
        wNode.pipe = pipe;
  
        var readableStream = FS.createStream({
          path: rName,
          node: rNode,
          flags: FS.modeStringToFlags('r'),
          seekable: false,
          stream_ops: PIPEFS.stream_ops
        });
        rNode.stream = readableStream;
  
        var writableStream = FS.createStream({
          path: wName,
          node: wNode,
          flags: FS.modeStringToFlags('w'),
          seekable: false,
          stream_ops: PIPEFS.stream_ops
        });
        wNode.stream = writableStream;
  
        return {
          readable_fd: readableStream.fd,
          writable_fd: writableStream.fd
        };
      },stream_ops:{poll:function (stream) {
          var pipe = stream.node.pipe;
  
          if ((stream.flags & 2097155) === 1) {
            return (256 | 4);
          } else {
            if (pipe.buckets.length > 0) {
              for (var i = 0; i < pipe.buckets.length; i++) {
                var bucket = pipe.buckets[i];
                if (bucket.offset - bucket.roffset > 0) {
                  return (64 | 1);
                }
              }
            }
          }
  
          return 0;
        },ioctl:function (stream, request, varargs) {
          return ERRNO_CODES.EINVAL;
        },fsync:function (stream) {
          return ERRNO_CODES.EINVAL;
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var pipe = stream.node.pipe;
          var currentLength = 0;
  
          for (var i = 0; i < pipe.buckets.length; i++) {
            var bucket = pipe.buckets[i];
            currentLength += bucket.offset - bucket.roffset;
          }
  
          assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
          var data = buffer.subarray(offset, offset + length);
  
          if (length <= 0) {
            return 0;
          }
          if (currentLength == 0) {
            // Behave as if the read end is always non-blocking
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
          }
          var toRead = Math.min(currentLength, length);
  
          var totalRead = toRead;
          var toRemove = 0;
  
          for (var i = 0; i < pipe.buckets.length; i++) {
            var currBucket = pipe.buckets[i];
            var bucketSize = currBucket.offset - currBucket.roffset;
  
            if (toRead <= bucketSize) {
              var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
              if (toRead < bucketSize) {
                tmpSlice = tmpSlice.subarray(0, toRead);
                currBucket.roffset += toRead;
              } else {
                toRemove++;
              }
              data.set(tmpSlice);
              break;
            } else {
              var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
              data.set(tmpSlice);
              data = data.subarray(tmpSlice.byteLength);
              toRead -= tmpSlice.byteLength;
              toRemove++;
            }
          }
  
          if (toRemove && toRemove == pipe.buckets.length) {
            // Do not generate excessive garbage in use cases such as
            // write several bytes, read everything, write several bytes, read everything...
            toRemove--;
            pipe.buckets[toRemove].offset = 0;
            pipe.buckets[toRemove].roffset = 0;
          }
  
          pipe.buckets.splice(0, toRemove);
  
          return totalRead;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var pipe = stream.node.pipe;
  
          assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
          var data = buffer.subarray(offset, offset + length);
  
          var dataLen = data.byteLength;
          if (dataLen <= 0) {
            return 0;
          }
  
          var currBucket = null;
  
          if (pipe.buckets.length == 0) {
            currBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: 0,
              roffset: 0
            };
            pipe.buckets.push(currBucket);
          } else {
            currBucket = pipe.buckets[pipe.buckets.length - 1];
          }
  
          assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
  
          var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
          if (freeBytesInCurrBuffer >= dataLen) {
            currBucket.buffer.set(data, currBucket.offset);
            currBucket.offset += dataLen;
            return dataLen;
          } else if (freeBytesInCurrBuffer > 0) {
            currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
            currBucket.offset += freeBytesInCurrBuffer;
            data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
          }
  
          var numBuckets = (data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE) | 0;
          var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
  
          for (var i = 0; i < numBuckets; i++) {
            var newBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: PIPEFS.BUCKET_BUFFER_SIZE,
              roffset: 0
            };
            pipe.buckets.push(newBucket);
            newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
            data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
          }
  
          if (remElements > 0) {
            var newBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: data.byteLength,
              roffset: 0
            };
            pipe.buckets.push(newBucket);
            newBucket.buffer.set(data);
          }
  
          return dataLen;
        },close:function (stream) {
          var pipe = stream.node.pipe;
          pipe.buckets = null;
        }},nextname:function () {
        if (!PIPEFS.nextname.current) {
          PIPEFS.nextname.current = 0;
        }
        return 'pipe[' + (PIPEFS.nextname.current++) + ']';
      }};function ___sys_pipe(fdPtr) {try {
  
      if (fdPtr == 0) {
        throw new FS.ErrnoError(21);
      }
  
      var res = PIPEFS.createPipe();
  
      HEAP32[((fdPtr)>>2)]=res.readable_fd;
      HEAP32[(((fdPtr)+(4))>>2)]=res.writable_fd;
  
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_poll(fds, nfds, timeout) {try {
  
      var nonzero = 0;
      for (var i = 0; i < nfds; i++) {
        var pollfd = fds + 8 * i;
        var fd = HEAP32[((pollfd)>>2)];
        var events = HEAP16[(((pollfd)+(4))>>1)];
        var mask = 32;
        var stream = FS.getStream(fd);
        if (stream) {
          mask = SYSCALLS.DEFAULT_POLLMASK;
          if (stream.stream_ops.poll) {
            mask = stream.stream_ops.poll(stream);
          }
        }
        mask &= events | 8 | 16;
        if (mask) nonzero++;
        HEAP16[(((pollfd)+(6))>>1)]=mask;
      }
      return nonzero;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_pread64(fd, buf, count, zero, low, high) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd)
      var offset = SYSCALLS.get64(low, high);
      return FS.read(stream, HEAP8,buf, count, offset);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_read(fd, buf, count) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      return FS.read(stream, HEAP8,buf, count);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_readlink(path, buf, bufsize) {try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doReadlink(path, buf, bufsize);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_rename(old_path, new_path) {try {
  
      old_path = SYSCALLS.getStr(old_path);
      new_path = SYSCALLS.getStr(new_path);
      FS.rename(old_path, new_path);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_rmdir(path) {try {
  
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_setpriority() {
      return -63;
    }

  
  var SOCKFS={mount:function(mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module['websocket'] = (Module['websocket'] && 
                               ('object' === typeof Module['websocket'])) ? Module['websocket'] : {};
  
        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module['websocket']._callbacks = {};
        Module['websocket']['on'] = /** @this{Object} */ function(event, callback) {
  	    if ('function' === typeof callback) {
  		  this._callbacks[event] = callback;
          }
  	    return this;
        };
  
        Module['websocket'].emit = /** @this{Object} */ function(event, param) {
  	    if ('function' === typeof this._callbacks[event]) {
  		  this._callbacks[event].call(this, param);
          }
        };
  
        // If debug is enabled register simple default logging callbacks for each Event.
  
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function(family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function(fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function(stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function(stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function(stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function(stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function(stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function() {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function(sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split('/');
                url = url + parts[0] + ":" + port + "/" + parts.slice(1).join('/');
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The default WebSocket options
              var opts = undefined;
  
              if (subProtocols !== 'null') {
                // The regex trims the string (removes spaces at the beginning and end, then splits the string by
                // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
                subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
                // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
                opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
              }
  
              // some webservers (azure) does not support subprotocol header
              if (runtimeConfig && null === Module['websocket']['subprotocol']) {
                subProtocols = 'null';
                opts = undefined;
              }
  
              // If node we use the ws library.
              var WebSocketConstructor;
              if (ENVIRONMENT_IS_NODE) {
                WebSocketConstructor = /** @type{(typeof WebSocket)} */(require('ws'));
              } else
              {
                WebSocketConstructor = WebSocket;
              }
              ws = new WebSocketConstructor(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function(sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function(sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function(sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function(sock, peer) {
          var first = true;
  
          var handleOpen = function () {
  
            Module['websocket'].emit('open', sock.stream.fd);
  
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            if (typeof data === 'string') {
              var encoder = new TextEncoder(); // should be utf-8
              data = encoder.encode(data); // make a typed array from the string
            } else {
              assert(data.byteLength !== undefined); // must receive an ArrayBuffer
              if (data.byteLength == 0) {
                // An empty ArrayBuffer will emit a pseudo disconnect event
                // as recv/recvmsg will return zero which indicates that a socket
                // has performed a shutdown although the connection has not been disconnected yet.
                return;
              } else {
                data = new Uint8Array(data); // make a typed array view on the array buffer
              }
            }
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
            Module['websocket'].emit('message', sock.stream.fd);
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('close', function() {
              Module['websocket'].emit('close', sock.stream.fd);
            });
            peer.socket.on('error', function(error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g. 
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onclose = function() {
              Module['websocket'].emit('close', sock.stream.fd);
            };
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
            peer.socket.onerror = function(error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
            };
          }
        },poll:function(sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function(sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function(sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function(sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port;
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function(sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function(sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          Module['websocket'].emit('listen', sock.stream.fd); // Send Event with listen fd.
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
              Module['websocket'].emit('connection', newsock.stream.fd);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
              Module['websocket'].emit('connection', sock.stream.fd);
            }
          });
          sock.server.on('closed', function() {
            Module['websocket'].emit('close', sock.stream.fd);
            sock.server = null;
          });
          sock.server.on('error', function(error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g. 
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = ERRNO_CODES.EHOSTUNREACH; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'EHOSTUNREACH: Host is unreachable']);
            // don't throw
          });
        },accept:function(listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function(sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function(sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          if (ArrayBuffer.isView(buffer)) {
            offset += buffer.byteOffset;
            buffer = buffer.buffer;
          }
  
          var data;
            data = buffer.slice(offset, offset + length);
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function(sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};
  
  
  function __inet_pton4_raw(str) {
      var b = str.split('.');
      for (var i = 0; i < 4; i++) {
        var tmp = Number(b[i]);
        if (isNaN(tmp)) return null;
        b[i] = tmp;
      }
      return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
    }
  
  
  /** @suppress {checkTypes} */
  function jstoi_q(str) {
      return parseInt(str);
    }function __inet_pton6_raw(str) {
      var words;
      var w, offset, z, i;
      /* http://home.deds.nl/~aeron/regex/ */
      var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i
      var parts = [];
      if (!valid6regx.test(str)) {
        return null;
      }
      if (str === "::") {
        return [0, 0, 0, 0, 0, 0, 0, 0];
      }
      // Z placeholder to keep track of zeros when splitting the string on ":"
      if (str.indexOf("::") === 0) {
        str = str.replace("::", "Z:"); // leading zeros case
      } else {
        str = str.replace("::", ":Z:");
      }
  
      if (str.indexOf(".") > 0) {
        // parse IPv4 embedded stress
        str = str.replace(new RegExp('[.]', 'g'), ":");
        words = str.split(":");
        words[words.length-4] = jstoi_q(words[words.length-4]) + jstoi_q(words[words.length-3])*256;
        words[words.length-3] = jstoi_q(words[words.length-2]) + jstoi_q(words[words.length-1])*256;
        words = words.slice(0, words.length-2);
      } else {
        words = str.split(":");
      }
  
      offset = 0; z = 0;
      for (w=0; w < words.length; w++) {
        if (typeof words[w] === 'string') {
          if (words[w] === 'Z') {
            // compressed zeros - write appropriate number of zero words
            for (z = 0; z < (8 - words.length+1); z++) {
              parts[w+z] = 0;
            }
            offset = z-1;
          } else {
            // parse hex to field to 16-bit value and write it in network byte-order
            parts[w+offset] = _htons(parseInt(words[w],16));
          }
        } else {
          // parsed IPv4 words
          parts[w+offset] = words[w];
        }
      }
      return [
        (parts[1] << 16) | parts[0],
        (parts[3] << 16) | parts[2],
        (parts[5] << 16) | parts[4],
        (parts[7] << 16) | parts[6]
      ];
    }var DNS={address_map:{id:1,addrs:{},names:{}},lookup_name:function (name) {
        // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
        var res = __inet_pton4_raw(name);
        if (res !== null) {
          return name;
        }
        res = __inet_pton6_raw(name);
        if (res !== null) {
          return name;
        }
  
        // See if this name is already mapped.
        var addr;
  
        if (DNS.address_map.addrs[name]) {
          addr = DNS.address_map.addrs[name];
        } else {
          var id = DNS.address_map.id++;
          assert(id < 65535, 'exceeded max address mappings of 65535');
  
          addr = '172.29.' + (id & 0xff) + '.' + (id & 0xff00);
  
          DNS.address_map.names[addr] = name;
          DNS.address_map.addrs[name] = addr;
        }
  
        return addr;
      },lookup_addr:function (addr) {
        if (DNS.address_map.names[addr]) {
          return DNS.address_map.names[addr];
        }
  
        return null;
      }};
  
  
  var Sockets={BUFFER_SIZE:10240,MAX_BUFFER_SIZE:10485760,nextFd:1,fds:{},nextport:1,maxport:65535,peer:null,connections:{},portmap:{},localAddr:4261412874,addrPool:[33554442,50331658,67108874,83886090,100663306,117440522,134217738,150994954,167772170,184549386,201326602,218103818,234881034]};
  
  function __inet_ntop4_raw(addr) {
      return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
    }
  
  function __inet_ntop6_raw(ints) {
      //  ref:  http://www.ietf.org/rfc/rfc2373.txt - section 2.5.4
      //  Format for IPv4 compatible and mapped  128-bit IPv6 Addresses
      //  128-bits are split into eight 16-bit words
      //  stored in network byte order (big-endian)
      //  |                80 bits               | 16 |      32 bits        |
      //  +-----------------------------------------------------------------+
      //  |               10 bytes               |  2 |      4 bytes        |
      //  +--------------------------------------+--------------------------+
      //  +               5 words                |  1 |      2 words        |
      //  +--------------------------------------+--------------------------+
      //  |0000..............................0000|0000|    IPv4 ADDRESS     | (compatible)
      //  +--------------------------------------+----+---------------------+
      //  |0000..............................0000|FFFF|    IPv4 ADDRESS     | (mapped)
      //  +--------------------------------------+----+---------------------+
      var str = "";
      var word = 0;
      var longest = 0;
      var lastzero = 0;
      var zstart = 0;
      var len = 0;
      var i = 0;
      var parts = [
        ints[0] & 0xffff,
        (ints[0] >> 16),
        ints[1] & 0xffff,
        (ints[1] >> 16),
        ints[2] & 0xffff,
        (ints[2] >> 16),
        ints[3] & 0xffff,
        (ints[3] >> 16)
      ];
  
      // Handle IPv4-compatible, IPv4-mapped, loopback and any/unspecified addresses
  
      var hasipv4 = true;
      var v4part = "";
      // check if the 10 high-order bytes are all zeros (first 5 words)
      for (i = 0; i < 5; i++) {
        if (parts[i] !== 0) { hasipv4 = false; break; }
      }
  
      if (hasipv4) {
        // low-order 32-bits store an IPv4 address (bytes 13 to 16) (last 2 words)
        v4part = __inet_ntop4_raw(parts[6] | (parts[7] << 16));
        // IPv4-mapped IPv6 address if 16-bit value (bytes 11 and 12) == 0xFFFF (6th word)
        if (parts[5] === -1) {
          str = "::ffff:";
          str += v4part;
          return str;
        }
        // IPv4-compatible IPv6 address if 16-bit value (bytes 11 and 12) == 0x0000 (6th word)
        if (parts[5] === 0) {
          str = "::";
          //special case IPv6 addresses
          if(v4part === "0.0.0.0") v4part = ""; // any/unspecified address
          if(v4part === "0.0.0.1") v4part = "1";// loopback address
          str += v4part;
          return str;
        }
      }
  
      // Handle all other IPv6 addresses
  
      // first run to find the longest contiguous zero words
      for (word = 0; word < 8; word++) {
        if (parts[word] === 0) {
          if (word - lastzero > 1) {
            len = 0;
          }
          lastzero = word;
          len++;
        }
        if (len > longest) {
          longest = len;
          zstart = word - longest + 1;
        }
      }
  
      for (word = 0; word < 8; word++) {
        if (longest > 1) {
          // compress contiguous zeros - to produce "::"
          if (parts[word] === 0 && word >= zstart && word < (zstart + longest) ) {
            if (word === zstart) {
              str += ":";
              if (zstart === 0) str += ":"; //leading zeros case
            }
            continue;
          }
        }
        // converts 16-bit words from big-endian to little-endian before converting to hex string
        str += Number(_ntohs(parts[word] & 0xffff)).toString(16);
        str += word < 7 ? ":" : "";
      }
      return str;
    }function __read_sockaddr(sa, salen) {
      // family / port offsets are common to both sockaddr_in and sockaddr_in6
      var family = HEAP16[((sa)>>1)];
      var port = _ntohs(HEAPU16[(((sa)+(2))>>1)]);
      var addr;
  
      switch (family) {
        case 2:
          if (salen !== 16) {
            return { errno: 28 };
          }
          addr = HEAP32[(((sa)+(4))>>2)];
          addr = __inet_ntop4_raw(addr);
          break;
        case 10:
          if (salen !== 28) {
            return { errno: 28 };
          }
          addr = [
            HEAP32[(((sa)+(8))>>2)],
            HEAP32[(((sa)+(12))>>2)],
            HEAP32[(((sa)+(16))>>2)],
            HEAP32[(((sa)+(20))>>2)]
          ];
          addr = __inet_ntop6_raw(addr);
          break;
        default:
          return { errno: 5 };
      }
  
      return { family: family, addr: addr, port: port };
    }
  
  function __write_sockaddr(sa, family, addr, port) {
      switch (family) {
        case 2:
          addr = __inet_pton4_raw(addr);
          HEAP16[((sa)>>1)]=family;
          HEAP32[(((sa)+(4))>>2)]=addr;
          HEAP16[(((sa)+(2))>>1)]=_htons(port);
          break;
        case 10:
          addr = __inet_pton6_raw(addr);
          HEAP32[((sa)>>2)]=family;
          HEAP32[(((sa)+(8))>>2)]=addr[0];
          HEAP32[(((sa)+(12))>>2)]=addr[1];
          HEAP32[(((sa)+(16))>>2)]=addr[2];
          HEAP32[(((sa)+(20))>>2)]=addr[3];
          HEAP16[(((sa)+(2))>>1)]=_htons(port);
          HEAP32[(((sa)+(4))>>2)]=0;
          HEAP32[(((sa)+(24))>>2)]=0;
          break;
        default:
          return { errno: 5 };
      }
      // kind of lame, but let's match _read_sockaddr's interface
      return {};
    }function ___sys_socketcall(call, socketvararg) {try {
  
      // socketcalls pass the rest of the arguments in a struct
      SYSCALLS.varargs = socketvararg;
  
      var getSocketFromFD = function() {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(8);
        return socket;
      };
      /** @param {boolean=} allowNull */
      var getSocketAddress = function(allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      };
  
      switch (call) {
        case 1: { // socket
          var domain = SYSCALLS.get(), type = SYSCALLS.get(), protocol = SYSCALLS.get();
          var sock = SOCKFS.createSocket(domain, type, protocol);
          return sock.stream.fd;
        }
        case 2: { // bind
          var sock = getSocketFromFD(), info = getSocketAddress();
          sock.sock_ops.bind(sock, info.addr, info.port);
          return 0;
        }
        case 3: { // connect
          var sock = getSocketFromFD(), info = getSocketAddress();
          sock.sock_ops.connect(sock, info.addr, info.port);
          return 0;
        }
        case 4: { // listen
          var sock = getSocketFromFD(), backlog = SYSCALLS.get();
          sock.sock_ops.listen(sock, backlog);
          return 0;
        }
        case 5: { // accept
          var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
          var newsock = sock.sock_ops.accept(sock);
          if (addr) {
            var res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport);
          }
          return newsock.stream.fd;
        }
        case 6: { // getsockname
          var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
          // TODO: sock.saddr should never be undefined, see TODO in websocket_sock_ops.getname
          var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || '0.0.0.0'), sock.sport);
          return 0;
        }
        case 7: { // getpeername
          var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
          if (!sock.daddr) {
            return -53; // The socket is not connected.
          }
          var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport);
          return 0;
        }
        case 11: { // sendto
          var sock = getSocketFromFD(), message = SYSCALLS.get(), length = SYSCALLS.get(), flags = SYSCALLS.get(), dest = getSocketAddress(true);
          if (!dest) {
            // send, no address provided
            return FS.write(sock.stream, HEAP8,message, length);
          } else {
            // sendto an address
            return sock.sock_ops.sendmsg(sock, HEAP8,message, length, dest.addr, dest.port);
          }
        }
        case 12: { // recvfrom
          var sock = getSocketFromFD(), buf = SYSCALLS.get(), len = SYSCALLS.get(), flags = SYSCALLS.get(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
          var msg = sock.sock_ops.recvmsg(sock, len);
          if (!msg) return 0; // socket is closed
          if (addr) {
            var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port);
          }
          HEAPU8.set(msg.buffer, buf);
          return msg.buffer.byteLength;
        }
        case 14: { // setsockopt
          return -50; // The option is unknown at the level indicated.
        }
        case 15: { // getsockopt
          var sock = getSocketFromFD(), level = SYSCALLS.get(), optname = SYSCALLS.get(), optval = SYSCALLS.get(), optlen = SYSCALLS.get();
          // Minimal getsockopt aimed at resolving https://github.com/emscripten-core/emscripten/issues/2211
          // so only supports SOL_SOCKET with SO_ERROR.
          if (level === 1) {
            if (optname === 4) {
              HEAP32[((optval)>>2)]=sock.error;
              HEAP32[((optlen)>>2)]=4;
              sock.error = null; // Clear the error (The SO_ERROR option obtains and then clears this field).
              return 0;
            }
          }
          return -50; // The option is unknown at the level indicated.
        }
        case 16: { // sendmsg
          var sock = getSocketFromFD(), message = SYSCALLS.get(), flags = SYSCALLS.get();
          var iov = HEAP32[(((message)+(8))>>2)];
          var num = HEAP32[(((message)+(12))>>2)];
          // read the address and port to send to
          var addr, port;
          var name = HEAP32[((message)>>2)];
          var namelen = HEAP32[(((message)+(4))>>2)];
          if (name) {
            var info = __read_sockaddr(name, namelen);
            if (info.errno) return -info.errno;
            port = info.port;
            addr = DNS.lookup_addr(info.addr) || info.addr;
          }
          // concatenate scatter-gather arrays into one message buffer
          var total = 0;
          for (var i = 0; i < num; i++) {
            total += HEAP32[(((iov)+((8 * i) + 4))>>2)];
          }
          var view = new Uint8Array(total);
          var offset = 0;
          for (var i = 0; i < num; i++) {
            var iovbase = HEAP32[(((iov)+((8 * i) + 0))>>2)];
            var iovlen = HEAP32[(((iov)+((8 * i) + 4))>>2)];
            for (var j = 0; j < iovlen; j++) {  
              view[offset++] = HEAP8[(((iovbase)+(j))>>0)];
            }
          }
          // write the buffer
          return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port);
        }
        case 17: { // recvmsg
          var sock = getSocketFromFD(), message = SYSCALLS.get(), flags = SYSCALLS.get();
          var iov = HEAP32[(((message)+(8))>>2)];
          var num = HEAP32[(((message)+(12))>>2)];
          // get the total amount of data we can read across all arrays
          var total = 0;
          for (var i = 0; i < num; i++) {
            total += HEAP32[(((iov)+((8 * i) + 4))>>2)];
          }
          // try to read total data
          var msg = sock.sock_ops.recvmsg(sock, total);
          if (!msg) return 0; // socket is closed
  
          // TODO honor flags:
          // MSG_OOB
          // Requests out-of-band data. The significance and semantics of out-of-band data are protocol-specific.
          // MSG_PEEK
          // Peeks at the incoming message.
          // MSG_WAITALL
          // Requests that the function block until the full amount of data requested can be returned. The function may return a smaller amount of data if a signal is caught, if the connection is terminated, if MSG_PEEK was specified, or if an error is pending for the socket.
  
          // write the source address out
          var name = HEAP32[((message)>>2)];
          if (name) {
            var res = __write_sockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port);
          }
          // write the buffer out to the scatter-gather arrays
          var bytesRead = 0;
          var bytesRemaining = msg.buffer.byteLength;
          for (var i = 0; bytesRemaining > 0 && i < num; i++) {
            var iovbase = HEAP32[(((iov)+((8 * i) + 0))>>2)];
            var iovlen = HEAP32[(((iov)+((8 * i) + 4))>>2)];
            if (!iovlen) {
              continue;
            }
            var length = Math.min(iovlen, bytesRemaining);
            var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
            HEAPU8.set(buf, iovbase + bytesRead);
            bytesRead += length;
            bytesRemaining -= length;
          }
  
          // TODO set msghdr.msg_flags
          // MSG_EOR
          // End of record was received (if supported by the protocol).
          // MSG_OOB
          // Out-of-band data was received.
          // MSG_TRUNC
          // Normal data was truncated.
          // MSG_CTRUNC
  
          return bytesRead;
        }
        default: {
          return -52; // unsupported feature
        }
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_stat64(path, buf) {try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doStat(FS.stat, path, buf);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_statfs64(path, size, buf) {try {
  
      path = SYSCALLS.getStr(path);
      // NOTE: None of the constants here are true. We're just returning safe and
      //       sane values.
      HEAP32[(((buf)+(4))>>2)]=4096;
      HEAP32[(((buf)+(40))>>2)]=4096;
      HEAP32[(((buf)+(8))>>2)]=1000000;
      HEAP32[(((buf)+(12))>>2)]=500000;
      HEAP32[(((buf)+(16))>>2)]=500000;
      HEAP32[(((buf)+(20))>>2)]=FS.nextInode;
      HEAP32[(((buf)+(24))>>2)]=1000000;
      HEAP32[(((buf)+(28))>>2)]=42;
      HEAP32[(((buf)+(44))>>2)]=2;  // ST_NOSUID
      HEAP32[(((buf)+(36))>>2)]=255;
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_uname(buf) {try {
  
      if (!buf) return -21
      var layout = {"__size__":390,"sysname":0,"nodename":65,"release":130,"version":195,"machine":260,"domainname":325};
      var copyString = function(element, value) {
        var offset = layout[element];
        writeAsciiToMemory(value, buf + offset);
      };
      copyString('sysname', 'Emscripten');
      copyString('nodename', 'emscripten');
      copyString('release', '1.0');
      copyString('version', '#1');
      copyString('machine', 'x86-JS');
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___sys_unlink(path) {try {
  
      path = SYSCALLS.getStr(path);
      FS.unlink(path);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function _exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      exit(status);
    }function __exit(a0
  ) {
  return _exit(a0);
  }

  function _abort() {
      abort();
    }


  
  function _emscripten_get_now_res() { // return resolution of get_now, in nanoseconds
      if (ENVIRONMENT_IS_NODE) {
        return 1; // nanoseconds
      } else
      if (typeof dateNow !== 'undefined') {
        return 1000; // microseconds (1/1000 of a millisecond)
      } else
      // Modern environment where performance.now() is supported:
      return 1000; // microseconds (1/1000 of a millisecond)
    }function _clock_getres(clk_id, res) {
      // int clock_getres(clockid_t clk_id, struct timespec *res);
      var nsec;
      if (clk_id === 0) {
        nsec = 1000 * 1000; // educated guess that it's milliseconds
      } else if (clk_id === 1 && _emscripten_get_now_is_monotonic) {
        nsec = _emscripten_get_now_res();
      } else {
        setErrNo(28);
        return -1;
      }
      HEAP32[((res)>>2)]=(nsec/1000000000)|0;
      HEAP32[(((res)+(4))>>2)]=nsec // resolution is nanoseconds
      return 0;
    }


  
  
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now())|0;
          setTimeout(Browser.mainLoop.runner, timeUntilNextTick); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (typeof setImmediate === 'undefined') {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = 'setimmediate';
          var Browser_setImmediate_messageHandler = function(event) {
            // When called in current thread or Worker, the main loop ID is structured slightly different to accommodate for --proxy-to-worker runtime listening to Worker events,
            // so check for both cases.
            if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          addEventListener("message", Browser_setImmediate_messageHandler, true);
          setImmediate = /** @type{function(function(): ?, ...?): number} */(function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            if (ENVIRONMENT_IS_WORKER) {
              if (Module['setImmediates'] === undefined) Module['setImmediates'] = [];
              Module['setImmediates'].push(func);
              postMessage({target: emscriptenMainLoopMessageId}); // In --proxy-to-worker, route the message via proxyClient.js
            } else postMessage(emscriptenMainLoopMessageId, "*"); // On the main thread, can just send the message to itself.
          })
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          setImmediate(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }/** @param {number|boolean=} noSetTiming */
  function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      noExitRuntime = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var browserIterationFunc;
      if (typeof arg !== 'undefined') {
        browserIterationFunc = function() {
          Module['dynCall_vi'](func, arg);
        };
      } else {
        browserIterationFunc = function() {
          Module['dynCall_v'](func);
        };
      }
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
  
          // catches pause/resume main loop from blocker execution
          if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        } else if (Browser.mainLoop.timingMode == 0/*EM_TIMING_SETTIMEOUT*/) {
          Browser.mainLoop.tickStartTime = _emscripten_get_now();
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
  
  
  
        Browser.mainLoop.runIter(browserIterationFunc);
  
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'unwind';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function() {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function() {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function() {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function(func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) err('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullscreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function() {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
  
        // Canvas event setup
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === Module['canvas'] ||
                                document['mozPointerLockElement'] === Module['canvas'] ||
                                document['webkitPointerLockElement'] === Module['canvas'] ||
                                document['msPointerLockElement'] === Module['canvas'];
        }
        var canvas = Module['canvas'];
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
  
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && Module['canvas'].requestPointerLock) {
                Module['canvas'].requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function(canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false,
            majorVersion: 1,
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          // This check of existence of GL is here to satisfy Closure compiler, which yells if variable GL is referenced below but GL object is not
          // actually compiled in because application is not doing any GL operations. TODO: Ideally if GL is not being used, this function
          // Browser.createContext() should not even be emitted.
          if (typeof GL !== 'undefined') {
            contextHandle = GL.createContext(canvas, contextAttributes);
            if (contextHandle) {
              ctx = GL.getContext(contextHandle).GLctx;
            }
          }
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function(canvas, useWebGL, setInModule) {},fullscreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullscreen:function(lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullscreenChange() {
          Browser.isFullscreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['fullscreenElement'] || document['mozFullScreenElement'] ||
               document['msFullscreenElement'] || document['webkitFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.exitFullscreen = Browser.exitFullscreen;
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullscreen = true;
            if (Browser.resizeCanvas) {
              Browser.setFullscreenCanvasSize();
            } else {
              Browser.updateCanvasDimensions(canvas);
            }
          } else {
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
  
            if (Browser.resizeCanvas) {
              Browser.setWindowedCanvasSize();
            } else {
              Browser.updateCanvasDimensions(canvas);
            }
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullscreen);
          if (Module['onFullscreen']) Module['onFullscreen'](Browser.isFullscreen);
        }
  
        if (!Browser.fullscreenHandlersInstalled) {
          Browser.fullscreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullscreenChange, false);
          document.addEventListener('mozfullscreenchange', fullscreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullscreenChange, false);
          document.addEventListener('MSFullscreenChange', fullscreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullscreen = canvasContainer['requestFullscreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullscreen'] ? function() { canvasContainer['webkitRequestFullscreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null) ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        canvasContainer.requestFullscreen();
      },exitFullscreen:function() {
        // This is workaround for chrome. Trying to exit from fullscreen
        // not in fullscreen state will cause "TypeError: Document not active"
        // in chrome. See https://github.com/emscripten-core/emscripten/pull/8236
        if (!Browser.isFullscreen) {
          return false;
        }
  
        var CFS = document['exitFullscreen'] ||
                  document['cancelFullScreen'] ||
                  document['mozCancelFullScreen'] ||
                  document['msExitFullscreen'] ||
                  document['webkitCancelFullScreen'] ||
            (function() {});
        CFS.apply(document, []);
        return true;
      },nextRAF:0,fakeRequestAnimationFrame:function(func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function(func) {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(func);
          return;
        }
        var RAF = Browser.fakeRequestAnimationFrame;
        RAF(func);
      },safeCallback:function(func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function() {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function() { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function(func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function(func, timeout) {
        noExitRuntime = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function(func, timeout) {
        noExitRuntime = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function(name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function(func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function(event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function(event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function(event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll':
            // 3 lines make up a step
            delta = event.detail / 3;
            break;
          case 'mousewheel':
            // 120 units make up a step
            delta = event.wheelDelta / 120;
            break;
          case 'wheel':
            delta = event.deltaY
            switch(event.deltaMode) {
              case 0:
                // DOM_DELTA_PIXEL: 100 pixels make up a step
                delta /= 100;
                break;
              case 1:
                // DOM_DELTA_LINE: 3 lines make up a step
                delta /= 3;
                break;
              case 2:
                // DOM_DELTA_PAGE: A page makes up 80 steps
                delta *= 80;
                break;
              default:
                throw 'unrecognized mouse wheel delta mode: ' + event.deltaMode;
            }
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function(event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
  
          // check if SDL is available
          if (typeof SDL != "undefined") {
            Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
            Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
            // just add the mouse delta to the current absolut mouse position
            // FIXME: ideally this should be clamped against the canvas size and zero
            Browser.mouseX += Browser.mouseMovementX;
            Browser.mouseY += Browser.mouseMovementY;
          }
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
  
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            }
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },asyncLoad:function(url, onload, onerror, noRunDep) {
        var dep = !noRunDep ? getUniqueRunDependency('al ' + url) : '';
        readAsync(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (dep) removeRunDependency(dep);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (dep) addRunDependency(dep);
      },resizeListeners:[],updateResizeListeners:function() {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function(width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullscreenCanvasSize:function() {
        // check if SDL is available
        if (typeof SDL != "undefined") {
          var flags = HEAPU32[((SDL.screen)>>2)];
          flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
          HEAP32[((SDL.screen)>>2)]=flags
        }
        Browser.updateCanvasDimensions(Module['canvas']);
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function() {
        // check if SDL is available
        if (typeof SDL != "undefined") {
          var flags = HEAPU32[((SDL.screen)>>2)];
          flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
          HEAP32[((SDL.screen)>>2)]=flags
        }
        Browser.updateCanvasDimensions(Module['canvas']);
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function(canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['fullscreenElement'] || document['mozFullScreenElement'] ||
             document['msFullscreenElement'] || document['webkitFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function() {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};var EGL={errorCode:12288,defaultDisplayInitialized:false,currentContext:0,currentReadSurface:0,currentDrawSurface:0,contextAttributes:{alpha:false,depth:false,stencil:false,antialias:false},stringCache:{},setErrorCode:function(code) {
        EGL.errorCode = code;
      },chooseConfig:function(display, attribList, config, config_size, numConfigs) {
        if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
          EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
          return 0;
        }
  
        if (attribList) {
          // read attribList if it is non-null
          for(;;) {
            var param = HEAP32[((attribList)>>2)];
            if (param == 0x3021 /*EGL_ALPHA_SIZE*/) {
              var alphaSize = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.alpha = (alphaSize > 0);
            } else if (param == 0x3025 /*EGL_DEPTH_SIZE*/) {
              var depthSize = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.depth = (depthSize > 0);
            } else if (param == 0x3026 /*EGL_STENCIL_SIZE*/) {
              var stencilSize = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.stencil = (stencilSize > 0);
            } else if (param == 0x3031 /*EGL_SAMPLES*/) {
              var samples = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.antialias = (samples > 0);
            } else if (param == 0x3032 /*EGL_SAMPLE_BUFFERS*/) {
              var samples = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.antialias = (samples == 1);
            } else if (param == 0x3100 /*EGL_CONTEXT_PRIORITY_LEVEL_IMG*/) {
              var requestedPriority = HEAP32[(((attribList)+(4))>>2)];
              EGL.contextAttributes.lowLatency = (requestedPriority != 0x3103 /*EGL_CONTEXT_PRIORITY_LOW_IMG*/);
            } else if (param == 0x3038 /*EGL_NONE*/) {
                break;
            }
            attribList += 8;
          }
        }
  
        if ((!config || !config_size) && !numConfigs) {
          EGL.setErrorCode(0x300C /* EGL_BAD_PARAMETER */);
          return 0;
        }
        if (numConfigs) {
          HEAP32[((numConfigs)>>2)]=1; // Total number of supported configs: 1.
        }
        if (config && config_size > 0) {
          HEAP32[((config)>>2)]=62002;
        }
  
        EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
        return 1;
      }};function _eglGetCurrentDisplay() {
      return EGL.currentContext ? 62000 /* Magic ID for Emscripten 'default display' */ : 0;
    }

  function _eglGetProcAddress(name_) {
      return _emscripten_GetProcAddress(name_);
    }

  function _eglQueryString(display, name) {
      if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
        EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
        return 0;
      }
      //\todo An EGL_NOT_INITIALIZED error is generated if EGL is not initialized for dpy.
      EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
      if (EGL.stringCache[name]) return EGL.stringCache[name];
      var ret;
      switch(name) {
        case 0x3053 /* EGL_VENDOR */: ret = allocateUTF8("Emscripten"); break;
        case 0x3054 /* EGL_VERSION */: ret = allocateUTF8("1.4 Emscripten EGL"); break;
        case 0x3055 /* EGL_EXTENSIONS */:  ret = allocateUTF8(""); break; // Currently not supporting any EGL extensions.
        case 0x308D /* EGL_CLIENT_APIS */: ret = allocateUTF8("OpenGL_ES"); break;
        default:
          EGL.setErrorCode(0x300C /* EGL_BAD_PARAMETER */);
          return 0;
      }
      EGL.stringCache[name] = ret;
      return ret;
    }

  function _emscripten_get_sbrk_ptr() {
      return 1314736;
    }

  
  
  function __webgl_enable_ANGLE_instanced_arrays(ctx) {
      // Extension available in WebGL 1 from Firefox 26 and Google Chrome 30 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('ANGLE_instanced_arrays');
      if (ext) {
        ctx['vertexAttribDivisor'] = function(index, divisor) { ext['vertexAttribDivisorANGLE'](index, divisor); };
        ctx['drawArraysInstanced'] = function(mode, first, count, primcount) { ext['drawArraysInstancedANGLE'](mode, first, count, primcount); };
        ctx['drawElementsInstanced'] = function(mode, count, type, indices, primcount) { ext['drawElementsInstancedANGLE'](mode, count, type, indices, primcount); };
        return 1;
      }
    }
  
  function __webgl_enable_OES_vertex_array_object(ctx) {
      // Extension available in WebGL 1 from Firefox 25 and WebKit 536.28/desktop Safari 6.0.3 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('OES_vertex_array_object');
      if (ext) {
        ctx['createVertexArray'] = function() { return ext['createVertexArrayOES'](); };
        ctx['deleteVertexArray'] = function(vao) { ext['deleteVertexArrayOES'](vao); };
        ctx['bindVertexArray'] = function(vao) { ext['bindVertexArrayOES'](vao); };
        ctx['isVertexArray'] = function(vao) { return ext['isVertexArrayOES'](vao); };
        return 1;
      }
    }
  
  function __webgl_enable_WEBGL_draw_buffers(ctx) {
      // Extension available in WebGL 1 from Firefox 28 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('WEBGL_draw_buffers');
      if (ext) {
        ctx['drawBuffers'] = function(n, bufs) { ext['drawBuffersWEBGL'](n, bufs); };
        return 1;
      }
    }var GL={counter:1,buffers:[],programs:[],framebuffers:[],renderbuffers:[],textures:[],uniforms:[],shaders:[],vaos:[],contexts:[],offscreenCanvases:{},timerQueriesEXT:[],programInfos:{},stringCache:{},unpackAlignment:4,recordError:function recordError(errorCode) {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },getNewId:function(table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },getSource:function(shader, count, string, length) {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var len = length ? HEAP32[(((length)+(i*4))>>2)] : -1;
          source += UTF8ToString(HEAP32[(((string)+(i*4))>>2)], len < 0 ? undefined : len);
        }
        return source;
      },createContext:function(canvas, webGLContextAttributes) {
  
  
  
  
  
        var ctx = 
          (canvas.getContext("webgl", webGLContextAttributes)
            // https://caniuse.com/#feat=webgl
            );
  
  
        if (!ctx) return 0;
  
        var handle = GL.registerContext(ctx, webGLContextAttributes);
  
  
  
        return handle;
      },registerContext:function(ctx, webGLContextAttributes) {
        // without pthreads a context is just an integer ID
        var handle = GL.getNewId(GL.contexts);
  
        var context = {
          handle: handle,
          attributes: webGLContextAttributes,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
  
  
        // Store the created context object so that we can access the context given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault === 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
  
  
  
  
        return handle;
      },makeContextCurrent:function(contextHandle) {
  
        GL.currentContext = GL.contexts[contextHandle]; // Active Emscripten GL layer context object.
        Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx; // Active WebGL context object.
        return !(contextHandle && !GLctx);
      },getContext:function(contextHandle) {
        return GL.contexts[contextHandle];
      },deleteContext:function(contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents === 'object') JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas); // Release all JS event handlers on the DOM element that the GL context is associated with since the context is now deleted.
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined; // Make sure the canvas object no longer refers to the context object so there are no GC surprises.
        GL.contexts[contextHandle] = null;
      },initExtensions:function(context) {
        // If this function is called without a specific context object, init the extensions of the currently active context.
        if (!context) context = GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist.
  
        // Extensions that are only available in WebGL 1 (the calls will be no-ops if called on a WebGL 2 context active)
        __webgl_enable_ANGLE_instanced_arrays(GLctx);
        __webgl_enable_OES_vertex_array_object(GLctx);
        __webgl_enable_WEBGL_draw_buffers(GLctx);
  
        GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
  
        // These are the 'safe' feature-enabling extensions that don't add any performance impact related to e.g. debugging, and
        // should be enabled by default so that client GLES2/GL code will not need to go through extra hoops to get its stuff working.
        // As new extensions are ratified at http://www.khronos.org/registry/webgl/extensions/ , feel free to add your new extensions
        // here, as long as they don't produce a performance impact for users that might not be using those extensions.
        // E.g. debugging-related extensions should probably be off by default.
        var automaticallyEnabledExtensions = [ // Khronos ratified WebGL extensions ordered by number (no debug extensions):
                                               "OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives",
                                               "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture",
                                               "OES_element_index_uint", "EXT_texture_filter_anisotropic", "EXT_frag_depth",
                                               "WEBGL_draw_buffers", "ANGLE_instanced_arrays", "OES_texture_float_linear",
                                               "OES_texture_half_float_linear", "EXT_blend_minmax", "EXT_shader_texture_lod",
                                               "EXT_texture_norm16",
                                               // Community approved WebGL extensions ordered by number:
                                               "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float",
                                               "EXT_sRGB", "WEBGL_compressed_texture_etc1", "EXT_disjoint_timer_query",
                                               "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_astc", "EXT_color_buffer_float",
                                               "WEBGL_compressed_texture_s3tc_srgb", "EXT_disjoint_timer_query_webgl2",
                                               // Old style prefixed forms of extensions (but still currently used on e.g. iPhone Xs as
                                               // tested on iOS 12.4.1):
                                               "WEBKIT_WEBGL_compressed_texture_pvrtc"];
  
        function shouldEnableAutomatically(extension) {
          var ret = false;
          automaticallyEnabledExtensions.forEach(function(include) {
            if (extension.indexOf(include) != -1) {
              ret = true;
            }
          });
          return ret;
        }
  
        var exts = GLctx.getSupportedExtensions() || []; // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
        exts.forEach(function(ext) {
          if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
            GLctx.getExtension(ext); // Calling .getExtension enables that extension permanently, no need to store the return value to be enabled.
          }
        });
      },populateUniformTable:function(program) {
        var p = GL.programs[program];
        var ptable = GL.programInfos[program] = {
          uniforms: {},
          maxUniformLength: 0, // This is eagerly computed below, since we already enumerate all uniforms anyway.
          maxAttributeLength: -1, // This is lazily computed and cached, computed when/if first asked, "-1" meaning not computed yet.
          maxUniformBlockNameLength: -1 // Lazily computed as well
        };
  
        var utable = ptable.uniforms;
        // A program's uniform table maps the string name of an uniform to an integer location of that uniform.
        // The global GL.uniforms map maps integer locations to WebGLUniformLocations.
        var numUniforms = GLctx.getProgramParameter(p, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
        for (var i = 0; i < numUniforms; ++i) {
          var u = GLctx.getActiveUniform(p, i);
  
          var name = u.name;
          ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length+1);
  
          // If we are dealing with an array, e.g. vec4 foo[3], strip off the array index part to canonicalize that "foo", "foo[]",
          // and "foo[0]" will mean the same. Loop below will populate foo[1] and foo[2].
          if (name.slice(-1) == ']') {
            name = name.slice(0, name.lastIndexOf('['));
          }
  
          // Optimize memory usage slightly: If we have an array of uniforms, e.g. 'vec3 colors[3];', then
          // only store the string 'colors' in utable, and 'colors[0]', 'colors[1]' and 'colors[2]' will be parsed as 'colors'+i.
          // Note that for the GL.uniforms table, we still need to fetch the all WebGLUniformLocations for all the indices.
          var loc = GLctx.getUniformLocation(p, name);
          if (loc) {
            var id = GL.getNewId(GL.uniforms);
            utable[name] = [u.size, id];
            GL.uniforms[id] = loc;
  
            for (var j = 1; j < u.size; ++j) {
              var n = name + '['+j+']';
              loc = GLctx.getUniformLocation(p, n);
              id = GL.getNewId(GL.uniforms);
  
              GL.uniforms[id] = loc;
            }
          }
        }
      }};function _emscripten_glActiveTexture(x0) { GLctx['activeTexture'](x0) }

  function _emscripten_glAttachShader(program, shader) {
      GLctx.attachShader(GL.programs[program],
                              GL.shaders[shader]);
    }

  function _emscripten_glBeginQueryEXT(target, id) {
      GLctx.disjointTimerQueryExt['beginQueryEXT'](target, GL.timerQueriesEXT[id]);
    }

  function _emscripten_glBindAttribLocation(program, index, name) {
      GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    }

  function _emscripten_glBindBuffer(target, buffer) {
  
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    }

  function _emscripten_glBindFramebuffer(target, framebuffer) {
  
      GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
  
    }

  function _emscripten_glBindRenderbuffer(target, renderbuffer) {
      GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
    }

  function _emscripten_glBindTexture(target, texture) {
      GLctx.bindTexture(target, GL.textures[texture]);
    }

  function _emscripten_glBindVertexArrayOES(vao) {
      GLctx['bindVertexArray'](GL.vaos[vao]);
    }

  function _emscripten_glBlendColor(x0, x1, x2, x3) { GLctx['blendColor'](x0, x1, x2, x3) }

  function _emscripten_glBlendEquation(x0) { GLctx['blendEquation'](x0) }

  function _emscripten_glBlendEquationSeparate(x0, x1) { GLctx['blendEquationSeparate'](x0, x1) }

  function _emscripten_glBlendFunc(x0, x1) { GLctx['blendFunc'](x0, x1) }

  function _emscripten_glBlendFuncSeparate(x0, x1, x2, x3) { GLctx['blendFuncSeparate'](x0, x1, x2, x3) }

  function _emscripten_glBufferData(target, size, data, usage) {
        // N.b. here first form specifies a heap subarray, second form an integer size, so the ?: code here is polymorphic. It is advised to avoid
        // randomly mixing both uses in calling code, to avoid any potential JS engine JIT issues.
        GLctx.bufferData(target, data ? HEAPU8.subarray(data, data+size) : size, usage);
    }

  function _emscripten_glBufferSubData(target, offset, size, data) {
      GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data+size));
    }

  function _emscripten_glCheckFramebufferStatus(x0) { return GLctx['checkFramebufferStatus'](x0) }

  function _emscripten_glClear(x0) { GLctx['clear'](x0) }

  function _emscripten_glClearColor(x0, x1, x2, x3) { GLctx['clearColor'](x0, x1, x2, x3) }

  function _emscripten_glClearDepthf(x0) { GLctx['clearDepth'](x0) }

  function _emscripten_glClearStencil(x0) { GLctx['clearStencil'](x0) }

  function _emscripten_glColorMask(red, green, blue, alpha) {
      GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    }

  function _emscripten_glCompileShader(shader) {
      GLctx.compileShader(GL.shaders[shader]);
    }

  function _emscripten_glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
      GLctx['compressedTexImage2D'](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray((data),(data+imageSize)) : null);
    }

  function _emscripten_glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
      GLctx['compressedTexSubImage2D'](target, level, xoffset, yoffset, width, height, format, data ? HEAPU8.subarray((data),(data+imageSize)) : null);
    }

  function _emscripten_glCopyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7) { GLctx['copyTexImage2D'](x0, x1, x2, x3, x4, x5, x6, x7) }

  function _emscripten_glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) { GLctx['copyTexSubImage2D'](x0, x1, x2, x3, x4, x5, x6, x7) }

  function _emscripten_glCreateProgram() {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      program.name = id;
      GL.programs[id] = program;
      return id;
    }

  function _emscripten_glCreateShader(shaderType) {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
      return id;
    }

  function _emscripten_glCullFace(x0) { GLctx['cullFace'](x0) }

  function _emscripten_glDeleteBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
  
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
  
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
  
      }
    }

  function _emscripten_glDeleteFramebuffers(n, framebuffers) {
      for (var i = 0; i < n; ++i) {
        var id = HEAP32[(((framebuffers)+(i*4))>>2)];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue; // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null;
      }
    }

  function _emscripten_glDeleteProgram(id) {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) { // glDeleteProgram actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
      GL.programInfos[id] = null;
    }

  function _emscripten_glDeleteQueriesEXT(n, ids) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((ids)+(i*4))>>2)];
        var query = GL.timerQueriesEXT[id];
        if (!query) continue; // GL spec: "unused names in ids are ignored, as is the name zero."
        GLctx.disjointTimerQueryExt['deleteQueryEXT'](query);
        GL.timerQueriesEXT[id] = null;
      }
    }

  function _emscripten_glDeleteRenderbuffers(n, renderbuffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((renderbuffers)+(i*4))>>2)];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue; // GL spec: "glDeleteRenderbuffers silently ignores 0s and names that do not correspond to existing renderbuffer objects".
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null;
      }
    }

  function _emscripten_glDeleteShader(id) {
      if (!id) return;
      var shader = GL.shaders[id];
      if (!shader) { // glDeleteShader actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteShader(shader);
      GL.shaders[id] = null;
    }

  function _emscripten_glDeleteTextures(n, textures) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        if (!texture) continue; // GL spec: "glDeleteTextures silently ignores 0s and names that do not correspond to existing textures".
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    }

  function _emscripten_glDeleteVertexArraysOES(n, vaos) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((vaos)+(i*4))>>2)];
        GLctx['deleteVertexArray'](GL.vaos[id]);
        GL.vaos[id] = null;
      }
    }

  function _emscripten_glDepthFunc(x0) { GLctx['depthFunc'](x0) }

  function _emscripten_glDepthMask(flag) {
      GLctx.depthMask(!!flag);
    }

  function _emscripten_glDepthRangef(x0, x1) { GLctx['depthRange'](x0, x1) }

  function _emscripten_glDetachShader(program, shader) {
      GLctx.detachShader(GL.programs[program],
                              GL.shaders[shader]);
    }

  function _emscripten_glDisable(x0) { GLctx['disable'](x0) }

  function _emscripten_glDisableVertexAttribArray(index) {
      GLctx.disableVertexAttribArray(index);
    }

  function _emscripten_glDrawArrays(mode, first, count) {
  
      GLctx.drawArrays(mode, first, count);
  
    }

  function _emscripten_glDrawArraysInstancedANGLE(mode, first, count, primcount) {
      GLctx['drawArraysInstanced'](mode, first, count, primcount);
    }

  
  var __tempFixedLengthArray=[];function _emscripten_glDrawBuffersWEBGL(n, bufs) {
  
      var bufArray = __tempFixedLengthArray[n];
      for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[(((bufs)+(i*4))>>2)];
      }
  
      GLctx['drawBuffers'](bufArray);
    }

  function _emscripten_glDrawElements(mode, count, type, indices) {
  
      GLctx.drawElements(mode, count, type, indices);
  
    }

  function _emscripten_glDrawElementsInstancedANGLE(mode, count, type, indices, primcount) {
      GLctx['drawElementsInstanced'](mode, count, type, indices, primcount);
    }

  function _emscripten_glEnable(x0) { GLctx['enable'](x0) }

  function _emscripten_glEnableVertexAttribArray(index) {
      GLctx.enableVertexAttribArray(index);
    }

  function _emscripten_glEndQueryEXT(target) {
      GLctx.disjointTimerQueryExt['endQueryEXT'](target);
    }

  function _emscripten_glFinish() { GLctx['finish']() }

  function _emscripten_glFlush() { GLctx['flush']() }

  function _emscripten_glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
      GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget,
                                         GL.renderbuffers[renderbuffer]);
    }

  function _emscripten_glFramebufferTexture2D(target, attachment, textarget, texture, level) {
      GLctx.framebufferTexture2D(target, attachment, textarget,
                                      GL.textures[texture], level);
    }

  function _emscripten_glFrontFace(x0) { GLctx['frontFace'](x0) }

  
  function __glGenObject(n, buffers, createFunction, objectTable
      ) {
      for (var i = 0; i < n; i++) {
        var buffer = GLctx[createFunction]();
        var id = buffer && GL.getNewId(objectTable);
        if (buffer) {
          buffer.name = id;
          objectTable[id] = buffer;
        } else {
          GL.recordError(0x502 /* GL_INVALID_OPERATION */);
        }
        HEAP32[(((buffers)+(i*4))>>2)]=id;
      }
    }function _emscripten_glGenBuffers(n, buffers) {
      __glGenObject(n, buffers, 'createBuffer', GL.buffers
        );
    }

  function _emscripten_glGenFramebuffers(n, ids) {
      __glGenObject(n, ids, 'createFramebuffer', GL.framebuffers
        );
    }

  function _emscripten_glGenQueriesEXT(n, ids) {
      for (var i = 0; i < n; i++) {
        var query = GLctx.disjointTimerQueryExt['createQueryEXT']();
        if (!query) {
          GL.recordError(0x502 /* GL_INVALID_OPERATION */);
          while(i < n) HEAP32[(((ids)+(i++*4))>>2)]=0;
          return;
        }
        var id = GL.getNewId(GL.timerQueriesEXT);
        query.name = id;
        GL.timerQueriesEXT[id] = query;
        HEAP32[(((ids)+(i*4))>>2)]=id;
      }
    }

  function _emscripten_glGenRenderbuffers(n, renderbuffers) {
      __glGenObject(n, renderbuffers, 'createRenderbuffer', GL.renderbuffers
        );
    }

  function _emscripten_glGenTextures(n, textures) {
      __glGenObject(n, textures, 'createTexture', GL.textures
        );
    }

  function _emscripten_glGenVertexArraysOES(n, arrays) {
      __glGenObject(n, arrays, 'createVertexArray', GL.vaos
        );
    }

  function _emscripten_glGenerateMipmap(x0) { GLctx['generateMipmap'](x0) }

  
  function __glGetActiveAttribOrUniform(funcName, program, index, bufSize, length, size, type, name) {
      program = GL.programs[program];
      var info = GLctx[funcName](program, index);
      if (info) { // If an error occurs, nothing will be written to length, size and type and name.
        var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
        if (size) HEAP32[((size)>>2)]=info.size;
        if (type) HEAP32[((type)>>2)]=info.type;
      }
    }function _emscripten_glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
      __glGetActiveAttribOrUniform('getActiveAttrib', program, index, bufSize, length, size, type, name);
    }

  function _emscripten_glGetActiveUniform(program, index, bufSize, length, size, type, name) {
      __glGetActiveAttribOrUniform('getActiveUniform', program, index, bufSize, length, size, type, name);
    }

  function _emscripten_glGetAttachedShaders(program, maxCount, count, shaders) {
      var result = GLctx.getAttachedShaders(GL.programs[program]);
      var len = result.length;
      if (len > maxCount) {
        len = maxCount;
      }
      HEAP32[((count)>>2)]=len;
      for (var i = 0; i < len; ++i) {
        var id = GL.shaders.indexOf(result[i]);
        HEAP32[(((shaders)+(i*4))>>2)]=id;
      }
    }

  function _emscripten_glGetAttribLocation(program, name) {
      return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
    }

  
  
  function writeI53ToI64(ptr, num) {
      HEAPU32[ptr>>2] = num;
      HEAPU32[ptr+4>>2] = (num - HEAPU32[ptr>>2])/4294967296;
    }function emscriptenWebGLGet(name_, p, type) {
      // Guard against user passing a null pointer.
      // Note that GLES2 spec does not say anything about how passing a null pointer should be treated.
      // Testing on desktop core GL 3, the application crashes on glGetIntegerv to a null pointer, but
      // better to report an error instead of doing anything random.
      if (!p) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var ret = undefined;
      switch(name_) { // Handle a few trivial GLES values
        case 0x8DFA: // GL_SHADER_COMPILER
          ret = 1;
          break;
        case 0x8DF8: // GL_SHADER_BINARY_FORMATS
          if (type != 0 && type != 1) {
            GL.recordError(0x500); // GL_INVALID_ENUM
          }
          return; // Do not write anything to the out pointer, since no binary formats are supported.
        case 0x8DF9: // GL_NUM_SHADER_BINARY_FORMATS
          ret = 0;
          break;
        case 0x86A2: // GL_NUM_COMPRESSED_TEXTURE_FORMATS
          // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be queried for length),
          // so implement it ourselves to allow C++ GLES2 code get the length.
          var formats = GLctx.getParameter(0x86A3 /*GL_COMPRESSED_TEXTURE_FORMATS*/);
          ret = formats ? formats.length : 0;
          break;
      }
  
      if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof(result)) {
          case "number":
            ret = result;
            break;
          case "boolean":
            ret = result ? 1 : 0;
            break;
          case "string":
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          case "object":
            if (result === null) {
              // null is a valid result for some (e.g., which buffer is bound - perhaps nothing is bound), but otherwise
              // can mean an invalid name_, which we need to report as an error
              switch(name_) {
                case 0x8894: // ARRAY_BUFFER_BINDING
                case 0x8B8D: // CURRENT_PROGRAM
                case 0x8895: // ELEMENT_ARRAY_BUFFER_BINDING
                case 0x8CA6: // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
                case 0x8CA7: // RENDERBUFFER_BINDING
                case 0x8069: // TEXTURE_BINDING_2D
                case 0x85B5: // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
                case 0x8514: { // TEXTURE_BINDING_CUBE_MAP
                  ret = 0;
                  break;
                }
                default: {
                  GL.recordError(0x500); // GL_INVALID_ENUM
                  return;
                }
              }
            } else if (result instanceof Float32Array ||
                       result instanceof Uint32Array ||
                       result instanceof Int32Array ||
                       result instanceof Array) {
              for (var i = 0; i < result.length; ++i) {
                switch (type) {
                  case 0: HEAP32[(((p)+(i*4))>>2)]=result[i]; break;
                  case 2: HEAPF32[(((p)+(i*4))>>2)]=result[i]; break;
                  case 4: HEAP8[(((p)+(i))>>0)]=result[i] ? 1 : 0; break;
                }
              }
              return;
            } else {
              try {
                ret = result.name | 0;
              } catch(e) {
                GL.recordError(0x500); // GL_INVALID_ENUM
                err('GL_INVALID_ENUM in glGet' + type + 'v: Unknown object returned from WebGL getParameter(' + name_ + ')! (error: ' + e + ')');
                return;
              }
            }
            break;
          default:
            GL.recordError(0x500); // GL_INVALID_ENUM
            err('GL_INVALID_ENUM in glGet' + type + 'v: Native code calling glGet' + type + 'v(' + name_ + ') and it returns ' + result + ' of type ' + typeof(result) + '!');
            return;
        }
      }
  
      switch (type) {
        case 1: writeI53ToI64(p, ret); break;
        case 0: HEAP32[((p)>>2)]=ret; break;
        case 2:   HEAPF32[((p)>>2)]=ret; break;
        case 4: HEAP8[((p)>>0)]=ret ? 1 : 0; break;
      }
    }function _emscripten_glGetBooleanv(name_, p) {
      emscriptenWebGLGet(name_, p, 4);
    }

  function _emscripten_glGetBufferParameteriv(target, value, data) {
      if (!data) {
        // GLES2 specification does not specify how to behave if data is a null pointer. Since calling this function does not make sense
        // if data == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((data)>>2)]=GLctx.getBufferParameter(target, value);
    }

  function _emscripten_glGetError() {
      var error = GLctx.getError() || GL.lastError;
      GL.lastError = 0/*GL_NO_ERROR*/;
      return error;
    }

  function _emscripten_glGetFloatv(name_, p) {
      emscriptenWebGLGet(name_, p, 2);
    }

  function _emscripten_glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
      var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
      if (result instanceof WebGLRenderbuffer ||
          result instanceof WebGLTexture) {
        result = result.name | 0;
      }
      HEAP32[((params)>>2)]=result;
    }

  function _emscripten_glGetIntegerv(name_, p) {
      emscriptenWebGLGet(name_, p, 0);
    }

  function _emscripten_glGetProgramInfoLog(program, maxLength, length, infoLog) {
      var log = GLctx.getProgramInfoLog(GL.programs[program]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
    }

  function _emscripten_glGetProgramiv(program, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      var ptable = GL.programInfos[program];
      if (!ptable) {
        GL.recordError(0x502 /* GL_INVALID_OPERATION */);
        return;
      }
  
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        HEAP32[((p)>>2)]=ptable.maxUniformLength;
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (ptable.maxAttributeLength == -1) {
          program = GL.programs[program];
          var numAttribs = GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/);
          ptable.maxAttributeLength = 0; // Spec says if there are no active attribs, 0 must be returned.
          for (var i = 0; i < numAttribs; ++i) {
            var activeAttrib = GLctx.getActiveAttrib(program, i);
            ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length+1);
          }
        }
        HEAP32[((p)>>2)]=ptable.maxAttributeLength;
      } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (ptable.maxUniformBlockNameLength == -1) {
          program = GL.programs[program];
          var numBlocks = GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/);
          ptable.maxUniformBlockNameLength = 0;
          for (var i = 0; i < numBlocks; ++i) {
            var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
            ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length+1);
          }
        }
        HEAP32[((p)>>2)]=ptable.maxUniformBlockNameLength;
      } else {
        HEAP32[((p)>>2)]=GLctx.getProgramParameter(GL.programs[program], pname);
      }
    }

  function _emscripten_glGetQueryObjecti64vEXT(id, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var query = GL.timerQueriesEXT[id];
      var param = GLctx.disjointTimerQueryExt['getQueryObjectEXT'](query, pname);
      var ret;
      if (typeof param == 'boolean') {
        ret = param ? 1 : 0;
      } else {
        ret = param;
      }
      writeI53ToI64(params, ret);
    }

  function _emscripten_glGetQueryObjectivEXT(id, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var query = GL.timerQueriesEXT[id];
      var param = GLctx.disjointTimerQueryExt['getQueryObjectEXT'](query, pname);
      var ret;
      if (typeof param == 'boolean') {
        ret = param ? 1 : 0;
      } else {
        ret = param;
      }
      HEAP32[((params)>>2)]=ret;
    }

  function _emscripten_glGetQueryObjectui64vEXT(id, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var query = GL.timerQueriesEXT[id];
      var param = GLctx.disjointTimerQueryExt['getQueryObjectEXT'](query, pname);
      var ret;
      if (typeof param == 'boolean') {
        ret = param ? 1 : 0;
      } else {
        ret = param;
      }
      writeI53ToI64(params, ret);
    }

  function _emscripten_glGetQueryObjectuivEXT(id, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var query = GL.timerQueriesEXT[id];
      var param = GLctx.disjointTimerQueryExt['getQueryObjectEXT'](query, pname);
      var ret;
      if (typeof param == 'boolean') {
        ret = param ? 1 : 0;
      } else {
        ret = param;
      }
      HEAP32[((params)>>2)]=ret;
    }

  function _emscripten_glGetQueryivEXT(target, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((params)>>2)]=GLctx.disjointTimerQueryExt['getQueryEXT'](target, pname);
    }

  function _emscripten_glGetRenderbufferParameteriv(target, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if params == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((params)>>2)]=GLctx.getRenderbufferParameter(target, pname);
    }

  function _emscripten_glGetShaderInfoLog(shader, maxLength, length, infoLog) {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
    }

  function _emscripten_glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
      var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
      HEAP32[((range)>>2)]=result.rangeMin;
      HEAP32[(((range)+(4))>>2)]=result.rangeMax;
      HEAP32[((precision)>>2)]=result.precision;
    }

  function _emscripten_glGetShaderSource(shader, bufSize, length, source) {
      var result = GLctx.getShaderSource(GL.shaders[shader]);
      if (!result) return; // If an error occurs, nothing will be written to length or source.
      var numBytesWrittenExclNull = (bufSize > 0 && source) ? stringToUTF8(result, source, bufSize) : 0;
      if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
    }

  function _emscripten_glGetShaderiv(shader, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = (source === null || source.length == 0) ? 0 : source.length + 1;
        HEAP32[((p)>>2)]=sourceLength;
      } else {
        HEAP32[((p)>>2)]=GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    }

  
  function stringToNewUTF8(jsString) {
      var length = lengthBytesUTF8(jsString)+1;
      var cString = _malloc(length);
      stringToUTF8(jsString, cString, length);
      return cString;
    }function _emscripten_glGetString(name_) {
      if (GL.stringCache[name_]) return GL.stringCache[name_];
      var ret;
      switch(name_) {
        case 0x1F03 /* GL_EXTENSIONS */:
          var exts = GLctx.getSupportedExtensions() || []; // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
          exts = exts.concat(exts.map(function(e) { return "GL_" + e; }));
          ret = stringToNewUTF8(exts.join(' '));
          break;
        case 0x1F00 /* GL_VENDOR */:
        case 0x1F01 /* GL_RENDERER */:
        case 0x9245 /* UNMASKED_VENDOR_WEBGL */:
        case 0x9246 /* UNMASKED_RENDERER_WEBGL */:
          var s = GLctx.getParameter(name_);
          if (!s) {
            GL.recordError(0x500/*GL_INVALID_ENUM*/);
          }
          ret = stringToNewUTF8(s);
          break;
  
        case 0x1F02 /* GL_VERSION */:
          var glVersion = GLctx.getParameter(0x1F02 /*GL_VERSION*/);
          // return GLES version string corresponding to the version of the WebGL context
          {
            glVersion = 'OpenGL ES 2.0 (' + glVersion + ')';
          }
          ret = stringToNewUTF8(glVersion);
          break;
        case 0x8B8C /* GL_SHADING_LANGUAGE_VERSION */:
          var glslVersion = GLctx.getParameter(0x8B8C /*GL_SHADING_LANGUAGE_VERSION*/);
          // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
          var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
          var ver_num = glslVersion.match(ver_re);
          if (ver_num !== null) {
            if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + '0'; // ensure minor version has 2 digits
            glslVersion = 'OpenGL ES GLSL ES ' + ver_num[1] + ' (' + glslVersion + ')';
          }
          ret = stringToNewUTF8(glslVersion);
          break;
        default:
          GL.recordError(0x500/*GL_INVALID_ENUM*/);
          return 0;
      }
      GL.stringCache[name_] = ret;
      return ret;
    }

  function _emscripten_glGetTexParameterfv(target, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAPF32[((params)>>2)]=GLctx.getTexParameter(target, pname);
    }

  function _emscripten_glGetTexParameteriv(target, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((params)>>2)]=GLctx.getTexParameter(target, pname);
    }

  function _emscripten_glGetUniformLocation(program, name) {
      name = UTF8ToString(name);
  
      var arrayIndex = 0;
      // If user passed an array accessor "[index]", parse the array index off the accessor.
      if (name[name.length - 1] == ']') {
        var leftBrace = name.lastIndexOf('[');
        arrayIndex = name[leftBrace+1] != ']' ? jstoi_q(name.slice(leftBrace + 1)) : 0; // "index]", parseInt will ignore the ']' at the end; but treat "foo[]" as "foo[0]"
        name = name.slice(0, leftBrace);
      }
  
      var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name]; // returns pair [ dimension_of_uniform_array, uniform_location ]
      if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) { // Check if user asked for an out-of-bounds element, i.e. for 'vec4 colors[3];' user could ask for 'colors[10]' which should return -1.
        return uniformInfo[1] + arrayIndex;
      } else {
        return -1;
      }
    }

  
  /** @suppress{checkTypes} */
  function emscriptenWebGLGetUniform(program, location, params, type) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if params == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var data = GLctx.getUniform(GL.programs[program], GL.uniforms[location]);
      if (typeof data == 'number' || typeof data == 'boolean') {
        switch (type) {
          case 0: HEAP32[((params)>>2)]=data; break;
          case 2: HEAPF32[((params)>>2)]=data; break;
          default: throw 'internal emscriptenWebGLGetUniform() error, bad type: ' + type;
        }
      } else {
        for (var i = 0; i < data.length; i++) {
          switch (type) {
            case 0: HEAP32[(((params)+(i*4))>>2)]=data[i]; break;
            case 2: HEAPF32[(((params)+(i*4))>>2)]=data[i]; break;
            default: throw 'internal emscriptenWebGLGetUniform() error, bad type: ' + type;
          }
        }
      }
    }function _emscripten_glGetUniformfv(program, location, params) {
      emscriptenWebGLGetUniform(program, location, params, 2);
    }

  function _emscripten_glGetUniformiv(program, location, params) {
      emscriptenWebGLGetUniform(program, location, params, 0);
    }

  function _emscripten_glGetVertexAttribPointerv(index, pname, pointer) {
      if (!pointer) {
        // GLES2 specification does not specify how to behave if pointer is a null pointer. Since calling this function does not make sense
        // if pointer == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((pointer)>>2)]=GLctx.getVertexAttribOffset(index, pname);
    }

  
  /** @suppress{checkTypes} */
  function emscriptenWebGLGetVertexAttrib(index, pname, params, type) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if params == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var data = GLctx.getVertexAttrib(index, pname);
      if (pname == 0x889F/*VERTEX_ATTRIB_ARRAY_BUFFER_BINDING*/) {
        HEAP32[((params)>>2)]=data && data["name"];
      } else if (typeof data == 'number' || typeof data == 'boolean') {
        switch (type) {
          case 0: HEAP32[((params)>>2)]=data; break;
          case 2: HEAPF32[((params)>>2)]=data; break;
          case 5: HEAP32[((params)>>2)]=Math.fround(data); break;
          default: throw 'internal emscriptenWebGLGetVertexAttrib() error, bad type: ' + type;
        }
      } else {
        for (var i = 0; i < data.length; i++) {
          switch (type) {
            case 0: HEAP32[(((params)+(i*4))>>2)]=data[i]; break;
            case 2: HEAPF32[(((params)+(i*4))>>2)]=data[i]; break;
            case 5: HEAP32[(((params)+(i*4))>>2)]=Math.fround(data[i]); break;
            default: throw 'internal emscriptenWebGLGetVertexAttrib() error, bad type: ' + type;
          }
        }
      }
    }function _emscripten_glGetVertexAttribfv(index, pname, params) {
      // N.B. This function may only be called if the vertex attribute was specified using the function glVertexAttrib*f(),
      // otherwise the results are undefined. (GLES3 spec 6.1.12)
      emscriptenWebGLGetVertexAttrib(index, pname, params, 2);
    }

  function _emscripten_glGetVertexAttribiv(index, pname, params) {
      // N.B. This function may only be called if the vertex attribute was specified using the function glVertexAttrib*f(),
      // otherwise the results are undefined. (GLES3 spec 6.1.12)
      emscriptenWebGLGetVertexAttrib(index, pname, params, 5);
    }

  function _emscripten_glHint(x0, x1) { GLctx['hint'](x0, x1) }

  function _emscripten_glIsBuffer(buffer) {
      var b = GL.buffers[buffer];
      if (!b) return 0;
      return GLctx.isBuffer(b);
    }

  function _emscripten_glIsEnabled(x0) { return GLctx['isEnabled'](x0) }

  function _emscripten_glIsFramebuffer(framebuffer) {
      var fb = GL.framebuffers[framebuffer];
      if (!fb) return 0;
      return GLctx.isFramebuffer(fb);
    }

  function _emscripten_glIsProgram(program) {
      program = GL.programs[program];
      if (!program) return 0;
      return GLctx.isProgram(program);
    }

  function _emscripten_glIsQueryEXT(id) {
      var query = GL.timerQueriesEXT[id];
      if (!query) return 0;
      return GLctx.disjointTimerQueryExt['isQueryEXT'](query);
    }

  function _emscripten_glIsRenderbuffer(renderbuffer) {
      var rb = GL.renderbuffers[renderbuffer];
      if (!rb) return 0;
      return GLctx.isRenderbuffer(rb);
    }

  function _emscripten_glIsShader(shader) {
      var s = GL.shaders[shader];
      if (!s) return 0;
      return GLctx.isShader(s);
    }

  function _emscripten_glIsTexture(id) {
      var texture = GL.textures[id];
      if (!texture) return 0;
      return GLctx.isTexture(texture);
    }

  function _emscripten_glIsVertexArrayOES(array) {
  
      var vao = GL.vaos[array];
      if (!vao) return 0;
      return GLctx['isVertexArray'](vao);
    }

  function _emscripten_glLineWidth(x0) { GLctx['lineWidth'](x0) }

  function _emscripten_glLinkProgram(program) {
      GLctx.linkProgram(GL.programs[program]);
      GL.populateUniformTable(program);
    }

  function _emscripten_glPixelStorei(pname, param) {
      if (pname == 0xCF5 /* GL_UNPACK_ALIGNMENT */) {
        GL.unpackAlignment = param;
      }
      GLctx.pixelStorei(pname, param);
    }

  function _emscripten_glPolygonOffset(x0, x1) { GLctx['polygonOffset'](x0, x1) }

  function _emscripten_glQueryCounterEXT(id, target) {
      GLctx.disjointTimerQueryExt['queryCounterEXT'](GL.timerQueriesEXT[id], target);
    }

  
  
  function __computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
      function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
      }
      var plainRowSize = width * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
      return height * alignedRowSize;
    }
  
  function __colorChannelsInGlTextureFormat(format) {
      // Micro-optimizations for size: map format to size by subtracting smallest enum value (0x1902) from all values first.
      // Also omit the most common size value (1) from the list, which is assumed by formats not on the list.
      var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
      };
      return colorChannels[format - 0x1902]||1;
    }
  
  function __heapObjectForWebGLType(type) {
      // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
      // smaller values for the heap, for shorter generated code size.
      // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
      // (since most types are HEAPU16)
      type -= 0x1400;
  
      if (type == 1) return HEAPU8;
  
  
      if (type == 4) return HEAP32;
  
      if (type == 6) return HEAPF32;
  
      if (type == 5
        || type == 28922
        )
        return HEAPU32;
  
      return HEAPU16;
    }
  
  function __heapAccessShiftForWebGLHeap(heap) {
      return 31 - Math.clz32(heap.BYTES_PER_ELEMENT);
    }function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
      var heap = __heapObjectForWebGLType(type);
      var shift = __heapAccessShiftForWebGLHeap(heap);
      var byteSize = 1<<shift;
      var sizePerPixel = __colorChannelsInGlTextureFormat(format) * byteSize;
      var bytes = __computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
      return heap.subarray(pixels >> shift, pixels + bytes >> shift);
    }function _emscripten_glReadPixels(x, y, width, height, format, type, pixels) {
      var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
      if (!pixelData) {
        GL.recordError(0x500/*GL_INVALID_ENUM*/);
        return;
      }
      GLctx.readPixels(x, y, width, height, format, type, pixelData);
    }

  function _emscripten_glReleaseShaderCompiler() {
      // NOP (as allowed by GLES 2.0 spec)
    }

  function _emscripten_glRenderbufferStorage(x0, x1, x2, x3) { GLctx['renderbufferStorage'](x0, x1, x2, x3) }

  function _emscripten_glSampleCoverage(value, invert) {
      GLctx.sampleCoverage(value, !!invert);
    }

  function _emscripten_glScissor(x0, x1, x2, x3) { GLctx['scissor'](x0, x1, x2, x3) }

  function _emscripten_glShaderBinary() {
      GL.recordError(0x500/*GL_INVALID_ENUM*/);
    }

  function _emscripten_glShaderSource(shader, count, string, length) {
      var source = GL.getSource(shader, count, string, length);
  
  
      GLctx.shaderSource(GL.shaders[shader], source);
    }

  function _emscripten_glStencilFunc(x0, x1, x2) { GLctx['stencilFunc'](x0, x1, x2) }

  function _emscripten_glStencilFuncSeparate(x0, x1, x2, x3) { GLctx['stencilFuncSeparate'](x0, x1, x2, x3) }

  function _emscripten_glStencilMask(x0) { GLctx['stencilMask'](x0) }

  function _emscripten_glStencilMaskSeparate(x0, x1) { GLctx['stencilMaskSeparate'](x0, x1) }

  function _emscripten_glStencilOp(x0, x1, x2) { GLctx['stencilOp'](x0, x1, x2) }

  function _emscripten_glStencilOpSeparate(x0, x1, x2, x3) { GLctx['stencilOpSeparate'](x0, x1, x2, x3) }

  function _emscripten_glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null);
    }

  function _emscripten_glTexParameterf(x0, x1, x2) { GLctx['texParameterf'](x0, x1, x2) }

  function _emscripten_glTexParameterfv(target, pname, params) {
      var param = HEAPF32[((params)>>2)];
      GLctx.texParameterf(target, pname, param);
    }

  function _emscripten_glTexParameteri(x0, x1, x2) { GLctx['texParameteri'](x0, x1, x2) }

  function _emscripten_glTexParameteriv(target, pname, params) {
      var param = HEAP32[((params)>>2)];
      GLctx.texParameteri(target, pname, param);
    }

  function _emscripten_glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
      var pixelData = null;
      if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    }

  function _emscripten_glUniform1f(location, v0) {
      GLctx.uniform1f(GL.uniforms[location], v0);
    }

  
  var __miniTempWebGLFloatBuffers=[];function _emscripten_glUniform1fv(location, count, value) {
  
  
  
      if (count <= 288) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[count-1];
        for (var i = 0; i < count; ++i) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*4)>>2);
      }
      GLctx.uniform1fv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform1i(location, v0) {
      GLctx.uniform1i(GL.uniforms[location], v0);
    }

  
  var __miniTempWebGLIntBuffers=[];function _emscripten_glUniform1iv(location, count, value) {
  
  
  
      if (count <= 288) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[count-1];
        for (var i = 0; i < count; ++i) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*4)>>2);
      }
      GLctx.uniform1iv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform2f(location, v0, v1) {
      GLctx.uniform2f(GL.uniforms[location], v0, v1);
    }

  function _emscripten_glUniform2fv(location, count, value) {
  
  
  
      if (count <= 144) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[2*count-1];
        for (var i = 0; i < 2*count; i += 2) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*8)>>2);
      }
      GLctx.uniform2fv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform2i(location, v0, v1) {
      GLctx.uniform2i(GL.uniforms[location], v0, v1);
    }

  function _emscripten_glUniform2iv(location, count, value) {
  
  
  
      if (count <= 144) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[2*count-1];
        for (var i = 0; i < 2*count; i += 2) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*8)>>2);
      }
      GLctx.uniform2iv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform3f(location, v0, v1, v2) {
      GLctx.uniform3f(GL.uniforms[location], v0, v1, v2);
    }

  function _emscripten_glUniform3fv(location, count, value) {
  
  
  
      if (count <= 96) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[3*count-1];
        for (var i = 0; i < 3*count; i += 3) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*12)>>2);
      }
      GLctx.uniform3fv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform3i(location, v0, v1, v2) {
      GLctx.uniform3i(GL.uniforms[location], v0, v1, v2);
    }

  function _emscripten_glUniform3iv(location, count, value) {
  
  
  
      if (count <= 96) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[3*count-1];
        for (var i = 0; i < 3*count; i += 3) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAP32[(((value)+(4*i+8))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*12)>>2);
      }
      GLctx.uniform3iv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform4f(location, v0, v1, v2, v3) {
      GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3);
    }

  function _emscripten_glUniform4fv(location, count, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[4*count-1];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 4 * count; i += 4) {
          var dst = value + i;
          view[i] = heap[dst];
          view[i + 1] = heap[dst + 1];
          view[i + 2] = heap[dst + 2];
          view[i + 3] = heap[dst + 3];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniform4fv(GL.uniforms[location], view);
    }

  function _emscripten_glUniform4i(location, v0, v1, v2, v3) {
      GLctx.uniform4i(GL.uniforms[location], v0, v1, v2, v3);
    }

  function _emscripten_glUniform4iv(location, count, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[4*count-1];
        for (var i = 0; i < 4*count; i += 4) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAP32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAP32[(((value)+(4*i+12))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniform4iv(GL.uniforms[location], view);
    }

  function _emscripten_glUniformMatrix2fv(location, count, transpose, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[4*count-1];
        for (var i = 0; i < 4*count; i += 4) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAPF32[(((value)+(4*i+12))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniformMatrix2fv(GL.uniforms[location], !!transpose, view);
    }

  function _emscripten_glUniformMatrix3fv(location, count, transpose, value) {
  
  
  
      if (count <= 32) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[9*count-1];
        for (var i = 0; i < 9*count; i += 9) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAPF32[(((value)+(4*i+12))>>2)];
          view[i+4] = HEAPF32[(((value)+(4*i+16))>>2)];
          view[i+5] = HEAPF32[(((value)+(4*i+20))>>2)];
          view[i+6] = HEAPF32[(((value)+(4*i+24))>>2)];
          view[i+7] = HEAPF32[(((value)+(4*i+28))>>2)];
          view[i+8] = HEAPF32[(((value)+(4*i+32))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*36)>>2);
      }
      GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, view);
    }

  function _emscripten_glUniformMatrix4fv(location, count, transpose, value) {
  
  
  
      if (count <= 18) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[16*count-1];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 16 * count; i += 16) {
          var dst = value + i;
          view[i] = heap[dst];
          view[i + 1] = heap[dst + 1];
          view[i + 2] = heap[dst + 2];
          view[i + 3] = heap[dst + 3];
          view[i + 4] = heap[dst + 4];
          view[i + 5] = heap[dst + 5];
          view[i + 6] = heap[dst + 6];
          view[i + 7] = heap[dst + 7];
          view[i + 8] = heap[dst + 8];
          view[i + 9] = heap[dst + 9];
          view[i + 10] = heap[dst + 10];
          view[i + 11] = heap[dst + 11];
          view[i + 12] = heap[dst + 12];
          view[i + 13] = heap[dst + 13];
          view[i + 14] = heap[dst + 14];
          view[i + 15] = heap[dst + 15];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*64)>>2);
      }
      GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, view);
    }

  function _emscripten_glUseProgram(program) {
      GLctx.useProgram(GL.programs[program]);
    }

  function _emscripten_glValidateProgram(program) {
      GLctx.validateProgram(GL.programs[program]);
    }

  function _emscripten_glVertexAttrib1f(x0, x1) { GLctx['vertexAttrib1f'](x0, x1) }

  function _emscripten_glVertexAttrib1fv(index, v) {
  
      GLctx.vertexAttrib1f(index, HEAPF32[v>>2]);
    }

  function _emscripten_glVertexAttrib2f(x0, x1, x2) { GLctx['vertexAttrib2f'](x0, x1, x2) }

  function _emscripten_glVertexAttrib2fv(index, v) {
  
      GLctx.vertexAttrib2f(index, HEAPF32[v>>2], HEAPF32[v+4>>2]);
    }

  function _emscripten_glVertexAttrib3f(x0, x1, x2, x3) { GLctx['vertexAttrib3f'](x0, x1, x2, x3) }

  function _emscripten_glVertexAttrib3fv(index, v) {
  
      GLctx.vertexAttrib3f(index, HEAPF32[v>>2], HEAPF32[v+4>>2], HEAPF32[v+8>>2]);
    }

  function _emscripten_glVertexAttrib4f(x0, x1, x2, x3, x4) { GLctx['vertexAttrib4f'](x0, x1, x2, x3, x4) }

  function _emscripten_glVertexAttrib4fv(index, v) {
  
      GLctx.vertexAttrib4f(index, HEAPF32[v>>2], HEAPF32[v+4>>2], HEAPF32[v+8>>2], HEAPF32[v+12>>2]);
    }

  function _emscripten_glVertexAttribDivisorANGLE(index, divisor) {
      GLctx['vertexAttribDivisor'](index, divisor);
    }

  function _emscripten_glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    }

  function _emscripten_glViewport(x0, x1, x2, x3) { GLctx['viewport'](x0, x1, x2, x3) }

  
  function _longjmp(env, value) {
      _setThrew(env, value || 1);
      throw 'longjmp';
    }function _emscripten_longjmp(env, value) {
      _longjmp(env, value);
    }

  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }

  
  function _emscripten_get_heap_size() {
      return HEAPU8.length;
    }
  
  function emscripten_realloc_buffer(size) {
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow((size - buffer.byteLength + 65535) >>> 16); // .grow() takes a delta compared to the previous size
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1 /*success*/;
      } catch(e) {
      }
    }function _emscripten_resize_heap(requestedSize) {
      requestedSize = requestedSize >>> 0;
      var oldSize = _emscripten_get_heap_size();
      // With pthreads, races can happen (another thread might increase the size in between), so return a failure, and let the caller retry.
  
  
      var PAGE_MULTIPLE = 65536;
  
      // Memory resize rules:
      // 1. When resizing, always produce a resized heap that is at least 16MB (to avoid tiny heap sizes receiving lots of repeated resizes at startup)
      // 2. Always increase heap size to at least the requested size, rounded up to next page multiple.
      // 3a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap geometrically: increase the heap size according to 
      //                                         MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%),
      //                                         At most overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 3b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap linearly: increase the heap size by at least MEMORY_GROWTH_LINEAR_STEP bytes.
      // 4. Max size for the heap is capped at 2048MB-PAGE_MULTIPLE, or by MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 5. If we were unable to allocate as much memory, it may be due to over-eager decision to excessively reserve due to (3) above.
      //    Hence if an allocation fails, cut down on the amount of excess growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit was set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = 2147483648;
      if (requestedSize > maxHeapSize) {
        return false;
      }
  
      var minHeapSize = 16777216;
  
      // Loop through potential heap size increases. If we attempt a too eager reservation that fails, cut down on the
      // attempted size and reserve a smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for(var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
  
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(minHeapSize, requestedSize, overGrownHeapSize), PAGE_MULTIPLE));
  
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
  
          return true;
        }
      }
      return false;
    }

  
  
  var ENV={};
  
  function __getExecutableName() {
      return thisProgram || './this.program';
    }function getEnvStrings() {
      if (!getEnvStrings.strings) {
        // Default values.
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          // Browser language detection #8751
          'LANG': ((typeof navigator === 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8',
          '_': __getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(x + '=' + env[x]);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }function _environ_get(__environ, environ_buf) {
      var bufSize = 0;
      getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAP32[(((__environ)+(i * 4))>>2)]=ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }

  function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings();
      HEAP32[((penviron_count)>>2)]=strings.length;
      var bufSize = 0;
      strings.forEach(function(string) {
        bufSize += string.length + 1;
      });
      HEAP32[((penviron_buf_size)>>2)]=bufSize;
      return 0;
    }

  
  function _execl(path, arg0, varArgs) {
      // int execl(const char *path, const char *arg0, ... /*, (char *)0 */);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/exec.html
      // We don't support executing external code.
      setErrNo(45);
      return -1;
    }function _execve(a0,a1,a2
  ) {
  return _execl(a0,a1,a2);
  }


  function _fd_close(fd) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fd_fdstat_get(fd, pbuf) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      // All character devices are terminals (other things a Linux system would
      // assume is a character device, like the mouse, we have special APIs for).
      var type = stream.tty ? 2 :
                 FS.isDir(stream.mode) ? 3 :
                 FS.isLink(stream.mode) ? 7 :
                 4;
      HEAP8[((pbuf)>>0)]=type;
      // TODO HEAP16[(((pbuf)+(2))>>1)]=?;
      // TODO (tempI64 = [?>>>0,(tempDouble=?,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((pbuf)+(8))>>2)]=tempI64[0],HEAP32[(((pbuf)+(12))>>2)]=tempI64[1]);
      // TODO (tempI64 = [?>>>0,(tempDouble=?,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((pbuf)+(16))>>2)]=tempI64[0],HEAP32[(((pbuf)+(20))>>2)]=tempI64[1]);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fd_read(fd, iov, iovcnt, pnum) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = SYSCALLS.doReadv(stream, iov, iovcnt);
      HEAP32[((pnum)>>2)]=num
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {try {
  
      
      var stream = SYSCALLS.getStreamFromFD(fd);
      var HIGH_OFFSET = 0x100000000; // 2^32
      // use an unsigned operator on low and shift high by 32-bits
      var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
  
      var DOUBLE_LIMIT = 0x20000000000000; // 2^53
      // we also check for equality since DOUBLE_LIMIT + 1 == DOUBLE_LIMIT
      if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
        return -61;
      }
  
      FS.llseek(stream, offset, whence);
      (tempI64 = [stream.position>>>0,(tempDouble=stream.position,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((newOffset)>>2)]=tempI64[0],HEAP32[(((newOffset)+(4))>>2)]=tempI64[1]);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fd_sync(fd) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (stream.stream_ops && stream.stream_ops.fsync) {
        return -stream.stream_ops.fsync(stream);
      }
      return 0; // we can't do anything synchronously; the in-memory FS is already synced to
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fd_write(fd, iov, iovcnt, pnum) {try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = SYSCALLS.doWritev(stream, iov, iovcnt);
      HEAP32[((pnum)>>2)]=num
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  function _fork() {
      // pid_t fork(void);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fork.html
      // We don't support multiple processes.
      setErrNo(6);
      return -1;
    }

  function _getTempRet0() {
      return (getTempRet0() | 0);
    }

  function _getaddrinfo(node, service, hint, out) {
      // Note getaddrinfo currently only returns a single addrinfo with ai_next defaulting to NULL. When NULL
      // hints are specified or ai_family set to AF_UNSPEC or ai_socktype or ai_protocol set to 0 then we
      // really should provide a linked list of suitable addrinfo values.
      var addrs = [];
      var canon = null;
      var addr = 0;
      var port = 0;
      var flags = 0;
      var family = 0;
      var type = 0;
      var proto = 0;
      var ai, last;
  
      function allocaddrinfo(family, type, proto, canon, addr, port) {
        var sa, salen, ai;
        var res;
  
        salen = family === 10 ?
          28 :
          16;
        addr = family === 10 ?
          __inet_ntop6_raw(addr) :
          __inet_ntop4_raw(addr);
        sa = _malloc(salen);
        res = __write_sockaddr(sa, family, addr, port);
        assert(!res.errno);
  
        ai = _malloc(32);
        HEAP32[(((ai)+(4))>>2)]=family;
        HEAP32[(((ai)+(8))>>2)]=type;
        HEAP32[(((ai)+(12))>>2)]=proto;
        HEAP32[(((ai)+(24))>>2)]=canon;
        HEAP32[(((ai)+(20))>>2)]=sa;
        if (family === 10) {
          HEAP32[(((ai)+(16))>>2)]=28;
        } else {
          HEAP32[(((ai)+(16))>>2)]=16;
        }
        HEAP32[(((ai)+(28))>>2)]=0;
  
        return ai;
      }
  
      if (hint) {
        flags = HEAP32[((hint)>>2)];
        family = HEAP32[(((hint)+(4))>>2)];
        type = HEAP32[(((hint)+(8))>>2)];
        proto = HEAP32[(((hint)+(12))>>2)];
      }
      if (type && !proto) {
        proto = type === 2 ? 17 : 6;
      }
      if (!type && proto) {
        type = proto === 17 ? 2 : 1;
      }
  
      // If type or proto are set to zero in hints we should really be returning multiple addrinfo values, but for
      // now default to a TCP STREAM socket so we can at least return a sensible addrinfo given NULL hints.
      if (proto === 0) {
        proto = 6;
      }
      if (type === 0) {
        type = 1;
      }
  
      if (!node && !service) {
        return -2;
      }
      if (flags & ~(1|2|4|
          1024|8|16|32)) {
        return -1;
      }
      if (hint !== 0 && (HEAP32[((hint)>>2)] & 2) && !node) {
        return -1;
      }
      if (flags & 32) {
        // TODO
        return -2;
      }
      if (type !== 0 && type !== 1 && type !== 2) {
        return -7;
      }
      if (family !== 0 && family !== 2 && family !== 10) {
        return -6;
      }
  
      if (service) {
        service = UTF8ToString(service);
        port = parseInt(service, 10);
  
        if (isNaN(port)) {
          if (flags & 1024) {
            return -2;
          }
          // TODO support resolving well-known service names from:
          // http://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt
          return -8;
        }
      }
  
      if (!node) {
        if (family === 0) {
          family = 2;
        }
        if ((flags & 1) === 0) {
          if (family === 2) {
            addr = _htonl(2130706433);
          } else {
            addr = [0, 0, 0, 1];
          }
        }
        ai = allocaddrinfo(family, type, proto, null, addr, port);
        HEAP32[((out)>>2)]=ai;
        return 0;
      }
  
      //
      // try as a numeric address
      //
      node = UTF8ToString(node);
      addr = __inet_pton4_raw(node);
      if (addr !== null) {
        // incoming node is a valid ipv4 address
        if (family === 0 || family === 2) {
          family = 2;
        }
        else if (family === 10 && (flags & 8)) {
          addr = [0, 0, _htonl(0xffff), addr];
          family = 10;
        } else {
          return -2;
        }
      } else {
        addr = __inet_pton6_raw(node);
        if (addr !== null) {
          // incoming node is a valid ipv6 address
          if (family === 0 || family === 10) {
            family = 10;
          } else {
            return -2;
          }
        }
      }
      if (addr != null) {
        ai = allocaddrinfo(family, type, proto, node, addr, port);
        HEAP32[((out)>>2)]=ai;
        return 0;
      }
      if (flags & 4) {
        return -2;
      }
  
      //
      // try as a hostname
      //
      // resolve the hostname to a temporary fake address
      node = DNS.lookup_name(node);
      addr = __inet_pton4_raw(node);
      if (family === 0) {
        family = 2;
      } else if (family === 10) {
        addr = [0, 0, _htonl(0xffff), addr];
      }
      ai = allocaddrinfo(family, type, proto, null, addr, port);
      HEAP32[((out)>>2)]=ai;
      return 0;
    }

  function _getgrgid_r() { throw 'getgrgid_r: TODO' }

  function _getgrnam_r() { throw 'getgrnam_r: TODO' }

  function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
      var info = __read_sockaddr(sa, salen);
      if (info.errno) {
        return -6;
      }
      var port = info.port;
      var addr = info.addr;
  
      var overflowed = false;
  
      if (node && nodelen) {
        var lookup;
        if ((flags & 1) || !(lookup = DNS.lookup_addr(addr))) {
          if (flags & 8) {
            return -2;
          }
        } else {
          addr = lookup;
        }
        var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
  
        if (numBytesWrittenExclNull+1 >= nodelen) {
          overflowed = true;
        }
      }
  
      if (serv && servlen) {
        port = '' + port;
        var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
  
        if (numBytesWrittenExclNull+1 >= servlen) {
          overflowed = true;
        }
      }
  
      if (overflowed) {
        // Note: even when we overflow, getnameinfo() is specced to write out the truncated results.
        return -12;
      }
  
      return 0;
    }

  
  
  var Protocols={list:[],map:{}};function _setprotoent(stayopen) {
      // void setprotoent(int stayopen);
  
      // Allocate and populate a protoent structure given a name, protocol number and array of aliases
      function allocprotoent(name, proto, aliases) {
        // write name into buffer
        var nameBuf = _malloc(name.length + 1);
        writeAsciiToMemory(name, nameBuf);
  
        // write aliases into buffer
        var j = 0;
        var length = aliases.length;
        var aliasListBuf = _malloc((length + 1) * 4); // Use length + 1 so we have space for the terminating NULL ptr.
  
        for (var i = 0; i < length; i++, j += 4) {
          var alias = aliases[i];
          var aliasBuf = _malloc(alias.length + 1);
          writeAsciiToMemory(alias, aliasBuf);
          HEAP32[(((aliasListBuf)+(j))>>2)]=aliasBuf;
        }
        HEAP32[(((aliasListBuf)+(j))>>2)]=0; // Terminating NULL pointer.
  
        // generate protoent
        var pe = _malloc(12);
        HEAP32[((pe)>>2)]=nameBuf;
        HEAP32[(((pe)+(4))>>2)]=aliasListBuf;
        HEAP32[(((pe)+(8))>>2)]=proto;
        return pe;
      };
  
      // Populate the protocol 'database'. The entries are limited to tcp and udp, though it is fairly trivial
      // to add extra entries from /etc/protocols if desired - though not sure if that'd actually be useful.
      var list = Protocols.list;
      var map  = Protocols.map;
      if (list.length === 0) {
          var entry = allocprotoent('tcp', 6, ['TCP']);
          list.push(entry);
          map['tcp'] = map['6'] = entry;
          entry = allocprotoent('udp', 17, ['UDP']);
          list.push(entry);
          map['udp'] = map['17'] = entry;
      }
  
      _setprotoent.index = 0;
    }function _getprotobyname(name) {
      // struct protoent *getprotobyname(const char *);
      name = UTF8ToString(name);
      _setprotoent(true);
      var result = Protocols.map[name];
      return result;
    }

  function _gettimeofday(ptr) {
      var now = Date.now();
      HEAP32[((ptr)>>2)]=(now/1000)|0; // seconds
      HEAP32[(((ptr)+(4))>>2)]=((now % 1000)*1000)|0; // microseconds
      return 0;
    }

  function _glActiveTexture(x0) { GLctx['activeTexture'](x0) }

  function _glAttachShader(program, shader) {
      GLctx.attachShader(GL.programs[program],
                              GL.shaders[shader]);
    }

  function _glBindAttribLocation(program, index, name) {
      GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    }

  function _glBindBuffer(target, buffer) {
  
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    }

  function _glBindFramebuffer(target, framebuffer) {
  
      GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
  
    }

  function _glBindRenderbuffer(target, renderbuffer) {
      GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
    }

  function _glBindTexture(target, texture) {
      GLctx.bindTexture(target, GL.textures[texture]);
    }

  function _glBlendColor(x0, x1, x2, x3) { GLctx['blendColor'](x0, x1, x2, x3) }

  function _glBlendEquation(x0) { GLctx['blendEquation'](x0) }

  function _glBlendFunc(x0, x1) { GLctx['blendFunc'](x0, x1) }

  function _glBufferData(target, size, data, usage) {
        // N.b. here first form specifies a heap subarray, second form an integer size, so the ?: code here is polymorphic. It is advised to avoid
        // randomly mixing both uses in calling code, to avoid any potential JS engine JIT issues.
        GLctx.bufferData(target, data ? HEAPU8.subarray(data, data+size) : size, usage);
    }

  function _glBufferSubData(target, offset, size, data) {
      GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data+size));
    }

  function _glCheckFramebufferStatus(x0) { return GLctx['checkFramebufferStatus'](x0) }

  function _glClear(x0) { GLctx['clear'](x0) }

  function _glClearColor(x0, x1, x2, x3) { GLctx['clearColor'](x0, x1, x2, x3) }

  function _glClearStencil(x0) { GLctx['clearStencil'](x0) }

  function _glColorMask(red, green, blue, alpha) {
      GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    }

  function _glCompileShader(shader) {
      GLctx.compileShader(GL.shaders[shader]);
    }

  function _glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
      GLctx['compressedTexImage2D'](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray((data),(data+imageSize)) : null);
    }

  function _glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
      GLctx['compressedTexSubImage2D'](target, level, xoffset, yoffset, width, height, format, data ? HEAPU8.subarray((data),(data+imageSize)) : null);
    }

  function _glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) { GLctx['copyTexSubImage2D'](x0, x1, x2, x3, x4, x5, x6, x7) }

  function _glCreateProgram() {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      program.name = id;
      GL.programs[id] = program;
      return id;
    }

  function _glCreateShader(shaderType) {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
      return id;
    }

  function _glCullFace(x0) { GLctx['cullFace'](x0) }

  function _glDeleteBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
  
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
  
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
  
      }
    }

  function _glDeleteFramebuffers(n, framebuffers) {
      for (var i = 0; i < n; ++i) {
        var id = HEAP32[(((framebuffers)+(i*4))>>2)];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue; // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null;
      }
    }

  function _glDeleteProgram(id) {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) { // glDeleteProgram actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
      GL.programInfos[id] = null;
    }

  function _glDeleteRenderbuffers(n, renderbuffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((renderbuffers)+(i*4))>>2)];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue; // GL spec: "glDeleteRenderbuffers silently ignores 0s and names that do not correspond to existing renderbuffer objects".
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null;
      }
    }

  function _glDeleteShader(id) {
      if (!id) return;
      var shader = GL.shaders[id];
      if (!shader) { // glDeleteShader actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteShader(shader);
      GL.shaders[id] = null;
    }

  function _glDeleteTextures(n, textures) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        if (!texture) continue; // GL spec: "glDeleteTextures silently ignores 0s and names that do not correspond to existing textures".
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    }

  function _glDepthMask(flag) {
      GLctx.depthMask(!!flag);
    }

  function _glDisable(x0) { GLctx['disable'](x0) }

  function _glDisableVertexAttribArray(index) {
      GLctx.disableVertexAttribArray(index);
    }

  function _glDrawArrays(mode, first, count) {
  
      GLctx.drawArrays(mode, first, count);
  
    }

  function _glDrawElements(mode, count, type, indices) {
  
      GLctx.drawElements(mode, count, type, indices);
  
    }

  function _glEnable(x0) { GLctx['enable'](x0) }

  function _glEnableVertexAttribArray(index) {
      GLctx.enableVertexAttribArray(index);
    }

  function _glFinish() { GLctx['finish']() }

  function _glFlush() { GLctx['flush']() }

  function _glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
      GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget,
                                         GL.renderbuffers[renderbuffer]);
    }

  function _glFramebufferTexture2D(target, attachment, textarget, texture, level) {
      GLctx.framebufferTexture2D(target, attachment, textarget,
                                      GL.textures[texture], level);
    }

  function _glFrontFace(x0) { GLctx['frontFace'](x0) }

  function _glGenBuffers(n, buffers) {
      __glGenObject(n, buffers, 'createBuffer', GL.buffers
        );
    }

  function _glGenFramebuffers(n, ids) {
      __glGenObject(n, ids, 'createFramebuffer', GL.framebuffers
        );
    }

  function _glGenRenderbuffers(n, renderbuffers) {
      __glGenObject(n, renderbuffers, 'createRenderbuffer', GL.renderbuffers
        );
    }

  function _glGenTextures(n, textures) {
      __glGenObject(n, textures, 'createTexture', GL.textures
        );
    }

  function _glGenerateMipmap(x0) { GLctx['generateMipmap'](x0) }

  function _glGetBufferParameteriv(target, value, data) {
      if (!data) {
        // GLES2 specification does not specify how to behave if data is a null pointer. Since calling this function does not make sense
        // if data == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((data)>>2)]=GLctx.getBufferParameter(target, value);
    }

  function _glGetError() {
      var error = GLctx.getError() || GL.lastError;
      GL.lastError = 0/*GL_NO_ERROR*/;
      return error;
    }

  function _glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
      var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
      if (result instanceof WebGLRenderbuffer ||
          result instanceof WebGLTexture) {
        result = result.name | 0;
      }
      HEAP32[((params)>>2)]=result;
    }

  function _glGetIntegerv(name_, p) {
      emscriptenWebGLGet(name_, p, 0);
    }

  function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
      var log = GLctx.getProgramInfoLog(GL.programs[program]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
    }

  function _glGetProgramiv(program, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      var ptable = GL.programInfos[program];
      if (!ptable) {
        GL.recordError(0x502 /* GL_INVALID_OPERATION */);
        return;
      }
  
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        HEAP32[((p)>>2)]=ptable.maxUniformLength;
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (ptable.maxAttributeLength == -1) {
          program = GL.programs[program];
          var numAttribs = GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/);
          ptable.maxAttributeLength = 0; // Spec says if there are no active attribs, 0 must be returned.
          for (var i = 0; i < numAttribs; ++i) {
            var activeAttrib = GLctx.getActiveAttrib(program, i);
            ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length+1);
          }
        }
        HEAP32[((p)>>2)]=ptable.maxAttributeLength;
      } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (ptable.maxUniformBlockNameLength == -1) {
          program = GL.programs[program];
          var numBlocks = GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/);
          ptable.maxUniformBlockNameLength = 0;
          for (var i = 0; i < numBlocks; ++i) {
            var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
            ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length+1);
          }
        }
        HEAP32[((p)>>2)]=ptable.maxUniformBlockNameLength;
      } else {
        HEAP32[((p)>>2)]=GLctx.getProgramParameter(GL.programs[program], pname);
      }
    }

  function _glGetRenderbufferParameteriv(target, pname, params) {
      if (!params) {
        // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
        // if params == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      HEAP32[((params)>>2)]=GLctx.getRenderbufferParameter(target, pname);
    }

  function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
    }

  function _glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
      var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
      HEAP32[((range)>>2)]=result.rangeMin;
      HEAP32[(((range)+(4))>>2)]=result.rangeMax;
      HEAP32[((precision)>>2)]=result.precision;
    }

  function _glGetShaderiv(shader, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = (source === null || source.length == 0) ? 0 : source.length + 1;
        HEAP32[((p)>>2)]=sourceLength;
      } else {
        HEAP32[((p)>>2)]=GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    }

  function _glGetString(name_) {
      if (GL.stringCache[name_]) return GL.stringCache[name_];
      var ret;
      switch(name_) {
        case 0x1F03 /* GL_EXTENSIONS */:
          var exts = GLctx.getSupportedExtensions() || []; // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
          exts = exts.concat(exts.map(function(e) { return "GL_" + e; }));
          ret = stringToNewUTF8(exts.join(' '));
          break;
        case 0x1F00 /* GL_VENDOR */:
        case 0x1F01 /* GL_RENDERER */:
        case 0x9245 /* UNMASKED_VENDOR_WEBGL */:
        case 0x9246 /* UNMASKED_RENDERER_WEBGL */:
          var s = GLctx.getParameter(name_);
          if (!s) {
            GL.recordError(0x500/*GL_INVALID_ENUM*/);
          }
          ret = stringToNewUTF8(s);
          break;
  
        case 0x1F02 /* GL_VERSION */:
          var glVersion = GLctx.getParameter(0x1F02 /*GL_VERSION*/);
          // return GLES version string corresponding to the version of the WebGL context
          {
            glVersion = 'OpenGL ES 2.0 (' + glVersion + ')';
          }
          ret = stringToNewUTF8(glVersion);
          break;
        case 0x8B8C /* GL_SHADING_LANGUAGE_VERSION */:
          var glslVersion = GLctx.getParameter(0x8B8C /*GL_SHADING_LANGUAGE_VERSION*/);
          // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
          var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
          var ver_num = glslVersion.match(ver_re);
          if (ver_num !== null) {
            if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + '0'; // ensure minor version has 2 digits
            glslVersion = 'OpenGL ES GLSL ES ' + ver_num[1] + ' (' + glslVersion + ')';
          }
          ret = stringToNewUTF8(glslVersion);
          break;
        default:
          GL.recordError(0x500/*GL_INVALID_ENUM*/);
          return 0;
      }
      GL.stringCache[name_] = ret;
      return ret;
    }

  function _glGetUniformLocation(program, name) {
      name = UTF8ToString(name);
  
      var arrayIndex = 0;
      // If user passed an array accessor "[index]", parse the array index off the accessor.
      if (name[name.length - 1] == ']') {
        var leftBrace = name.lastIndexOf('[');
        arrayIndex = name[leftBrace+1] != ']' ? jstoi_q(name.slice(leftBrace + 1)) : 0; // "index]", parseInt will ignore the ']' at the end; but treat "foo[]" as "foo[0]"
        name = name.slice(0, leftBrace);
      }
  
      var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name]; // returns pair [ dimension_of_uniform_array, uniform_location ]
      if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) { // Check if user asked for an out-of-bounds element, i.e. for 'vec4 colors[3];' user could ask for 'colors[10]' which should return -1.
        return uniformInfo[1] + arrayIndex;
      } else {
        return -1;
      }
    }

  function _glIsTexture(id) {
      var texture = GL.textures[id];
      if (!texture) return 0;
      return GLctx.isTexture(texture);
    }

  function _glLineWidth(x0) { GLctx['lineWidth'](x0) }

  function _glLinkProgram(program) {
      GLctx.linkProgram(GL.programs[program]);
      GL.populateUniformTable(program);
    }

  function _glPixelStorei(pname, param) {
      if (pname == 0xCF5 /* GL_UNPACK_ALIGNMENT */) {
        GL.unpackAlignment = param;
      }
      GLctx.pixelStorei(pname, param);
    }

  function _glReadPixels(x, y, width, height, format, type, pixels) {
      var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
      if (!pixelData) {
        GL.recordError(0x500/*GL_INVALID_ENUM*/);
        return;
      }
      GLctx.readPixels(x, y, width, height, format, type, pixelData);
    }

  function _glRenderbufferStorage(x0, x1, x2, x3) { GLctx['renderbufferStorage'](x0, x1, x2, x3) }

  function _glScissor(x0, x1, x2, x3) { GLctx['scissor'](x0, x1, x2, x3) }

  function _glShaderSource(shader, count, string, length) {
      var source = GL.getSource(shader, count, string, length);
  
  
      GLctx.shaderSource(GL.shaders[shader], source);
    }

  function _glStencilFunc(x0, x1, x2) { GLctx['stencilFunc'](x0, x1, x2) }

  function _glStencilFuncSeparate(x0, x1, x2, x3) { GLctx['stencilFuncSeparate'](x0, x1, x2, x3) }

  function _glStencilMask(x0) { GLctx['stencilMask'](x0) }

  function _glStencilMaskSeparate(x0, x1) { GLctx['stencilMaskSeparate'](x0, x1) }

  function _glStencilOp(x0, x1, x2) { GLctx['stencilOp'](x0, x1, x2) }

  function _glStencilOpSeparate(x0, x1, x2, x3) { GLctx['stencilOpSeparate'](x0, x1, x2, x3) }

  function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null);
    }

  function _glTexParameterf(x0, x1, x2) { GLctx['texParameterf'](x0, x1, x2) }

  function _glTexParameterfv(target, pname, params) {
      var param = HEAPF32[((params)>>2)];
      GLctx.texParameterf(target, pname, param);
    }

  function _glTexParameteri(x0, x1, x2) { GLctx['texParameteri'](x0, x1, x2) }

  function _glTexParameteriv(target, pname, params) {
      var param = HEAP32[((params)>>2)];
      GLctx.texParameteri(target, pname, param);
    }

  function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
      var pixelData = null;
      if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    }

  function _glUniform1f(location, v0) {
      GLctx.uniform1f(GL.uniforms[location], v0);
    }

  function _glUniform1fv(location, count, value) {
  
  
  
      if (count <= 288) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[count-1];
        for (var i = 0; i < count; ++i) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*4)>>2);
      }
      GLctx.uniform1fv(GL.uniforms[location], view);
    }

  function _glUniform1i(location, v0) {
      GLctx.uniform1i(GL.uniforms[location], v0);
    }

  function _glUniform1iv(location, count, value) {
  
  
  
      if (count <= 288) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[count-1];
        for (var i = 0; i < count; ++i) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*4)>>2);
      }
      GLctx.uniform1iv(GL.uniforms[location], view);
    }

  function _glUniform2f(location, v0, v1) {
      GLctx.uniform2f(GL.uniforms[location], v0, v1);
    }

  function _glUniform2fv(location, count, value) {
  
  
  
      if (count <= 144) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[2*count-1];
        for (var i = 0; i < 2*count; i += 2) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*8)>>2);
      }
      GLctx.uniform2fv(GL.uniforms[location], view);
    }

  function _glUniform2i(location, v0, v1) {
      GLctx.uniform2i(GL.uniforms[location], v0, v1);
    }

  function _glUniform2iv(location, count, value) {
  
  
  
      if (count <= 144) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[2*count-1];
        for (var i = 0; i < 2*count; i += 2) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*8)>>2);
      }
      GLctx.uniform2iv(GL.uniforms[location], view);
    }

  function _glUniform3f(location, v0, v1, v2) {
      GLctx.uniform3f(GL.uniforms[location], v0, v1, v2);
    }

  function _glUniform3fv(location, count, value) {
  
  
  
      if (count <= 96) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[3*count-1];
        for (var i = 0; i < 3*count; i += 3) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*12)>>2);
      }
      GLctx.uniform3fv(GL.uniforms[location], view);
    }

  function _glUniform3i(location, v0, v1, v2) {
      GLctx.uniform3i(GL.uniforms[location], v0, v1, v2);
    }

  function _glUniform3iv(location, count, value) {
  
  
  
      if (count <= 96) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[3*count-1];
        for (var i = 0; i < 3*count; i += 3) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAP32[(((value)+(4*i+8))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*12)>>2);
      }
      GLctx.uniform3iv(GL.uniforms[location], view);
    }

  function _glUniform4f(location, v0, v1, v2, v3) {
      GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3);
    }

  function _glUniform4fv(location, count, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[4*count-1];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 4 * count; i += 4) {
          var dst = value + i;
          view[i] = heap[dst];
          view[i + 1] = heap[dst + 1];
          view[i + 2] = heap[dst + 2];
          view[i + 3] = heap[dst + 3];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniform4fv(GL.uniforms[location], view);
    }

  function _glUniform4i(location, v0, v1, v2, v3) {
      GLctx.uniform4i(GL.uniforms[location], v0, v1, v2, v3);
    }

  function _glUniform4iv(location, count, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLIntBuffers[4*count-1];
        for (var i = 0; i < 4*count; i += 4) {
          view[i] = HEAP32[(((value)+(4*i))>>2)];
          view[i+1] = HEAP32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAP32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAP32[(((value)+(4*i+12))>>2)];
        }
      } else
      {
        var view = HEAP32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniform4iv(GL.uniforms[location], view);
    }

  function _glUniformMatrix2fv(location, count, transpose, value) {
  
  
  
      if (count <= 72) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[4*count-1];
        for (var i = 0; i < 4*count; i += 4) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAPF32[(((value)+(4*i+12))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniformMatrix2fv(GL.uniforms[location], !!transpose, view);
    }

  function _glUniformMatrix3fv(location, count, transpose, value) {
  
  
  
      if (count <= 32) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[9*count-1];
        for (var i = 0; i < 9*count; i += 9) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
          view[i+3] = HEAPF32[(((value)+(4*i+12))>>2)];
          view[i+4] = HEAPF32[(((value)+(4*i+16))>>2)];
          view[i+5] = HEAPF32[(((value)+(4*i+20))>>2)];
          view[i+6] = HEAPF32[(((value)+(4*i+24))>>2)];
          view[i+7] = HEAPF32[(((value)+(4*i+28))>>2)];
          view[i+8] = HEAPF32[(((value)+(4*i+32))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*36)>>2);
      }
      GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, view);
    }

  function _glUniformMatrix4fv(location, count, transpose, value) {
  
  
  
      if (count <= 18) {
        // avoid allocation when uploading few enough uniforms
        var view = __miniTempWebGLFloatBuffers[16*count-1];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 16 * count; i += 16) {
          var dst = value + i;
          view[i] = heap[dst];
          view[i + 1] = heap[dst + 1];
          view[i + 2] = heap[dst + 2];
          view[i + 3] = heap[dst + 3];
          view[i + 4] = heap[dst + 4];
          view[i + 5] = heap[dst + 5];
          view[i + 6] = heap[dst + 6];
          view[i + 7] = heap[dst + 7];
          view[i + 8] = heap[dst + 8];
          view[i + 9] = heap[dst + 9];
          view[i + 10] = heap[dst + 10];
          view[i + 11] = heap[dst + 11];
          view[i + 12] = heap[dst + 12];
          view[i + 13] = heap[dst + 13];
          view[i + 14] = heap[dst + 14];
          view[i + 15] = heap[dst + 15];
        }
      } else
      {
        var view = HEAPF32.subarray((value)>>2,(value+count*64)>>2);
      }
      GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, view);
    }

  function _glUseProgram(program) {
      GLctx.useProgram(GL.programs[program]);
    }

  function _glVertexAttrib1f(x0, x1) { GLctx['vertexAttrib1f'](x0, x1) }

  function _glVertexAttrib2fv(index, v) {
  
      GLctx.vertexAttrib2f(index, HEAPF32[v>>2], HEAPF32[v+4>>2]);
    }

  function _glVertexAttrib3fv(index, v) {
  
      GLctx.vertexAttrib3f(index, HEAPF32[v>>2], HEAPF32[v+4>>2], HEAPF32[v+8>>2]);
    }

  function _glVertexAttrib4fv(index, v) {
  
      GLctx.vertexAttrib4f(index, HEAPF32[v>>2], HEAPF32[v+4>>2], HEAPF32[v+8>>2], HEAPF32[v+12>>2]);
    }

  function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    }

  function _glViewport(x0, x1, x2, x3) { GLctx['viewport'](x0, x1, x2, x3) }

  
  var ___tm_timezone=(stringToUTF8("GMT", 1314800, 4), 1314800);function _gmtime_r(time, tmPtr) {
      var date = new Date(HEAP32[((time)>>2)]*1000);
      HEAP32[((tmPtr)>>2)]=date.getUTCSeconds();
      HEAP32[(((tmPtr)+(4))>>2)]=date.getUTCMinutes();
      HEAP32[(((tmPtr)+(8))>>2)]=date.getUTCHours();
      HEAP32[(((tmPtr)+(12))>>2)]=date.getUTCDate();
      HEAP32[(((tmPtr)+(16))>>2)]=date.getUTCMonth();
      HEAP32[(((tmPtr)+(20))>>2)]=date.getUTCFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)]=date.getUTCDay();
      HEAP32[(((tmPtr)+(36))>>2)]=0;
      HEAP32[(((tmPtr)+(32))>>2)]=0;
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)]=yday;
      HEAP32[(((tmPtr)+(40))>>2)]=___tm_timezone;
  
      return tmPtr;
    }

  function _kill(pid, sig) {
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/kill.html
      // Makes no sense in a single-process environment.
  	  // Should kill itself somtimes depending on `pid`
      setErrNo(ERRNO_CODES.EPERM);
      return -1;
    }

  function _llvm_eh_typeid_for(type) {
      return type;
    }

  
  function _tzset() {
      // TODO: Use (malleable) environment variables instead of system settings.
      if (_tzset.called) return;
      _tzset.called = true;
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by getTimezoneOffset().
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAP32[((__get_timezone())>>2)]=(new Date()).getTimezoneOffset() * 60;
  
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      HEAP32[((__get_daylight())>>2)]=Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
  
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      };
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = allocateUTF8(winterName);
      var summerNamePtr = allocateUTF8(summerName);
      if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
        // Northern hemisphere
        HEAP32[((__get_tzname())>>2)]=winterNamePtr;
        HEAP32[(((__get_tzname())+(4))>>2)]=summerNamePtr;
      } else {
        HEAP32[((__get_tzname())>>2)]=summerNamePtr;
        HEAP32[(((__get_tzname())+(4))>>2)]=winterNamePtr;
      }
    }function _localtime_r(time, tmPtr) {
      _tzset();
      var date = new Date(HEAP32[((time)>>2)]*1000);
      HEAP32[((tmPtr)>>2)]=date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)]=date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)]=date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)]=date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)]=date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)]=date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)]=date.getDay();
  
      var start = new Date(date.getFullYear(), 0, 1);
      var yday = ((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)]=yday;
      HEAP32[(((tmPtr)+(36))>>2)]=-(date.getTimezoneOffset() * 60);
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)]=dst;
  
      var zonePtr = HEAP32[(((__get_tzname())+(dst ? 4 : 0))>>2)];
      HEAP32[(((tmPtr)+(40))>>2)]=zonePtr;
  
      return tmPtr;
    }

  
  var MONO={pump_count:0,timeout_queue:[],_vt_stack:[],mono_wasm_runtime_is_ready:false,mono_wasm_ignore_pdb_load_errors:true,pump_message:function () {
  			if (!this.mono_background_exec)
  				this.mono_background_exec = Module.cwrap ("mono_background_exec", null);
  			while (MONO.timeout_queue.length > 0) {
  				--MONO.pump_count;
  				MONO.timeout_queue.shift()();
  			}
  			while (MONO.pump_count > 0) {
  				--MONO.pump_count;
  				this.mono_background_exec ();
  			}
  		},export_functions:function (module) {
  			module ["pump_message"] = MONO.pump_message;
  			module ["mono_load_runtime_and_bcl"] = MONO.mono_load_runtime_and_bcl;
  		},mono_text_decoder:undefined,string_decoder:{copy:function (mono_string) {
  				if (mono_string == 0)
  					return null;
  
  				if (!this.mono_wasm_string_convert)
  					this.mono_wasm_string_convert = Module.cwrap ("mono_wasm_string_convert", null, ['number']);
  
  				this.mono_wasm_string_convert (mono_string);
  				var result = this.result;
  				this.result = undefined;
  				return result;
  			},decode:function (start, end, save) {
  				if (!MONO.mono_text_decoder) {
  					MONO.mono_text_decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
                  }
  
  				var str = "";
  				if (MONO.mono_text_decoder) {
  					// When threading is enabled, TextDecoder does not accept a view of a 
  					// SharedArrayBuffer, we must make a copy of the array first.
  					var subArray = typeof SharedArrayBuffer !== 'undefined' && Module.HEAPU8.buffer instanceof SharedArrayBuffer
  						? Module.HEAPU8.slice(start, end)
  						: Module.HEAPU8.subarray(start, end);
  
  					str = MONO.mono_text_decoder.decode(subArray);
  				} else {
  					for (var i = 0; i < end - start; i+=2) {
  						var char = Module.getValue (start + i, 'i16');
  						str += String.fromCharCode (char);
  					}
  				}
  				if (save)
  					this.result = str;
  
  				return str;
  			}},mono_wasm_get_call_stack:function() {
  			if (!this.mono_wasm_current_bp_id)
  				this.mono_wasm_current_bp_id = Module.cwrap ("mono_wasm_current_bp_id", 'number');
  			if (!this.mono_wasm_enum_frames)
  				this.mono_wasm_enum_frames = Module.cwrap ("mono_wasm_enum_frames", null);
  
  			var bp_id = this.mono_wasm_current_bp_id ();
  			this.active_frames = [];
  			this.mono_wasm_enum_frames ();
  
  			var the_frames = this.active_frames;
  			this.active_frames = [];
  			return {
  				"breakpoint_id": bp_id,
  				"frames": the_frames,
  			};
  		},_fixup_name_value_objects:function (var_list) {
  			var out_list = [];
  
  			var _fixup_value = function (value) {
  				if (value != null && value != undefined) {
  					var descr = value.description;
  					if (descr == null || descr == undefined)
  						value.description = '' + value.value;
  				}
  				return value;
  			};
  
  			var i = 0;
  			while (i < var_list.length) {
  				var o = var_list [i];
  				var name = o.name;
  				if (name == null || name == undefined) {
  					i ++;
  					o.value = _fixup_value(o.value);
  					out_list.push (o);
  					continue;
  				}
  
  				if (i + 1 < var_list.length) {
  					_fixup_value(var_list[i + 1].value);
  					o = Object.assign (o, var_list [i + 1]);
  				}
  
  				out_list.push (o);
  				i += 2;
  			}
  
  			return out_list;
  		},_filter_automatic_properties:function (props) {
  			var names_found = {};
  			var final_var_list = [];
  
  			for (var i in props) {
  				var p = props [i];
  				if (p.name in names_found)
  					continue;
  
  				if (p.name.endsWith ("k__BackingField"))
  					p.name = p.name.replace ("k__BackingField", "")
  							.replace ('<', '')
  							.replace ('>', '');
  
  				names_found [p.name] = p.name;
  				final_var_list.push (p);
  			}
  
  			return final_var_list;
  		},_split_object_id:function (id, delim = ':', count = 3) {
  			if (id === undefined || id == "")
  				return [];
  
  			if (delim === undefined) delim = ':';
  			if (count === undefined) count = 3;
  
  			var arr = id.split (delim);
  			var result = arr.splice (0, count - 1);
  
  			if (arr.length > 0)
  				result.push (arr.join (delim));
  			return result;
  		},mono_wasm_get_variables:function(scope, var_list) {
  			if (!this.mono_wasm_get_var_info)
  				this.mono_wasm_get_var_info = Module.cwrap ("mono_wasm_get_var_info", null, [ 'number', 'number', 'number']);
  
  			this.var_info = [];
  			var numBytes = var_list.length * Int32Array.BYTES_PER_ELEMENT;
  			var ptr = Module._malloc(numBytes);
  			var heapBytes = new Int32Array(Module.HEAP32.buffer, ptr, numBytes);
  			for (let i=0; i<var_list.length; i++) {
  				heapBytes[i] = var_list[i].index;
  			}
  
  			this._async_method_objectId = 0;
  			this.mono_wasm_get_var_info (scope, heapBytes.byteOffset, var_list.length);
  			Module._free(heapBytes.byteOffset);
  			var res = MONO._fixup_name_value_objects (this.var_info);
  
  			for (let i in res) {
  				var res_name = res [i].name;
  
  				var value = res[i].value;
  				if (this._async_method_objectId != 0) {
  					//Async methods are special in the way that local variables can be lifted to generated class fields
  					//value of "this" comes here either
  					if (res_name !== undefined && res_name.indexOf ('>') > 0) {
  						// For async methods, we get the names too, so use that
  						// ALTHOUGH, the name wouldn't have `<>` for method args
  						res [i].name = res_name.substring (1, res_name.indexOf ('>'));
  					}
  
  					if (value.isValueType)
  						value.objectId = `dotnet:valuetype:${this._async_method_objectId}:${res [i].fieldOffset}`;
  				} else if (res_name === undefined && var_list [i] !== undefined) {
  					// For non-async methods, we just have the var id, but we have the name
  					// from the caller
  					res [i].name = var_list [i].name;
  				}
  			}
  
  			this._post_process_details(res);
  			this.var_info = []
  
  			return res;
  		},mono_wasm_get_object_properties:function(objId, expandValueTypes) {
  			if (!this.mono_wasm_get_object_properties_info)
  				this.mono_wasm_get_object_properties_info = Module.cwrap ("mono_wasm_get_object_properties", null, [ 'number', 'bool' ]);
  
  			this.var_info = [];
  			this.mono_wasm_get_object_properties_info (objId, expandValueTypes);
  
  			var res = MONO._filter_automatic_properties (MONO._fixup_name_value_objects (this.var_info));
  			for (var i = 0; i < res.length; i++) {
  				var res_val = res [i].value;
  				// we might not have a `.value`, like in case of getters which have a `.get` instead
  				if (res_val !== undefined && res_val.isValueType != undefined && res_val.isValueType)
  					res_val.objectId = `dotnet:valuetype:${objId}:${res [i].fieldOffset}`;
  			}
  
  			this.var_info = [];
  
  			return res;
  		},mono_wasm_get_array_values:function(objId) {
  			if (!this.mono_wasm_get_array_values_info)
  				this.mono_wasm_get_array_values_info = Module.cwrap ("mono_wasm_get_array_values", null, [ 'number' ]);
  
  			this.var_info = [];
  			this.mono_wasm_get_array_values_info (objId);
  
  			var res = MONO._fixup_name_value_objects (this.var_info);
  			for (var i = 0; i < res.length; i++) {
  				var prop_value = res [i].value;
  				if (prop_value.isValueType) {
  					res [i].value.objectId = `dotnet:array:${objId}:${i}`;
  				} else if (prop_value.objectId !== undefined && prop_value.objectId.startsWith("dotnet:pointer")) {
  					prop_value.objectId = this._get_updated_ptr_id (prop_value.objectId, {
  						varName: `[${i}]`
  					});
  				}
  			}
  
  			this.var_info = [];
  
  			return res;
  		},mono_wasm_get_array_value_expanded:function(objId, idx) {
  			if (!this.mono_wasm_get_array_value_expanded_info)
  				this.mono_wasm_get_array_value_expanded_info = Module.cwrap ("mono_wasm_get_array_value_expanded", null, [ 'number', 'number' ]);
  
  			this.var_info = [];
  			this.mono_wasm_get_array_value_expanded_info (objId, idx);
  
  			var res = MONO._fixup_name_value_objects (this.var_info);
  			// length should be exactly one!
  			if (res [0].value.isValueType != undefined && res [0].value.isValueType)
  				res [0].value.objectId = `dotnet:array:${objId}:${idx}`;
  
  			this.var_info = [];
  
  			return res;
  		},_post_process_details:function (details) {
  			if (details == undefined)
  				return {};
  
  			if (details.length > 0)
  				this._extract_and_cache_value_types(details);
  
  			return details;
  		},_next_value_type_id:function () {
  			return ++this._next_value_type_id_var;
  		},_extract_and_cache_value_types:function (var_list) {
  			if (var_list == undefined || !Array.isArray (var_list) || var_list.length == 0)
  				return var_list;
  
  			for (let i in var_list) {
  				var value = var_list [i].value;
  				if (value === undefined)
  					continue;
  
  				if (value.objectId !== undefined && value.objectId.startsWith ("dotnet:pointer:")) {
  					var ptr_args = this._get_ptr_args (value.objectId);
  					if (ptr_args.varName === undefined) {
  						// It might have been already set in some cases, like arrays
  						// where the name would be `0`, but we want `[0]` for pointers,
  						// so the deref would look like `*[0]`
  						value.objectId = this._get_updated_ptr_id (value.objectId, {
  							varName: var_list [i].name
  						});
  					}
  				}
  
  				if (value.type != "object" || value.isValueType != true || value.expanded != true) // undefined would also give us false
  					continue;
  
  				// Generate objectId for expanded valuetypes
  
  				var objectId = value.objectId;
  				if (objectId == undefined)
  					objectId = `dotnet:valuetype:${this._next_value_type_id ()}`;
  				value.objectId = objectId;
  
  				this._extract_and_cache_value_types (value.members);
  
  				this._value_types_cache [objectId] = value.members;
  				delete value.members;
  			}
  
  			return var_list;
  		},_get_details_for_value_type:function (objectId, fetchDetailsFn) {
  			if (objectId in this._value_types_cache)
  				return this._value_types_cache[objectId];
  
  			this._post_process_details (fetchDetailsFn());
  			if (objectId in this._value_types_cache)
  				return this._value_types_cache[objectId];
  
  			// return error
  			throw new Error (`Could not get details for ${objectId}`);
  		},_is_object_id_array:function (objectId) {
  			// Keep this in sync with `_get_array_details`
  			return (objectId.startsWith ('dotnet:array:') && objectId.split (':').length == 3);
  		},_get_array_details:function (objectId, objectIdParts) {
  			// Keep this in sync with `_is_object_id_array`
  			switch (objectIdParts.length) {
  				case 3:
  					return this._post_process_details (this.mono_wasm_get_array_values(objectIdParts[2]));
  
  				case 4:
  					var arrayObjectId = objectIdParts[2];
  					var arrayIdx = objectIdParts[3];
  					return this._get_details_for_value_type(
  									objectId, () => this.mono_wasm_get_array_value_expanded(arrayObjectId, arrayIdx));
  
  				default:
  					throw new Error (`object id format not supported : ${objectId}`);
  			}
  		},_get_cfo_res_details:function (objectId, args) {
  			if (!(objectId in this._call_function_res_cache))
  				throw new Error(`Could not find any object with id ${objectId}`);
  
  			var real_obj = this._call_function_res_cache [objectId];
  
  			var descriptors = Object.getOwnPropertyDescriptors (real_obj);
  			if (args.accessorPropertiesOnly) {
  				Object.keys (descriptors).forEach (k => {
  					if (descriptors [k].get === undefined)
  						Reflect.deleteProperty (descriptors, k);
  				});
  			}
  
  			var res_details = [];
  			Object.keys (descriptors).forEach (k => {
  				var new_obj;
  				var prop_desc = descriptors [k];
  				if (typeof prop_desc.value == "object") {
  					// convert `{value: { type='object', ... }}`
  					// to      `{ name: 'foo', value: { type='object', ... }}
  					new_obj = Object.assign ({ name: k }, prop_desc);
  				} else if (prop_desc.value !== undefined) {
  					// This is needed for values that were not added by us,
  					// thus are like { value: 5 }
  					// instead of    { value: { type = 'number', value: 5 }}
  					//
  					// This can happen, for eg., when `length` gets added for arrays
  					// or `__proto__`.
  					new_obj = {
  						name: k,
  						// merge/add `type` and `description` to `d.value`
  						value: Object.assign ({ type: (typeof prop_desc.value), description: '' + prop_desc.value },
  												prop_desc)
  					};
  				} else if (prop_desc.get !== undefined) {
  					// The real_obj has the actual getter. We are just returning a placeholder
  					// If the caller tries to run function on the cfo_res object,
  					// that accesses this property, then it would be run on `real_obj`,
  					// which *has* the original getter
  					new_obj = {
  						name: k,
  						get: {
  							className: "Function",
  							description: `get ${k} () {}`,
  							type: "function"
  						}
  					};
  				} else {
  					new_obj = { name: k, value: { type: "symbol", value: "<Unknown>", description: "<Unknown>"} };
  				}
  
  				res_details.push (new_obj);
  			});
  
  			return { __value_as_json_string__: JSON.stringify (res_details) };
  		},_get_ptr_args:function (objectId) {
  			var parts = this._split_object_id (objectId);
  			if (parts.length != 3)
  				throw new Error (`Bug: Unexpected objectId format for a pointer, expected 3 parts: ${objectId}`);
  			return JSON.parse (parts [2]);
  		},_get_updated_ptr_id:function (objectId, new_args) {
  			var old_args = {};
  			if (typeof (objectId) === 'string' && objectId.length)
  				old_args = this._get_ptr_args (objectId);
  
  			return `dotnet:pointer:${JSON.stringify ( Object.assign (old_args, new_args) )}`;
  		},_get_deref_ptr_value:function (objectId) {
  			if (!this.mono_wasm_get_deref_ptr_value_info)
  				this.mono_wasm_get_deref_ptr_value_info = Module.cwrap("mono_wasm_get_deref_ptr_value", null, ['number', 'number']);
  
  			var ptr_args = this._get_ptr_args (objectId);
  			if (ptr_args.ptr_addr == 0 || ptr_args.klass_addr == 0)
  				throw new Error (`Both ptr_addr and klass_addr need to be non-zero, to dereference a pointer. objectId: ${objectId}`);
  
  			this.var_info = [];
  			var value_addr = new DataView (Module.HEAPU8.buffer).getUint32 (ptr_args.ptr_addr, /* littleEndian */ true);
  			this.mono_wasm_get_deref_ptr_value_info (value_addr, ptr_args.klass_addr);
  
  			var res = MONO._fixup_name_value_objects(this.var_info);
  			if (res.length > 0) {
  				if (ptr_args.varName === undefined)
  					throw new Error (`Bug: no varName found for the pointer. objectId: ${objectId}`);
  
  				res [0].name = `*${ptr_args.varName}`;
  			}
  
  			res = this._post_process_details (res);
  			this.var_info = [];
  			return res;
  		},mono_wasm_get_details:function (objectId, args) {
  			var parts = objectId.split(":");
  			if (parts[0] != "dotnet")
  				throw new Error ("Can't handle non-dotnet object ids. ObjectId: " + objectId);
  
  			switch (parts[1]) {
  				case "object":
  					if (parts.length != 3)
  						throw new Error(`exception this time: Invalid object id format: ${objectId}`);
  
  					return this._post_process_details(this.mono_wasm_get_object_properties(parts[2], false));
  
  				case "array":
  					return this._get_array_details(objectId, parts);
  
  				case "valuetype":
  					if (parts.length != 3 && parts.length != 4) {
  						// dotnet:valuetype:vtid
  						// dotnet:valuetype:containerObjectId:vtId
  						throw new Error(`Invalid object id format: ${objectId}`);
  					}
  
  					var containerObjectId = parts[2];
  					return this._get_details_for_value_type(objectId, () => this.mono_wasm_get_object_properties(containerObjectId, true));
  
  				case "cfo_res":
  					return this._get_cfo_res_details (objectId, args);
  
  				case "pointer": {
  					return this._get_deref_ptr_value (objectId);
  				}
  
  				default:
  					throw new Error(`Unknown object id format: ${objectId}`);
  			}
  		},_cache_call_function_res:function (obj) {
  			var id = `dotnet:cfo_res:${this._next_call_function_res_id++}`;
  			this._call_function_res_cache[id] = obj;
  			return id;
  		},mono_wasm_release_object:function (objectId) {
  			if (objectId in this._cache_call_function_res)
  				delete this._cache_call_function_res[objectId];
  		},_invoke_getter_on_object:function (objectId, name) {
  			if (!this.mono_wasm_invoke_getter_on_object)
  				this.mono_wasm_invoke_getter_on_object = Module.cwrap ("mono_wasm_invoke_getter_on_object", 'void', [ 'number', 'string' ]);
  
  			if (objectId < 0) {
  				// invalid id
  				return [];
  			}
  
  			this.mono_wasm_invoke_getter_on_object (objectId, name);
  			var getter_res = MONO._post_process_details (MONO.var_info);
  
  			MONO.var_info = [];
  			return getter_res [0];
  		},_create_proxy_from_object_id:function (objectId) {
  			var details = this.mono_wasm_get_details(objectId);
  
  			if (this._is_object_id_array (objectId))
  				return details.map (p => p.value);
  
  			var objIdParts = objectId.split (':');
  			var objIdNum = -1;
  			if (objectId.startsWith ("dotnet:object:"))
  				objIdNum = objIdParts [2];
  
  			var proxy = {};
  			Object.keys (details).forEach (p => {
  				var prop = details [p];
  				if (prop.get !== undefined) {
  					// TODO: `set`
  
  					// We don't add a `get` for non-object types right now,
  					// so, we shouldn't get here with objIdNum==-1
  					Object.defineProperty (proxy,
  							prop.name,
  							{ get () { return MONO._invoke_getter_on_object (objIdNum, prop.name); } }
  					);
  				} else {
  					proxy [prop.name] = prop.value;
  				}
  			});
  
  			return proxy;
  		},mono_wasm_call_function_on:function (request) {
  			if (request.arguments != undefined && !Array.isArray (request.arguments))
  				throw new Error (`"arguments" should be an array, but was ${request.arguments}`);
  
  			var objId = request.objectId;
  			var proxy;
  
  			if (objId in this._call_function_res_cache) {
  				proxy = this._call_function_res_cache [objId];
  			} else if (!objId.startsWith ('dotnet:cfo_res:')) {
  				proxy = this._create_proxy_from_object_id (objId);
  			}
  
  			var fn_args = request.arguments != undefined ? request.arguments.map(a => JSON.stringify(a.value)) : [];
  			var fn_eval_str = `var fn = ${request.functionDeclaration}; fn.call (proxy, ...[${fn_args}]);`;
  
  			var fn_res = eval (fn_eval_str);
  			if (fn_res == undefined) // should we just return undefined?
  				throw Error ('Function returned undefined result');
  
  			// primitive type
  			if (Object (fn_res) !== fn_res)
  				return fn_res;
  
  			// return .value, if it is a primitive type
  			if (fn_res.value !== undefined && Object (fn_res.value.value) !== fn_res.value.value)
  				return fn_res.value;
  
  			if (request.returnByValue)
  				return {type: "object", value: fn_res};
  
  			var fn_res_id = this._cache_call_function_res (fn_res);
  			if (Object.getPrototypeOf (fn_res) == Array.prototype) {
  				return {
  					type: "object",
  					subtype: "array",
  					className: "Array",
  					description: `Array(${fn_res.length})`,
  					objectId: fn_res_id
  				};
  			} else {
  				return { type: "object", className: "Object", description: "Object", objectId: fn_res_id };
  			}
  		},_clear_per_step_state:function () {
  			this._next_value_type_id_var = 0;
  			this._value_types_cache = {};
  		},mono_wasm_debugger_resume:function () {
  			this._clear_per_step_state ();
  		},mono_wasm_start_single_stepping:function (kind) {
  			console.log (">> mono_wasm_start_single_stepping " + kind);
  			if (!this.mono_wasm_setup_single_step)
  				this.mono_wasm_setup_single_step = Module.cwrap ("mono_wasm_setup_single_step", 'number', [ 'number']);
  
  			this._clear_per_step_state ();
  
  			return this.mono_wasm_setup_single_step (kind);
  		},mono_wasm_runtime_ready:function () {
  			this.mono_wasm_runtime_is_ready = true;
  			// DO NOT REMOVE - magic debugger init function
  			console.debug ("mono_wasm_runtime_ready", "fe00e07a-5519-4dfe-b35a-f867dbaf2e28", JSON.stringify (this.loaded_files));
  
  			this._clear_per_step_state ();
  
  			// FIXME: where should this go?
  			this._next_call_function_res_id = 0;
  			this._call_function_res_cache = {};
  		},mono_wasm_set_breakpoint:function (assembly, method_token, il_offset) {
  			if (!this.mono_wasm_set_bp)
  				this.mono_wasm_set_bp = Module.cwrap ('mono_wasm_set_breakpoint', 'number', ['string', 'number', 'number']);
  
  			return this.mono_wasm_set_bp (assembly, method_token, il_offset)
  		},mono_wasm_remove_breakpoint:function (breakpoint_id) {
  			if (!this.mono_wasm_del_bp)
  				this.mono_wasm_del_bp = Module.cwrap ('mono_wasm_remove_breakpoint', 'number', ['number']);
  
  			return this.mono_wasm_del_bp (breakpoint_id);
  		},mono_wasm_setenv:function (name, value) {
  			if (!this.wasm_setenv)
  				this.wasm_setenv = Module.cwrap ('mono_wasm_setenv', null, ['string', 'string']);
  			this.wasm_setenv (name, value);
  		},mono_wasm_set_runtime_options:function (options) {
  			if (!this.wasm_parse_runtime_options)
  				this.wasm_parse_runtime_options = Module.cwrap ('mono_wasm_parse_runtime_options', null, ['number', 'number']);
  			var argv = Module._malloc (options.length * 4);
  			var wasm_strdup = Module.cwrap ('mono_wasm_strdup', 'number', ['string']);
  			aindex = 0;
  			for (var i = 0; i < options.length; ++i) {
  				Module.setValue (argv + (aindex * 4), wasm_strdup (options [i]), "i32");
  				aindex += 1;
  			}
  			this.wasm_parse_runtime_options (options.length, argv);
  		},mono_wasm_init_aot_profiler:function (options) {
  			if (options == null)
  				options = {}
  			if (!('write_at' in options))
  				options.write_at = 'WebAssembly.Runtime::StopProfile';
  			if (!('send_to' in options))
  				options.send_to = 'WebAssembly.Runtime::DumpAotProfileData';
  			var arg = "aot:write-at-method=" + options.write_at + ",send-to-method=" + options.send_to;
  			Module.ccall ('mono_wasm_load_profiler_aot', null, ['string'], [arg]);
  		},mono_wasm_init_coverage_profiler:function (options) {
  			if (options == null)
  				options = {}
  			if (!('write_at' in options))
  				options.write_at = 'WebAssembly.Runtime::StopProfile';
  			if (!('send_to' in options))
  				options.send_to = 'WebAssembly.Runtime::DumpCoverageProfileData';
  			var arg = "coverage:write-at-method=" + options.write_at + ",send-to-method=" + options.send_to;
  			Module.ccall ('mono_wasm_load_profiler_coverage', null, ['string'], [arg]);
  		},mono_load_runtime_and_bcl:function (vfs_prefix, deploy_prefix, enable_debugging, file_list, loaded_cb, fetch_file_cb) {
  			var pending = file_list.length;
  			var loaded_files = [];
  			var loaded_files_with_debug_info = [];
  			var mono_wasm_add_assembly = Module.cwrap ('mono_wasm_add_assembly', 'number', ['string', 'number', 'number']);
  
  			if (!fetch_file_cb) {
  				if (ENVIRONMENT_IS_NODE) {
  					var fs = require('fs');
  					fetch_file_cb = function (asset) {
  						console.log("MONO_WASM: Loading... " + asset);
  						var binary = fs.readFileSync (asset);
  						var resolve_func2 = function(resolve, reject) {
  							resolve(new Uint8Array (binary));
  						};
  
  						var resolve_func1 = function(resolve, reject) {
  							var response = {
  								ok: true,
  								url: asset,
  								arrayBuffer: function() {
  									return new Promise(resolve_func2);
  								}
  							};
  							resolve(response);
  						};
  
  						return new Promise(resolve_func1);
  					};
  				} else {
  					fetch_file_cb = function (asset) {
  						return fetch (asset, { credentials: 'same-origin' });
  					}
  				}
  			}
  
  			file_list.forEach (function(file_name) {
  				
  				var fetch_promise = fetch_file_cb (locateFile(deploy_prefix + "/" + file_name));
  
  				fetch_promise.then (function (response) {
  					if (!response.ok) {
  						// If it's a 404 on a .pdb, we don't want to block the app from starting up.
  						// We'll just skip that file and continue (though the 404 is logged in the console).
  						if (response.status === 404 && file_name.match(/\.pdb$/) && MONO.mono_wasm_ignore_pdb_load_errors) {
  							--pending;
  							throw "MONO-WASM: Skipping failed load for .pdb file: '" + file_name + "'";
  						}
  						else {
  							throw "MONO_WASM: Failed to load file: '" + file_name + "'";
  						}
  					}
  					else {
  						loaded_files.push ({ url: response.url, file: file_name});
  						return response ['arrayBuffer'] ();
  					}
  				}).then (function (blob) {
  					var asm = new Uint8Array (blob);
  					var memory = Module._malloc(asm.length);
  					var heapBytes = new Uint8Array(Module.HEAPU8.buffer, memory, asm.length);
  					heapBytes.set (asm);
  					var hasPpdb = mono_wasm_add_assembly (file_name, memory, asm.length);
  					
  					if (!hasPpdb) {
  						var index = loaded_files.findIndex(element => element.file == file_name);
  						loaded_files.splice(index, 1);
  					}
  					//console.log ("MONO_WASM: Loaded: " + file_name);
  					--pending;
  					if (pending == 0) {
  						loaded_files.forEach(value => loaded_files_with_debug_info.push(value.url));
  						MONO.loaded_files = loaded_files_with_debug_info;
  						var load_runtime = Module.cwrap ('mono_wasm_load_runtime', null, ['string', 'number']);
  
  						console.log ("MONO_WASM: Initializing mono runtime");
  						if (ENVIRONMENT_IS_SHELL || ENVIRONMENT_IS_NODE) {
  							try {
  								load_runtime (vfs_prefix, enable_debugging);
  							} catch (ex) {
  								print ("MONO_WASM: load_runtime () failed: " + ex);
  								print ("MONO_WASM: Stacktrace: \n");
  								print (ex.stack);
  
  								var wasm_exit = Module.cwrap ('mono_wasm_exit', null, ['number']);
  								wasm_exit (1);
  							}
  						} else {
  							load_runtime (vfs_prefix, enable_debugging);
  						}
  						MONO.mono_wasm_runtime_ready ();
  						loaded_cb ();
  					}
  				});
  			});
  		},mono_wasm_get_loaded_files:function() {
  			console.log(">>>mono_wasm_get_loaded_files");
  			return this.loaded_files;
  		},mono_wasm_clear_all_breakpoints:function() {
  			if (!this.mono_clear_bps)
  				this.mono_clear_bps = Module.cwrap ('mono_wasm_clear_all_breakpoints', null);
  
  			this.mono_clear_bps ();
  		},mono_wasm_add_null_var:function(className)
  		{
  			fixed_class_name = MONO._mono_csharp_fixup_class_name(Module.UTF8ToString (className));
  			if (!fixed_class_name) {
  				// Eg, when a @className is passed from js itself, like
  				// mono_wasm_add_null_var ("string")
  				fixed_class_name = className;
  			}
  			MONO.var_info.push ({value: {
  				type: "object",
  				className: fixed_class_name,
  				description: fixed_class_name,
  				subtype: "null"
  			}});
  		},_mono_wasm_add_string_var:function(var_value) {
  			if (var_value == 0) {
  				MONO.mono_wasm_add_null_var ("string");
  				return;
  			}
  
  			MONO.var_info.push({
  				value: {
  					type: "string",
  					value: var_value,
  				}
  			});
  		},_mono_wasm_add_getter_var:function(className, invokable) {
  			fixed_class_name = MONO._mono_csharp_fixup_class_name (className);
  			if (invokable != 0) {
  				var name;
  				if (MONO.var_info.length > 0)
  					name = MONO.var_info [MONO.var_info.length - 1].name;
  				name = (name === undefined) ? "" : name;
  
  				MONO.var_info.push({
  					get: {
  						className: "Function",
  						description: `get ${name} () {}`,
  						type: "function",
  					}
  				});
  			} else {
  				var value = `${fixed_class_name} { get; }`;
  				MONO.var_info.push({
  					value: {
  						type: "symbol",
  						description: value,
  						value: value,
  					}
  				});
  			}
  		},_mono_wasm_add_array_var:function(className, objectId, length) {
  			fixed_class_name = MONO._mono_csharp_fixup_class_name(className);
  			if (objectId == 0) {
  				MONO.mono_wasm_add_null_var (fixed_class_name);
  				return;
  			}
  
  			MONO.var_info.push({
  				value: {
  					type: "object",
  					subtype: "array",
  					className: fixed_class_name,
  					description: `${fixed_class_name}(${length})`,
  					objectId: "dotnet:array:"+ objectId,
  				}
  			});
  		},mono_wasm_add_typed_value:function (type, str_value, value) {
  			var type_str = type;
  			if (typeof type != 'string')
  				type_str = Module.UTF8ToString (type);
  			if (typeof str_value != 'string')
  				str_value = Module.UTF8ToString (str_value);
  
  			switch (type_str) {
  			case "bool":
  				MONO.var_info.push ({
  					value: {
  						type: "boolean",
  						value: value != 0
  					}
  				});
  				break;
  
  			case "char":
  				MONO.var_info.push ({
  					value: {
  						type: "symbol",
  						value: `${value} '${String.fromCharCode (value)}'`
  					}
  				});
  				break;
  
  			case "number":
  				MONO.var_info.push ({
  					value: {
  						type: "number",
  						value: value
  					}
  				});
  				break;
  
  			case "string":
  				MONO._mono_wasm_add_string_var (str_value);
  				break;
  
  			case "getter":
  				MONO._mono_wasm_add_getter_var (str_value, value);
  				break;
  
  			case "array":
  				MONO._mono_wasm_add_array_var (str_value, value.objectId, value.length);
  				break;
  
  			case "pointer": {
  				var fixed_value_str = MONO._mono_csharp_fixup_class_name (str_value);
  				if (value.klass_addr == 0 || value.ptr_addr == 0 || fixed_value_str.startsWith ('(void*')) {
  					// null or void*, which we can't deref
  					MONO.var_info.push({
  						value: {
  							type: "symbol",
  							value: fixed_value_str,
  							description: fixed_value_str
  						}
  					});
  				} else {
  					MONO.var_info.push({
  						value: {
  							type: "object",
  							className: fixed_value_str,
  							description: fixed_value_str,
  							objectId: this._get_updated_ptr_id ('', value)
  						}
  					});
  				}
  				}
  				break;
  
  			default: {
  				var msg = `'${str_value}' ${value}`;
  
  				MONO.var_info.push ({
  					value: {
  						type: "symbol",
  						value: msg,
  						description: msg
  					}
  				});
  				break;
  				}
  			}
  		},_mono_csharp_fixup_class_name:function(className)
  		{
  			// Fix up generic names like Foo`2<int, string> to Foo<int, string>
  			// and nested class names like Foo/Bar to Foo.Bar
  			return className.replace(/\//g, '.').replace(/`\d+/g, '');
  		}};function _mono_set_timeout(timeout, id) {
  		if (!this.mono_set_timeout_exec)
  			this.mono_set_timeout_exec = Module.cwrap ("mono_set_timeout_exec", null, [ 'number' ]);
  		if (ENVIRONMENT_IS_WEB) {
  			window.setTimeout (function () {
  				this.mono_set_timeout_exec (id);
  			}, timeout);
  		} else if (ENVIRONMENT_IS_WORKER) {
  			self.setTimeout (function () {
  				this.mono_set_timeout_exec (id);
  			}, timeout);
  		} else if (ENVIRONMENT_IS_NODE) {
  			global.setTimeout (function () {
  				global.mono_set_timeout_exec (id);
  			}, timeout);
  		} else {
  			++MONO.pump_count;
  			MONO.timeout_queue.push(function() {
  				this.mono_set_timeout_exec (id);
  			})
  		}
  	}

  function _mono_wasm_add_array_item(position) {
  		MONO.var_info.push({
  			name: `${position}`
  		});
  	}

  function _mono_wasm_add_enum_var(className, members, value) {
  		// FIXME: flags
  		//
  
  		// group0: Monday:0
  		// group1: Monday
  		// group2: 0
  		var re = new RegExp (`[,]?([^,:]+):(${value}(?=,)|${value}$)`, 'g')
  		var members_str = Module.UTF8ToString (members);
  
  		var match = re.exec(members_str);
  		var member_name = match == null ? ('' + value) : match [1];
  
  		fixed_class_name = MONO._mono_csharp_fixup_class_name(Module.UTF8ToString (className));
  		MONO.var_info.push({
  			value: {
  				type: "object",
  				className: fixed_class_name,
  				description: member_name,
  				isEnum: true
  			}
  		});
  	}

  function _mono_wasm_add_frame(il, method, assembly_name, method_full_name) {
  		var parts = Module.UTF8ToString (method_full_name).split (":", 2);
  		MONO.active_frames.push( {
  			il_pos: il,
  			method_token: method,
  			assembly_name: Module.UTF8ToString (assembly_name),
  			// Extract just the method name from `{class_name}:{method_name}`
  			method_name: parts [parts.length - 1]
  		});
  	}

  function _mono_wasm_add_func_var(className, targetName, objectId) {
  		if (objectId == 0) {
  			MONO.mono_wasm_add_null_var (
  				MONO._mono_csharp_fixup_class_name (Module.UTF8ToString (className)));
  			return;
  		}
  
  		function args_to_sig (args_str) {
  			var parts = args_str.split (":");
  			// TODO: min length = 3?
  			parts = parts.map (a => MONO._mono_csharp_fixup_class_name (a));
  
  			// method name at the end
  			var method_name = parts.pop ();
  
  			// ret type at the beginning
  			var ret_sig = parts [0];
  			var args_sig = parts.splice (1).join (', ');
  			return `${ret_sig} ${method_name} (${args_sig})`;
  		}
  
  		var tgt_sig;
  		if (targetName != 0)
  			tgt_sig = args_to_sig (Module.UTF8ToString (targetName));
  
  		var type_name = MONO._mono_csharp_fixup_class_name (Module.UTF8ToString (className));
  
  		if (objectId == -1) {
  			// Target property
  			MONO.var_info.push ({
  				value: {
  					type: "symbol",
  					value: tgt_sig,
  					description: tgt_sig,
  				}
  			});
  		} else {
  			MONO.var_info.push ({
  				value: {
  					type: "object",
  					className: type_name,
  					description: tgt_sig,
  					objectId: "dotnet:object:" + objectId,
  				}
  			});
  		}
  	}

  function _mono_wasm_add_obj_var(className, toString, objectId) {
  		if (objectId == 0) {
  			MONO.mono_wasm_add_null_var (className);
  			return;
  		}
  
  		fixed_class_name = MONO._mono_csharp_fixup_class_name(Module.UTF8ToString (className));
  		MONO.var_info.push({
  			value: {
  				type: "object",
  				className: fixed_class_name,
  				description: (toString == 0 ? fixed_class_name : Module.UTF8ToString (toString)),
  				objectId: "dotnet:object:"+ objectId,
  			}
  		});
  	}

  function _mono_wasm_add_properties_var(name, field_offset) {
  		MONO.var_info.push({
  			name: Module.UTF8ToString (name),
  			fieldOffset: field_offset
  		});
  	}

  function _mono_wasm_add_typed_value(type, str_value, value) {
  		MONO.mono_wasm_add_typed_value (type, str_value, value);
  	}

  function _mono_wasm_add_value_type_unexpanded_var(className, toString) {
  		fixed_class_name = MONO._mono_csharp_fixup_class_name(Module.UTF8ToString (className));
  		MONO.var_info.push({
  			value: {
  				type: "object",
  				className: fixed_class_name,
  				description: (toString == 0 ? fixed_class_name : Module.UTF8ToString (toString)),
  				// objectId added when enumerating object's properties
  				expanded: false,
  				isValueType: true
  			}
  		});
  	}

  function _mono_wasm_begin_value_type_var(className, toString) {
  		fixed_class_name = MONO._mono_csharp_fixup_class_name(Module.UTF8ToString (className));
  		var vt_obj = {
  			value: {
  				type: "object",
  				className: fixed_class_name,
  				description: (toString == 0 ? fixed_class_name : Module.UTF8ToString (toString)),
  				// objectId will be generated by MonoProxy
  				expanded: true,
  				isValueType: true,
  				members: []
  			}
  		};
  		if (MONO._vt_stack.length == 0)
  			MONO._old_var_info = MONO.var_info;
  
  		MONO.var_info = vt_obj.value.members;
  		MONO._vt_stack.push (vt_obj);
  	}

  
  var BINDING={BINDING_ASM:"[WebAssembly.Bindings]WebAssembly.Runtime",mono_wasm_object_registry:[],mono_wasm_ref_counter:0,mono_wasm_free_list:[],mono_wasm_marshal_enum_as_int:false,mono_bindings_init:function (binding_asm) {
  			this.BINDING_ASM = binding_asm;
  		},export_functions:function (module) {
  			module ["mono_bindings_init"] = BINDING.mono_bindings_init.bind(BINDING);
  			module ["mono_method_invoke"] = BINDING.call_method.bind(BINDING);
  			module ["mono_method_get_call_signature"] = BINDING.mono_method_get_call_signature.bind(BINDING);
  			module ["mono_method_resolve"] = BINDING.resolve_method_fqn.bind(BINDING);
  			module ["mono_bind_static_method"] = BINDING.bind_static_method.bind(BINDING);
  			module ["mono_call_static_method"] = BINDING.call_static_method.bind(BINDING);
  			module ["mono_bind_assembly_entry_point"] = BINDING.bind_assembly_entry_point.bind(BINDING);
  			module ["mono_call_assembly_entry_point"] = BINDING.call_assembly_entry_point.bind(BINDING);
  		},bindings_lazy_init:function () {
  			if (this.init)
  				return;
  		
  			this.assembly_load = Module.cwrap ('mono_wasm_assembly_load', 'number', ['string']);
  			this.find_class = Module.cwrap ('mono_wasm_assembly_find_class', 'number', ['number', 'string', 'string']);
  			this.find_method = Module.cwrap ('mono_wasm_assembly_find_method', 'number', ['number', 'string', 'number']);
  			this.invoke_method = Module.cwrap ('mono_wasm_invoke_method', 'number', ['number', 'number', 'number', 'number']);
  			this.mono_string_get_utf8 = Module.cwrap ('mono_wasm_string_get_utf8', 'number', ['number']);
  			this.js_string_to_mono_string = Module.cwrap ('mono_wasm_string_from_js', 'number', ['string']);
  			this.mono_get_obj_type = Module.cwrap ('mono_wasm_get_obj_type', 'number', ['number']);
  			this.mono_unbox_int = Module.cwrap ('mono_unbox_int', 'number', ['number']);
  			this.mono_unbox_float = Module.cwrap ('mono_wasm_unbox_float', 'number', ['number']);
  			this.mono_array_length = Module.cwrap ('mono_wasm_array_length', 'number', ['number']);
  			this.mono_array_get = Module.cwrap ('mono_wasm_array_get', 'number', ['number', 'number']);
  			this.mono_obj_array_new = Module.cwrap ('mono_wasm_obj_array_new', 'number', ['number']);
  			this.mono_obj_array_set = Module.cwrap ('mono_wasm_obj_array_set', 'void', ['number', 'number', 'number']);
  			this.mono_unbox_enum = Module.cwrap ('mono_wasm_unbox_enum', 'number', ['number']);
  			this.assembly_get_entry_point = Module.cwrap ('mono_wasm_assembly_get_entry_point', 'number', ['number']);
  
  			// receives a byteoffset into allocated Heap with a size.
  			this.mono_typed_array_new = Module.cwrap ('mono_wasm_typed_array_new', 'number', ['number','number','number','number']);
  
  			var binding_fqn_asm = this.BINDING_ASM.substring(this.BINDING_ASM.indexOf ("[") + 1, this.BINDING_ASM.indexOf ("]")).trim();
  			var binding_fqn_class = this.BINDING_ASM.substring (this.BINDING_ASM.indexOf ("]") + 1).trim();
  			
  			this.binding_module = this.assembly_load (binding_fqn_asm);
  			if (!this.binding_module)
  				throw "Can't find bindings module assembly: " + binding_fqn_asm;
  
  			if (binding_fqn_class !== null && typeof binding_fqn_class !== "undefined")
  			{
  				var namespace = "WebAssembly";
  				var classname = binding_fqn_class.length > 0 ? binding_fqn_class : "Runtime";
  				if (binding_fqn_class.indexOf(".") != -1) {
  					var idx = binding_fqn_class.lastIndexOf(".");
  					namespace = binding_fqn_class.substring (0, idx);
  					classname = binding_fqn_class.substring (idx + 1);
  				}
  			}
  
  			var wasm_runtime_class = this.find_class (this.binding_module, namespace, classname)
  			if (!wasm_runtime_class)
  				throw "Can't find " + binding_fqn_class + " class";
  
  			var get_method = function(method_name) {
  				var res = BINDING.find_method (wasm_runtime_class, method_name, -1)
  				if (!res)
  					throw "Can't find method " + namespace + "." + classname + ":" + method_name;
  				return res;
  			}
  			this.bind_js_obj = get_method ("BindJSObject");
  			this.bind_core_clr_obj = get_method ("BindCoreCLRObject");
  			this.bind_existing_obj = get_method ("BindExistingObject");
  			this.unbind_js_obj = get_method ("UnBindJSObject");
  			this.unbind_js_obj_and_free = get_method ("UnBindJSObjectAndFree");			
  			this.unbind_raw_obj_and_free = get_method ("UnBindRawJSObjectAndFree");			
  			this.get_js_id = get_method ("GetJSObjectId");
  			this.get_raw_mono_obj = get_method ("GetMonoObject");
  
  			this.box_js_int = get_method ("BoxInt");
  			this.box_js_double = get_method ("BoxDouble");
  			this.box_js_bool = get_method ("BoxBool");
  			this.is_simple_array = get_method ("IsSimpleArray");
  			this.get_core_type = get_method ("GetCoreType");
  			this.setup_js_cont = get_method ("SetupJSContinuation");
  
  			this.create_tcs = get_method ("CreateTaskSource");
  			this.set_tcs_result = get_method ("SetTaskSourceResult");
  			this.set_tcs_failure = get_method ("SetTaskSourceFailure");
  			this.tcs_get_task_and_bind = get_method ("GetTaskAndBind");
  			this.get_call_sig = get_method ("GetCallSignature");
  
  			this.object_to_string = get_method ("ObjectToString");
  			this.get_date_value = get_method ("GetDateValue");
  			this.create_date_time = get_method ("CreateDateTime");
  			this.create_uri = get_method ("CreateUri");
  
  			this.object_to_enum = get_method ("ObjectToEnum");
  			this.init = true;
  		},get_js_obj:function (js_handle) {
  			if (js_handle > 0)
  				return this.mono_wasm_require_handle(js_handle);
  			return null;
  		},conv_string:function (mono_obj) {
  			return MONO.string_decoder.copy (mono_obj);
  		},is_nested_array:function (ele) {
  			return this.call_method (this.is_simple_array, null, "mi", [ ele ]);
  		},mono_array_to_js_array:function (mono_array) {
  			if (mono_array == 0)
  				return null;
  
  			var res = [];
  			var len = this.mono_array_length (mono_array);
  			for (var i = 0; i < len; ++i)
  			{
  				var ele = this.mono_array_get (mono_array, i);
  				if (this.is_nested_array(ele))
  					res.push(this.mono_array_to_js_array(ele));
  				else
  					res.push (this.unbox_mono_obj (ele));
  			}
  
  			return res;
  		},js_array_to_mono_array:function (js_array) {
  			var mono_array = this.mono_obj_array_new (js_array.length);
  			for (var i = 0; i < js_array.length; ++i) {
  				this.mono_obj_array_set (mono_array, i, this.js_to_mono_obj (js_array [i]));
  			}
  			return mono_array;
  		},unbox_mono_obj:function (mono_obj) {
  			if (mono_obj == 0)
  				return undefined;
  			var type = this.mono_get_obj_type (mono_obj);
  			//See MARSHAL_TYPE_ defines in driver.c
  			switch (type) {
  			case 1: // int
  				return this.mono_unbox_int (mono_obj);
  			case 2: // float
  				return this.mono_unbox_float (mono_obj);
  			case 3: //string
  				return this.conv_string (mono_obj);
  			case 4: //vts
  				throw new Error ("no idea on how to unbox value types");
  			case 5: { // delegate
  				var obj = this.extract_js_obj (mono_obj);
  				return function () {
  					return BINDING.invoke_delegate (obj, arguments);
  				};
  			}
  			case 6: {// Task
  
  				if (typeof Promise === "undefined" || typeof Promise.resolve === "undefined")
  					throw new Error ("Promises are not supported thus C# Tasks can not work in this context.");
  
  				var obj = this.extract_js_obj (mono_obj);
  				var cont_obj = null;
  				var promise = new Promise (function (resolve, reject) {
  					cont_obj = {
  						resolve: resolve,
  						reject: reject
  					};
  				});
  
  				this.call_method (this.setup_js_cont, null, "mo", [ mono_obj, cont_obj ]);
  				obj.__mono_js_cont__ = cont_obj.__mono_gchandle__;
  				cont_obj.__mono_js_task__ = obj.__mono_gchandle__;
  				return promise;
  			}
  
  			case 7: // ref type
  				return this.extract_js_obj (mono_obj);
  
  			case 8: // bool
  				return this.mono_unbox_int (mono_obj) != 0;
  
  			case 9: // enum
  
  				if(this.mono_wasm_marshal_enum_as_int)
  				{
  					return this.mono_unbox_enum (mono_obj);
  				}
  				else
  				{
  					enumValue = this.call_method(this.object_to_string, null, "m", [ mono_obj ]);
  				}
  
  				return enumValue;
  
  
  			case 11: 
  			case 12: 
  			case 13: 
  			case 14: 
  			case 15: 
  			case 16: 
  			case 17: 
  			case 18:
  			{
  				throw new Error ("Marshalling of primitive arrays are not supported.  Use the corresponding TypedArray instead.");
  			}
  			case 20: // clr .NET DateTime
  				var dateValue = this.call_method(this.get_date_value, null, "md", [ mono_obj ]);
  				return new Date(dateValue);
  			case 21: // clr .NET DateTimeOffset
  				var dateoffsetValue = this.call_method(this.object_to_string, null, "m", [ mono_obj ]);
  				return dateoffsetValue;
  			case 22: // clr .NET Uri
  				var uriValue = this.call_method(this.object_to_string, null, "m", [ mono_obj ]);
  				return uriValue;
  			default:
  				throw new Error ("no idea on how to unbox object kind " + type);
  			}
  		},create_task_completion_source:function () {
  			return this.call_method (this.create_tcs, null, "i", [ -1 ]);
  		},set_task_result:function (tcs, result) {
  			tcs.is_mono_tcs_result_set = true;
  			this.call_method (this.set_tcs_result, null, "oo", [ tcs, result ]);
  			if (tcs.is_mono_tcs_task_bound)
  				this.free_task_completion_source(tcs);
  		},set_task_failure:function (tcs, reason) {
  			tcs.is_mono_tcs_result_set = true;
  			this.call_method (this.set_tcs_failure, null, "os", [ tcs, reason.toString () ]);
  			if (tcs.is_mono_tcs_task_bound)
  				this.free_task_completion_source(tcs);
  		},js_typedarray_to_heap:function(typedArray){
  			var numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
  			var ptr = Module._malloc(numBytes);
  			var heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
  			heapBytes.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, numBytes));
  			return heapBytes;
  		},js_to_mono_obj:function (js_obj) {
  			this.bindings_lazy_init ();
  
  			// determines if the javascript object is a Promise or Promise like which can happen
  			// when using an external Promise library.  The javascript object should be marshalled 
  			// as managed Task objects.
  			// 
  			// Example is when Bluebird is included in a web page using a script tag, it overwrites the 
  			// global Promise object by default with its own version of Promise.
  			function isThenable() {
  				// When using an external Promise library the Promise.resolve may not be sufficient
  				// to identify the object as a Promise.
  				return Promise.resolve(js_obj) === js_obj || 
  						((typeof js_obj === "object" || typeof js_obj === "function") && typeof js_obj.then === "function")
  			}
  
  			switch (true) {
  				case js_obj === null:
  				case typeof js_obj === "undefined":
  					return 0;
  				case typeof js_obj === "number":
  					if (parseInt(js_obj) == js_obj)
  						return this.call_method (this.box_js_int, null, "im", [ js_obj ]);
  					return this.call_method (this.box_js_double, null, "dm", [ js_obj ]);
  				case typeof js_obj === "string":
  					return this.js_string_to_mono_string (js_obj);
  				case typeof js_obj === "boolean":
  					return this.call_method (this.box_js_bool, null, "im", [ js_obj ]);
  				case isThenable() === true:
  					var the_task = this.try_extract_mono_obj (js_obj);
  					if (the_task)
  						return the_task;
  					var tcs = this.create_task_completion_source ();
  					js_obj.then (function (result) {
  						BINDING.set_task_result (tcs, result);
  					}, function (reason) {
  						BINDING.set_task_failure (tcs, reason);
  					})
  					return this.get_task_and_bind (tcs, js_obj);
  				case js_obj.constructor.name === "Date":
  					// We may need to take into account the TimeZone Offset
  					return this.call_method(this.create_date_time, null, "dm", [ js_obj.getTime() ]);
  				default:
  					return this.extract_mono_obj (js_obj);
  			}
  		},js_to_mono_uri:function (js_obj) {
  			this.bindings_lazy_init ();
  
  			switch (true) {
  				case js_obj === null:
  				case typeof js_obj === "undefined":
  					return 0;
  				case typeof js_obj === "string":
  					return this.call_method(this.create_uri, null, "sm", [ js_obj ])
  				default:
  					return this.extract_mono_obj (js_obj);
  			}
  		},js_typed_array_to_array:function (js_obj) {
  
  			// JavaScript typed arrays are array-like objects and provide a mechanism for accessing 
  			// raw binary data. (...) To achieve maximum flexibility and efficiency, JavaScript typed arrays 
  			// split the implementation into buffers and views. A buffer (implemented by the ArrayBuffer object)
  			//  is an object representing a chunk of data; it has no format to speak of, and offers no 
  			// mechanism for accessing its contents. In order to access the memory contained in a buffer, 
  			// you need to use a view. A view provides a context — that is, a data type, starting offset, 
  			// and number of elements — that turns the data into an actual typed array.
  			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
  			if (!!(js_obj.buffer instanceof ArrayBuffer && js_obj.BYTES_PER_ELEMENT)) 
  			{
  				var arrayType = 0;	
  				if (js_obj instanceof Int8Array)
  					arrayType = 11;
  				if (js_obj instanceof Uint8Array)
  					arrayType = 12;
  				if (js_obj instanceof Uint8ClampedArray)
  					arrayType = 12;
  				if (js_obj instanceof Int16Array)
  					arrayType = 13;
  				if (js_obj instanceof Uint16Array)
  					arrayType = 14;
  				if (js_obj instanceof Int32Array)
  					arrayType = 15;
  				if (js_obj instanceof Uint32Array)
  					arrayType = 16;
  				if (js_obj instanceof Float32Array)
  					arrayType = 17;
  				if (js_obj instanceof Float64Array)
  					arrayType = 18;
  
  				var heapBytes = this.js_typedarray_to_heap(js_obj);
  				var bufferArray = this.mono_typed_array_new(heapBytes.byteOffset, js_obj.length, js_obj.BYTES_PER_ELEMENT, arrayType);
  				Module._free(heapBytes.byteOffset);
  				return bufferArray;
  			}
  			else {
  				throw new Error("Object '" + js_obj + "' is not a typed array");
  			} 
  
  
  		},typedarray_copy_to:function (typed_array, pinned_array, begin, end, bytes_per_element) {
  
  			// JavaScript typed arrays are array-like objects and provide a mechanism for accessing 
  			// raw binary data. (...) To achieve maximum flexibility and efficiency, JavaScript typed arrays 
  			// split the implementation into buffers and views. A buffer (implemented by the ArrayBuffer object)
  			//  is an object representing a chunk of data; it has no format to speak of, and offers no 
  			// mechanism for accessing its contents. In order to access the memory contained in a buffer, 
  			// you need to use a view. A view provides a context — that is, a data type, starting offset, 
  			// and number of elements — that turns the data into an actual typed array.
  			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
  			if (!!(typed_array.buffer instanceof ArrayBuffer && typed_array.BYTES_PER_ELEMENT)) 
  			{
  				// Some sanity checks of what is being asked of us
  				// lets play it safe and throw an error here instead of assuming to much.
  				// Better safe than sorry later
  				if (bytes_per_element !== typed_array.BYTES_PER_ELEMENT)
  					throw new Error("Inconsistent element sizes: TypedArray.BYTES_PER_ELEMENT '" + typed_array.BYTES_PER_ELEMENT + "' sizeof managed element: '" + bytes_per_element + "'");
  
  				// how much space we have to work with
  				var num_of_bytes = (end - begin) * bytes_per_element;
  				// how much typed buffer space are we talking about
  				var view_bytes = typed_array.length * typed_array.BYTES_PER_ELEMENT;
  				// only use what is needed.
  				if (num_of_bytes > view_bytes)
  					num_of_bytes = view_bytes;
  
  				// offset index into the view
  				var offset = begin * bytes_per_element;
  
  				// Create a view over the heap pointed to by the pinned array address
  				var heapBytes = new Uint8Array(Module.HEAPU8.buffer, pinned_array + offset, num_of_bytes);
  				// Copy the bytes of the typed array to the heap.
  				heapBytes.set(new Uint8Array(typed_array.buffer, typed_array.byteOffset, num_of_bytes));
  
  				return num_of_bytes;
  			}
  			else {
  				throw new Error("Object '" + typed_array + "' is not a typed array");
  			} 
  
  		},typedarray_copy_from:function (typed_array, pinned_array, begin, end, bytes_per_element) {
  
  			// JavaScript typed arrays are array-like objects and provide a mechanism for accessing 
  			// raw binary data. (...) To achieve maximum flexibility and efficiency, JavaScript typed arrays 
  			// split the implementation into buffers and views. A buffer (implemented by the ArrayBuffer object)
  			//  is an object representing a chunk of data; it has no format to speak of, and offers no 
  			// mechanism for accessing its contents. In order to access the memory contained in a buffer, 
  			// you need to use a view. A view provides a context — that is, a data type, starting offset, 
  			// and number of elements — that turns the data into an actual typed array.
  			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
  			if (!!(typed_array.buffer instanceof ArrayBuffer && typed_array.BYTES_PER_ELEMENT)) 
  			{
  				// Some sanity checks of what is being asked of us
  				// lets play it safe and throw an error here instead of assuming to much.
  				// Better safe than sorry later
  				if (bytes_per_element !== typed_array.BYTES_PER_ELEMENT)
  					throw new Error("Inconsistent element sizes: TypedArray.BYTES_PER_ELEMENT '" + typed_array.BYTES_PER_ELEMENT + "' sizeof managed element: '" + bytes_per_element + "'");
  
  				// how much space we have to work with
  				var num_of_bytes = (end - begin) * bytes_per_element;
  				// how much typed buffer space are we talking about
  				var view_bytes = typed_array.length * typed_array.BYTES_PER_ELEMENT;
  				// only use what is needed.
  				if (num_of_bytes > view_bytes)
  					num_of_bytes = view_bytes;
  
  				// Create a new view for mapping
  				var typedarrayBytes = new Uint8Array(typed_array.buffer, 0, num_of_bytes);
  				// offset index into the view
  				var offset = begin * bytes_per_element;
  				// Set view bytes to value from HEAPU8
  				typedarrayBytes.set(Module.HEAPU8.subarray(pinned_array + offset, pinned_array + offset + num_of_bytes));
  				return num_of_bytes;
  			}
  			else {
  				throw new Error("Object '" + typed_array + "' is not a typed array");
  			} 
  
  		},typed_array_from:function (pinned_array, begin, end, bytes_per_element, type) {
  
  			// typed array
  			var newTypedArray = 0;
  
  			switch (type)
  			{
  				case 5: 
  					newTypedArray = new Int8Array(end - begin);
  					break;
  				case 6: 
  					newTypedArray = new Uint8Array(end - begin);
  					break;
  				case 7: 
  					newTypedArray = new Int16Array(end - begin);
  					break;
  				case 8: 
  					newTypedArray = new Uint16Array(end - begin);
  					break;
  				case 9: 
  					newTypedArray = new Int32Array(end - begin);
  					break;
  				case 10: 
  					newTypedArray = new Uint32Array(end - begin);
  					break;
  				case 13: 
  					newTypedArray = new Float32Array(end - begin);
  					break;
  				case 14:
  					newTypedArray = new Float64Array(end - begin);
  					break;
  				case 15:  // This is a special case because the typed array is also byte[]
  					newTypedArray = new Uint8ClampedArray(end - begin);
  					break;
  			}
  
  			this.typedarray_copy_from(newTypedArray, pinned_array, begin, end, bytes_per_element);
  			return newTypedArray;
  		},js_to_mono_enum:function (method, parmIdx, js_obj) {
  			this.bindings_lazy_init ();
      
  			if (js_obj === null || typeof js_obj === "undefined")
  				return 0;
  
  			var monoObj = this.js_to_mono_obj(js_obj);
  			// Check enum contract
  			var monoEnum = this.call_method(this.object_to_enum, null, "iimm", [ method, parmIdx, monoObj ])
  			// return the unboxed enum value.
  			return this.mono_unbox_enum(monoEnum);
  		},wasm_binding_obj_new:function (js_obj_id, type)
  		{
  			return this.call_method (this.bind_js_obj, null, "io", [js_obj_id, type]);
  		},wasm_bind_existing:function (mono_obj, js_id)
  		{
  			return this.call_method (this.bind_existing_obj, null, "mi", [mono_obj, js_id]);
  		},wasm_bind_core_clr_obj:function (js_id, gc_handle)
  		{
  			return this.call_method (this.bind_core_clr_obj, null, "ii", [js_id, gc_handle]);
  		},wasm_unbind_js_obj:function (js_obj_id)
  		{
  			this.call_method (this.unbind_js_obj, null, "i", [js_obj_id]);
  		},wasm_unbind_js_obj_and_free:function (js_obj_id)
  		{
  			this.call_method (this.unbind_js_obj_and_free, null, "i", [js_obj_id]);
  		},wasm_get_js_id:function (mono_obj)
  		{
  			return this.call_method (this.get_js_id, null, "m", [mono_obj]);
  		},wasm_get_raw_obj:function (gchandle)
  		{
  			return this.call_method (this.get_raw_mono_obj, null, "im", [gchandle]);
  		},try_extract_mono_obj:function (js_obj) {
  			if (js_obj === null || typeof js_obj === "undefined" || typeof js_obj.__mono_gchandle__ === "undefined")
  				return 0;
  			return this.wasm_get_raw_obj (js_obj.__mono_gchandle__);
  		},mono_method_get_call_signature:function(method) {
  			this.bindings_lazy_init ();
  
  			return this.call_method (this.get_call_sig, null, "i", [ method ]);
  		},get_task_and_bind:function (tcs, js_obj) {
  			var gc_handle = this.mono_wasm_free_list.length ? this.mono_wasm_free_list.pop() : this.mono_wasm_ref_counter++;
  			var task_gchandle = this.call_method (this.tcs_get_task_and_bind, null, "oi", [ tcs, gc_handle + 1 ]);
  			js_obj.__mono_gchandle__ = task_gchandle;
  			this.mono_wasm_object_registry[gc_handle] = js_obj;
  			this.free_task_completion_source(tcs);
  			tcs.is_mono_tcs_task_bound = true;
  			js_obj.__mono_bound_tcs__ = tcs.__mono_gchandle__;
  			tcs.__mono_bound_task__ = js_obj.__mono_gchandle__;
  			return this.wasm_get_raw_obj (js_obj.__mono_gchandle__);
  		},free_task_completion_source:function (tcs) {
  			if (tcs.is_mono_tcs_result_set)
  			{
  				this.call_method (this.unbind_raw_obj_and_free, null, "ii", [ tcs.__mono_gchandle__ ]);
  			}
  			if (tcs.__mono_bound_task__)
  			{
  				this.call_method (this.unbind_raw_obj_and_free, null, "ii", [ tcs.__mono_bound_task__ ]);
  			}
  		},extract_mono_obj:function (js_obj) {
  
  			if (js_obj === null || typeof js_obj === "undefined")
  				return 0;
  
  			if (!js_obj.is_mono_bridged_obj) {
  				var gc_handle = this.mono_wasm_register_obj(js_obj);
  				return this.wasm_get_raw_obj (gc_handle);
  			}
  
  
  			return this.wasm_get_raw_obj (js_obj.__mono_gchandle__);
  		},extract_js_obj:function (mono_obj) {
  			if (mono_obj == 0)
  				return null;
  
  			var js_id = this.wasm_get_js_id (mono_obj);
  			if (js_id > 0)
  				return this.mono_wasm_require_handle(js_id);
  
  			var gcHandle = this.mono_wasm_free_list.length ? this.mono_wasm_free_list.pop() : this.mono_wasm_ref_counter++;
  			var js_obj = {
  				__mono_gchandle__: this.wasm_bind_existing(mono_obj, gcHandle + 1),
  				is_mono_bridged_obj: true
  			};
  
  			this.mono_wasm_object_registry[gcHandle] = js_obj;
  			return js_obj;
  		},call_method:function (method, this_arg, args_marshal, args) {
  			this.bindings_lazy_init ();
  
  			// Allocate memory for error
  			var has_args = args !== null && typeof args !== "undefined" && args.length > 0;
  			var has_args_marshal = args_marshal !== null && typeof args_marshal !== "undefined" && args_marshal.length > 0;
  
  			if (has_args_marshal && (!has_args || args.length > args_marshal.length))
  				throw Error("Parameter count mismatch.");
  
  			var args_start = null;
  			var buffer = null;
  			var exception_out = null;
  
  			// check if the method signature needs argument mashalling
  			if (has_args_marshal && has_args) {
  				var i;
  
  				var converters = this.converters;
  				if (!converters) {
  					converters = new Map ();
  					converters.set ('m', { steps: [{ }], size: 0});
  					converters.set ('s', { steps: [{ convert: this.js_string_to_mono_string.bind (this)}], size: 0});
  					converters.set ('o', { steps: [{ convert: this.js_to_mono_obj.bind (this)}], size: 0});
  					converters.set ('u', { steps: [{ convert: this.js_to_mono_uri.bind (this)}], size: 0});
  					converters.set ('k', { steps: [{ convert: this.js_to_mono_enum.bind (this), indirect: 'i64'}], size: 8});
  					converters.set ('j', { steps: [{ convert: this.js_to_mono_enum.bind (this), indirect: 'i32'}], size: 8});
  					converters.set ('i', { steps: [{ indirect: 'i32'}], size: 8});
  					converters.set ('l', { steps: [{ indirect: 'i64'}], size: 8});
  					converters.set ('f', { steps: [{ indirect: 'float'}], size: 8});
  					converters.set ('d', { steps: [{ indirect: 'double'}], size: 8});
  					converters.set ('p', { steps: [{ }], size: 8});
  					this.converters = converters;
  				}
  
  				var converter = converters.get (args_marshal);
  				if (!converter) {
  					var steps = [];
  					var size = 0;
  
  					for (i = 0; i < args_marshal.length; ++i) {
  						var conv = this.converters.get (args_marshal[i]);
  						if (!conv)
  							throw Error ("Unknown parameter type " + type);
  
  						steps.push (conv.steps[0]);
  						size += conv.size;
  					}
  					converter = { steps: steps, size: size };
  					converters.set (args_marshal, converter);
  				}
  
  				// assume at least 8 byte alignment from malloc
  				buffer = Module._malloc (converter.size + (args.length * 4) + 4);
  				var indirect_start = buffer; // buffer + buffer % 8
  				exception_out = indirect_start + converter.size;
  				args_start = exception_out + 4;
  
  				var slot = args_start;
  				var indirect_value = indirect_start;
  				for (i = 0; i < args.length; ++i) {
  					var handler = converter.steps[i];
  					var obj = handler.convert ? handler.convert (args[i], method, i) : args[i];
  
  					if (handler.indirect) {
  						Module.setValue (indirect_value, obj, handler.indirect);
  						obj = indirect_value;
  						indirect_value += 8;
  					}
  
  					Module.setValue (slot, obj, "*");
  					slot += 4;
  				}
  			} else {
  				// only marshal the exception
  				exception_out = buffer = Module._malloc (4);
  			}
  
  			Module.setValue (exception_out, 0, "*");
  
  			var res = this.invoke_method (method, this_arg, args_start, exception_out);
  			var eh_res = Module.getValue (exception_out, "*");
  
  			Module._free (buffer);
  
  			if (eh_res != 0) {
  				var msg = this.conv_string (res);
  				throw new Error (msg); //the convention is that invoke_method ToString () any outgoing exception
  			}
  
  			if (has_args_marshal && has_args) {
  				if (args_marshal.length >= args.length && args_marshal [args.length] === "m")
  					return res;
  			}
  
  			return this.unbox_mono_obj (res);
  		},invoke_delegate:function (delegate_obj, js_args) {
  			this.bindings_lazy_init ();
  
  			if (!this.delegate_dynamic_invoke) {
  				if (!this.corlib)
  					this.corlib = this.assembly_load ("mscorlib");
  				if (!this.delegate_class)
  					this.delegate_class = this.find_class (this.corlib, "System", "Delegate");
  				if (!this.delegate_class)
  				{
  					throw new Error("System.Delegate class can not be resolved.");
  				}
  				this.delegate_dynamic_invoke = this.find_method (this.delegate_class, "DynamicInvoke", -1);
  			}
  			var mono_args = this.js_array_to_mono_array (js_args);
  			if (!this.delegate_dynamic_invoke)
  				throw new Error("System.Delegate.DynamicInvoke method can not be resolved.");
  			// Note: the single 'm' passed here is causing problems with AOT.  Changed to "mo" again.  
  			// This may need more analysis if causes problems again.
  			return this.call_method (this.delegate_dynamic_invoke, this.extract_mono_obj (delegate_obj), "mo", [ mono_args ]);
  		},resolve_method_fqn:function (fqn) {
  			var assembly = fqn.substring(fqn.indexOf ("[") + 1, fqn.indexOf ("]")).trim();
  			fqn = fqn.substring (fqn.indexOf ("]") + 1).trim();
  
  			var methodname = fqn.substring(fqn.indexOf (":") + 1);
  			fqn = fqn.substring (0, fqn.indexOf (":")).trim ();
  
  			var namespace = "";
  			var classname = fqn;
  			if (fqn.indexOf(".") != -1) {
  				var idx = fqn.lastIndexOf(".");
  				namespace = fqn.substring (0, idx);
  				classname = fqn.substring (idx + 1);
  			}
  
  			var asm = this.assembly_load (assembly);
  			if (!asm)
  				throw new Error ("Could not find assembly: " + assembly);
  
  			var klass = this.find_class(asm, namespace, classname);
  			if (!klass)
  				throw new Error ("Could not find class: " + namespace + ":" +classname);
  
  			var method = this.find_method (klass, methodname, -1);
  			if (!method)
  				throw new Error ("Could not find method: " + methodname);
  			return method;
  		},call_static_method:function (fqn, args, signature) {
  			this.bindings_lazy_init ();
  
  			var method = this.resolve_method_fqn (fqn);
  
  			if (typeof signature === "undefined")
  				signature = Module.mono_method_get_call_signature (method);
  
  			return this.call_method (method, null, signature, args);
  		},bind_static_method:function (fqn, signature) {
  			this.bindings_lazy_init ();
  
  			var method = this.resolve_method_fqn (fqn);
  
  			if (typeof signature === "undefined")
  				signature = Module.mono_method_get_call_signature (method);
  
  			return function() {
  				return BINDING.call_method (method, null, signature, arguments);
  			};
  		},bind_assembly_entry_point:function (assembly) {
  			this.bindings_lazy_init ();
  
  			var asm = this.assembly_load (assembly);
  			if (!asm)
  				throw new Error ("Could not find assembly: " + assembly);
  
  			var method = this.assembly_get_entry_point(asm);
  			if (!method)
  				throw new Error ("Could not find entry point for assembly: " + assembly);
  
  			if (typeof signature === "undefined")
  				signature = Module.mono_method_get_call_signature (method);
  
  			return function() {
  				return BINDING.call_method (method, null, signature, arguments);
  			};
  		},call_assembly_entry_point:function (assembly, args, signature) {
  			this.bindings_lazy_init ();
  
  			var asm = this.assembly_load (assembly);
  			if (!asm)
  				throw new Error ("Could not find assembly: " + assembly);
  
  			var method = this.assembly_get_entry_point(asm);
  			if (!method)
  				throw new Error ("Could not find entry point for assembly: " + assembly);
  
  			if (typeof signature === "undefined")
  				signature = Module.mono_method_get_call_signature (method);
  
  			return this.call_method (method, null, signature, args);
  		},wasm_get_core_type:function (obj)
  		{
  			return this.call_method (this.get_core_type, null, "so", [ "WebAssembly.Core."+obj.constructor.name ]);
  		},get_wasm_type:function(obj) {
  			var coreType = obj[Symbol.for("wasm type")];
  			if (typeof coreType === "undefined") {
  				coreType = this.wasm_get_core_type(obj);
  				if (typeof coreType !== "undefined") {
  					obj.constructor.prototype[Symbol.for("wasm type")] = coreType;
  				}
  		  	}
  			return coreType;
  		},mono_wasm_register_obj:function(obj) {
  
  			var gc_handle = undefined;
  			if (obj !== null && typeof obj !== "undefined") 
  			{
  				gc_handle = obj.__mono_gchandle__;
  
  				if (typeof gc_handle === "undefined") {
  					var handle = this.mono_wasm_free_list.length ?
  								this.mono_wasm_free_list.pop() : this.mono_wasm_ref_counter++;
  					obj.__mono_jshandle__ = handle;
  					// Obtain the JS -> C# type mapping.
  					var wasm_type = this.get_wasm_type(obj);
  					gc_handle = obj.__mono_gchandle__ = this.wasm_binding_obj_new(handle + 1, wasm_type);
  					this.mono_wasm_object_registry[handle] = obj;
  						
  				}
  			}
  			return gc_handle;
  		},mono_wasm_require_handle:function(handle) {
  			if (handle > 0)
  				return this.mono_wasm_object_registry[handle - 1];
  			return null;
  		},mono_wasm_unregister_obj:function(js_id) {
  			var obj = this.mono_wasm_object_registry[js_id - 1];
  			if (typeof obj  !== "undefined" && obj !== null) {
  				// if this is the global object then do not
  				// unregister it.
  				if (typeof ___mono_wasm_global___ !== "undefined" && ___mono_wasm_global___ === obj)
  					return obj;
  
  				var gc_handle = obj.__mono_gchandle__;
  				if (typeof gc_handle  !== "undefined") {
  					this.wasm_unbind_js_obj_and_free(js_id);
  
  					obj.__mono_gchandle__ = undefined;
  					obj.__mono_jshandle__ = undefined;
  
  					this.mono_wasm_object_registry[js_id - 1] = undefined;
  					this.mono_wasm_free_list.push(js_id - 1);
  				}
  			}
  			return obj;
  		},mono_wasm_free_handle:function(handle) {
  			this.mono_wasm_unregister_obj(handle);
  		},mono_wasm_free_raw_object:function(js_id) {
  			var obj = this.mono_wasm_object_registry[js_id - 1];
  			if (typeof obj  !== "undefined" && obj !== null) {
  				// if this is the global object then do not
  				// unregister it.
  				if (typeof ___mono_wasm_global___ !== "undefined" && ___mono_wasm_global___ === obj)
  					return obj;
  
  				var gc_handle = obj.__mono_gchandle__;
  				if (typeof gc_handle  !== "undefined") {
  
  					obj.__mono_gchandle__ = undefined;
  					obj.__mono_jshandle__ = undefined;
  
  					this.mono_wasm_object_registry[js_id - 1] = undefined;
  					this.mono_wasm_free_list.push(js_id - 1);
  				}
  			}
  			return obj;
  		},mono_wasm_get_global:function() {
  			function testGlobal(obj) {
  				obj['___mono_wasm_global___'] = obj;
  				var success = typeof ___mono_wasm_global___ === 'object' && obj['___mono_wasm_global___'] === obj;
  				if (!success) {
  					delete obj['___mono_wasm_global___'];
  				}
  				return success;
  			}
  			if (typeof ___mono_wasm_global___ === 'object') {
  				return ___mono_wasm_global___;
  			}
  			if (typeof global === 'object' && testGlobal(global)) {
  				___mono_wasm_global___ = global;
  			} else if (typeof window === 'object' && testGlobal(window)) {
  				___mono_wasm_global___ = window;
  			} else if (testGlobal((function(){return Function;})()('return this')())) {
  
  				___mono_wasm_global___ = (function(){return Function;})()('return this')();
  
  			}
  			if (typeof ___mono_wasm_global___ === 'object') {
  				return ___mono_wasm_global___;
  			}
  			throw Error('Unable to get mono wasm global object.');
  		}};function _mono_wasm_bind_core_object(js_handle, gc_handle, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		BINDING.wasm_bind_core_clr_obj(js_handle, gc_handle );
  		requireObject.__mono_gchandle__ = gc_handle;
  		return gc_handle;
  	}

  function _mono_wasm_bind_host_object(js_handle, gc_handle, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		BINDING.wasm_bind_core_clr_obj(js_handle, gc_handle );
  		requireObject.__mono_gchandle__ = gc_handle;
  		return gc_handle;
  	}

  function _mono_wasm_end_value_type_var() {
  		var top_vt_obj_popped = MONO._vt_stack.pop ();
  		top_vt_obj_popped.value.members = MONO._filter_automatic_properties (
  							MONO._fixup_name_value_objects (top_vt_obj_popped.value.members));
  
  		if (MONO._vt_stack.length == 0) {
  			MONO.var_info = MONO._old_var_info;
  			MONO.var_info.push(top_vt_obj_popped);
  		} else {
  			var top_obj = MONO._vt_stack [MONO._vt_stack.length - 1];
  			top_obj.value.members.push (top_vt_obj_popped);
  			MONO.var_info = top_obj.value.members;
  		}
  	}

  function _mono_wasm_fire_bp() {
  		console.log ("mono_wasm_fire_bp");
  		debugger;
  	}

  function _mono_wasm_get_by_index(js_handle, property_index, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var obj = BINDING.mono_wasm_require_handle (js_handle);
  		if (!obj) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		try {
  			var m = obj [property_index];
  			return BINDING.js_to_mono_obj (m);
  		} catch (e) {
  			var res = e.toString ();
  			setValue (is_exception, 1, "i32");
  			if (res === null || typeof res === "undefined")
  				res = "unknown exception";
  			return BINDING.js_string_to_mono_string (res);
  		}
  	}

  function _mono_wasm_get_global_object(global_name, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var js_name = BINDING.conv_string (global_name);
  
  		var globalObj = undefined;
  
  		if (!js_name) {
  			globalObj = BINDING.mono_wasm_get_global();
  		}
  		else {
  			globalObj = BINDING.mono_wasm_get_global()[js_name];
  		}
  
  		if (globalObj === null || typeof globalObj === undefined) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Global object '" + js_name + "' not found.");
  		}
  
  		return BINDING.js_to_mono_obj (globalObj);
  	}

  function _mono_wasm_get_object_property(js_handle, property_name, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var obj = BINDING.mono_wasm_require_handle (js_handle);
  		if (!obj) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var js_name = BINDING.conv_string (property_name);
  		if (!js_name) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid property name object '" + js_name + "'");
  		}
  
  		var res;
  		try {
  			var m = obj [js_name];
  			if (m === Object(m) && obj.__is_mono_proxied__)
  				m.__is_mono_proxied__ = true;
  				
  			return BINDING.js_to_mono_obj (m);
  		} catch (e) {
  			var res = e.toString ();
  			setValue (is_exception, 1, "i32");
  			if (res === null || typeof res === "undefined")
  				res = "unknown exception";
  			return BINDING.js_string_to_mono_string (res);
  		}
  	}

  
  var DOTNET={_dotnet_get_global:function() {
  			function testGlobal(obj) {
  				obj['___dotnet_global___'] = obj;
  				var success = typeof ___dotnet_global___ === 'object' && obj['___dotnet_global___'] === obj;
  				if (!success) {
  					delete obj['___dotnet_global___'];
  				}
  				return success;
  			}
  			if (typeof ___dotnet_global___ === 'object') {
  				return ___dotnet_global___;
  			}
  			if (typeof global === 'object' && testGlobal(global)) {
  				___dotnet_global___ = global;
  			} else if (typeof window === 'object' && testGlobal(window)) {
  				___dotnet_global___ = window;
  			}
  			if (typeof ___dotnet_global___ === 'object') {
  				return ___dotnet_global___;
  			}
  			throw Error('unable to get DotNet global object.');
  		},conv_string:function (mono_obj) {
  			return MONO.string_decoder.copy (mono_obj);
  		}};function _mono_wasm_invoke_js_marshalled(exceptionMessage, asyncHandleLongPtr, functionName, argsJson) {
  
  		var mono_string = DOTNET._dotnet_get_global()._mono_string_cached
  			|| (DOTNET._dotnet_get_global()._mono_string_cached = Module.cwrap('mono_wasm_string_from_js', 'number', ['string']));
  
  		try {
  			// Passing a .NET long into JS via Emscripten is tricky. The method here is to pass
  			// as pointer to the long, then combine two reads from the HEAPU32 array.
  			// Even though JS numbers can't represent the full range of a .NET long, it's OK
  			// because we'll never exceed Number.MAX_SAFE_INTEGER (2^53 - 1) in this case.
  			//var u32Index = $1 >> 2;
  			var u32Index = asyncHandleLongPtr >> 2;
  			var asyncHandleJsNumber = Module.HEAPU32[u32Index + 1]*4294967296 + Module.HEAPU32[u32Index];
  
  			// var funcNameJsString = UTF8ToString (functionName);
  			// var argsJsonJsString = argsJson && UTF8ToString (argsJson);
  			var funcNameJsString = DOTNET.conv_string(functionName);
  			var argsJsonJsString = argsJson && DOTNET.conv_string (argsJson);
  
  			var dotNetExports = DOTNET._dotnet_get_global().DotNet;
  			if (!dotNetExports) {
  				throw new Error('The Microsoft.JSInterop.js library is not loaded.');
  			}
  
  			if (asyncHandleJsNumber) {
  				dotNetExports.jsCallDispatcher.beginInvokeJSFromDotNet(asyncHandleJsNumber, funcNameJsString, argsJsonJsString);
  				return 0;
  			} else {
  				var resultJson = dotNetExports.jsCallDispatcher.invokeJSFromDotNet(funcNameJsString, argsJsonJsString);
  				return resultJson === null ? 0 : mono_string(resultJson);
  			}
  		} catch (ex) {
  			var exceptionJsString = ex.message + '\n' + ex.stack;
  			var exceptionSystemString = mono_string(exceptionJsString);
  			setValue (exceptionMessage, exceptionSystemString, 'i32'); // *exceptionMessage = exceptionSystemString;
  			return 0;
  		}
  	}

  function _mono_wasm_invoke_js_unmarshalled(exceptionMessage, funcName, arg0, arg1, arg2)	{
  		try {
  			// Get the function you're trying to invoke
  			var funcNameJsString = DOTNET.conv_string(funcName);
  			var dotNetExports = DOTNET._dotnet_get_global().DotNet;
  			if (!dotNetExports) {
  				throw new Error('The Microsoft.JSInterop.js library is not loaded.');
  			}
  			var funcInstance = dotNetExports.jsCallDispatcher.findJSFunction(funcNameJsString);
  
  			return funcInstance.call(null, arg0, arg1, arg2);
  		} catch (ex) {
  			var exceptionJsString = ex.message + '\n' + ex.stack;
  			var mono_string = Module.cwrap('mono_wasm_string_from_js', 'number', ['string']); // TODO: Cache
  			var exceptionSystemString = mono_string(exceptionJsString);
  			setValue (exceptionMessage, exceptionSystemString, 'i32'); // *exceptionMessage = exceptionSystemString;
  			return 0;
  		}
  	}

  function _mono_wasm_invoke_js_with_args(js_handle, method_name, args, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var obj = BINDING.get_js_obj (js_handle);
  		if (!obj) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var js_name = BINDING.conv_string (method_name);
  		if (!js_name) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid method name object '" + method_name + "'");
  		}
  
  		var js_args = BINDING.mono_array_to_js_array(args);
  
  		var res;
  		try {
  			var m = obj [js_name];
  			if (typeof m === "undefined")
  				throw new Error("Method: '" + js_name + "' not found for: '" + Object.prototype.toString.call(obj) + "'");
  			var res = m.apply (obj, js_args);
  			return BINDING.js_to_mono_obj (res);
  		} catch (e) {
  			var res = e.toString ();
  			setValue (is_exception, 1, "i32");
  			if (res === null || res === undefined)
  				res = "unknown exception";
  			return BINDING.js_string_to_mono_string (res);
  		}
  	}

  function _mono_wasm_new(core_name, args, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var js_name = BINDING.conv_string (core_name);
  
  		if (!js_name) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Core object '" + js_name + "' not found.");
  		}
  
  		var coreObj = BINDING.mono_wasm_get_global()[js_name];
  
  		if (coreObj === null || typeof coreObj === "undefined") {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("JavaScript host object '" + js_name + "' not found.");
  		}
  
  		var js_args = BINDING.mono_array_to_js_array(args);
  		
  		try {
  			
  			// This is all experimental !!!!!!
  			var allocator = function(constructor, js_args) {
  				// Not sure if we should be checking for anything here
  				var argsList = new Array();
  				argsList[0] = constructor;
  				if (js_args)
  					argsList = argsList.concat(js_args);
  				var obj = new (constructor.bind.apply(constructor, argsList ));
  				return obj;
  			};
  	
  			var res = allocator(coreObj, js_args);
  			var gc_handle = BINDING.mono_wasm_free_list.length ? BINDING.mono_wasm_free_list.pop() : BINDING.mono_wasm_ref_counter++;
  			BINDING.mono_wasm_object_registry[gc_handle] = res;
  			return BINDING.js_to_mono_obj (gc_handle + 1);
  		} catch (e) {
  			var res = e.toString ();
  			setValue (is_exception, 1, "i32");
  			if (res === null || res === undefined)
  				res = "Error allocating object.";
  			return BINDING.js_string_to_mono_string (res);
  		}	
  
  	}

  function _mono_wasm_new_object(object_handle_or_function, args, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		if (!object_handle_or_function) {
  			return BINDING.js_to_mono_obj ({});
  		}
  		else {
  
  			var requireObject;
  			if (typeof object_handle_or_function === 'function')
  				requireObject = object_handle_or_function;
  			else
  				requireObject = BINDING.mono_wasm_require_handle (object_handle_or_function);
  
  			if (!requireObject) {
  				setValue (is_exception, 1, "i32");
  				return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + object_handle_or_function + "'");
  			}
  
  			var js_args = BINDING.mono_array_to_js_array(args);
  			
  			try {
  				
  				// This is all experimental !!!!!!
  				var allocator = function(constructor, js_args) {
  					// Not sure if we should be checking for anything here
  					var argsList = new Array();
  					argsList[0] = constructor;
  					if (js_args)
  						argsList = argsList.concat(js_args);
  					var obj = new (constructor.bind.apply(constructor, argsList ));
  					return obj;
  				};
  		
  				var res = allocator(requireObject, js_args);
  				return BINDING.extract_mono_obj (res);
  			} catch (e) {
  				var res = e.toString ();
  				setValue (is_exception, 1, "i32");
  				if (res === null || res === undefined)
  					res = "Error allocating object.";
  				return BINDING.js_string_to_mono_string (res);
  			}	
  		}
  
  	}

  function _mono_wasm_release_handle(js_handle, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		BINDING.mono_wasm_free_handle(js_handle);
  	}

  function _mono_wasm_release_object(js_handle, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		BINDING.mono_wasm_free_raw_object(js_handle);
  	}

  function _mono_wasm_set_by_index(js_handle, property_index, value, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var obj = BINDING.mono_wasm_require_handle (js_handle);
  		if (!obj) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var js_value = BINDING.unbox_mono_obj(value);
  
  		try {
  			obj [property_index] = js_value;
  			return true;
  		} catch (e) {
  			var res = e.toString ();
  			setValue (is_exception, 1, "i32");
  			if (res === null || typeof res === "undefined")
  				res = "unknown exception";
  			return BINDING.js_string_to_mono_string (res);
  		}
  	}

  function _mono_wasm_set_is_async_method(objectId) {
  		MONO._async_method_objectId = objectId;
  	}

  function _mono_wasm_set_object_property(js_handle, property_name, value, createIfNotExist, hasOwnProperty, is_exception) {
  
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var property = BINDING.conv_string (property_name);
  		if (!property) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid property name object '" + property_name + "'");
  		}
  
          var result = false;
  
  		var js_value = BINDING.unbox_mono_obj(value);
  
          if (createIfNotExist) {
              requireObject[property] = js_value;
              result = true;
          }
          else {
  			result = false;
  			if (!createIfNotExist)
  			{
  				if (!requireObject.hasOwnProperty(property))
  					return false;
  			}
              if (hasOwnProperty === true) {
                  if (requireObject.hasOwnProperty(property)) {
                      requireObject[property] = js_value;
                      result = true;
                  }
              }
              else {
                  requireObject[property] = js_value;
                  result = true;
              }
          
          }
          return BINDING.call_method (BINDING.box_js_bool, null, "im", [ result ]);
  	}

  function _mono_wasm_typed_array_copy_from(js_handle, pinned_array, begin, end, bytes_per_element, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var res = BINDING.typedarray_copy_from(requireObject, pinned_array, begin, end, bytes_per_element);
  		return BINDING.js_to_mono_obj (res)
  	}

  function _mono_wasm_typed_array_copy_to(js_handle, pinned_array, begin, end, bytes_per_element, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		var res = BINDING.typedarray_copy_to(requireObject, pinned_array, begin, end, bytes_per_element);
  		return BINDING.js_to_mono_obj (res)
  	}

  function _mono_wasm_typed_array_from(pinned_array, begin, end, bytes_per_element, type, is_exception) {
  		BINDING.bindings_lazy_init ();
  		var res = BINDING.typed_array_from(pinned_array, begin, end, bytes_per_element, type);
  		return BINDING.js_to_mono_obj (res)
  	}

  function _mono_wasm_typed_array_to_array(js_handle, is_exception) {
  		BINDING.bindings_lazy_init ();
  
  		var requireObject = BINDING.mono_wasm_require_handle (js_handle);
  		if (!requireObject) {
  			setValue (is_exception, 1, "i32");
  			return BINDING.js_string_to_mono_string ("Invalid JS object handle '" + js_handle + "'");
  		}
  
  		return BINDING.js_typed_array_to_array(requireObject);
  	}

  
  function _usleep(useconds) {
      // int usleep(useconds_t useconds);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/usleep.html
      // We're single-threaded, so use a busy loop. Super-ugly.
      var start = _emscripten_get_now();
      while (_emscripten_get_now() - start < useconds / 1000) {
        // Do nothing.
      }
    }
  Module["_usleep"] = _usleep;function _nanosleep(rqtp, rmtp) {
      // int nanosleep(const struct timespec  *rqtp, struct timespec *rmtp);
      if (rqtp === 0) {
        setErrNo(28);
        return -1;
      }
      var seconds = HEAP32[((rqtp)>>2)];
      var nanoseconds = HEAP32[(((rqtp)+(4))>>2)];
      if (nanoseconds < 0 || nanoseconds > 999999999 || seconds < 0) {
        setErrNo(28);
        return -1;
      }
      if (rmtp !== 0) {
        HEAP32[((rmtp)>>2)]=0;
        HEAP32[(((rmtp)+(4))>>2)]=0;
      }
      return _usleep((seconds * 1e6) + (nanoseconds / 1000));
    }

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { dynCall_vi(routine, arg) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _pthread_setcancelstate() { return 0; }

  
  function _round(d) {
      d = +d;
      return d >= +0 ? +Math_floor(d + +0.5) : +Math_ceil(d - +0.5);
    }

  function _schedule_background_exec() {
  		++MONO.pump_count;
  		if (ENVIRONMENT_IS_WEB) {
  			window.setTimeout (MONO.pump_message, 0);
  		} else if (ENVIRONMENT_IS_WORKER) {
  			self.setTimeout (MONO.pump_message, 0);
  		} else if (ENVIRONMENT_IS_NODE) {
  			global.setTimeout (MONO.pump_message, 0);
  		}
  	}

  function _sem_destroy() {}

  function _sem_init() {}

  function _sem_post() {}

  function _sem_trywait() {}

  function _sem_wait() {}

  function _setTempRet0($i) {
      setTempRet0(($i) | 0);
    }

  function _sigaction(signum, act, oldact) {
      //int sigaction(int signum, const struct sigaction *act, struct sigaction *oldact);
      return 0;
    }

  function _sigemptyset(set) {
      HEAP32[((set)>>2)]=0;
      return 0;
    }

  
  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }
  
  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
        // no-op
      }
      return sum;
    }
  
  
  var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];
  
  var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while(days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
  
      return newDate;
    }function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
  
      var tm_zone = HEAP32[(((tm)+(40))>>2)];
  
      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)],
        tm_gmtoff: HEAP32[(((tm)+(36))>>2)],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ''
      };
  
      var pattern = UTF8ToString(format);
  
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate time representation
        // Modified Conversion Specifiers
        '%Ec': '%c',                      // Replaced by the locale's alternative appropriate date and time representation.
        '%EC': '%C',                      // Replaced by the name of the base year (period) in the locale's alternative representation.
        '%Ex': '%m/%d/%y',                // Replaced by the locale's alternative date representation.
        '%EX': '%H:%M:%S',                // Replaced by the locale's alternative time representation.
        '%Ey': '%y',                      // Replaced by the offset from %EC (year only) in the locale's alternative representation.
        '%EY': '%Y',                      // Replaced by the full alternative year representation.
        '%Od': '%d',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading zeros if there is any alternative symbol for zero; otherwise, with leading <space> characters.
        '%Oe': '%e',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading <space> characters.
        '%OH': '%H',                      // Replaced by the hour (24-hour clock) using the locale's alternative numeric symbols.
        '%OI': '%I',                      // Replaced by the hour (12-hour clock) using the locale's alternative numeric symbols.
        '%Om': '%m',                      // Replaced by the month using the locale's alternative numeric symbols.
        '%OM': '%M',                      // Replaced by the minutes using the locale's alternative numeric symbols.
        '%OS': '%S',                      // Replaced by the seconds using the locale's alternative numeric symbols.
        '%Ou': '%u',                      // Replaced by the weekday as a number in the locale's alternative representation (Monday=1).
        '%OU': '%U',                      // Replaced by the week number of the year (Sunday as the first day of the week, rules corresponding to %U ) using the locale's alternative numeric symbols.
        '%OV': '%V',                      // Replaced by the week number of the year (Monday as the first day of the week, rules corresponding to %V ) using the locale's alternative numeric symbols.
        '%Ow': '%w',                      // Replaced by the number of the weekday (Sunday=0) using the locale's alternative numeric symbols.
        '%OW': '%W',                      // Replaced by the week number of the year (Monday as the first day of the week) using the locale's alternative numeric symbols.
        '%Oy': '%y',                      // Replaced by the year (offset from %C ) using the locale's alternative numeric symbols.
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
  
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
      function leadingSomething(value, digits, character) {
        var str = typeof value === 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      }
  
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      }
  
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        }
  
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      }
  
      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      }
  
      function getWeekBasedYear(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            } else {
              return thisDate.getFullYear();
            }
          } else {
            return thisDate.getFullYear()-1;
          }
      }
  
      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls((year/100)|0,2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year.
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes
          // January 4th, which is also the week that includes the first Thursday of the year, and
          // is also the first week that contains at least four days in the year.
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of
          // the last week of the preceding year; thus, for Saturday 2nd January 1999,
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th,
          // or 31st is a Monday, it and any following days are part of week 1 of the following year.
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
  
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          var twelveHour = date.tm_hour;
          if (twelveHour == 0) twelveHour = 12;
          else if (twelveHour > 12) twelveHour -= 12;
          return leadingNulls(twelveHour, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour >= 0 && date.tm_hour < 12) {
            return 'AM';
          } else {
            return 'PM';
          }
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          return date.tm_wday || 7;
        },
        '%U': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Sunday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year+1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7-janFirst.getDay());
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
  
          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstSundayUntilEndJanuary = 31-firstSunday.getDate();
            var days = firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
  
          return compareByDay(firstSunday, janFirst) === 0 ? '01': '00';
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week)
          // as a decimal number [01,53]. If the week containing 1 January has four
          // or more days in the new year, then it is considered week 1.
          // Otherwise, it is the last week of the previous year, and the next week is week 1.
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year+1900, 0, 4);
          var janFourthNextYear = new Date(date.tm_year+1901, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          var endDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return '53';
          }
  
          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return '01';
          }
  
          // given date is in between CW 01..53 of this calendar year
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date.tm_year+1900) {
            // first CW of this year starts last year
            daysDifference = date.tm_yday+32-firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday+1-firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference/7), 2);
        },
        '%w': function(date) {
          return date.tm_wday;
        },
        '%W': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Monday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7-janFirst.getDay()+1);
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
  
          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstMondayUntilEndJanuary = 31-firstMonday.getDate();
            var days = firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? '01': '00';
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ).
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich).
          var off = date.tm_gmtoff;
          var ahead = off >= 0;
          off = Math.abs(off) / 60;
          // convert from minutes into hhmm format (which means 60 minutes = 100 units)
          off = (off / 60)*100 + (off % 60);
          return (ahead ? '+' : '-') + String("0000" + off).slice(-4);
        },
        '%Z': function(date) {
          return date.tm_zone;
        },
        '%%': function() {
          return '%';
        }
      };
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
  
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
  
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }

  function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm); // no locale support yet
    }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return 16384;
        case 85:
          var maxHeapSize = 2147483648;
          return maxHeapSize / 16384;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
        case 79:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      setErrNo(28);
      return -1;
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _utime(path, times) {
      // int utime(const char *path, const struct utimbuf *times);
      // http://pubs.opengroup.org/onlinepubs/009695399/basedefs/utime.h.html
      var time;
      if (times) {
        // NOTE: We don't keep track of access timestamps.
        var offset = 4;
        time = HEAP32[(((times)+(offset))>>2)];
        time *= 1000;
      } else {
        time = Date.now();
      }
      path = UTF8ToString(path);
      try {
        FS.utime(path, time, time);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }

  function _utimes(path, times) {
      var time;
      if (times) {
        var offset = 8 + 0;
        time = HEAP32[(((times)+(offset))>>2)] * 1000;
        offset = 8 + 4;
        time += HEAP32[(((times)+(offset))>>2)] / 1000;
      } else {
        time = Date.now();
      }
      path = UTF8ToString(path);
      try {
        FS.utime(path, time, time);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }

  
  function _wait(stat_loc) {
      // pid_t wait(int *stat_loc);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/wait.html
      // Makes no sense in a single-process environment.
      setErrNo(12);
      return -1;
    }function _waitpid(a0
  ) {
  return _wait(a0);
  }

  
  var __readAsmConstArgsArray=[];function readAsmConstArgs(sigPtr, buf) {
      __readAsmConstArgsArray.length = 0;
      var ch;
      buf >>= 2; // Align buf up front to index Int32Array (HEAP32)
      while (ch = HEAPU8[sigPtr++]) {
        __readAsmConstArgsArray.push(ch < 105 ? HEAPF64[++buf >> 1] : HEAP32[buf]);
        ++buf;
      }
      return __readAsmConstArgsArray;
    }

var FSNode = /** @constructor */ function(parent, name, mode, rdev) {
    if (!parent) {
      parent = this;  // root node sets parent to itself
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
  };
  var readMode = 292/*292*/ | 73/*73*/;
  var writeMode = 146/*146*/;
  Object.defineProperties(FSNode.prototype, {
   read: {
    get: /** @this{FSNode} */function() {
     return (this.mode & readMode) === readMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= readMode : this.mode &= ~readMode;
    }
   },
   write: {
    get: /** @this{FSNode} */function() {
     return (this.mode & writeMode) === writeMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= writeMode : this.mode &= ~writeMode;
    }
   },
   isFolder: {
    get: /** @this{FSNode} */function() {
     return FS.isDir(this.mode);
    }
   },
   isDevice: {
    get: /** @this{FSNode} */function() {
     return FS.isChrdev(this.mode);
    }
   }
  });
  FS.FSNode = FSNode;
  FS.staticInit();Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;;
Module["requestFullscreen"] = function Module_requestFullscreen(lockPointer, resizeCanvas) { Browser.requestFullscreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) };
var GLctx;;
for (var i = 0; i < 32; ++i) __tempFixedLengthArray.push(new Array(i));;
var __miniTempWebGLFloatBuffersStorage = new Float32Array(288);
  for (/**@suppress{duplicate}*/var i = 0; i < 288; ++i) {
  __miniTempWebGLFloatBuffers[i] = __miniTempWebGLFloatBuffersStorage.subarray(0, i+1);
  }
  ;
var __miniTempWebGLIntBuffersStorage = new Int32Array(288);
  for (/**@suppress{duplicate}*/var i = 0; i < 288; ++i) {
  __miniTempWebGLIntBuffers[i] = __miniTempWebGLIntBuffersStorage.subarray(0, i+1);
  }
  ;
MONO.export_functions (Module);;
BINDING.export_functions (Module);;
var ASSERTIONS = false;



/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// ASM_LIBRARY EXTERN PRIMITIVES: Math_floor,Math_ceil

var asmGlobalArg = {};
var asmLibraryArg = { "__assert_fail": ___assert_fail, "__clock_gettime": ___clock_gettime, "__cxa_allocate_exception": ___cxa_allocate_exception, "__cxa_atexit": ___cxa_atexit, "__cxa_begin_catch": ___cxa_begin_catch, "__cxa_end_catch": ___cxa_end_catch, "__cxa_find_matching_catch_2": ___cxa_find_matching_catch_2, "__cxa_find_matching_catch_3": ___cxa_find_matching_catch_3, "__cxa_free_exception": ___cxa_free_exception, "__cxa_rethrow": ___cxa_rethrow, "__cxa_throw": ___cxa_throw, "__cxa_uncaught_exceptions": ___cxa_uncaught_exceptions, "__map_file": ___map_file, "__resumeException": ___resumeException, "__sys__newselect": ___sys__newselect, "__sys_access": ___sys_access, "__sys_chdir": ___sys_chdir, "__sys_chmod": ___sys_chmod, "__sys_dup": ___sys_dup, "__sys_dup2": ___sys_dup2, "__sys_fadvise64_64": ___sys_fadvise64_64, "__sys_fcntl64": ___sys_fcntl64, "__sys_fstat64": ___sys_fstat64, "__sys_ftruncate64": ___sys_ftruncate64, "__sys_getcwd": ___sys_getcwd, "__sys_getdents64": ___sys_getdents64, "__sys_getegid32": ___sys_getegid32, "__sys_geteuid32": ___sys_geteuid32, "__sys_getpid": ___sys_getpid, "__sys_getpriority": ___sys_getpriority, "__sys_getresuid32": ___sys_getresuid32, "__sys_getrusage": ___sys_getrusage, "__sys_getuid32": ___sys_getuid32, "__sys_ioctl": ___sys_ioctl, "__sys_lstat64": ___sys_lstat64, "__sys_mkdir": ___sys_mkdir, "__sys_mmap2": ___sys_mmap2, "__sys_msync": ___sys_msync, "__sys_munmap": ___sys_munmap, "__sys_open": ___sys_open, "__sys_pipe": ___sys_pipe, "__sys_poll": ___sys_poll, "__sys_pread64": ___sys_pread64, "__sys_read": ___sys_read, "__sys_readlink": ___sys_readlink, "__sys_rename": ___sys_rename, "__sys_rmdir": ___sys_rmdir, "__sys_setpriority": ___sys_setpriority, "__sys_socketcall": ___sys_socketcall, "__sys_stat64": ___sys_stat64, "__sys_statfs64": ___sys_statfs64, "__sys_uname": ___sys_uname, "__sys_unlink": ___sys_unlink, "_exit": __exit, "abort": _abort, "atexit": _atexit, "clock_getres": _clock_getres, "clock_gettime": _clock_gettime, "compile_function": compile_function, "eglGetCurrentDisplay": _eglGetCurrentDisplay, "eglGetProcAddress": _eglGetProcAddress, "eglQueryString": _eglQueryString, "emscripten_asm_const_iii": _emscripten_asm_const_iii, "emscripten_get_sbrk_ptr": _emscripten_get_sbrk_ptr, "emscripten_glActiveTexture": _emscripten_glActiveTexture, "emscripten_glAttachShader": _emscripten_glAttachShader, "emscripten_glBeginQueryEXT": _emscripten_glBeginQueryEXT, "emscripten_glBindAttribLocation": _emscripten_glBindAttribLocation, "emscripten_glBindBuffer": _emscripten_glBindBuffer, "emscripten_glBindFramebuffer": _emscripten_glBindFramebuffer, "emscripten_glBindRenderbuffer": _emscripten_glBindRenderbuffer, "emscripten_glBindTexture": _emscripten_glBindTexture, "emscripten_glBindVertexArrayOES": _emscripten_glBindVertexArrayOES, "emscripten_glBlendColor": _emscripten_glBlendColor, "emscripten_glBlendEquation": _emscripten_glBlendEquation, "emscripten_glBlendEquationSeparate": _emscripten_glBlendEquationSeparate, "emscripten_glBlendFunc": _emscripten_glBlendFunc, "emscripten_glBlendFuncSeparate": _emscripten_glBlendFuncSeparate, "emscripten_glBufferData": _emscripten_glBufferData, "emscripten_glBufferSubData": _emscripten_glBufferSubData, "emscripten_glCheckFramebufferStatus": _emscripten_glCheckFramebufferStatus, "emscripten_glClear": _emscripten_glClear, "emscripten_glClearColor": _emscripten_glClearColor, "emscripten_glClearDepthf": _emscripten_glClearDepthf, "emscripten_glClearStencil": _emscripten_glClearStencil, "emscripten_glColorMask": _emscripten_glColorMask, "emscripten_glCompileShader": _emscripten_glCompileShader, "emscripten_glCompressedTexImage2D": _emscripten_glCompressedTexImage2D, "emscripten_glCompressedTexSubImage2D": _emscripten_glCompressedTexSubImage2D, "emscripten_glCopyTexImage2D": _emscripten_glCopyTexImage2D, "emscripten_glCopyTexSubImage2D": _emscripten_glCopyTexSubImage2D, "emscripten_glCreateProgram": _emscripten_glCreateProgram, "emscripten_glCreateShader": _emscripten_glCreateShader, "emscripten_glCullFace": _emscripten_glCullFace, "emscripten_glDeleteBuffers": _emscripten_glDeleteBuffers, "emscripten_glDeleteFramebuffers": _emscripten_glDeleteFramebuffers, "emscripten_glDeleteProgram": _emscripten_glDeleteProgram, "emscripten_glDeleteQueriesEXT": _emscripten_glDeleteQueriesEXT, "emscripten_glDeleteRenderbuffers": _emscripten_glDeleteRenderbuffers, "emscripten_glDeleteShader": _emscripten_glDeleteShader, "emscripten_glDeleteTextures": _emscripten_glDeleteTextures, "emscripten_glDeleteVertexArraysOES": _emscripten_glDeleteVertexArraysOES, "emscripten_glDepthFunc": _emscripten_glDepthFunc, "emscripten_glDepthMask": _emscripten_glDepthMask, "emscripten_glDepthRangef": _emscripten_glDepthRangef, "emscripten_glDetachShader": _emscripten_glDetachShader, "emscripten_glDisable": _emscripten_glDisable, "emscripten_glDisableVertexAttribArray": _emscripten_glDisableVertexAttribArray, "emscripten_glDrawArrays": _emscripten_glDrawArrays, "emscripten_glDrawArraysInstancedANGLE": _emscripten_glDrawArraysInstancedANGLE, "emscripten_glDrawBuffersWEBGL": _emscripten_glDrawBuffersWEBGL, "emscripten_glDrawElements": _emscripten_glDrawElements, "emscripten_glDrawElementsInstancedANGLE": _emscripten_glDrawElementsInstancedANGLE, "emscripten_glEnable": _emscripten_glEnable, "emscripten_glEnableVertexAttribArray": _emscripten_glEnableVertexAttribArray, "emscripten_glEndQueryEXT": _emscripten_glEndQueryEXT, "emscripten_glFinish": _emscripten_glFinish, "emscripten_glFlush": _emscripten_glFlush, "emscripten_glFramebufferRenderbuffer": _emscripten_glFramebufferRenderbuffer, "emscripten_glFramebufferTexture2D": _emscripten_glFramebufferTexture2D, "emscripten_glFrontFace": _emscripten_glFrontFace, "emscripten_glGenBuffers": _emscripten_glGenBuffers, "emscripten_glGenFramebuffers": _emscripten_glGenFramebuffers, "emscripten_glGenQueriesEXT": _emscripten_glGenQueriesEXT, "emscripten_glGenRenderbuffers": _emscripten_glGenRenderbuffers, "emscripten_glGenTextures": _emscripten_glGenTextures, "emscripten_glGenVertexArraysOES": _emscripten_glGenVertexArraysOES, "emscripten_glGenerateMipmap": _emscripten_glGenerateMipmap, "emscripten_glGetActiveAttrib": _emscripten_glGetActiveAttrib, "emscripten_glGetActiveUniform": _emscripten_glGetActiveUniform, "emscripten_glGetAttachedShaders": _emscripten_glGetAttachedShaders, "emscripten_glGetAttribLocation": _emscripten_glGetAttribLocation, "emscripten_glGetBooleanv": _emscripten_glGetBooleanv, "emscripten_glGetBufferParameteriv": _emscripten_glGetBufferParameteriv, "emscripten_glGetError": _emscripten_glGetError, "emscripten_glGetFloatv": _emscripten_glGetFloatv, "emscripten_glGetFramebufferAttachmentParameteriv": _emscripten_glGetFramebufferAttachmentParameteriv, "emscripten_glGetIntegerv": _emscripten_glGetIntegerv, "emscripten_glGetProgramInfoLog": _emscripten_glGetProgramInfoLog, "emscripten_glGetProgramiv": _emscripten_glGetProgramiv, "emscripten_glGetQueryObjecti64vEXT": _emscripten_glGetQueryObjecti64vEXT, "emscripten_glGetQueryObjectivEXT": _emscripten_glGetQueryObjectivEXT, "emscripten_glGetQueryObjectui64vEXT": _emscripten_glGetQueryObjectui64vEXT, "emscripten_glGetQueryObjectuivEXT": _emscripten_glGetQueryObjectuivEXT, "emscripten_glGetQueryivEXT": _emscripten_glGetQueryivEXT, "emscripten_glGetRenderbufferParameteriv": _emscripten_glGetRenderbufferParameteriv, "emscripten_glGetShaderInfoLog": _emscripten_glGetShaderInfoLog, "emscripten_glGetShaderPrecisionFormat": _emscripten_glGetShaderPrecisionFormat, "emscripten_glGetShaderSource": _emscripten_glGetShaderSource, "emscripten_glGetShaderiv": _emscripten_glGetShaderiv, "emscripten_glGetString": _emscripten_glGetString, "emscripten_glGetTexParameterfv": _emscripten_glGetTexParameterfv, "emscripten_glGetTexParameteriv": _emscripten_glGetTexParameteriv, "emscripten_glGetUniformLocation": _emscripten_glGetUniformLocation, "emscripten_glGetUniformfv": _emscripten_glGetUniformfv, "emscripten_glGetUniformiv": _emscripten_glGetUniformiv, "emscripten_glGetVertexAttribPointerv": _emscripten_glGetVertexAttribPointerv, "emscripten_glGetVertexAttribfv": _emscripten_glGetVertexAttribfv, "emscripten_glGetVertexAttribiv": _emscripten_glGetVertexAttribiv, "emscripten_glHint": _emscripten_glHint, "emscripten_glIsBuffer": _emscripten_glIsBuffer, "emscripten_glIsEnabled": _emscripten_glIsEnabled, "emscripten_glIsFramebuffer": _emscripten_glIsFramebuffer, "emscripten_glIsProgram": _emscripten_glIsProgram, "emscripten_glIsQueryEXT": _emscripten_glIsQueryEXT, "emscripten_glIsRenderbuffer": _emscripten_glIsRenderbuffer, "emscripten_glIsShader": _emscripten_glIsShader, "emscripten_glIsTexture": _emscripten_glIsTexture, "emscripten_glIsVertexArrayOES": _emscripten_glIsVertexArrayOES, "emscripten_glLineWidth": _emscripten_glLineWidth, "emscripten_glLinkProgram": _emscripten_glLinkProgram, "emscripten_glPixelStorei": _emscripten_glPixelStorei, "emscripten_glPolygonOffset": _emscripten_glPolygonOffset, "emscripten_glQueryCounterEXT": _emscripten_glQueryCounterEXT, "emscripten_glReadPixels": _emscripten_glReadPixels, "emscripten_glReleaseShaderCompiler": _emscripten_glReleaseShaderCompiler, "emscripten_glRenderbufferStorage": _emscripten_glRenderbufferStorage, "emscripten_glSampleCoverage": _emscripten_glSampleCoverage, "emscripten_glScissor": _emscripten_glScissor, "emscripten_glShaderBinary": _emscripten_glShaderBinary, "emscripten_glShaderSource": _emscripten_glShaderSource, "emscripten_glStencilFunc": _emscripten_glStencilFunc, "emscripten_glStencilFuncSeparate": _emscripten_glStencilFuncSeparate, "emscripten_glStencilMask": _emscripten_glStencilMask, "emscripten_glStencilMaskSeparate": _emscripten_glStencilMaskSeparate, "emscripten_glStencilOp": _emscripten_glStencilOp, "emscripten_glStencilOpSeparate": _emscripten_glStencilOpSeparate, "emscripten_glTexImage2D": _emscripten_glTexImage2D, "emscripten_glTexParameterf": _emscripten_glTexParameterf, "emscripten_glTexParameterfv": _emscripten_glTexParameterfv, "emscripten_glTexParameteri": _emscripten_glTexParameteri, "emscripten_glTexParameteriv": _emscripten_glTexParameteriv, "emscripten_glTexSubImage2D": _emscripten_glTexSubImage2D, "emscripten_glUniform1f": _emscripten_glUniform1f, "emscripten_glUniform1fv": _emscripten_glUniform1fv, "emscripten_glUniform1i": _emscripten_glUniform1i, "emscripten_glUniform1iv": _emscripten_glUniform1iv, "emscripten_glUniform2f": _emscripten_glUniform2f, "emscripten_glUniform2fv": _emscripten_glUniform2fv, "emscripten_glUniform2i": _emscripten_glUniform2i, "emscripten_glUniform2iv": _emscripten_glUniform2iv, "emscripten_glUniform3f": _emscripten_glUniform3f, "emscripten_glUniform3fv": _emscripten_glUniform3fv, "emscripten_glUniform3i": _emscripten_glUniform3i, "emscripten_glUniform3iv": _emscripten_glUniform3iv, "emscripten_glUniform4f": _emscripten_glUniform4f, "emscripten_glUniform4fv": _emscripten_glUniform4fv, "emscripten_glUniform4i": _emscripten_glUniform4i, "emscripten_glUniform4iv": _emscripten_glUniform4iv, "emscripten_glUniformMatrix2fv": _emscripten_glUniformMatrix2fv, "emscripten_glUniformMatrix3fv": _emscripten_glUniformMatrix3fv, "emscripten_glUniformMatrix4fv": _emscripten_glUniformMatrix4fv, "emscripten_glUseProgram": _emscripten_glUseProgram, "emscripten_glValidateProgram": _emscripten_glValidateProgram, "emscripten_glVertexAttrib1f": _emscripten_glVertexAttrib1f, "emscripten_glVertexAttrib1fv": _emscripten_glVertexAttrib1fv, "emscripten_glVertexAttrib2f": _emscripten_glVertexAttrib2f, "emscripten_glVertexAttrib2fv": _emscripten_glVertexAttrib2fv, "emscripten_glVertexAttrib3f": _emscripten_glVertexAttrib3f, "emscripten_glVertexAttrib3fv": _emscripten_glVertexAttrib3fv, "emscripten_glVertexAttrib4f": _emscripten_glVertexAttrib4f, "emscripten_glVertexAttrib4fv": _emscripten_glVertexAttrib4fv, "emscripten_glVertexAttribDivisorANGLE": _emscripten_glVertexAttribDivisorANGLE, "emscripten_glVertexAttribPointer": _emscripten_glVertexAttribPointer, "emscripten_glViewport": _emscripten_glViewport, "emscripten_longjmp": _emscripten_longjmp, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap, "environ_get": _environ_get, "environ_sizes_get": _environ_sizes_get, "execve": _execve, "exit": _exit, "fd_close": _fd_close, "fd_fdstat_get": _fd_fdstat_get, "fd_read": _fd_read, "fd_seek": _fd_seek, "fd_sync": _fd_sync, "fd_write": _fd_write, "fork": _fork, "getTempRet0": _getTempRet0, "getaddrinfo": _getaddrinfo, "getgrgid_r": _getgrgid_r, "getgrnam_r": _getgrnam_r, "getnameinfo": _getnameinfo, "getprotobyname": _getprotobyname, "gettimeofday": _gettimeofday, "glActiveTexture": _glActiveTexture, "glAttachShader": _glAttachShader, "glBindAttribLocation": _glBindAttribLocation, "glBindBuffer": _glBindBuffer, "glBindFramebuffer": _glBindFramebuffer, "glBindRenderbuffer": _glBindRenderbuffer, "glBindTexture": _glBindTexture, "glBlendColor": _glBlendColor, "glBlendEquation": _glBlendEquation, "glBlendFunc": _glBlendFunc, "glBufferData": _glBufferData, "glBufferSubData": _glBufferSubData, "glCheckFramebufferStatus": _glCheckFramebufferStatus, "glClear": _glClear, "glClearColor": _glClearColor, "glClearStencil": _glClearStencil, "glColorMask": _glColorMask, "glCompileShader": _glCompileShader, "glCompressedTexImage2D": _glCompressedTexImage2D, "glCompressedTexSubImage2D": _glCompressedTexSubImage2D, "glCopyTexSubImage2D": _glCopyTexSubImage2D, "glCreateProgram": _glCreateProgram, "glCreateShader": _glCreateShader, "glCullFace": _glCullFace, "glDeleteBuffers": _glDeleteBuffers, "glDeleteFramebuffers": _glDeleteFramebuffers, "glDeleteProgram": _glDeleteProgram, "glDeleteRenderbuffers": _glDeleteRenderbuffers, "glDeleteShader": _glDeleteShader, "glDeleteTextures": _glDeleteTextures, "glDepthMask": _glDepthMask, "glDisable": _glDisable, "glDisableVertexAttribArray": _glDisableVertexAttribArray, "glDrawArrays": _glDrawArrays, "glDrawElements": _glDrawElements, "glEnable": _glEnable, "glEnableVertexAttribArray": _glEnableVertexAttribArray, "glFinish": _glFinish, "glFlush": _glFlush, "glFramebufferRenderbuffer": _glFramebufferRenderbuffer, "glFramebufferTexture2D": _glFramebufferTexture2D, "glFrontFace": _glFrontFace, "glGenBuffers": _glGenBuffers, "glGenFramebuffers": _glGenFramebuffers, "glGenRenderbuffers": _glGenRenderbuffers, "glGenTextures": _glGenTextures, "glGenerateMipmap": _glGenerateMipmap, "glGetBufferParameteriv": _glGetBufferParameteriv, "glGetError": _glGetError, "glGetFramebufferAttachmentParameteriv": _glGetFramebufferAttachmentParameteriv, "glGetIntegerv": _glGetIntegerv, "glGetProgramInfoLog": _glGetProgramInfoLog, "glGetProgramiv": _glGetProgramiv, "glGetRenderbufferParameteriv": _glGetRenderbufferParameteriv, "glGetShaderInfoLog": _glGetShaderInfoLog, "glGetShaderPrecisionFormat": _glGetShaderPrecisionFormat, "glGetShaderiv": _glGetShaderiv, "glGetString": _glGetString, "glGetUniformLocation": _glGetUniformLocation, "glIsTexture": _glIsTexture, "glLineWidth": _glLineWidth, "glLinkProgram": _glLinkProgram, "glPixelStorei": _glPixelStorei, "glReadPixels": _glReadPixels, "glRenderbufferStorage": _glRenderbufferStorage, "glScissor": _glScissor, "glShaderSource": _glShaderSource, "glStencilFunc": _glStencilFunc, "glStencilFuncSeparate": _glStencilFuncSeparate, "glStencilMask": _glStencilMask, "glStencilMaskSeparate": _glStencilMaskSeparate, "glStencilOp": _glStencilOp, "glStencilOpSeparate": _glStencilOpSeparate, "glTexImage2D": _glTexImage2D, "glTexParameterf": _glTexParameterf, "glTexParameterfv": _glTexParameterfv, "glTexParameteri": _glTexParameteri, "glTexParameteriv": _glTexParameteriv, "glTexSubImage2D": _glTexSubImage2D, "glUniform1f": _glUniform1f, "glUniform1fv": _glUniform1fv, "glUniform1i": _glUniform1i, "glUniform1iv": _glUniform1iv, "glUniform2f": _glUniform2f, "glUniform2fv": _glUniform2fv, "glUniform2i": _glUniform2i, "glUniform2iv": _glUniform2iv, "glUniform3f": _glUniform3f, "glUniform3fv": _glUniform3fv, "glUniform3i": _glUniform3i, "glUniform3iv": _glUniform3iv, "glUniform4f": _glUniform4f, "glUniform4fv": _glUniform4fv, "glUniform4i": _glUniform4i, "glUniform4iv": _glUniform4iv, "glUniformMatrix2fv": _glUniformMatrix2fv, "glUniformMatrix3fv": _glUniformMatrix3fv, "glUniformMatrix4fv": _glUniformMatrix4fv, "glUseProgram": _glUseProgram, "glVertexAttrib1f": _glVertexAttrib1f, "glVertexAttrib2fv": _glVertexAttrib2fv, "glVertexAttrib3fv": _glVertexAttrib3fv, "glVertexAttrib4fv": _glVertexAttrib4fv, "glVertexAttribPointer": _glVertexAttribPointer, "glViewport": _glViewport, "gmtime_r": _gmtime_r, "invoke_diii": invoke_diii, "invoke_fiii": invoke_fiii, "invoke_i": invoke_i, "invoke_ii": invoke_ii, "invoke_iii": invoke_iii, "invoke_iiii": invoke_iiii, "invoke_iiiii": invoke_iiiii, "invoke_iiiiid": invoke_iiiiid, "invoke_iiiiii": invoke_iiiiii, "invoke_iiiiiii": invoke_iiiiiii, "invoke_iiiiiiii": invoke_iiiiiiii, "invoke_iiiiiiiiii": invoke_iiiiiiiiii, "invoke_iiiiiiiiiii": invoke_iiiiiiiiiii, "invoke_iiiiiiiiiiii": invoke_iiiiiiiiiiii, "invoke_iiiiiiiiiiiii": invoke_iiiiiiiiiiiii, "invoke_iiiiij": invoke_iiiiij, "invoke_jii": invoke_jii, "invoke_jiiii": invoke_jiiii, "invoke_v": invoke_v, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_viii": invoke_viii, "invoke_viiii": invoke_viiii, "invoke_viiiii": invoke_viiiii, "invoke_viiiiii": invoke_viiiiii, "invoke_viiiiiii": invoke_viiiiiii, "invoke_viiiiiiiii": invoke_viiiiiiiii, "invoke_viiiiiiiiii": invoke_viiiiiiiiii, "invoke_viiiiiiiiiiiiiii": invoke_viiiiiiiiiiiiiii, "kill": _kill, "llvm_eh_typeid_for": _llvm_eh_typeid_for, "localtime_r": _localtime_r, "memory": wasmMemory, "mono_set_timeout": _mono_set_timeout, "mono_wasm_add_array_item": _mono_wasm_add_array_item, "mono_wasm_add_enum_var": _mono_wasm_add_enum_var, "mono_wasm_add_frame": _mono_wasm_add_frame, "mono_wasm_add_func_var": _mono_wasm_add_func_var, "mono_wasm_add_obj_var": _mono_wasm_add_obj_var, "mono_wasm_add_properties_var": _mono_wasm_add_properties_var, "mono_wasm_add_typed_value": _mono_wasm_add_typed_value, "mono_wasm_add_value_type_unexpanded_var": _mono_wasm_add_value_type_unexpanded_var, "mono_wasm_begin_value_type_var": _mono_wasm_begin_value_type_var, "mono_wasm_bind_core_object": _mono_wasm_bind_core_object, "mono_wasm_bind_host_object": _mono_wasm_bind_host_object, "mono_wasm_end_value_type_var": _mono_wasm_end_value_type_var, "mono_wasm_fire_bp": _mono_wasm_fire_bp, "mono_wasm_get_by_index": _mono_wasm_get_by_index, "mono_wasm_get_global_object": _mono_wasm_get_global_object, "mono_wasm_get_object_property": _mono_wasm_get_object_property, "mono_wasm_invoke_js_marshalled": _mono_wasm_invoke_js_marshalled, "mono_wasm_invoke_js_unmarshalled": _mono_wasm_invoke_js_unmarshalled, "mono_wasm_invoke_js_with_args": _mono_wasm_invoke_js_with_args, "mono_wasm_new": _mono_wasm_new, "mono_wasm_new_object": _mono_wasm_new_object, "mono_wasm_release_handle": _mono_wasm_release_handle, "mono_wasm_release_object": _mono_wasm_release_object, "mono_wasm_set_by_index": _mono_wasm_set_by_index, "mono_wasm_set_is_async_method": _mono_wasm_set_is_async_method, "mono_wasm_set_object_property": _mono_wasm_set_object_property, "mono_wasm_timezone_get_local_name": mono_wasm_timezone_get_local_name, "mono_wasm_typed_array_copy_from": _mono_wasm_typed_array_copy_from, "mono_wasm_typed_array_copy_to": _mono_wasm_typed_array_copy_to, "mono_wasm_typed_array_from": _mono_wasm_typed_array_from, "mono_wasm_typed_array_to_array": _mono_wasm_typed_array_to_array, "nanosleep": _nanosleep, "pthread_cleanup_pop": _pthread_cleanup_pop, "pthread_cleanup_push": _pthread_cleanup_push, "pthread_setcancelstate": _pthread_setcancelstate, "round": _round, "schedule_background_exec": _schedule_background_exec, "sem_destroy": _sem_destroy, "sem_init": _sem_init, "sem_post": _sem_post, "sem_trywait": _sem_trywait, "sem_wait": _sem_wait, "setTempRet0": _setTempRet0, "sigaction": _sigaction, "sigemptyset": _sigemptyset, "strftime": _strftime, "strftime_l": _strftime_l, "sysconf": _sysconf, "table": wasmTable, "time": _time, "utime": _utime, "utimes": _utimes, "waitpid": _waitpid };
var asm = createWasm();
/** @type {function(...*):?} */
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
  return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["__wasm_call_ctors"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_add_assembly = Module["_mono_wasm_add_assembly"] = function() {
  return (_mono_wasm_add_assembly = Module["_mono_wasm_add_assembly"] = Module["asm"]["mono_wasm_add_assembly"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_setenv = Module["_mono_wasm_setenv"] = function() {
  return (_mono_wasm_setenv = Module["_mono_wasm_setenv"] = Module["asm"]["mono_wasm_setenv"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _free = Module["_free"] = function() {
  return (_free = Module["_free"] = Module["asm"]["free"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_load_runtime = Module["_mono_wasm_load_runtime"] = function() {
  return (_mono_wasm_load_runtime = Module["_mono_wasm_load_runtime"] = Module["asm"]["mono_wasm_load_runtime"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_assembly_load = Module["_mono_wasm_assembly_load"] = function() {
  return (_mono_wasm_assembly_load = Module["_mono_wasm_assembly_load"] = Module["asm"]["mono_wasm_assembly_load"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_assembly_find_class = Module["_mono_wasm_assembly_find_class"] = function() {
  return (_mono_wasm_assembly_find_class = Module["_mono_wasm_assembly_find_class"] = Module["asm"]["mono_wasm_assembly_find_class"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_assembly_find_method = Module["_mono_wasm_assembly_find_method"] = function() {
  return (_mono_wasm_assembly_find_method = Module["_mono_wasm_assembly_find_method"] = Module["asm"]["mono_wasm_assembly_find_method"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_invoke_method = Module["_mono_wasm_invoke_method"] = function() {
  return (_mono_wasm_invoke_method = Module["_mono_wasm_invoke_method"] = Module["asm"]["mono_wasm_invoke_method"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_assembly_get_entry_point = Module["_mono_wasm_assembly_get_entry_point"] = function() {
  return (_mono_wasm_assembly_get_entry_point = Module["_mono_wasm_assembly_get_entry_point"] = Module["asm"]["mono_wasm_assembly_get_entry_point"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_string_get_utf8 = Module["_mono_wasm_string_get_utf8"] = function() {
  return (_mono_wasm_string_get_utf8 = Module["_mono_wasm_string_get_utf8"] = Module["asm"]["mono_wasm_string_get_utf8"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_string_convert = Module["_mono_wasm_string_convert"] = function() {
  return (_mono_wasm_string_convert = Module["_mono_wasm_string_convert"] = Module["asm"]["mono_wasm_string_convert"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_string_from_js = Module["_mono_wasm_string_from_js"] = function() {
  return (_mono_wasm_string_from_js = Module["_mono_wasm_string_from_js"] = Module["asm"]["mono_wasm_string_from_js"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_obj_type = Module["_mono_wasm_get_obj_type"] = function() {
  return (_mono_wasm_get_obj_type = Module["_mono_wasm_get_obj_type"] = Module["asm"]["mono_wasm_get_obj_type"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_unbox_int = Module["_mono_unbox_int"] = function() {
  return (_mono_unbox_int = Module["_mono_unbox_int"] = Module["asm"]["mono_unbox_int"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_unbox_float = Module["_mono_wasm_unbox_float"] = function() {
  return (_mono_wasm_unbox_float = Module["_mono_wasm_unbox_float"] = Module["asm"]["mono_wasm_unbox_float"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_array_length = Module["_mono_wasm_array_length"] = function() {
  return (_mono_wasm_array_length = Module["_mono_wasm_array_length"] = Module["asm"]["mono_wasm_array_length"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_array_get = Module["_mono_wasm_array_get"] = function() {
  return (_mono_wasm_array_get = Module["_mono_wasm_array_get"] = Module["asm"]["mono_wasm_array_get"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_obj_array_new = Module["_mono_wasm_obj_array_new"] = function() {
  return (_mono_wasm_obj_array_new = Module["_mono_wasm_obj_array_new"] = Module["asm"]["mono_wasm_obj_array_new"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_obj_array_set = Module["_mono_wasm_obj_array_set"] = function() {
  return (_mono_wasm_obj_array_set = Module["_mono_wasm_obj_array_set"] = Module["asm"]["mono_wasm_obj_array_set"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_string_array_new = Module["_mono_wasm_string_array_new"] = function() {
  return (_mono_wasm_string_array_new = Module["_mono_wasm_string_array_new"] = Module["asm"]["mono_wasm_string_array_new"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_exec_regression = Module["_mono_wasm_exec_regression"] = function() {
  return (_mono_wasm_exec_regression = Module["_mono_wasm_exec_regression"] = Module["asm"]["mono_wasm_exec_regression"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_exit = Module["_mono_wasm_exit"] = function() {
  return (_mono_wasm_exit = Module["_mono_wasm_exit"] = Module["asm"]["mono_wasm_exit"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_set_main_args = Module["_mono_wasm_set_main_args"] = function() {
  return (_mono_wasm_set_main_args = Module["_mono_wasm_set_main_args"] = Module["asm"]["mono_wasm_set_main_args"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_strdup = Module["_mono_wasm_strdup"] = function() {
  return (_mono_wasm_strdup = Module["_mono_wasm_strdup"] = Module["asm"]["mono_wasm_strdup"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_parse_runtime_options = Module["_mono_wasm_parse_runtime_options"] = function() {
  return (_mono_wasm_parse_runtime_options = Module["_mono_wasm_parse_runtime_options"] = Module["asm"]["mono_wasm_parse_runtime_options"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_enable_on_demand_gc = Module["_mono_wasm_enable_on_demand_gc"] = function() {
  return (_mono_wasm_enable_on_demand_gc = Module["_mono_wasm_enable_on_demand_gc"] = Module["asm"]["mono_wasm_enable_on_demand_gc"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _malloc = Module["_malloc"] = function() {
  return (_malloc = Module["_malloc"] = Module["asm"]["malloc"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_typed_array_new = Module["_mono_wasm_typed_array_new"] = function() {
  return (_mono_wasm_typed_array_new = Module["_mono_wasm_typed_array_new"] = Module["asm"]["mono_wasm_typed_array_new"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_unbox_enum = Module["_mono_wasm_unbox_enum"] = function() {
  return (_mono_wasm_unbox_enum = Module["_mono_wasm_unbox_enum"] = Module["asm"]["mono_wasm_unbox_enum"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _memset = Module["_memset"] = function() {
  return (_memset = Module["_memset"] = Module["asm"]["memset"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _strstr = Module["_strstr"] = function() {
  return (_strstr = Module["_strstr"] = Module["asm"]["strstr"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _realloc = Module["_realloc"] = function() {
  return (_realloc = Module["_realloc"] = Module["asm"]["realloc"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _testSetjmp = Module["_testSetjmp"] = function() {
  return (_testSetjmp = Module["_testSetjmp"] = Module["asm"]["testSetjmp"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _saveSetjmp = Module["_saveSetjmp"] = function() {
  return (_saveSetjmp = Module["_saveSetjmp"] = Module["asm"]["saveSetjmp"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var ___errno_location = Module["___errno_location"] = function() {
  return (___errno_location = Module["___errno_location"] = Module["asm"]["__errno_location"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_print_method_from_ip = Module["_mono_print_method_from_ip"] = function() {
  return (_mono_print_method_from_ip = Module["_mono_print_method_from_ip"] = Module["asm"]["mono_print_method_from_ip"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_setup_single_step = Module["_mono_wasm_setup_single_step"] = function() {
  return (_mono_wasm_setup_single_step = Module["_mono_wasm_setup_single_step"] = Module["asm"]["mono_wasm_setup_single_step"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_clear_all_breakpoints = Module["_mono_wasm_clear_all_breakpoints"] = function() {
  return (_mono_wasm_clear_all_breakpoints = Module["_mono_wasm_clear_all_breakpoints"] = Module["asm"]["mono_wasm_clear_all_breakpoints"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_set_breakpoint = Module["_mono_wasm_set_breakpoint"] = function() {
  return (_mono_wasm_set_breakpoint = Module["_mono_wasm_set_breakpoint"] = Module["asm"]["mono_wasm_set_breakpoint"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_remove_breakpoint = Module["_mono_wasm_remove_breakpoint"] = function() {
  return (_mono_wasm_remove_breakpoint = Module["_mono_wasm_remove_breakpoint"] = Module["asm"]["mono_wasm_remove_breakpoint"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_current_bp_id = Module["_mono_wasm_current_bp_id"] = function() {
  return (_mono_wasm_current_bp_id = Module["_mono_wasm_current_bp_id"] = Module["asm"]["mono_wasm_current_bp_id"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_enum_frames = Module["_mono_wasm_enum_frames"] = function() {
  return (_mono_wasm_enum_frames = Module["_mono_wasm_enum_frames"] = Module["asm"]["mono_wasm_enum_frames"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_deref_ptr_value = Module["_mono_wasm_get_deref_ptr_value"] = function() {
  return (_mono_wasm_get_deref_ptr_value = Module["_mono_wasm_get_deref_ptr_value"] = Module["asm"]["mono_wasm_get_deref_ptr_value"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_var_info = Module["_mono_wasm_get_var_info"] = function() {
  return (_mono_wasm_get_var_info = Module["_mono_wasm_get_var_info"] = Module["asm"]["mono_wasm_get_var_info"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_object_properties = Module["_mono_wasm_get_object_properties"] = function() {
  return (_mono_wasm_get_object_properties = Module["_mono_wasm_get_object_properties"] = Module["asm"]["mono_wasm_get_object_properties"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_array_values = Module["_mono_wasm_get_array_values"] = function() {
  return (_mono_wasm_get_array_values = Module["_mono_wasm_get_array_values"] = Module["asm"]["mono_wasm_get_array_values"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_get_array_value_expanded = Module["_mono_wasm_get_array_value_expanded"] = function() {
  return (_mono_wasm_get_array_value_expanded = Module["_mono_wasm_get_array_value_expanded"] = Module["asm"]["mono_wasm_get_array_value_expanded"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_wasm_invoke_getter_on_object = Module["_mono_wasm_invoke_getter_on_object"] = function() {
  return (_mono_wasm_invoke_getter_on_object = Module["_mono_wasm_invoke_getter_on_object"] = Module["asm"]["mono_wasm_invoke_getter_on_object"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_set_timeout_exec = Module["_mono_set_timeout_exec"] = function() {
  return (_mono_set_timeout_exec = Module["_mono_set_timeout_exec"] = Module["asm"]["mono_set_timeout_exec"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _mono_background_exec = Module["_mono_background_exec"] = function() {
  return (_mono_background_exec = Module["_mono_background_exec"] = Module["asm"]["mono_background_exec"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _htonl = Module["_htonl"] = function() {
  return (_htonl = Module["_htonl"] = Module["asm"]["htonl"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _htons = Module["_htons"] = function() {
  return (_htons = Module["_htons"] = Module["asm"]["htons"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _ntohs = Module["_ntohs"] = function() {
  return (_ntohs = Module["_ntohs"] = Module["asm"]["ntohs"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_GetProcAddress = Module["_emscripten_GetProcAddress"] = function() {
  return (_emscripten_GetProcAddress = Module["_emscripten_GetProcAddress"] = Module["asm"]["emscripten_GetProcAddress"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __get_tzname = Module["__get_tzname"] = function() {
  return (__get_tzname = Module["__get_tzname"] = Module["asm"]["_get_tzname"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __get_daylight = Module["__get_daylight"] = function() {
  return (__get_daylight = Module["__get_daylight"] = Module["asm"]["_get_daylight"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __get_timezone = Module["__get_timezone"] = function() {
  return (__get_timezone = Module["__get_timezone"] = Module["asm"]["_get_timezone"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _setThrew = Module["_setThrew"] = function() {
  return (_setThrew = Module["_setThrew"] = Module["asm"]["setThrew"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var stackSave = Module["stackSave"] = function() {
  return (stackSave = Module["stackSave"] = Module["asm"]["stackSave"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var stackRestore = Module["stackRestore"] = function() {
  return (stackRestore = Module["stackRestore"] = Module["asm"]["stackRestore"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var stackAlloc = Module["stackAlloc"] = function() {
  return (stackAlloc = Module["stackAlloc"] = Module["asm"]["stackAlloc"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = function() {
  return (__ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = Module["asm"]["_ZSt18uncaught_exceptionv"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var ___cxa_can_catch = Module["___cxa_can_catch"] = function() {
  return (___cxa_can_catch = Module["___cxa_can_catch"] = Module["asm"]["__cxa_can_catch"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = function() {
  return (___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = Module["asm"]["__cxa_is_pointer_type"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _memalign = Module["_memalign"] = function() {
  return (_memalign = Module["_memalign"] = Module["asm"]["memalign"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_main_thread_process_queued_calls = Module["_emscripten_main_thread_process_queued_calls"] = function() {
  return (_emscripten_main_thread_process_queued_calls = Module["_emscripten_main_thread_process_queued_calls"] = Module["asm"]["emscripten_main_thread_process_queued_calls"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_v = Module["dynCall_v"] = function() {
  return (dynCall_v = Module["dynCall_v"] = Module["asm"]["dynCall_v"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vi = Module["dynCall_vi"] = function() {
  return (dynCall_vi = Module["dynCall_vi"] = Module["asm"]["dynCall_vi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vii = Module["dynCall_vii"] = function() {
  return (dynCall_vii = Module["dynCall_vii"] = Module["asm"]["dynCall_vii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viii = Module["dynCall_viii"] = function() {
  return (dynCall_viii = Module["dynCall_viii"] = Module["asm"]["dynCall_viii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiii = Module["dynCall_viiii"] = function() {
  return (dynCall_viiii = Module["dynCall_viiii"] = Module["asm"]["dynCall_viiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiii = Module["dynCall_viiiii"] = function() {
  return (dynCall_viiiii = Module["dynCall_viiiii"] = Module["asm"]["dynCall_viiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {
  return (dynCall_viiiiii = Module["dynCall_viiiiii"] = Module["asm"]["dynCall_viiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = function() {
  return (dynCall_viiiiiii = Module["dynCall_viiiiiii"] = Module["asm"]["dynCall_viiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = function() {
  return (dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiiiiii = Module["dynCall_viiiiiiiiii"] = function() {
  return (dynCall_viiiiiiiiii = Module["dynCall_viiiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiiiiiiiiiii = Module["dynCall_viiiiiiiiiiiiiii"] = function() {
  return (dynCall_viiiiiiiiiiiiiii = Module["dynCall_viiiiiiiiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_i = Module["dynCall_i"] = function() {
  return (dynCall_i = Module["dynCall_i"] = Module["asm"]["dynCall_i"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ii = Module["dynCall_ii"] = function() {
  return (dynCall_ii = Module["dynCall_ii"] = Module["asm"]["dynCall_ii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iii = Module["dynCall_iii"] = function() {
  return (dynCall_iii = Module["dynCall_iii"] = Module["asm"]["dynCall_iii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiii = Module["dynCall_iiii"] = function() {
  return (dynCall_iiii = Module["dynCall_iiii"] = Module["asm"]["dynCall_iiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiii = Module["dynCall_iiiii"] = function() {
  return (dynCall_iiiii = Module["dynCall_iiiii"] = Module["asm"]["dynCall_iiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiii = Module["dynCall_iiiiii"] = function() {
  return (dynCall_iiiiii = Module["dynCall_iiiiii"] = Module["asm"]["dynCall_iiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = function() {
  return (dynCall_iiiiiii = Module["dynCall_iiiiiii"] = Module["asm"]["dynCall_iiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = function() {
  return (dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = Module["asm"]["dynCall_iiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = function() {
  return (dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiiiiii = Module["dynCall_iiiiiiiiiii"] = function() {
  return (dynCall_iiiiiiiiiii = Module["dynCall_iiiiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiiiiiii = Module["dynCall_iiiiiiiiiiii"] = function() {
  return (dynCall_iiiiiiiiiiii = Module["dynCall_iiiiiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiiiiiiii = Module["dynCall_iiiiiiiiiiiii"] = function() {
  return (dynCall_iiiiiiiiiiiii = Module["dynCall_iiiiiiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiij = Module["dynCall_iiiiij"] = function() {
  return (dynCall_iiiiij = Module["dynCall_iiiiij"] = Module["asm"]["dynCall_iiiiij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiid = Module["dynCall_iiiiid"] = function() {
  return (dynCall_iiiiid = Module["dynCall_iiiiid"] = Module["asm"]["dynCall_iiiiid"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jii = Module["dynCall_jii"] = function() {
  return (dynCall_jii = Module["dynCall_jii"] = Module["asm"]["dynCall_jii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jiiii = Module["dynCall_jiiii"] = function() {
  return (dynCall_jiiii = Module["dynCall_jiiii"] = Module["asm"]["dynCall_jiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fiii = Module["dynCall_fiii"] = function() {
  return (dynCall_fiii = Module["dynCall_fiii"] = Module["asm"]["dynCall_fiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_diii = Module["dynCall_diii"] = function() {
  return (dynCall_diii = Module["dynCall_diii"] = Module["asm"]["dynCall_diii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __growWasmMemory = Module["__growWasmMemory"] = function() {
  return (__growWasmMemory = Module["__growWasmMemory"] = Module["asm"]["__growWasmMemory"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiffi = Module["dynCall_viiffi"] = function() {
  return (dynCall_viiffi = Module["dynCall_viiffi"] = Module["asm"]["dynCall_viiffi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vif = Module["dynCall_vif"] = function() {
  return (dynCall_vif = Module["dynCall_vif"] = Module["asm"]["dynCall_vif"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viff = Module["dynCall_viff"] = function() {
  return (dynCall_viff = Module["dynCall_viff"] = Module["asm"]["dynCall_viff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fi = Module["dynCall_fi"] = function() {
  return (dynCall_fi = Module["dynCall_fi"] = Module["asm"]["dynCall_fi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fiiiiii = Module["dynCall_fiiiiii"] = function() {
  return (dynCall_fiiiiii = Module["dynCall_fiiiiii"] = Module["asm"]["dynCall_fiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiij = Module["dynCall_viiiiij"] = function() {
  return (dynCall_viiiiij = Module["dynCall_viiiiij"] = Module["asm"]["dynCall_viiiiij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = function() {
  return (dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jiiiijiiiii = Module["dynCall_jiiiijiiiii"] = function() {
  return (dynCall_jiiiijiiiii = Module["dynCall_jiiiijiiiii"] = Module["asm"]["dynCall_jiiiijiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiij = Module["dynCall_viiij"] = function() {
  return (dynCall_viiij = Module["dynCall_viiij"] = Module["asm"]["dynCall_viiij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vji = Module["dynCall_vji"] = function() {
  return (dynCall_vji = Module["dynCall_vji"] = Module["asm"]["dynCall_vji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vijii = Module["dynCall_vijii"] = function() {
  return (dynCall_vijii = Module["dynCall_vijii"] = Module["asm"]["dynCall_vijii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiffii = Module["dynCall_viiffii"] = function() {
  return (dynCall_viiffii = Module["dynCall_viiffii"] = Module["asm"]["dynCall_viiffii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = function() {
  return (dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = Module["asm"]["dynCall_viiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viifi = Module["dynCall_viifi"] = function() {
  return (dynCall_viifi = Module["dynCall_viifi"] = Module["asm"]["dynCall_viifi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_dii = Module["dynCall_dii"] = function() {
  return (dynCall_dii = Module["dynCall_dii"] = Module["asm"]["dynCall_dii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fii = Module["dynCall_fii"] = function() {
  return (dynCall_fii = Module["dynCall_fii"] = Module["asm"]["dynCall_fii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viid = Module["dynCall_viid"] = function() {
  return (dynCall_viid = Module["dynCall_viid"] = Module["asm"]["dynCall_viid"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viddi = Module["dynCall_viddi"] = function() {
  return (dynCall_viddi = Module["dynCall_viddi"] = Module["asm"]["dynCall_viddi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiffi = Module["dynCall_viiiiffi"] = function() {
  return (dynCall_viiiiffi = Module["dynCall_viiiiffi"] = Module["asm"]["dynCall_viiiiffi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiff = Module["dynCall_viiiiff"] = function() {
  return (dynCall_viiiiff = Module["dynCall_viiiiff"] = Module["asm"]["dynCall_viiiiff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iidi = Module["dynCall_iidi"] = function() {
  return (dynCall_iidi = Module["dynCall_iidi"] = Module["asm"]["dynCall_iidi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_diiii = Module["dynCall_diiii"] = function() {
  return (dynCall_diiii = Module["dynCall_diiii"] = Module["asm"]["dynCall_diiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_diiiiiiii = Module["dynCall_diiiiiiii"] = function() {
  return (dynCall_diiiiiiii = Module["dynCall_diiiiiiii"] = Module["asm"]["dynCall_diiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viijii = Module["dynCall_viijii"] = function() {
  return (dynCall_viijii = Module["dynCall_viijii"] = Module["asm"]["dynCall_viijii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viffff = Module["dynCall_viffff"] = function() {
  return (dynCall_viffff = Module["dynCall_viffff"] = Module["asm"]["dynCall_viffff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiif = Module["dynCall_viiif"] = function() {
  return (dynCall_viiif = Module["dynCall_viiif"] = Module["asm"]["dynCall_viiif"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viif = Module["dynCall_viif"] = function() {
  return (dynCall_viif = Module["dynCall_viif"] = Module["asm"]["dynCall_viif"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiff = Module["dynCall_viiff"] = function() {
  return (dynCall_viiff = Module["dynCall_viiff"] = Module["asm"]["dynCall_viiff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viifff = Module["dynCall_viifff"] = function() {
  return (dynCall_viifff = Module["dynCall_viifff"] = Module["asm"]["dynCall_viifff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiffff = Module["dynCall_viiffff"] = function() {
  return (dynCall_viiffff = Module["dynCall_viiffff"] = Module["asm"]["dynCall_viiffff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiiiiiii = Module["dynCall_viiiiiiiiiii"] = function() {
  return (dynCall_viiiiiiiiiii = Module["dynCall_viiiiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiij = Module["dynCall_iiiij"] = function() {
  return (dynCall_iiiij = Module["dynCall_iiiij"] = Module["asm"]["dynCall_iiiij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vffff = Module["dynCall_vffff"] = function() {
  return (dynCall_vffff = Module["dynCall_vffff"] = Module["asm"]["dynCall_vffff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vf = Module["dynCall_vf"] = function() {
  return (dynCall_vf = Module["dynCall_vf"] = Module["asm"]["dynCall_vf"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vifff = Module["dynCall_vifff"] = function() {
  return (dynCall_vifff = Module["dynCall_vifff"] = Module["asm"]["dynCall_vifff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vifii = Module["dynCall_vifii"] = function() {
  return (dynCall_vifii = Module["dynCall_vifii"] = Module["asm"]["dynCall_vifii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viifd = Module["dynCall_viifd"] = function() {
  return (dynCall_viifd = Module["dynCall_viifd"] = Module["asm"]["dynCall_viifd"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jiii = Module["dynCall_jiii"] = function() {
  return (dynCall_jiii = Module["dynCall_jiii"] = Module["asm"]["dynCall_jiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiffi = Module["dynCall_iiffi"] = function() {
  return (dynCall_iiffi = Module["dynCall_iiffi"] = Module["asm"]["dynCall_iiffi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fiff = Module["dynCall_fiff"] = function() {
  return (dynCall_fiff = Module["dynCall_fiff"] = Module["asm"]["dynCall_fiff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ji = Module["dynCall_ji"] = function() {
  return (dynCall_ji = Module["dynCall_ji"] = Module["asm"]["dynCall_ji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iijj = Module["dynCall_iijj"] = function() {
  return (dynCall_iijj = Module["dynCall_iijj"] = Module["asm"]["dynCall_iijj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vij = Module["dynCall_vij"] = function() {
  return (dynCall_vij = Module["dynCall_vij"] = Module["asm"]["dynCall_vij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viji = Module["dynCall_viji"] = function() {
  return (dynCall_viji = Module["dynCall_viji"] = Module["asm"]["dynCall_viji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vijiii = Module["dynCall_vijiii"] = function() {
  return (dynCall_vijiii = Module["dynCall_vijiii"] = Module["asm"]["dynCall_vijiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viffi = Module["dynCall_viffi"] = function() {
  return (dynCall_viffi = Module["dynCall_viffi"] = Module["asm"]["dynCall_viffi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viiiiiffii = Module["dynCall_viiiiiffii"] = function() {
  return (dynCall_viiiiiffii = Module["dynCall_viiiiiffii"] = Module["asm"]["dynCall_viiiiiffii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_di = Module["dynCall_di"] = function() {
  return (dynCall_di = Module["dynCall_di"] = Module["asm"]["dynCall_di"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_idiii = Module["dynCall_idiii"] = function() {
  return (dynCall_idiii = Module["dynCall_idiii"] = Module["asm"]["dynCall_idiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vijj = Module["dynCall_vijj"] = function() {
  return (dynCall_vijj = Module["dynCall_vijj"] = Module["asm"]["dynCall_vijj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_j = Module["dynCall_j"] = function() {
  return (dynCall_j = Module["dynCall_j"] = Module["asm"]["dynCall_j"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jiij = Module["dynCall_jiij"] = function() {
  return (dynCall_jiij = Module["dynCall_jiij"] = Module["asm"]["dynCall_jiij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iij = Module["dynCall_iij"] = function() {
  return (dynCall_iij = Module["dynCall_iij"] = Module["asm"]["dynCall_iij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vj = Module["dynCall_vj"] = function() {
  return (dynCall_vj = Module["dynCall_vj"] = Module["asm"]["dynCall_vj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iijiiii = Module["dynCall_iijiiii"] = function() {
  return (dynCall_iijiiii = Module["dynCall_iijiiii"] = Module["asm"]["dynCall_iijiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vijji = Module["dynCall_vijji"] = function() {
  return (dynCall_vijji = Module["dynCall_vijji"] = Module["asm"]["dynCall_vijji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jijii = Module["dynCall_jijii"] = function() {
  return (dynCall_jijii = Module["dynCall_jijii"] = Module["asm"]["dynCall_jijii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iijjji = Module["dynCall_iijjji"] = function() {
  return (dynCall_iijjji = Module["dynCall_iijjji"] = Module["asm"]["dynCall_iijjji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiji = Module["dynCall_iiji"] = function() {
  return (dynCall_iiji = Module["dynCall_iiji"] = Module["asm"]["dynCall_iiji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_dd = Module["dynCall_dd"] = function() {
  return (dynCall_dd = Module["dynCall_dd"] = Module["asm"]["dynCall_dd"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ff = Module["dynCall_ff"] = function() {
  return (dynCall_ff = Module["dynCall_ff"] = Module["asm"]["dynCall_ff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ddd = Module["dynCall_ddd"] = function() {
  return (dynCall_ddd = Module["dynCall_ddd"] = Module["asm"]["dynCall_ddd"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ddi = Module["dynCall_ddi"] = function() {
  return (dynCall_ddi = Module["dynCall_ddi"] = Module["asm"]["dynCall_ddi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fff = Module["dynCall_fff"] = function() {
  return (dynCall_fff = Module["dynCall_fff"] = Module["asm"]["dynCall_fff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_ffi = Module["dynCall_ffi"] = function() {
  return (dynCall_ffi = Module["dynCall_ffi"] = Module["asm"]["dynCall_ffi"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_viidiii = Module["dynCall_viidiii"] = function() {
  return (dynCall_viidiii = Module["dynCall_viidiii"] = Module["asm"]["dynCall_viidiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jij = Module["dynCall_jij"] = function() {
  return (dynCall_jij = Module["dynCall_jij"] = Module["asm"]["dynCall_jij"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_didd = Module["dynCall_didd"] = function() {
  return (dynCall_didd = Module["dynCall_didd"] = Module["asm"]["dynCall_didd"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jijj = Module["dynCall_jijj"] = function() {
  return (dynCall_jijj = Module["dynCall_jijj"] = Module["asm"]["dynCall_jijj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_did = Module["dynCall_did"] = function() {
  return (dynCall_did = Module["dynCall_did"] = Module["asm"]["dynCall_did"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_fif = Module["dynCall_fif"] = function() {
  return (dynCall_fif = Module["dynCall_fif"] = Module["asm"]["dynCall_fif"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vid = Module["dynCall_vid"] = function() {
  return (dynCall_vid = Module["dynCall_vid"] = Module["asm"]["dynCall_vid"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jd = Module["dynCall_jd"] = function() {
  return (dynCall_jd = Module["dynCall_jd"] = Module["asm"]["dynCall_jd"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jf = Module["dynCall_jf"] = function() {
  return (dynCall_jf = Module["dynCall_jf"] = Module["asm"]["dynCall_jf"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_id = Module["dynCall_id"] = function() {
  return (dynCall_id = Module["dynCall_id"] = Module["asm"]["dynCall_id"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_if = Module["dynCall_if"] = function() {
  return (dynCall_if = Module["dynCall_if"] = Module["asm"]["dynCall_if"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_d = Module["dynCall_d"] = function() {
  return (dynCall_d = Module["dynCall_d"] = Module["asm"]["dynCall_d"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_jiji = Module["dynCall_jiji"] = function() {
  return (dynCall_jiji = Module["dynCall_jiji"] = Module["asm"]["dynCall_jiji"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {
  return (dynCall_iidiiii = Module["dynCall_iidiiii"] = Module["asm"]["dynCall_iidiiii"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = function() {
  return (dynCall_iiiiijj = Module["dynCall_iiiiijj"] = Module["asm"]["dynCall_iiiiijj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = function() {
  return (dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = Module["asm"]["dynCall_iiiiiijj"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vff = Module["dynCall_vff"] = function() {
  return (dynCall_vff = Module["dynCall_vff"] = Module["asm"]["dynCall_vff"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var dynCall_vfi = Module["dynCall_vfi"] = function() {
  return (dynCall_vfi = Module["dynCall_vfi"] = Module["asm"]["dynCall_vfi"]).apply(null, arguments);
};


function invoke_viiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    dynCall_viiii(index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  var sp = stackSave();
  try {
    return dynCall_iii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return dynCall_iiiii(index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    dynCall_viii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index,a1) {
  var sp = stackSave();
  try {
    return dynCall_ii(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return dynCall_iiii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_vi(index,a1) {
  var sp = stackSave();
  try {
    dynCall_vi(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiii(index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    dynCall_v(index);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return dynCall_iiiiii(index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    dynCall_viiiiii(index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    dynCall_viiiii(index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_i(index) {
  var sp = stackSave();
  try {
    return dynCall_i(index);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiid(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return dynCall_iiiiid(index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_fiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return dynCall_fiii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_diii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return dynCall_diii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  var sp = stackSave();
  try {
    dynCall_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_jii(index,a1,a2) {
  var sp = stackSave();
  try {
    return dynCall_jii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiij(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return dynCall_iiiiij(index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}

function invoke_jiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return dynCall_jiiii(index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0 && e !== 'longjmp') throw e;
    _setThrew(1, 0);
  }
}




// === Auto-generated postamble setup entry stuff ===




Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
Module["setValue"] = setValue;
Module["getValue"] = getValue;

Module["getMemory"] = getMemory;

Module["UTF8ToString"] = UTF8ToString;












Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;







Module["addFunction"] = addFunction;



































































































var calledRun;

/**
 * @constructor
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}

var calledMain = false;


dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};





/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();


    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}
Module['run'] = run;


/** @param {boolean|number=} implicit */
function exit(status, implicit) {

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && noExitRuntime && status === 0) {
    return;
  }

  if (noExitRuntime) {
  } else {

    ABORT = true;
    EXITSTATUS = status;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  quit_(status, new ExitStatus(status));
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


  noExitRuntime = true;

run();






// {{MODULE_ADDITIONS}}



