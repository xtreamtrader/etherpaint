'use strict';

//actual paper handling stuff. sends/receives events and reads/writes to SVG

var paper = {};


paper.start = function (viewer_element, paper_element, scratch_element) {

    paper.viewer_element = viewer_element;
    paper.paper_element = paper_element;
    paper.scratch_element = scratch_element;

    paper.viewer_svg = SVG(viewer_element);
    paper.paper_svg = SVG(paper_element);
    paper.scratch_svg = SVG(scratch_element);

    paper.paper_svg.text("Work in progress - het is stuk :)").attr('font-size', '200%');

    paper.clients = {};
    paper.changed_clients= new Set();

    //paper.setZoom(1);

    //start frame timer
    paper.onAnimationFrame();

}


//send join to server
paper.join = function (id) {
    m.add_event(
        event.EventUnion.Join,
        event.Join.createJoin(
            m.builder,
            m.builder.createString(id)
        ));

    m.send();
}


//server tells us we are joined to a new session.
m.handlers[event.EventUnion.Join] = function (msg, event_index) {
    const join = msg.events(event_index, new event.Join());
    console.log("Joined shared session", join.id(), "as client", join.clientId());
    paper.client_id = join.clientId();
    paper.clients = {};
    paper.increments=[];
    paper.decrements=[];
    paper.increment_index=0;

}


//update cursor info (onFrameTimer will send it when its time)
paper.sendCursor = function (x, y) {

    if (paper.cursor_x != x || paper.cursor_y != y) {
        paper.cursor_x = x;
        paper.cursor_y = y;
        paper.cursor_moved = true;

    }
}

paper.sendDrawIncrement = function (type, p1, p2, p3) {
    m.add_event(
        event.EventUnion.DrawIncrement,
        event.DrawIncrement.createDrawIncrement(
            m.builder,
            paper.client_id,
            type,
            p1,
            p2,
            p3
        ));
}

//find or create PaperClient
paper.getClient = function (client_id) {
    let client = paper.clients[client_id];
    if (!client)
        client = paper.clients[client_id] = new PaperClient(client_id);

    return (client);

}

//received an incremental draw
m.handlers[event.EventUnion.DrawIncrement] = function (msg, event_index) {
    const draw_increment_event = msg.events(event_index, new event.DrawIncrement());
    const client_id = draw_increment_event.clientId();

    // const client=paper.getClient(client_id);
    paper.increments.push([
        client_id,
        draw_increment_event.type(),
        draw_increment_event.p1(),
        draw_increment_event.p2(),
        draw_increment_event.p3(),
    ]);

    // client.drawIncrementEvent(draw_increment);
    // paper.changed_clients.add(client);

}


paper.drawIncrements = function(index)
{
    while(paper.increment_index<=index)
    {
        const increment=paper.increments[paper.increment_index];
        const client=paper.getClient(increment[0]);
        client.drawIncrement(increment[1], increment[2], increment[3], increment[4]);
        paper.increment_index++;
    }
}


//draw data and send collected data
// paper.cursors = {};
// paper.cursor_events = {};
// paper.cursor_changed_clients = new Set();
paper.onAnimationFrame = function () {


    //only if we are connected
    if (!m.ws || m.ws.readyState != 1) {
        window.requestAnimationFrame(paper.onAnimationFrame);
        return;
    }

    //DRAW stuff

    //let all changed clients do their incremental draw and cursor stuff:
    for(const client of paper.changed_clients)
    {
        client.animateCursor();
    }
    paper.changed_clients.clear();

    paper.drawIncrements(paper.increments.length-1);



    //SEND stuff
    //buffer empty enough?
    //todo: some kind of smarter throttling
    if (m.ws && m.ws.bufferedAmount == 0 ) {
        //anything to send at all?
        if (paper.cursor_moved || !m.is_empty()) {

            if (paper.cursor_moved) {
                //add latest cursor event
                m.add_event(
                    event.EventUnion.Cursor,
                    event.Cursor.createCursor(
                        m.builder,
                        paper.client_id,
                        paper.cursor_x,
                        paper.cursor_y,
                    ))
                paper.cursor_moved = false;
            }


            m.send();
        }
    }


    window.requestAnimationFrame(paper.onAnimationFrame);
    // setTimeout(paper.onA)
}


//received a cursor event.
//only store/replace it to handle performance issues gracefully. (e.g. skip updates instead of queue them)
m.handlers[event.EventUnion.Cursor] = (msg, event_index) => {
    const cursor_event = msg.events(event_index, new event.Cursor());
    const client_id = cursor_event.clientId();

    // paper.cursor_events[client_id] = cursor_event;
    // paper.cursor_changed_clients.add(client_id);
    const client=paper.getClient(client_id);
    client.cursorEvent(cursor_event);
    paper.changed_clients.add(client);



}


paper.setZoom = function (factor) {

    const paper_size = 6500;

    paper.viewer_element.style.height = (paper_size * factor) + "px";
    paper.viewer_element.style.width = (paper_size * factor) + "px";
    paper.viewer_svg.viewbox(0, 0, paper_size, paper_size);

}

