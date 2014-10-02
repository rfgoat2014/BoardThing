define([
	"jquery"
],

function() {
	var Card = {};

	Card.Insert = function(id, card, callback) {
		$.ajax({
			type: "POST",
			url: "/workspace/boards/cards/" + id,
			data: card,
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

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