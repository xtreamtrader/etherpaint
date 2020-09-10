'use strict';

class PaperClient {
    constructor(client_id) {
        this.client_id = client_id;
        // this.increment_events = [];

        //current svg element we're building/modfiying
        this.current_element = undefined;

        //create cursor
        this.cursor_svg = paper.scratch_svg.group();
        this.cursor_svg.path('M-10,0 L10,0 M0,-10 L0,10').stroke('black');
        this.cursor_svg.text("client " + client_id);

    }


    //store latest cursor postion
    cursorEvent(cursor_event) {
        this.cursor_event = cursor_event;
    }

    // //enqueue all draw increments.
    // drawIncrementEvent(draw_increment) {
    //     this.increment_events.push(draw_increment);
    // }

    animateCursor() {
        this.cursor_svg.transform({
            translateX: this.cursor_event.x(),
            translateY: this.cursor_event.y()
        });
    }

    //use all collected data to do svg drawing actions
    drawIncrement(type, p1, p2, p3) {
        switch (type) {
            case event.IncrementalType.SelectDrawType:
                this.drawtype = p1;
                break;
            case event.IncrementalType.PointerStart:
                switch (this.drawtype) {
                    case event.DrawType.PolyLine:
                        this.current_element = paper.scratch_svg.polyline([[p1,p2]]);
                        this.current_element.stroke('black').fill('none');

                        // this.current_points=document.querySelector("#"+this.current_element.id).points;
                        break;
                    default:
                        break;
                }
                break;
            case event.IncrementalType.PointerMove:
                if (this.current_element) {

                    switch (this.drawtype) {
                        case event.DrawType.PolyLine:
                            let p = paper.scratch_svg.node.createSVGPoint();
                            p.x = p1;
                            p.y = p2;
                            this.current_element.node.points.appendItem(p);

                            break;
                        default:
                            break;
                    }
                }
                break;


            default:
                break;
        }


    }
}
