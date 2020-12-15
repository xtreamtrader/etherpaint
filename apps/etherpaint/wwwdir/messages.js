'use strict';

import {event} from "./messages_generated.js";

//m (messages)
var m = {};
export {m};

//fixed builder we reuse every time we send a message
m.builder = new flatbuffers.Builder(1);

//clear buffers, start new message.
m.start_message = function () {
    m.builder.clear();
    m.event_types = [];
    m.event_offsets = [];
}

m.is_empty = function () {
    return (m.event_types.length == 0);
}

//add event to message we're building. (you'll have to use m.builder directly in the create...() functions)
m.add_event = function (event_type, event_offset) {
    m.event_types.push(event_type);
    m.event_offsets.push(event_offset);
}

//contructs final message from collected events and sends it.
m.send = function () {
    m.builder.finish(
        event.Message.createMessage(
            m.builder,
            event.Message.createEventsTypeVector(m.builder, m.event_types),
            event.Message.createEventsVector(m.builder, m.event_offsets)
        )
    );

    let msgArray = m.builder.asUint8Array();
    m.ws.send(msgArray);

    // //handle local echo?
    // //server echoed altijd je eigen spul terug, ivm server performance. er word 1 message gemaakt en naar iedereen gestuurd zodat er geen extra kopien zijn
    // if (echo)
    //     m.callHandlers(msgArray);

    m.start_message();
}


m.log = function (txt) {
    console.debug("messages.js: " + txt);
}

m.handlers = [];

m.delayed_restart = function () {
    setTimeout(m.restart, 1000);
}


m.start = function (connectcb) {
    m.connectcb = connectcb;
    m.start_message();
    m.restart();
}

m.restart = function () {
    if (!"WebSocket" in window) {
        alert("WebSockets NOT supported by your Browser!");
        return;
    }

    var ws_url;
    if (location.protocol === 'http:') {
        ws_url = "ws://" + location.host + "/ws";
    } else {
        ws_url = "wss://" + location.host + "/ws";

    }
    m.log("Connecting to " + ws_url);

    m.ws = new WebSocket(ws_url);
    m.ws.binaryType = 'arraybuffer';

    // connected
    m.ws.onopen = function () {
        m.log("Connected");
        m.connectcb();
    };

    // receive websocket messages.
    m.ws.onmessage = function (wsEvent) {
        let msgArray = new Uint8Array(wsEvent.data);
        m.callHandlers(msgArray);
    }

    m.callHandlers = function (msgArray) {
        let byteBuffer = new flatbuffers.ByteBuffer(msgArray);
        let msg = event.Message.getRootAsMessage(byteBuffer);

        let events_length = msg.eventsLength();

        for (let event_index = 0; event_index < events_length; event_index++) {
            let handler = m.handlers[msg.eventsType(event_index)];
            if (handler) {
                handler(msg, event_index);
            } else {
                m.log("Handler not found: " + event.EventUnionName[msg.eventsType(event_index)]);
            }
        }
    };


    m.ws.onerror = function (evt) {
        m.log('Connection error');
    };

    m.ws.onclose = function (evt) {
        m.log('Disconnected, reconnecting.');
        m.delayed_restart();
    };

}

