var User = require(config.userModel);
var Board = require(config.boardModel);
var Card = require(config.cardModel);

// ===== action to retrieve all the boards for the currently logged in user
exports.getAll = function (req, res) {
	var moment = require("moment");

	// find all the boards owned by the logged in user
	Board
	.find({ owner: req.user._id })
	.select("_id owner title isPrivate password created lastModified")
	.populate("owner")
	.exec(function(err, boards) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "getAll",
				msg: "Error retrieving post ups",
				err: err,
				res: res
			});
		}
		else {
			var returnList = [];

			// add the boards owned by the currently logged in user to the list of boards to return
			for (var i=0, boardsLength = boards.length; i<boardsLength; i+=1) {
				var lastModified = "";
				var isPrivate = false;

				if (boards[i].lastModified) lastModified = moment(boards[i].lastModified).fromNow();

				if ((boards[i].isPrivate != undefined) && (boards[i].isPrivate != null)) isPrivate = boards[i].isPrivate;

				var returnBoard = {
					id: boards[i]._id,
				    title: boards[i].title,
				    isPrivate: isPrivate,
    				password: boards[i].password,
				    created: boards[i].created,
				    lastModified: lastModified,
				    owner: {
				    	id: boards[i].owner._id,
				    	username: boards[i].owner.username
				    },
				    isOwner: true
				};

				returnList.push(returnBoard);
			}

			// retrieve all the boards that the user has previously accessed but does not own
			User
			.findById(req.user._id)
			.select("sharedBoards")
			.exec(function(err, user) {
				if (err) {
					dataError.log({
						model: __filename,
						action: "getAll",
						msg: "Error retrieving user",
						err: err,
						res: res
					});
				}
				else {
					if (user) {
						var sharedBoardIds = [];

						for (var i=0; i<user.sharedBoards.length; i++) {
							sharedBoardIds.push(user.sharedBoards[i]._id);								
						}

						if (sharedBoardIds) {
							// retrieve the details of all the boards that the current user has previously accessed
							Board
							.find({ _id: { $in: sharedBoardIds } })
							.select("_id owner title created isPrivate lastModified")
							.populate("owner")
							.exec(function(err, boards) {
								// add the shared boards with the details to the list of boards to be returned
								for (var i=0, boardsLength = boards.length; i<boardsLength; i+=1) {
									var lastModified = "";
									var isPrivate = false;

									if (boards[i].lastModified) lastModified = moment(boards[i].lastModified).fromNow();

									if ((boards[i].isPrivate != undefined) && (boards[i].isPrivate != null)) isPrivate = boards[i].isPrivate;

									returnList.push({
										id: boards[i]._id,
									    owner: {
									    	id: boards[i].owner._id,
									    	username: boards[i].owner.username
									    },
									    title: boards[i].title,
					    				isPrivate: isPrivate,
					    				password: "",
									    created: boards[i].created,
				    					lastModified: lastModified,
							    		isOwner: false,
				    					sharedStatus: "Shared"
									})
								}

					        	res.send({ status: "success", boards: returnList });
							});
						}
						else {
					       	res.send({ status: "success", boards: returnList });
						}
			        }
			        else {
			        	dataError.log({
							model: __filename,
							action: "getAll",
							msg: "Unable to find user",
							res: res
						});
			        }
		        }
			});
        }
	});
};

// ===== Action to retreive all the details of a selected board
exports.get = function (req, res) {
	Board
	.findById(req.params.id)
	.select("_id owner title background isPrivate password created chat")
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "get",
				msg: "Error retrieving board for id: " + req.params.id,
				err: err,
				res: res
			});
		}
		else if (board) {
			// put together the details of the board requested
			var returnBoard = {
				id: board._id,
			    owner: board.owner,
			    isOwner: ((req.isAuthenticated()) && (req.user._id.toString() == board.owner.toString())),
			    title: board.title,
			    isPrivate: board.isPrivate,
			    created: board.created
			};

			// only include the boards password if this is the baord ower requesting it
			if (returnBoard.isOwner) returnBoard.password = board.password;

			// check if the request is from an authenticated user and if so if it's not the board owner. we want to add this board to the users shared boards
			if ((req.isAuthenticated()) && (board.owner.toString() != req.user._id.toString())) {
				// retrieve the user that is reqesting access to the board
				User
				.findById(req.user._id)
				.exec(function(err, user) {
					if (err) dataError.log({
						model: __filename,
						action: "get",
						msg: "Error retrieving user",
						err: err
					});
					else if (user) {
						// check that if this is a private board. private boards aren't added to a users list of shared boards
						if (!board.isPrivate) {
							var boardSaved = false;

							// check if this user already has the selected board in their list of shared boards
							for (var i=0, userSharedBoardsLength = user.sharedBoards.length; i<userSharedBoardsLength; i+=1) {
								if ((user.sharedBoards[i]) && (user.sharedBoards[i]._id.toString() == req.params.id.toString())) {
									boardSaved = true;
									break;
								}
							}

							// if they currently don't have the board in their list of shared board then add its
							if (!boardSaved) {
								user.sharedBoards.push(req.params.id);
								user.save();
							}
						}

						res.send({ status: "success", board: returnBoard });
			        }
			        else {
			        	dataError.log({
							model: __filename,
							action: "get",
							msg: "Unable to find user",
							res: res
						});
					}
				});
			}
			else {
				res.send({ status: "success", board: returnBoard });
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "get",
				msg: "Unable to find board " + req.params.id,
				res: res
			});
		}
    });
};

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
	    owner: req.user._id,
		title: req.body.title,
	    created: new Date(),
    	lastModified: new Date()
	});

	board.save(function (err, newPostup) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "insert",
				msg: "Error saving post up",
				err: err,
				res: res
			});
		}
		else {
			// return the new baord back to client

			var returnBoard = new Board({
				id: newPostup._id, 
			    owner: newPostup.owner,
				title: newPostup.title,
			    created: newPostup.created,
			    lastModified: newPostup.lastModified
			});
			
			res.send({ status: "success", board: returnBoard });
		}
	});
};

// ===== The action to save a selected board as a new board with a different name
exports.saveAs = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "saveAs",
				msg: "Error saving board",
				err: err,
				res: res
			});
        }
        else {
	        if (board) {
	        	// check if this is a private board. Only the owner of a private board is able to perform a save as against it
	        	var boardIsPrivate = false

	        	if (board.isPrivate != null) {
					boardIsPrivate = board.isPrivate;	        		
	        	}

	        	if ((!boardIsPrivate) || 
	        		(board.owner.toString() == req.user._id.toString()) || 
	        		((boardIsPrivate) && (cookies["BoardThing_" + board._id + "_password"]) && (cookies["BoardThing_" + board._id + "_password"] == board.password))) {
					// check that you dont current have a board with the same name as what you attempting to save as
					Board
					.find({ title: new RegExp('^' + req.body.title + '$', "i") })
					.exec(function(err, existingBoards) {
						if ((existingBoards) && (existingBoards.length === 0)) {
							// create the new board with the same details as the source but a different name
							var newBoard = new Board({ 
							    owner: req.user._id,
								title: req.body.title,
								background: board.background,
								isPrivate: false,
								password: null,
							    created: new Date(),
						    	lastModified: new Date()
							});

							newBoard.save(function (err, newBoard) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "saveAs",
										msg: "Error saving board",
										err: err,
										res: res
									});
								}
								else {
									// find all the cards associated to the source baord
									Card
									.find({ board: board._id })
									.exec(function(err, cards) {
										// because of parent/child relationships we can't just create new cards with the same details. 
										//We need to do them synchronously so we can match up the new ids between oarent and children.

										var idMap = [];

										var amazonClient = authenticateAmazonS3();

										var async = require("async");

										async.eachSeries(cards, function(card, callback) {
											// create the new card with the same details as the source card
											var newCard = new Card({
												board: newBoard._id,
											    parentId: card.parentId,
												title: card.title,
											    content: card.content,
											    type: card.type,
											    created: card.created,
												collapsed: card.collapsed,
											    children: card.children,
											    isVoting: card.isVoting,
											    votesReceived: card.votesReceived,
											    isLocked: card.isLocked,
											    width: card.width,
											    height: card.height,
											    xPos: card.xPos,
											    yPos: card.yPos,
											    zPos: card.zPos,
											    color: card.color
											});

											// if this is an image card then we need to copy the image stored in the amazon bucket
											if (card.type.trim().toLowerCase() != "text") amazonClient.copyFile(req.params.boardId + "/" + card.content, newBoard._id + "/" + card.content, function(err, res){});
									
											newCard.save(function(err, savedCard) {
												// store the new id of the card against what the source cards id is
												idMap.push({ oldId: card._id, newId: savedCard._id });
												callback();
											});

										}, function(err) {
											// we've inserted all the new cards and now we need to line up the parent child relationships with the new ids
											Card
											.find({ board: newBoard._id })
											.exec(function(err, newCards) {
												// loop through all the cards associated to the newly created board
												for (var i=0, newCardsLength = newCards.length; i<newCardsLength; i++) {
													var newChildren = [];

													// loop through the id mappings
													for (var j=0, idMapLength = idMap.length; j<idMapLength; j++) {
														// replace the old parent ID with ID the maps to in the new board
														if ((newCards[i].parentId) && (idMap[j].oldId.toString() == newCards[i].parentId)) newCards[i].parentId = idMap[j].newId.toString();

														// if this card has children then fix the mapping to previous boards cards with the new boards ones
														if (newCards[i].children) {
															for (var k=0, newCardsChildrenLength = newCards[i].children.length; k<newCardsChildrenLength; k++) {
																if (newCards[i].children[k] == idMap[j].oldId.toString()) newChildren.push(idMap[j].newId.toString()); 
															}
														}
													}

													// update the children for the card with the new mappig. We can just alert the array in line as for some reason this doesn't save through
													newCards[i].children = newChildren;

													newCards[i].save();
												}
											});
										});

										res.send({ status: "success" });
									});
								}
							});
						}
						else {
							dataError.log({
								model: __filename,
								action: "saveAs",
								msg: "Board title already taken",
								res: res
							});
						}
					});
				} 
				else {
					dataError.log({
						model: __filename,
						action: "saveAs",
						msg: "Unauthorized save attempt for " + req.params.boardId,
						res: res
					});
				}
			}
			else  {
				dataError.log({
					model: __filename,
					action: "saveAs",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
};

// ====== Update the title of a board (could add more metadata if requireds)
exports.update = function (req, res) {
	Board
	.findById(req.params.id)
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
	        if ((board != null) && (board.owner.toString() == req.user._id.toString())) {
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

// ===== Action for private boards to authenticate a provided password to see if they are allowed access
exports.authenticateBoard = function (req, res) {
	Board
	.findById(req.params.id)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "authenticateBoard",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else if (board) {
        	// check if the password provided matches the boards password
        	if (board.password.trim() == req.body.password.trim()) res.send({ status: "success" });
        	else res.send({ status: "failed", message: "Incorrect password" });
        }
		else {
			dataError.log({
				model: __filename,
				action: "authenticateBoard",
				msg: "Unable to find board " + req.params.boardId,
				res: res
			});
		}
	});
};

// ===== Actions to update the password of a board, which will set it as private or public
exports.updatePassword = function (req, res) {
	Board
	.findById(req.params.id)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "updatePassword",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else {
        	// check that the password request is coming from the boards owner
	        if ((board != null) && (board.owner.toString() == req.user._id.toString())) {
				if ((req.body.password) && (req.body.password.trim().length > 0)) {
					// a password is defined so update the board password and set it to private
		        	board.isPrivate = true;
		        	board.password = req.body.password;
				}
				else {
					// a password is not defined so blank the password and set the board public
		        	board.isPrivate = false;
		        	board.password = null;
				}

		        board.save(function (err, board) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "updatePassword",
							msg: "Error saving board",
							err: err,
							res: res
						});
					}	
					else {
			  			res.send({ status: "success", board: board });
			  		}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "updatePassword",
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
			// Check if this board is private and if so check this user has access
        	if ((!board.isPrivate) ||
        		((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        		((cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim()))) {
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
		.exec(function(err, board) {
			// There are 2 type of board deletes. One if you are an owner and one if you have just accessed it and want it off you list 
	        if ((board) && (board.owner.toString() == req.user._id.toString())) {
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
}

// ===== Action to ecport the contents of a selected board. This can be done as HTML, plain text or OPML. DEFINITELY not the best implemented feature
exports.export = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.id)
	.populate("owner")
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "export",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else if (board) {
			// Check if this board is private and if so check this user has access
        	if ((!board.isPrivate) || 
        		(board.owner._id.toString() == req.user._id.toString()) || 
        		((board.isPrivate) && (cookies["BoardThing_" + board._id + "_password"]) && (cookies["BoardThing_" + board._id + "_password"] == board.password))) {
				// Retrieve all the cards for a selected board
				Card
				.find({ board: board._id })
				.exec(function(err, cards) {
					// firstly, sort the baords by their zposition. This will get things in the correct order when exporting clusters
					cards.sort(function (a, b) { 
						return a.zPos > b.zPos ? 1 : a.zPos < b.zPos ? -1 : 0; 
					});

					// next find all of the root cards. So, any cards without a parent
					var rootElements = [];

					for (var i=0, cardsLength = cards.length; i<cardsLength; i++) {
						if (!cards[i].parentId) rootElements.push(cards[i]);
					}

					// sort these by their X/Y position going from top left to bottom right
					rootElements.sort(function sortByPosition(a, b){
						if (a.xPos == b.xPos) return a.yPos - b.yPos;

						return a.xPos - b.xPos;
					})

					if(req.params.format == "html") {
						// this is an HTML export so build the data structure using ul and li elements
						var htmlString = "<html><head></head><body><ul>";

						for (var i=0, rootElementsLength = rootElements.length; i<rootElementsLength; i++) {
							if (cards[i].type == "text") {
								htmlString += "<li>" + rootElements[i].content + "</li>";
							}
							else {
								if (cards[i].title.trim().length > 0) htmlString += "<li><img src=\"" + config.url + "/boards/cards/image/" + req.params.id + "/" + rootElements[i]._id + "\" /><br/>" + rootElements[i].title + "</li>";
								else htmlString += "<li><img src=\"" + config.url + "/boards/cards/image/" + req.params.id + "/" + rootElements[i]._id + "\" /></li>";
							}
							
							// we need to recurse through children in order to build up the HTML structure
							if (rootElements[i].children.length > 0) {
								htmlString += "<ul>";
								htmlString += appendDownloadChildren(req.params.id,rootElements[i].children,cards,0,"html");
								htmlString += "</ul>";
							}	
						}

						htmlString += "</ul></body></html>";

						res.setHeader('Content-disposition', 'attachment; filename=' + board.title + ".html");
					  	res.setHeader('Content-type', "text/html");
						res.send(htmlString);
					}
					else if(req.params.format == "text") {
						// this is a plain text export so represent the structure with "'" and spaces
						var textString = "";

						for (var i=0; i<rootElements.length; i++) {
							if (rootElements[i].type == "text") textString += "- " + rootElements[i].content + "\n";					
							else {
								if (rootElements[i].title.trim().length > 0) textString += "- " + rootElements[i].title + ": [Image]\n";
								else textString += "- [Image]\n";
							}

							// we need to recurse through children in order to build up the plain text structure
							if (rootElements[i].children.length > 0) {
								textString += appendDownloadChildren(req.params.id,rootElements[i].children,cards,0,"text");
							}
						}

						res.setHeader('Content-disposition', 'attachment; filename=' + board.title + ".txt");
					  	res.setHeader('Content-type', "text/plain");
						res.send(textString);
					}
					else if(req.params.format == "opml") {
						// this is an OPML structure so build the return document with OPML syntax
						var opmlString = "<?xml version=\"1.0\"?><opml version=\"2.0\"><head><ownerEmail>" + board.owner.email + "</ownerEmail></head><body>";
						
						for (var i=0; i<rootElements.length; i++) {
							if (!rootElements[i].parentId) {
								if (rootElements[i].type == "text") opmlString += "<outline text=\"" + rootElements[i].content + "\">";							else {
									if (rootElements[i].title.trim().length > 0) {
										opmlString += "<outline text=\"" + rootElements[i].title + ": [Image]\">";
									}
									else opmlString += "<outline text=\"[Image]\">";
								}

								// we need to recurse through children to build up the OTML structure
								if (rootElements[i].children.length > 0) {
									opmlString += appendDownloadChildren(req.params.id,rootElements[i].children,cards,0,"opml");
								}					
								opmlString += "</outline>";
							}	
						}

						opmlString += "</body></opml>";

						res.setHeader('Content-disposition', 'attachment; filename=' + board.title + ".opml");
					  	res.setHeader('Content-type', "text/xml");
						res.send(opmlString);
					}
				});
			}
    		else {
				dataError.log({
					model: __filename,
					action: "getImage",
					msg: "Invalid board authentication",
					res: res
				});
    		}
		}
		else {
			dataError.log({
				model: __filename,
				action: "getImage",
				msg: "Error finding board " + req.params.id,
				res: res
			});
		}
	});
}

// ===== This is used to recurse through the cluster structure of the board when building an export
function appendDownloadChildren(boardId,childNodes,allNodes,depth,format) {
	var currentDepth = depth+1;
	var returnString = "";

	// loop through all the nodes passed into the function
	for (var j=0, allNodesLength = allNodes.length; j<allNodesLength; j++) {
		// loop through all the child nodes of the parent node that called the recursive function
		for (var i = 0, childNodesLength = childNodes.length; i < childNodesLength; i++) {
			// check if this node belongs to tbe parent node
			if (childNodes[i].toString() == allNodes[j]._id.toString()) { 
				if (format == "html") {
					// this is an HTML export so build out the li structure 

					if (allNodes[j].type == "text") {
						returnString += "<li>" + allNodes[j].content + "</li>";
					}
					else {
						if (allNodes[j].title.trim().length > 0) returnString += "<li><img src=\"" + config.url + "/boards/cards/image/" + boardId + "/" + allNodes[j]._id + "\" /><br/>" + allNodes[j].title + "</li>";
						else returnString += "<li><img src=\"" + config.url + "/boards/cards/image/" + boardId + "/" + allNodes[j]._id + "\" /></li>";
					}

					// check if this node has children, if so then recurse further
					if (allNodes[j].children.length > 0) {
						returnString += "<ul>";
						returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"html");
						returnString += "</ul>";
					}
				}
				else if (format == "text") {
					// this is a plain text export. build up the structure. Use tabs to represent depth

					for (var k=0; k<currentDepth; k++) {
						returnString += "\t";
					}

					if (allNodes[j].type == "text") {
						returnString += "- " + allNodes[j].content + "\n";
					}
					else {
						if (allNodes[j].title.trim().length > 0) returnString += "- " + allNodes[j].title + ": [Image]\n";
						else returnString += "- [Image]\n";
					}

					// keep recursing
					returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"text");
				}
				else if (format == "opml") {
					// this is an OPML export so 

					if (allNodes[j].type == "text") {
						returnString += "<outline text=\"" + allNodes[j].content + "\">";
					}
					else {
						if (allNodes[j].title.trim().length > 0) returnString += "<outline text=\"" + allNodes[j].title + ": [Image]\">";
						else returnString += "<outline text=\"[Image]\">";
					}

					// check if there are any children. if so, keep recursing
					if ((allNodes[j].children) && (allNodes[j].children.length > 0)) returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"opml");
					
					returnString += "</outline>";
				}
				break;
			}
		}
	};
	
	return returnString;
}