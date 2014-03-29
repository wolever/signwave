
function right() {
    console.log('right');
}

function left() {
    console.log('left');
}

$(document).ready(function() {

    $("body").bind("webcamSwipeLeft", left);
    $("body").bind("webcamSwipeRight", right);

    window.initializeWebcamSwiper();

});

