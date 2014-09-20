var Board = require(config.boardModel);
var Card = require(config.cardModel);

// ===== Method to retrieve all the cards on a board
exports.get = function (req, res) {
	var cookies = parseCookies(req);;

	// Attempting to retrieve board
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "update",
				msg: "Error getting board",
				err: err,
				res: res
			});

			res.send({ status: "failed" });
        }
        else if (board) {
        	// Check if this is a public board and if not check if the user has access to it
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// Start building the cards and clusters to be returned to the board
				var returnCards = [];
				var childCards = []

				// Retrieve alll the cards associated to the board
				Card
				.find({ board: req.params.boardId })
				.exec(function(err, cards) {
					for (var i = 0; i < cards.length; i++) {
						// Sanity check that there is a card specified in the position
						if (cards[i]) {
							var returnCard = null

							// First pass through only capture root cards (those not part of a cluster)
							if (cards[i].parentId) {
								childCards.push({
							        id: cards[i]._id,
									parentId: cards[i].parentId,
						        	title: cards[i].title,
							        content: cards[i].content,
							        type: cards[i].type,
							        created: cards[i].created,
							    	collapsed: cards[i].collapsed,
								    isVoting: cards[i].isVoting,
							        votesReceived: cards[i].votesReceived,
							        isLocked: cards[i].isLocked,
									width: cards[i].width,
									height: cards[i].height,
									xPos: cards[i].xPos,
									yPos: cards[i].yPos,
									zPos: cards[i].zPos,
									color: cards[i].color,
									created: cards[i].created,
									children: cards[i].children,
									cards: []
								});
							}
							else {
								// Capture all the cards part of clusters
								returnCards.push({
							        id: cards[i]._id,
						        	title: cards[i].title,
							        content: cards[i].content,
							        type: cards[i].type,
							        created: cards[i].created,
							    	collapsed: cards[i].collapsed,
								    isVoting: cards[i].isVoting,
							        votesReceived: cards[i].votesReceived,
							        isLocked: cards[i].isLocked,
									width: cards[i].width,
									height: cards[i].height,
									xPos: cards[i].xPos,
									yPos: cards[i].yPos,
									zPos: cards[i].zPos,
									color: cards[i].color,
									created: cards[i].created,
									children: cards[i].children,
									cards: []
								});
							}
						}
					}

					// for cards that are part of a cluster start recursively building up the structure
					for (var i = 0; i < returnCards.length; i++) {
						attachChildCards(returnCards[i],childCards);
					}

					res.send({ status: "success", cards: returnCards });
				});
			}
    		else {
				dataError.log({
					model: __filename,
					action: "get",
					msg: "Invalid board authentication",
					res: res
				});
    		}
		}
		else {
			dataError.log({
				model: __filename,
				action: "get",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== A recursive method which builds up the cluster structure
function attachChildCards(currentNode,childNodes) {
	for (var i=0; i<currentNode.children.length; i++) {
		for (var j=0; j<childNodes.length; j++) {
			if (currentNode.children[i] == childNodes[j].id) {
				currentNode.cards.push(childNodes[j]);
				attachChildCards(currentNode.cards[(currentNode.cards.length-1)], childNodes);
			}
		}
	}
}

// ===== Retrieve a cards image from it's amazon bucket
exports.getImage = function (req, res) {
	var http = require('http');

    // Retrieve the amazon client object
	var amazonClient = authenticateAmazonS3();

	Card
	.findById(req.params.cardId)
	.exec(function(err, card) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "getImage",
				msg: "Error retrieving board",
				err: err,
				res: res
			});

			return null;
		}
		else {
			if (card) {
				var imageType = card.type;

				var data = '';

				// Retrieve the image data from the amazon bucket
				amazonClient.getFile(req.params.boardId + "/" + card.content, function(err, s3res) {  
					s3res.setEncoding('binary');

					s3res.on('data', function(chunk){
						data += chunk;
					});

					s3res.on('end', function() {
					    res.contentType(imageType);
					    res.write(data, encoding='binary')
					    res.end()
					});
				}).end();
			}
			else {
				dataError.log({
					model: __filename,
					action: "getImage",
					msg: "Error finding card " + req.params.boardId,
				});

				return null;
			}
		}
	});
}

// ===== Actions for inserting a new board cards
exports.insert = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) { 
			dataError.log({
				model: __filename,
				action: "insert",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else {
			if (board) {
				// Check if this is a private board and if so the current user has accesss
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
        			// Set the color for the new card, white is default if one is not specified
					var cardColor = "#FFFFFF";

					if ((req.body.color) && (req.body.color.trim().length > 0)) {
						cardColor = req.body.color;
					}			

					// Creating a new card object
					var card = new Card({
						board: board._id,
						content: req.body.content, 
						created: new Date(), 
						color: cardColor, 
						type: "text" 
					});

					card.save(function(err, addedCard) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "insert",
								msg: "Error saving card",
								err: err,
								res: res
							});
						}
						else {
							// Set the the date the board was modified to now
							board.lastModified = new Date();
							board.save();

							// Return the newly added card object
							var returnCard = {
						        id: addedCard._id,
					        	title: addedCard.title,
						        content: addedCard.content,
						        type: addedCard.type,
						        created: addedCard.created,
						    	collapsed: addedCard.collapsed,
						    	isLocked: false,
								width: null,
								height: null,
								xPos: null,
								yPos: null,
								zPos: null,
								color: addedCard.color,
								cards: []
							};

				  			res.send({ message: "success", card: returnCard });
			  			}
					});
				}
	  			else {
					dataError.log({
						model: __filename,
						action: "insert",
						msg: "Invalid board authentication",
						res: res
					});
	  			}
			}
			else {
				dataError.log({
					model: __filename,
					action: "insert",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

// ===== Actions to insert a new image card uploaded from a users computer to the database and amazon bucket
exports.insertImage = function (req, res) {
    var fs = require('fs'),
    	Busboy = require('busboy');

	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "insertImage",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else {
			if (board) {
				// Check if this is a private board and if so the current user has accesss
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var busboy = new Busboy({ headers: req.headers });

					// Upload the file using busyboy as express don't handle multipart data 
					busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
						var fileData = [];

						file.on('data', function(data) {
							fileData.push(data);
						});

						file.on('end', function() {
							var filenameParts = filename.split(".");
					    	var newFilename = createGUID() + "." + filenameParts[filenameParts.length-1];

					    	var finalData = Buffer.concat(fileData);

							var amazonClient = authenticateAmazonS3();

							var fileReq = amazonClient.put(req.params.boardId + "/" + newFilename, {
								'Content-Length': finalData.length,
								'Content-Type': mimetype
							});

							fileReq.on('response', function(uploadRes) {
								if (200 == uploadRes.statusCode) {
									// Set the color for the new card, white is default if one is not specified
									var cardColor = "#FFFFFF";

									if ((req.body.color) && (req.body.color.trim().length > 0)) {
										cardColor = req.body.color;
									}			

									// Create the new card object
									var card = new Card({ 
										board: board._id,
										content: newFilename, 
										card: cardColor, 
										created: new Date(), 
										type: mimetype
									});

									card.save(function(err, addedCard) {
										if (err) {
											dataError.log({
												model: __filename,
												action: "insertImage",
												msg: "Error saving board",
												err: err,
												res: res
											});
										}
										else {
											// Set the the date the board was modified to now
											board.lastModified = new Date();
											board.save();

											// Return the newly added card object
											var returnCard = {
										        id: addedCard._id,
									        	title: addedCard.title,
										        content: addedCard.content,
										        type: addedCard.type,
										        created: addedCard.created,
										    	collapsed: addedCard.collapsed,
					    						isLocked: false,
												width: addedCard.width,
												height: addedCard.height,
												xPos: addedCard.xPos,
												yPos: addedCard.yPos,
												zPos: addedCard.zPos,
												color: addedCard.color,
												cards: []
											};

								  			res.send({ message: "success", card: returnCard });
										}
									});
								}
								else {
									dataError.log({
										model: __filename,
										action: "insertImage",
										res: res
									});
								}
							});

		  					fileReq.end(finalData);
						});

					});

					busboy.on('finish', function() {
					});

					req.pipe(busboy);
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "insertImage",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

// Actions to insert a new image card downloaded from a specified URL to the database and amazon bucket
exports.downloadImage = function (req, res) {
	var request = require('request').defaults({ encoding: null });

	var amazonClient = authenticateAmazonS3();

	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "downloadImage",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else {
			if (board) {
				// Check if this is a private board and if so the current user has accesss
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var imageLocation = req.body.imageLocation;

					// Check if a location has been specified						
					if (imageLocation) {
						// Retrieve the image from the selected location
						request.get(imageLocation, function (error, response, body) {
							// Check if the selected image could be retrieved
						    if ((!error) && (response.statusCode == 200) && (response.headers["content-type"].toString().toLowerCase().indexOf("image") == 0)) {
						    	var data = new Buffer(body);

						    	// Create the image for insertion into Amazon database
						    	var newFilename = createGUID() + "." + mimeTypes.getFileExtension(response.headers["content-type"]);

								var fileReq = amazonClient.put(req.params.boardId + "/" + newFilename, {
									'Content-Length': response.headers["content-length"],
									'Content-Type': response.headers["content-type"]
								});

								fileReq.on('response', function(uploadRes) {
									if (200 == uploadRes.statusCode) {
										// Create the new card object
										var card = new Card({ 
											board: board._id,
											content: newFilename, 
											created: new Date(), 
											type: response.headers["content-type"]  
										});

										card.save(function(err, addedCard) {
											if (err) {
												dataError.log({
													model: __filename,
													action: "downloadImage",
													msg: "Error saving board",
													err: err,
													res: res
												});
											}
											else {
												// Set the the date the board was modified to now
												board.lastModified = new Date();
												board.save();

												// Return the newly added card object
												var returnCard = {
											        id: addedCard._id,
										        	title: addedCard.title,
											        content: addedCard.content,
											        type: addedCard.type,
											        created: addedCard.created,
											    	collapsed: addedCard.collapsed,
													width: addedCard.width,
													height: addedCard.height,
													xPos: addedCard.xPos,
													yPos: addedCard.yPos,
													zPos: addedCard.zPos,
													cards: []
												};

												res.send({ message: "success", card: returnCard });
											}
										});
									}
									else {
										dataError.log({
											model: __filename,
											action: "downloadImage",
											msg: "failed" ,
											res: res
										});
									}
								});

	  							fileReq.end(data);
						    }
						    else {
								res.send({ message: "failed" });
						    }
						});
					}
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "downloadImage",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

// ===== Allows the duplication of a board card
exports.duplicate = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
			dataError.log({
				model: __filename,
				action: "duplicate",
				msg: "Error getting board: " + req.params.boardId,
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this is a private board and if so the current user has accesss
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// Retrieve the card to duplicate
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (err) {
						dataError.log({
							model: __filename,
							action: "duplicate",
							msg: "Error retrieving board",
							err: err,
							res: res
						});

						return null;
					}
					else {
						var cardContent = card.content;

						// if this is an image card then a new file image needs to be created in the Amazon Bucket. Therefore create a new file name
						if (card.type != "text") {
					    	var filenameParts = card.content.split(".");

							cardContent = createGUID() + "." + filenameParts[filenameParts.length-1];
						}

						// Create the new file object
						var newCard = new Card({
							board: board._id,
							content: cardContent, 
							created: new Date(), 
							color: card.color, 
							type: card.type,
    						isLocked: card.isLocked,
    						width: card.width,
    						height: card.height,
							xPos: card.xPos+10,
							yPos: card.yPos+10
						});

						if (card.type != "text") {
							// the is an image card we're going to have to create a new copy of the image on the amazon web serve

							// get the amazon client object
							var amazonClient = authenticateAmazonS3();

							// copy the card image with the new file name
							amazonClient.copy(req.params.boardId + "/" + card.content, req.params.boardId + "/" + cardContent).on('response', function(amazonRes) {
								newCard.save(function(err, addedCard) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "duplicate",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
									else {
										// mark the board as updated
										board.lastModified = new Date();
										board.save();

										// set up some dummy card width and height values if not defined
										if (addedCard.width == undefined) addedCard.width = null;
										if (addedCard.height == undefined) addedCard.height = null;

										// return the new card object
										var returnCard = {
									        id: addedCard._id,
								        	title: addedCard.title,
									        content: addedCard.content,
									        type: addedCard.type,
									        created: addedCard.created,
		    								isLocked: addedCard.isLocked,
									    	collapsed: addedCard.collapsed,
				    						width: addedCard.width,
				    						height: addedCard.height,
											xPos: addedCard.xPos,
											yPos: addedCard.yPos,
											zPos: null,
										};

										res.send({ message: "success", card: returnCard });
									}
								});
							}).end();
						}
						else {
							// this isn't an image card so we can do a stright copy of the  card data
							newCard.save(function(err, addedCard) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "duplicate",
										msg: "Error saving card",
										err: err,
										res: res
									});
								}
								else {
									// update the date the board was last updated
									board.lastModified = new Date();
									board.save();

									// set up some dummy card width and height values if not defined
									if (addedCard.width == undefined) addedCard.width = null;
									if (addedCard.height == undefined) addedCard.height = null;

										// return the new card object
									var returnCard = {
								        id: addedCard._id,
							        	title: addedCard.title,
								        content: addedCard.content,
								        type: addedCard.type,
								        created: addedCard.created,
	    								isLocked: addedCard.isLocked,
								    	collapsed: addedCard.collapsed,
			    						width: addedCard.width,
			    						height: addedCard.height,
										xPos: addedCard.xPos,
										yPos: addedCard.yPos,
										zPos: null,
									};

									res.send({ message: "success", card: returnCard });
								}
							});
						}
					}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "duplicate",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "duplicate",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ====== Update the details of a text card
exports.update = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
			dataError.log({
				model: __filename,
				action: "update",
				msg: "Error getting board: " + req.params.boardId,
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// Retrieve the selected card
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					// Update the cards details, being a text card this could either be the content or color
					card.content = req.body.content;
					
					if ((req.body.color) && (req.body.color.trim().length > 0)) {
						card.color = req.body.color;
					}

					// save the updates
					card.save(function(err, savedIdea) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "update",
								msg: "Error saving card: " + req.params.cardId,
								err: err
							});

				  			res.send({ status: "failed" });
						}
						else {
							// update the timestamp of when the board was last modified
							board.lastModified = new Date();
							board.save();

				  			res.send({ status: "success" });
			  			}
					});
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "update",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "update",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Update the details of an image card
exports.updateImage = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "updateImage",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the image card to be updated
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (card) {
						// the actual image can't be updated, just the card color and associated text

						var cardColor = "#FFFFFF";

						if ((req.body.color) && (req.body.color.trim().length > 0)) {
							cardColor = req.body.color;
						}			

						card.color = cardColor;
						card.title = req.body.title;

						// save the udated card
						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "updateImage",
									msg: "Error saving card: " + req.params.cardId,
									err: err,
									res: res
								});

					  			res.send({ status: "failed" });
							}
							else {
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
				  			}
				  		});
					}
					else {
						dataError.log({
							model: __filename,
							action: "updateImage",
							msg: "Error finding card: " + req.params.cardId,
							res: res
						});
					}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "removeVotes",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "updateImage",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// Actions for deleting a card from a baord
exports.delete = function (req, res) {
	var cookies = parseCookies(req);

	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
			dataError.log({
				model: __filename,
				action: "delete",
				msg: "Error retrieving board " + req.params.boardId,
				err: err,
				res: res
			});
        }
		else {
			if (board) {
				// Check if this board is private and if so check this user has access
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					// retreive the card to be deleted
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						// if this is an image card then we're going to need to delete it from the amazon bucket toos
						if (card.type.trim().toLowerCase() != "text") {
							var amazonClient = authenticateAmazonS3();

							amazonClient.deleteFile(req.params.boardId + "/" +  card.content, function(err, res){
								if (err) {
									dataError.log({
										model: __filename,
										action: "updateZIndex",
										msg: "delete: Error deleting image " + card.content,
										err: err
									});
								}
							});
						}

						// we need to check if this card is part of a cluster. if so, we need to delete the reference from the parent card
						if (card.parentId) {
							Card
							.find({ board: board._id })
							.exec(function(err, cards) {
								for (var i=0; i<cards.length; i++) {
									if ((cards[i]) && (cards[i]._id == card.parentId)) {
										for (var j=0; j<cards[i].children.length; j++) {
											if (cards[i].children[j] == req.params.cardId) {
												cards[i].children.splice(j,1);
											}
										}

										cards[i].save();
									}
								}
							});
						}

						// remove the card and save
						card.remove();
						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "delete",
									msg: "Error saving card on " + req.params.boardId,
									err: err,
									res: res
								});
							}
							else {
								// update the timestamp of last updated on the board
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
				  			}
				  		});
					});
				}
				else {
					dataError.log({
						model: __filename,
						action: "delete",
						msg: "Invalid board authentication",
						res: res
					});
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "delete",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

// ===== Actions for adding a vote to a card while dot voting
exports.addVote = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
			dataError.log({
				model: __filename,
				action: "addVote",
				msg: "Error getting board: " + req.params.boardId,
				err: err,
				res: res
			});
        }
		else  if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// Retrieve the card voted on
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (card) {
						// add a vote to the selected card
						if (card.votesReceived) {
							card.votesReceived++;
						}
						else {
							card.votesReceived = 1;
						}

						// save the card
						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "addVote",
									msg: "Error saving card: " + req.params.cardId,
									err: err,
									res: res
								});
							}
							else {
								// update the timestamp of when the board was last modified
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
							}
				  		});
			  		}
			  		else {
						dataError.log({
							model: __filename,
							action: "addVote",
							msg: "Error finding card: " + req.params.cardId,
							res: res
						});
			  		}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "addVote",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "addVote",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Actions for removing all votes from a card
exports.removeVotes = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
			dataError.log({
				model: __filename,
				action: "removeVotes",
				msg: "Error getting board: " + req.params.boardId,
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the selected card
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (card) {
						// set the votes received to 0
						card.votesReceived = 0;

						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "removeVotes",
									msg: "Error saving card: " + req.params.cardId,
									err: err,
									res: res
								});
							}
							else {
								// update the timestamp of when the board was last modified
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
				  			}
				  		});
					}
					else {
						dataError.log({
							model: __filename,
							action: "removeVotes",
							msg: "Error finding card: " + req.params.cardId,
							res: res
						});
					}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "removeVotes",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "removeVotes",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Action for locking a board card
exports.lock = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
	        dataError.log({
				model: __filename,
				action: "lock",
				msg: "Error getting board",
				err: err,
				res: res
			});	
        } 
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the selected card
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					// set the cards locked property to true
					card.isLocked = true;

					card.save(function(err) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "lock",
								msg: "Error saving card: " + req.params.cardId,
								err: err,
								res: res
							});
						}
						else {
							// update the last modified timestamp for the board
							board.lastModified = new Date();
							board.save();

				  			res.send({ status: "success" });
			  			} 
			  		});
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "lock",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "lock",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ====== Action for unlocking a board card
exports.unlock = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) dataError.log({
			model: __filename,
			action: "unlock",
			msg: "Error getting board",
			err: err,
			res: res
		});
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the specified card
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					// set the cards locked property to false
					card.isLocked = false;

					card.save(function(err) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "unlock",
								msg: "Error saving card: " + req.params.cardId,
								err: err,
								res: res
							});
						}
						else {
							// update the last modified timestamp for the board
							board.lastModified = new Date();
							board.save();

				  			res.send({ status: "success" }); 
				  		}
			  		});
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "lock",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "unlock",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Update the dimensions of a selected card (width/height)
exports.updateDimensions = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "updatePosition",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this board is private and if so check this user has access
			if ((!board.isPrivate)||
				((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
				(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the card to be updated
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (card) {
						// set the width and height for the card
						card.width = req.body.width;
						card.height = req.body.height;

						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "updateDimensions",
									msg: "Error saving card: " + req.params.cardId,
									err: err,
									res: res
								});
							}
							else {
								// update the timestamp for when the board was last updated
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
					  		}
				  		});
					}
					else {
						dataError.log({
							model: __filename,
							action: "updateDimensions",
							msg: "Unable to find card " + req.params.cardId,
							res: res
						});
					}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "updateDimensions",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "updateDimensions",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Update the position of the card on a board
exports.updatePosition = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "updatePosition",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
				// retrieve the card to update the position of
				Card
				.findById(req.params.cardId)
				.exec(function(err, card) {
					if (card) {
						// set the x/y position of the card on the board
						card.xPos = req.body.xPos;
						card.yPos = req.body.yPos;

						card.save(function(err, savedIdea) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "updatePosition",
									msg: "Error saving card: " + req.params.cardId,
									err: err,
									res: res
								});
							}
							else {
								// update the timestamp of when the board was last updated
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
				  			}
				  		});
			  		}
			  		else {
						dataError.log({
							model: __filename,
							action: "updatePosition",
							msg: "Unable to find card: " + req.params.cardId,
							res: res
						});
			  		}
				});
			}
			else {
				dataError.log({
					model: __filename,
					action: "updateDimensions",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "updatePosition",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}

// ===== Update the z position of the card on the board
exports.updateZIndex = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "updatePosition",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
		else if (board) {
			// Check if this board is private and if so check this user has access
    		if ((!board.isPrivate)||
    			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
    			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
	        	if (req.body.cards) {
	        		var cardIds = [];

					for (var i=0; i<req.body.cards.length; i++) {
						cardIds.push(req.body.cards[i].cardId);
					}

					Card
					.find({ _id: { $in: cardIds } })
					.exec(function(err, cards) {
						// sort the cards based on the positions specified by the end user
						for (var i=0; i<cards.length; i++) {
							for (var j=0; j<req.body.cards.length; j++) {
								if ((cards[i]) && (cards[i]._id.toString() == req.body.cards[j].cardId)) {
									cards[i].zPos = req.body.cards[j].zPos;

									cards[i].save(function(err, savedIdea) {
										if (err) {
											dataError.log({
												model: __filename,
												action: "updateZIndex",
												msg: "Error saving card",
												err: err
											});
										} 
							  		});

							  		break;
						  		}
					  		}
						}

						if (cards.length > 0) {
							// update the timestamp of when the board was last modified
							board.lastModified = new Date();
							board.save();
						}

			  			res.send({ status: "success" });
					});
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "updateZIndex",
					msg: "Invalid board authentication",
					res: res
				});
			}
		}
		else {
			dataError.log({
				model: __filename,
				action: "updateZIndex",
				msg: "Error finding board " + req.params.boardId,
				res: res
			});
		}
	});
}