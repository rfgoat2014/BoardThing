var Hint = require(config.hintModel);

exports.getBoardHint = function (callback) {
	Hint.find(function(err, hints) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "getAllHints",
				msg: "Error retrieving hints",
				err: err
			});
		}
		else {
			if ((hints) && (hints.length)) {
				var messageNo = -1;

				for (var i = 0; i < hints.length; i++) {
					if (hints[i].priority == 1) {
						messageNo = i;
						break;
					}
				};

				if (messageNo === -1) {
					messageNo = Math.floor(Math.random() * ((hints.length-1) - 0 + 1)) + 0;
				}

				callback(hints[messageNo].content);
			}
			else {
				callback(null);
			}
        }
	});
}