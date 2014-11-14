$(document).ready(function() {
	//setup everything

	buildSlider(); // builds the slider
	addTemperature(); // adds the temperature div to the slider handle

	//start updating
	liveUpdate();


});

var order = ['2898120803000009','281EF307030000DC','282A02080300001C','28C9FD070300003F','28A3330803000029','28BE3E08030000D4','28882F080300003A','28D31108030000CA','28CD8A2603000020','28D70E0803000005','28FF0D080300005C','28E92308030000EF','28772B0803000073','28BDBD260300006D','285B29080300003B','2880F107030000FD','28C50C08030000B3','284C3608030000F6','28DFEE07030000E4','285E37080300000E','28AF1B0803000092','28BD3608030000B3','28340F08030000B8','280C120803000064','28501C0803000095','28670C0803000081','286516080300002E','2802040803000097','28C90308030000A1','28934008030000E7'];
var slideVal = 10;
var sliderSize = order.length;
var currentData = [];
var readings = [];
var uid = Math.floor(Math.random()*999999);

function parseCsv(str) {
	// this is from Trevor Dixon's http://jsfiddle.net/vHKYH/
    var arr = [];
    var quote = false;
	// cc = current char, nc = next char
    for (var row = col = c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }

        arr[row][col] += cc;
    }
    return arr;
}

function liveUpdate() {
	uid++;

	// var fetch = $.ajax('latest.csv?' + uid, {
	// 	cache: false,
	// 	timeout: 15000
	// });

	var fetch = $.ajax( "https://finlay.jcu.io/feed/federation.csv", {
		dataType: 'jsonp', // use JSONP
		jsonp: 'jsonp',    // specify the callback using '?jsonp=[callback]'
		cache: false,      // don't cache (jQuery's default for JSONP anyway)
		timeout: 15000     // give it 15 seconds before giving up
	});

	fetch.done(function(data) {
		var parsed = parseCsv(data);
		if (parsed) {
			// got good clean CSV data, now strip the unnecessary stuff
			var roundedTemp, time, thisRow, goodRows = [];
			for (var row = 0; row < parsed.length; row++) {
				thisRow = parsed[row];
				if (thisRow[0] == "Time") continue; // skip any title row
				time = parseInt(thisRow[0], 10);
				// add a proper data row
				// round off the temp to one decimal place (ignoring rounding errors..)
				roundedTemp = Math.round((parseFloat(thisRow[2]) * 10)) / 10;
				goodRows.push([ thisRow[1], roundedTemp ]);
			}

			if (goodRows.length > 0) {
				setData(sortData(goodRows)); // not supplying time arg
			}
		}
	});
	fetch.always( function() { setTimeout(liveUpdate, 10000); });

}

function buildSlider() {
	$('#slider').slider({
		orientation: 'vertical',
		max: sliderSize,
		min: 1,
		step:1,
		value:slideVal,
		slide: function(event, ui) {
			if (ui.value <= sliderSize) {
				updateSliderThumb(sliderSize - ui.value);
			} else {
				return false;
			}
		},
		stop: function(event, ui) {
			updateSliderThumb();
		}
	});
}

function updateSliderThumb(index) {
	index = index || sliderSize - $("#slider").slider("value");
	if (currentData && currentData[index]) {
		setTemperature(currentData[index][1]);
		setSliderColor(index);
	}
}

//sets the current data for the slider color and temperature
function setData(data, time) {
	if (data != undefined) {

		//get gradient step
		step = (100 / data.length);
		i = 1;

		//get max and min
		maxMin = getMaxMin(data);

		//set current data
		currentData = data;

		//update sensor count
		sensorCount = data.length;

		//show time
		//showTime(time);

		//build colors
		var colors = '';
		var steps = '';
		var size = 100 / data.length;

		$.each(data, function(key,val) {
			// colors = colors + getColor(val[1], maxMin) +" "+ Math.round(i*step) + '%,';
			steps = steps + '<div class="sliderStep" style="height:' + size + '%; width:100%; background-color:' + getColor(val[1], maxMin) + ';"></div>';
			i++;
		});

		colors = colors.slice(0, -1)
		// $('#slider').css("background","-moz-linear-gradient(top, "+colors+")");
		$('#innerSlider').html(steps);

		updateSliderThumb();
	}
}

function getColor(value, m) {
	min = m[0]-1;
	max = m[1]+1;
	value = value - min;
	mult = 255/(max-min);
	red = Math.round(value * mult);
	blue = Math.round(255-(value*mult));

	return 'rgba(' + red + ',50,' + blue + ',1)';
}

//set color of slider handle
function setSliderColor(value) {
	value += 1;
	col = $('#innerSlider .sliderStep:nth-child('+value+')').css('background-color');
	$('.ui-slider-handle').css('background-color',col);
}

//changes the value of the current temperature readout
function setTemperature(value) {
	$('#temperature .value').html(value);
}

//finds the maximum and minimum value in the data
function getMaxMin(data) {
 	min = 50;
 	max = 0;
 	$.each(data, function(key,val) {
 		if (val[1] < min)
 			min = val[1];

 		if (val[1] > max)
 			max = val[1];
 	});
 	return [min,max];
}

//sorts the sensor data based on the order given
function sortData(data) {
 	var temp = [];
 	var i = 0;
 	$.each(order, function(k,o) {
 		$.each(data, function(key,val) {
			if (endsWith(val[0],o)) {
				//alert(JSON.stringify(val));
				temp.push(Array(val[0],val[1]));
				data[key].pop();
				i++;
			}

	 	});
 	});
 	//alert(JSON.stringify(temp));
 	return temp;
}


//returns the slide value of a sensor
function sensorIndex(val) {
	return sensorCount-val;
}

// Utility function
// adds the temperature div to the slider handle
function addTemperature() {
	$('.ui-slider-handle').html('<div id="temperature"><span class="value">--.-</span>&deg;C</div>')
}

function endsWith(str, suffix) {
	if (str != undefined)
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	return 0
}