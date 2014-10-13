define([
	"jquery"
],

function() {
	var Cluster = {};

	Cluster.Insert = function(boardId, clusterId, cardId, callback) {
		$.ajax({
			type: "PUT",
			url: "/workspace/boards/clusters/" + boardId + "/" + clusterId,
			data: {
  				action: "create",
  				cards: [{ id: cardId }]
			},
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	Cluster.AttachCard = function(boardId, clusterId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/cards/" + boardId + "/" + clusterId + "/" + cardId,
            type: 'POST',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.UpdatePosition = function(boardId, clusterId, xPos, yPos, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/position/" + boardId + "/" + clusterId,
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

	return Cluster;
});