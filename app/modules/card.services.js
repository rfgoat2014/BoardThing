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

	Card.UpdatePosition = function(boardId, cardId, xPos, yPos, callback) {
        $.ajax({
            url: "/workspace/boards/cards/position/" + boardId + "/" + cardId,
            type: 'PUT',
            dataType: "json",
			data: {
	        	xPos: xPos,
	        	yPos: yPos
	        },
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	return Card;
});