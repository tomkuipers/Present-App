
Modernizr.load([
  {
    test: Modernizr.geolocation,
    // nope: 'javascript/geolocation.min.js' // syntax error on Opera Mini
    nope: '/javascripts/geolocation.js'
  },
  {
    test: window.JSON,
    nope: '/javascripts/json2.min.js'
  },
  {
    test: Modernizr.localstorage,
    nope: '/javascripts/storage.min.js'
  }
]);

$(document).bind("mobileinit", function(){
  //apply overrides here
  $.mobile.defaultPageTransition = "none";
});

var presentationId = presentationId || "";

$("#pageAddPresentation").live("pageinit", function() {
	var lat, lon, timeoutVal = 60000;
	navigator.geolocation.getCurrentPosition(function(pos) {
		lat = pos.coords.latitude;
		lon = pos.coords.longitude;
	}, function() {
		lat, lon  = 0;
	}, { enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0});

	$("#addPresentationBtn").click(function() {
		var title = $("#pTitle").val();
		$.post("/api/presentations", {
			"title": title,
			"lat": lat,
			"lon": lon
		}, function(data) {
			$("#qrcode").before("<p>Presentation <strong>" + data.title + "</strong> created.</p>").qrcode({text: "http://" + data.url});
			var gotoBtn = '<a href="//' + data.url + '" data-ajax="false" data-role="button" data-theme="a" id="launchBtn" >Start presentation</a>';
			$("#pageAddPresentation div.message").append("<a href='" + data.url + "' data-ajax='false'>" + data.url +  "</a><br/>" + gotoBtn).trigger("create");
			$("#pageAddPresentation div.inputfields").toggle();
		});
	});
});

$("#pageListPresentations").live("pageinit", function() {
	$.get("/api/presentations", function(data){ 
		data.reverse();
                var tempList = "";
		$.each(data, function(index, value) {
			tempList = tempList.concat('<li><a href="/' + value._id + '/" data-ajax="false">'+ value.title + '</a></li>');
		});
		$("#presentationsListView").append(tempList);
		$("#presentationsListView").listview("refresh");
	});
});

$("#pageListQuestions").live("pagebeforeshow", function() {
	$.get("/api/presentation/" + presentationId, function(data) {
		var tempList = "";
		$.each(data.questions, function(index, value) {
			var key = "Votes:" + presentationId  + ":" + value._id;
			if (localStorage.getItem(key) === null) {
				tempList = tempList.concat( '<li>' + value.name + '<span class="ui-li-count" style="width: 1.5em; margin-right: 2em;"><a href="#" id="' + value._id + '" style="text-decoration: none;">+1</a></span><span class="ui-li-count">' + value.votes +'</span></li>');
                        } else {
				tempList = tempList.concat( '<li>' + value.name + '<span class="ui-li-count">' + value.votes +'</span></li>');
                        }
		});
		$("#questions").html(tempList);
		$("#questions").listview("refresh");
		// add event listener for voting
		$("#questions").on("click", "li a", function(event) {
			// store vote in localStorage
			var key = "Votes:" + presentationId + ":" + this.id;
			localStorage.setItem(key, "voted");
			$.ajax({
				url: "/api/presentation/" + presentationId,
				type: "PUT",
				data: {
					"questionId": this.id,
				},
				success: window.location.reload()
			});
			event.preventDefault();
		});
	});
});

$("#pageQuestion").live("pageinit", function() { // pagebeforecreate + html(tempList)
	// populate previously asked questions
	$.get("/api/presentation/" + presentationId, function(data) {
		$.each(data.questions, function(index, value) {
			$('#messages').prepend('<li><a href="#pageListQuestions" id="' + value._id +'">' + value.name + '</a></li>');
		});
		$('#messages').listview("refresh");
	});

	now.receiveMessage = function(name, message) {
		$('#messages').prepend('<li><a href="#pageListQuestions">' + message + '</a></li>');
		$('#messages').listview("refresh");
 	}
  
	$("#sendButton").click(function() {
		var question = $("#messageText").val();
		$("#messageText").val("");
		// also post question via api
		$.post("/api/presentation/" + presentationId, {
			"question": question,
			"creator": "Anonymous"
		}, function(data) {
			now.distributeMessage(question);
		});
			
	});

	now.name = "Anonymous";

	now.ready(function() {
		// set room to current presentationId
		now.changeRoom(presentationId);
        });

});

$("#pageListFavorites").live("pagebeforeshow", function(){ //pageinit + append(tempList)
  // manipulate this page before its widgets are auto-initialized
	$.get("/api/presentation/" + presentationId + "/favorites", function(data) {
		var tempList = "";
		$.each(data, function(index, value) {
			tempList = tempList.concat('<li>' + value.name + '<span class="ui-li-count">' + value.votes +'</span></li>');
		});
		$("#favorites").html(tempList);
		$("#favorites").listview("refresh");
	}); 
});

// calculate distance, spherical law of cosines, source: http://www.movable-type.co.uk/scripts/latlong.html
var distance = function(lat1, lon1, lat2, lon2) {
	var R = 6371; // km
	var d = Math.acos(Math.sin(lat1)*Math.sin(lat2) + 
		Math.cos(lat1)*Math.cos(lat2) *
		Math.cos(lon2-lon1)) * R;
	return d;
};

