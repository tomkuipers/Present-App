
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

$("#pageListPresentations").live("pageinit", function() {
	$.get("/api/presentations", function(data){ // of met trailing slash!
		data.reverse();
                var tempList = "";
		$.each(data, function(index, value) {
			tempList = tempList.concat('<li><a href="/' + value._id + '/" data-ajax="false">'+ value.title + '</a></li>');
			//$("#presentationsListView").prepend('<li><a href="/' + value._id + '/" data-ajax="false">'+ value.title + '</a></li>');
		});
		$("#presentationsListView").append(tempList);
		$("#presentationsListView").listview("refresh");
	});
});

$("#pageListQuestions").live("pageinit", function() {
	$.get("/api/presentation/" + presentationId, function(data) {
		var tempList = "";
		$.each(data.questions, function(index, value) {
			// tempList = tempList.concat('<li></li>');
			tempList = tempList.concat( '<li>' + value.name + '<span class="ui-li-count" style="width: 1.5em; margin-right: 2em;"><a href="#" id="' + value._id + '" style="text-decoration: none;">+1</a></span><span class="ui-li-count">' + value.votes +'</span></li>');

		});
		$("#questions").append(tempList);
		$("#questions").listview("refresh");
		// add event listener for votingi
		//$("#questions").on("click", "li a", function(event) {
		$("#questions").find("li a").on("click", function(event) {
			console.log("click event for voting: " + this.id);
			// store vote in localStorage

			$.ajax({
				url: "/api/presentation/" + presentationId,
				type: "PUT",
				data: {
					"questionId": this.id,
				},
				success: function(data, textStatus, jqXHR) { 
					console.log("add vote response: "); 
					console.dir(data); 
					console.log(textStatus); 
					console.dir(jqXHR);
					// get request om alle questions op te halen, localStorage bijhouden van uitgebrachte stemmen
				}
			});
			event.preventDefault();
		});
	});
});

$("#pageQuestion").live("pageinit", function() {
	console.log("#pageQuestions pageinit");

	// populate previously asked questions
	$.get("/api/presentation/" + presentationId, function(data) {
		console.log(data);
 		console.log("questions: " + data.questions.length);
		$.each(data.questions, function(index, value) {
			console.log(index + " , " + value);
			$('#messages').prepend('<li><a href="#" id="' + value._id +'">' + value.name + '</a></li>');
		});
		$('#messages').listview("refresh");
	});

	now.receiveMessage = function(name, message) {
		$('#messages').prepend('<li><a href="#">' + message + '</a></li>');
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
		//now.changeRoom(presentationId);
		now.changeRoom("50b3bc6de934806be6000002");
        });

});

$("#pageListFavorites").live("pageinit", function(){
	console.log("#favoritesPage pageinit");
  // manipulate this page before its widgets are auto-initialized
	$.get("/api/presentation/" + presentationId + "/favorites", function(data) {
		console.log(data);
		$.each(data, function(index, value) {
			console.log(index + " , " + value);
			$("#favorites").prepend( '<li>' + value.name + '<span class="ui-li-count" style="width: 1.5em; margin-right: 2em;"><a href="#" id="' + value._id + '" style="text-decoration: none;">+1</a></span><span class="ui-li-count">' + value.votes +'</span></li>');
		});
		$("#favorites").listview("refresh");
	}); 
});

