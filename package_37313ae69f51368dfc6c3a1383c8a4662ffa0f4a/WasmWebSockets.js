define([""], () => {
});

class ActiveSocket {
    constructor(handle, socket) {
        this.handle = handle;
        this.socket = socket;
    }
}

var WebSocketInterop = {

    activeSockets: {},
    debug: false,

    connect: function (handle, url) {
        this.ensureInitialized();

        if (this.debug) console.log("WebSocketInterop: connect " + url);

        var webSocket = new WebSocket(url);
        webSocket.binaryType = "arraybuffer";

        webSocket.onopen = function () {
            if (this.debug) console.log(`Socket is opened [${webSocket.protocol}] ${WebSocketInterop.dispatchConnectedMethod}`);

            WebSocketInterop.dispatchConnectedMethod(String(handle), webSocket.protocol);
        };

        webSocket.onerror = function (evt) {
            WebSocketInterop.dispatchErrorMethod(String(handle), String(evt.error));
        };

        webSocket.onclose = function (evt) {
            WebSocketInterop.dispatchClosedMethod(String(handle), webSocket.readyState);
        };

        webSocket.onmessage = function (evt) {
            var msg = evt.data;

            if (msg instanceof ArrayBuffer) {
                if (this.debug) console.log(`Received ArrayBuffer`);

                if (msg !== null) {
                    var arraySize = msg.byteLength;

                    if (this.debug) console.log(`Result: ${msg} / ${arraySize}`);

                    var ptr = Module._malloc(arraySize);
                    try {
                        writeArrayToMemory(new Int8Array(msg), ptr);

                        WebSocketInterop.dispatchReceivedBinaryMethod(String(handle), ptr, arraySize);
                    }
                    finally {
                        Module._free(ptr);
                    }
                }
                else {
                    if (this.debug) console.error(`empty arraybuffer ? ${msg}`);
                }
            }
            else {
                if (this.debug) console.log(`Received message ${msg}`);
            }
        };

        this.activeSockets[handle] = new ActiveSocket(handle, webSocket);
    },

    close: function (handle, code, statusDescription) {
        this.getActiveSocket(handle).close(code, statusDescription);

        delete this.activeSockets[handle];
    },

    send: function (handle, pData, count, offset) {
        var data = new ArrayBuffer(count);
        var bytes = new Int8Array(data);

        for (var i = 0; i < count; i++) {
            bytes[i] = Module.HEAPU8[pData + i + offset];
        }

        this.activeSockets[handle].socket.send(data);
    },

    getActiveSocket: function (handle) {

        var activeSocket = this.activeSockets[handle];

        if (activeSocket === null) {
            throw `Unknown WasmWebSocket instance ${handle}`;
        }

        return activeSocket.socket;
    },

    ensureInitialized: function () {

        WebSocketInterop.dispatchConnectedMethod = Module.mono_bind_static_method("[Uno.Wasm.WebSockets] Uno.Wasm.WebSockets.WasmWebSocket:DispatchConnected");
        WebSocketInterop.dispatchErrorMethod = Module.mono_bind_static_method("[Uno.Wasm.WebSockets] Uno.Wasm.WebSockets.WasmWebSocket:DispatchError");
        WebSocketInterop.dispatchReceivedBinaryMethod = Module.mono_bind_static_method("[Uno.Wasm.WebSockets] Uno.Wasm.WebSockets.WasmWebSocket:DispatchReceivedBinary");
        WebSocketInterop.dispatchClosedMethod = Module.mono_bind_static_method("[Uno.Wasm.WebSockets] Uno.Wasm.WebSockets.WasmWebSocket:DispatchClosed");
    }
};