define([
	"jquery"
],

function() {
	var Card = {};

	Card.InsertTextCard = function(boardId, card, callback) {
		$.ajax({
			type: "POST",
			url: "/workspace/boards/cards/" + boardId,
			data: card,
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	Card.UpdateTextCard = function(boardId, cardId, card, callback) {
        $.ajax({
            url: "/workspace/boards/cards/text/" + boardId + "/" + cardId,
            type: "PUT",
            dataType: "json",
            data: card,
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.UpdateImageCard = function(boardId, cardId, card, callback) {
        $.ajax({
            url: "/workspace/boards/cards/image/" + boardId + "/" + cardId,
            type: "PUT",
            dataType: "json",
            data: card,
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.Delete = function(boardId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/cards/" + boardId + "/" + cardId,
            type: "DELETE",
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.UpdatePosition = function(boardId, cardId, xPos, yPos, callback) {
        $.ajax({
            url: "/workspace/boards/cards/position/" + boardId + "/" + cardId,
            type: "PUT",
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

	Card.Resize = function(boardId, cardId, card, callback) {
        $.ajax({
            url: "/workspace/boards/cards/resize/" + boardId + "/" + cardId,
            type: "PUT",
            dataType: "json",
            data: card,
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.Duplicate = function(boardId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/cards/duplicate/" + boardId + "/" + cardId,
            type: "POST",
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.Lock = function(boardId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/cards/lock/" + boardId + "/" + cardId,
            type: "PUT",
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.Unlock = function(boardId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/cards/unlock/" + boardId + "/" + cardId,
            type: "PUT",
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Card.DownloadImage = function(boardId, card, callback) {
        $.ajax({
            url: "/workspace/boards/cards/downloadImage/" + boardId,
            type: 'POST',
            dataType: "json",
            data: card,
            success:  function(response) {
				if (callback) callback(response);
			}
    	});
	};

	return Card;
});