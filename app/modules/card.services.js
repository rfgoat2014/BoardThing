define([
	"jquery"
],

function() {
	var Card = {};

	Card.Get = function(id, callback) {
		$.ajax({
			type: "GET",
			url: "/workspace/boards/cards/" + id,
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	return Card;
});