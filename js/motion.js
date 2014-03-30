(function() {
    var demoMode = true;

	function hasGetUserMedia() {
		// Note: Opera builds are unprefixed.
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}

	if (hasGetUserMedia()) {
		$("#info").hide();
		$("#message").show();
	} else {
		$("#info").show();
		$("#message").hide();
		$("#video-demo").show();
		$("#video-demo")[0].play();
		return;
	}

	var webcamError = function(e) {
		alert('Webcam error!', e);
	};

	var video = $('#webcam')[0];

	if (navigator.getUserMedia) {
		navigator.getUserMedia({audio: false, video: true}, function(stream) {
			video.src = stream;
			initialize();
		}, webcamError);
	} else if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia({audio: false, video: true}, function(stream) {
			video.src = window.webkitURL.createObjectURL(stream);
			initialize();
		}, webcamError);
	} else {
		//video.src = 'somevideo.webm'; // fallback.
	}

	var AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		null
	);

	var notesPos = [0, 82, 159, 238, 313, 390, 468, 544];
    
	var timeOut, lastImageData;
	var canvasSource = $("#canvas-source")[0];
	var canvasBlended = $("#canvas-blended")[0];

	var contextSource = canvasSource.getContext('2d');
	var contextBlended = canvasBlended.getContext('2d');

	var soundContext;
	var bufferLoader;
	var notes = [];

    var menus = [];
    
	// mirror video
	contextSource.translate(canvasSource.width, 0);
	contextSource.scale(-1, 1);

	var c = 5;

	function initialize() {
		;
        finishedLoading();
	}

	function finishedLoading() {
        addMenu('#menu1', 0, 120);
        addMenu('#menu2', 570, 120);
        addMenu('#menu3', 0, 320);
        addMenu('#menu4', 570, 320);
        
        function addMenu(menu_id, left, top) {   
            var elem = $(menu_id);
            
            menus.push({
                    ready: true, 
                    visual: $(menu_id), 
                    area: {
                        x: left,
                        y: top,
                        width: elem.width(),
                        height: elem.height()
                    }
                });
        }
		start();
	}

    var blendFramesCount = demoMode? 30 : 6;
    var blendFramesMultiplier = demoMode? 0.1 : 0.4;
    var blendFramesCur = -1;
    var blendFrames = [];
    var blendedData;

	function start() {
		$(canvasSource).show();
		$(canvasBlended).show();
		// $(".xylo").show();
        // menu options
        if (!demoMode) {
            $(".swipeMenu").show();
        }
		$("#message").hide();
		$("#description").show();
		update();
	}

	function update() {
		drawVideo();
		blend();
		checkAreas();
		timeOut = setTimeout(update, 1000/60);
	}

	function drawVideo() {
		contextSource.drawImage(video, 0, 0, video.width, video.height);
	}

	function blend() {
		var width = canvasSource.width;
		var height = canvasSource.height;
        if (!blendedData) {
            blendedData = contextSource.createImageData(width, height)
        }

		var sourceData = contextSource.getImageData(0, 0, width, height);

		// create an image if the previous image doesn’t exist
		if (!lastImageData) {
            lastImageData = contextSource.getImageData(0, 0, width, height);
        }

        var blendFramesNext = (blendFramesCur + 1) % blendFramesCount;
        var deadImageData = blendFrames[blendFramesNext];
        if (!deadImageData) {
            deadImageData = contextSource.getImageData(0, 0, width, height);
            blendFrames[blendFramesNext] = deadImageData;
        }

		// create a ImageData instance to receive the blended result
		// blend the 2 images
		differenceAccuracy(
            blendedData.data,
            sourceData.data,
            lastImageData.data,
            deadImageData.data,
            blendFramesMultiplier
        );

        blendFramesCur = blendFramesNext;

		// draw the result in a canvas
        if (demoMode) {
            contextSource.putImageData(blendedData, 0, 0);
        } else {
            contextBlended.putImageData(blendedData, 0, 0);
        }
		// store the current webcam image
		lastImageData = sourceData;
	}

	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}

	function difference(target, data1, data2) {
		// blend mode difference
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			target[4*i] = data1[4*i] == 0 ? 0 : fastAbs(data1[4*i] - data2[4*i]);
			target[4*i+1] = data1[4*i+1] == 0 ? 0 : fastAbs(data1[4*i+1] - data2[4*i+1]);
			target[4*i+2] = data1[4*i+2] == 0 ? 0 : fastAbs(data1[4*i+2] - data2[4*i+2]);
			target[4*i+3] = 0xFF;
			++i;
		}
	}

    function fastcap(x) {
        return (
            x < 0? 0 :
            x > 0xFF? 0xFF :
            x
        );
    }

	function differenceAccuracy(target, data1, data2, toRemove, multiplier) {
        var high = parseInt(0xFF * multiplier);
		if (data1.length != data2.length) return null;
        var x;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			var average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
			var average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
			var diff = (fastAbs(average1 - average2) > 0x10)? 0xFF : 0;
            var incr = diff && high;
			x = 4*i;   target[x] = toRemove[x] = fastcap(target[x] + incr - toRemove[x]);
			x = 4*i+1; target[x] = toRemove[x] = fastcap(target[x] + incr - toRemove[x]);
			x = 4*i+2; target[x] = toRemove[x] = fastcap(target[x] + incr - toRemove[x]);
			x = 4*i+3; target[x] = toRemove[x] = 0xFF;
			++i;
		}
	}

	function checkAreas() {
        for (var r = 0; r < menus.length; r++) {
            var blendedData = contextBlended.getImageData(menus[r].area.x, menus[r].area.y, menus[r].area.width, menus[r].area.height);
			var i = 0;
			var average = 0;
			// loop over the pixels
			while (i < (blendedData.data.length * 0.25)) {
				// make an average between the color channel
				average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
				++i;
			}
			// calculate an average
			average = Math.round(average / (blendedData.data.length * 0.25));
			var elem = $(menus[r].visual);
            if (average > 10) {
				elem.css('background', 'black');
				// elem.fadeOut();
			}else {
                elem.css('background', 'white');
            }
        }
	}
})();
