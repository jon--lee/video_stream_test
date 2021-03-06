const DEFAULT_LINE_WIDTH = 4;
const ERASER_LINE_WIDTH = 30;
const BOX_LINE_WIDTH = 0;
var lineWidth = DEFAULT_LINE_WIDTH;          //default value
var lineColor = '#00000'    //default value
var boxMode = false;
const ERASE = "destination-out";  //constant, do not change
const DRAW = "source-over";       //constant, do not change
var composite = DRAW;

//makes it so that all images are resizable
var maxSelectorIndex = 200;
setImageUI();

function setImageUI()
{
    $('.image').resizable({
    containment: "#imageContainer",
    start: function(event, ui){
        //console.log("started resizing");
        maxSelectorIndex++;
        $(this).parent().css("z-index", maxSelectorIndex.toString());
    },
    stop: function(event, ui){
        console.log("stopped resizing");    //should send info via websocket now
        sendImageCoordsDims($("img", this));
    }
});

$('.draggableHelper').draggable({
    containment: '#imageContainer',
    start: function(){
        //console.log("Start dragging");
        maxSelectorIndex++;
        $(this).css("z-index", maxSelectorIndex.toString());
    },
    stop: function(){
        console.log("stop dragging");       //should send info via websocket now
        sendImageCoordsDims($("img", this));
    }
});
}



function sendImageCoordsDims(img)
{
    helper = img.parent().parent();
    id = img.attr("id");
    x = helper.css("left");
    y = helper.css("top");
    w = img.css("width");
    h = img.css("height");
    console.log("sending: " + id);
    socket.emit("sendImageCoordsDims", room, id, x, y, w, h);
}

socket.on("sendImageCoordsDims", function(id, x, y, w, h){
    console.log("receiving: " + id);
    img = $("#" + id);
    setImageCoordsDims(img, x, y, w, h);
});

function setImageCoordsDims(img, x, y, w, h)
{
    helper = img.parent().parent();
    helper.css("left", x);
    helper.css("top", y);
    obj = img;
    for (i = 0; i < 3; i++){
        obj.css("width", w);
        obj.css("height", h);
        obj = obj.parent();
    }
}


//http://jqueryui.com/draggable/#events for reading stops and starts and drags
//recommend that when sending info via websocket, only send the stops, or else too much info would jam up the channel

//*consider a delay when the user is drawing before sending the info to the other user as there may be lag when continuously sending information.
//experiments proved the lag to be negligible.

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

var isDown = false;
var coords = {x: -1, y: -1};

//imageContainer.css("width", canvasContent.width() + "px");
//imageContainer.css("height", canvasContent.height() + "px");
/*$(window).resize(function(){
    canvas.width = canvasContent.width();
    canvas.height = canvasContent.height();
});*/

var context = canvas.getContext("2d");
resetContext();

/*context.beginPath();
context.moveTo(100, 150);
context.lineTo(450, 50);
context.lineWidth = defaultLineWidth;
context.lineCap = 'round';
context.stroke();*/

socket.on("test", function(){
    //console.log("received some test from server");
});

socket.on("updateDims", function(dims){
    hideImages();
    canvas.width = dims.w;
    canvas.height = dims.h;
    contenxt = canvas.getContext("2d");
    
});

socket.on('sendAction', function (json){
    //console.log("receiving paint");
    var temp = JSON.parse(json);
    console.log(temp["style"]);
    var drawing;
    if(temp["style"] == "line")
    {    
        drawing = new Line(context, temp["startPos"], temp["endPos"], temp["lineColor"], temp["lineWidth"], temp["composite"]);
        drawing.drawSelf();
    }
    else if(temp["style"] == "rect")
    {
        drawing = new Rect(context, temp["startPos"], temp["dims"], temp["lineColor"], temp["lineWidth"], temp["composite"]);
        drawing.drawSelf();
    }
    else if(temp["style"] == "newImage")
    {
        //create a new image with info
        makeImageHelper(temp["url"], temp["id"]);
    }
    else if(temp["style"] == "image")
    {
        //edit the images dims and coords
        var img = $("#" + temp["id"]);
        setImageCoordsDims(img, temp["x"], temp["y"], temp["w"], temp["h"]);
    }
    resetContext();
    /*var drawing = JSON.parse(drawingJSON);
    context.beginPath();
    context.strokeStyle = drawing["lineColor"];
    context.lineWidth = drawing["lineWidth"];
    context.globalCompositeOperation = drawing["composite"];
    context.moveTo(drawing["startPos"].x, drawing["startPos"].y);
    context.lineTo(drawing["endPos"].x, drawing["endPos"].y);
    context.stroke();
    resetContext();*/
});


socket.on('sendImage', function(imageJSON){
   var image = JSON.parse(imageJSON);
    
});

//MUST BE OFF THE SELECTOR TO DO ANY OF THESE FUNCTIONS

canvas.addEventListener('mousemove', mouseMove);

canvas.addEventListener('mouseup', mouseUp);

canvas.addEventListener('mouseout', mouseOut);

canvas.addEventListener('mousedown', mouseDown);

function mouseMove(evt)
{
    if(isDown && !onSelector && !boxMode){
        var newCoords = getMousePos(canvas, evt);
        /*context.beginPath();
        context.moveTo(coords.x, coords.y);
        context.lineTo(newCoords.x, newCoords.y);
        context.stroke();
        var drawing = {
            "startPos": coords,
            "endPos": newCoords,
            "lineColor": lineColor,
            "lineWidth": lineWidth,
            "composite": composite
        };
        var drawingJSON = JSON.stringify(drawing);*/
        var drawing = new Line(context, coords, newCoords, lineColor, lineWidth, composite);
        drawing.drawSelf();
        var json = drawing.toJSON();
        //console.log(JSON.stringify(drawing));
        socket.emit("sendPaint", room, json);
        //console.log("sending paint");
        coords = newCoords;
    }
    if(boxMode && isDown && !onSelector)
    {
        //show the box
        $('#cursor').css('display', 'block');
        var newCoords = getMousePos(canvas, evt);
        var startPos = {};
        startPos.x = coords.x;
        startPos.y = coords.y;
        if(newCoords.x < coords.x)
        {
            startPos.x = newCoords.x;
        }
        if(newCoords.y < coords.y)
        {
            startPos.y = newCoords.y;
        }
        var dims = {w: Math.abs(coords.x - newCoords.x), h: Math.abs(coords.y - newCoords.y)};
        $('#cursor').height(dims.h);
        $('#cursor').width(dims.w);
        $('#cursor').css({left: startPos.x + "px", top: startPos.y + "px"});
    }
}
function mouseOut(evt){
    if(!boxMode){
        mouseUp(evt);
    }
}
function mouseUp(evt)
{
    isDown = false;
    if(boxMode)
    {
        $('#cursor').css('display', 'none');
        //use the area as an eraser
        var newCoords = getMousePos(canvas, evt);
        var startPos = {};
        startPos.x = coords.x;
        startPos.y = coords.y;
        if(newCoords.x < coords.x)
        {
            startPos.x = newCoords.x;
        }
        if(newCoords.y < coords.y)
        {
            startPos.y = newCoords.y;
        }
        var dims = {w: Math.abs(coords.x - newCoords.x), h: Math.abs(coords.y - newCoords.y)};
        /*context.beginPath();
        context.rect(startPos.x, startPos.y, dims.w, dims.h);
        context.fillStyle = "rgba(0,0,0,1)";
        context.fill();
        context.stroke();*/
        var rect = new Rect(context, startPos, dims, lineColor, 0, composite);
        rect.drawSelf();
        var json = rect.toJSON();
        socket.emit("sendPaint", room, json);
    }
}

function mouseDown(evt)
{
    isDown = true;
    coords = getMousePos(canvas, evt);
}


$('#colorList li').on("click", function(e){
    //console.log("LIST ITEM CLICKED");
    if($(this).attr("id") == "eraserButton")
    {
        boxMode = false;
        //console.log("eraser clicked");
        lineColor = "rgba(0,0,0,1)";
        lineWidth = ERASER_LINE_WIDTH;
        composite = ERASE;
        
    }
    else if($(this).attr("id") == "boxEraserButton")
    {
        boxMode = true;
        lineColor = "rgba(0,0,0,1)";
        lineWidth = BOX_LINE_WIDTH;
        composite = ERASE;
    }
    else
    {
        boxMode = false;
        lineColor = $(this).css("background-color");
        lineWidth = DEFAULT_LINE_WIDTH;
        composite = DRAW;
        //console.log("line color: " + lineColor);
    }
    resetContext();
    togglePencilOptions();
});




//erase everything on the canvas (including images)
//must also reset the context stuff

$('#clearButton').click(function(){
    //console.log("clear pressed");
    showPopup($('#clearConfirmPopup'));
});

$('#clearConfirmPopup button').click(function(){
    hidePopup($('#clearConfirmPopup'));
});

$('#clearConfirmButton').click(function(){
    //clear logs
    socket.emit("clearLogs", room);
    canvas.width = canvas.width;
    resetContext();
    hideImages();
});

$( "#black" ).trigger( "click" );
togglePencilOptions();

function resetContext()
{
    //context = canvas.getContext('2d');
    context.strokeStyle = lineColor;
    //console.log("RESETTING strokestyle: " + context.strokeStyle + " and color: " + lineColor);
    context.lineWidth = lineWidth;
    context.globalCompositeOperation = composite;
    context.lineCap = 'round';
}
//images are merely hidden from the view, should inquire whether or not this affects performance to have stagnant "images" still on the page.
function hideImages()
{
    $('#imageContainer div').hide(0);
    $('#imageContainer img').attr("id", "dead");
    
}


////////////END CANVAS SETUP CODE///////////////////