var User = require(config.userModel),
	Board = require(config.boardModel),
	Card = require(config.cardModel);

// ===== Action to get the background for the board. The this is placed on the HTML canvas which users can draw on
exports.getBackground = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.id)
	.exec(function(err, board) {
        if (err) dataError.log({
			model: __filename,
			action: "getBackground",
			msg: "Error getting board",
			err: err,
			res: res
		});
        else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					res.send({ status: "success", background: board.background });
    		}
    		else {
				dataError.log({
					model: __filename,
					action: "getBackground",
					msg: "Invalid board authentication",
					res: res
				});
    		}
		}
		else {
			dataError.log({
				model: __filename,
				action: "getBackground",
				msg: "Error finding board " + req.params.id,
				res: res
			});
		}
	});
};

// ===== Actions to create a new board
exports.insert = function (req, res) {
	// create and save the new board

	var board = new Board({ 
		workspace: req.params.id,
		title: req.body.title,
	    created: new Date(),
    	lastModified: new Date()
	});

	board.save(function (err, newBoard) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "insert",
				msg: "Error saving board",
				err: err,
				res: res
			});
		}
		else {
			// return the new baord back to client

			var returnBoard = new Board({
				id: newBoard._id, 
			    workspace: newBoard.workspace,
			    owner: newBoard.owner,
				title: newBoard.title,
			    created: newBoard.created,
			    lastModified: newBoard.lastModified
			});
			
			res.send({ status: "success", board: returnBoard });
		}
	});
};

// ====== Update the title of a board (could add more metadata if requireds)
exports.update = function (req, res) {
	Board
	.findById(req.params.id)
	.populate("workspace")
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "update",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else {
        	// check that the update is being requested by the boards owner
	        if ((board != null) && (board.workspace.owner.toString() == req.user._id.toString())) {
	        	// update the title of the board and save it
	        	board.title = req.body.title;
	        	board.lastModified = new Date();

		        board.save(function (err, board) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "update",
							msg: "Error saving board",
							err: err
						});
					}	

		  			res.send({ status: "success", board: board });
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "update",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
};

// ===== Action to set the board background. This is based on the HTML canvas that people can draw on
exports.updateBackground = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.id)
	.populate("workspace")
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "updateBackground",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else if (board) {
			// Check if this workspace is private and if so check this user has access
        	if ((!board.workspace.isPrivate) ||
        		((req.isAuthenticated()) && (board.workspace.owner.toString() == req.user._id.toString())) || 
        		((cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.workspace.password.trim()))) {
	        	// Update the background image stored for this boards

	        	board.background = req.body.background;
	        	board.lastModified = new Date();

		        board.save(function (err, board) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "updateBackground",
							msg: "Error saving board",
							err: err,
							res: res
						});
					}
					else {
		  				res.send({ status: "success" });
					}
				});
		    }
		    else {
				dataError.log({
					model: __filename,
					action: "updateBackground",
					msg: "Invalid board authentication",
					res: res
				});
		    }
		}
		else {
			dataError.log({
				model: __filename,
				action: "updateBackground",
				msg: "Error finding board " + req.params.id,
				res: res
			});
		}
	});
};

// ===== Action to delete a board
exports.delete = function (req, res) {
	var path = require('path');
	var amazonClient = authenticateAmazonS3();
	var boards = req.params.ids.split(",");

	// multiple boards can be removed at the same time as a comma seperated list of board IDs is sent
	for (var i=0; i<boards.length; i++) {
		Board
		.findById(boards[i])
		.populate("workspace")
		.exec(function(err, board) {
			// There are 2 type of board deletes. One if you are an owner and one if you have just accessed it and want it off you list 
	        if ((board) && (board.workspace) && (board.workspace.owner.toString() == req.user._id.toString())) {
	        	// you own the baord you are attempting to delete

	        	// loop through all the cards associated to this board
				Card
				.find({ board: board._id })
				.exec(function(err, cards) {
					for (var j=0; j<cards.length; j++) {

						// if this card is a image card then deete it from the Amazon bucket
						if (cards[j].type.trim().toLowerCase() != "text") {
							amazonClient.deleteFile(board._id.toString() + "/" +  cards[j].content, function(err, res) {
								if (err) dataError.log({
									model: __filename,
									action: "delete",
									msg: "Error deleting image",
									err: err
								});
							});
						}

						// remove the card from the database
						cards[i].remove();

						cards[i].save();
					}
				});

				// remove the board from the database
		        board.remove();

		        board.save(function (err, savedBoard) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "delete",
							msg: "Error saving board",
							err: err,
							res: res
						});
					}
					else {
						res.send({ status: "success" });
					}
				});
		    }
	       	else if (board) {
	       		// you are not the owner so we want to remove the board from your list of shared boards
				User
				.findById(req.user._id)
				.exec(function(err, user) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "delete",
							msg: "Error retrieving user",
							res: res,
							err: err
						});
					}
					else {
						if (user) {
							// find the baord in your list of shared boards and remove it out
							var boardDeleted = false;
							
							for (var j = 0, userSharedBoardsLength = user.sharedBoards.length; j < userSharedBoardsLength; j+=1) {
								if (user.sharedBoards[j]._id.toString() == board._id.toString()) {
									user.sharedBoards.splice(j,1);
									j--;
									boardDeleted = true;
								}
							};

							if (boardDeleted) user.save();
	
							res.send({ status: "success" });
				        }
				        else {
				        	dataError.log({
								model: __filename,
								action: "delete",
								msg: "Unable to find user",
								res: res
							});
				        }
			        }
				});  		
	       	}
	 	});
	}
};