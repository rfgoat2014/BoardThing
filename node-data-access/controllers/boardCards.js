var Board = require(config.boardModel);
var Card = require(config.cardModel);

exports.get = function (req, res) {
	var cookies = parseCookies(req);;

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
        else {
        	if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var returnCards = [];
					var childCards = []

					Card
					.find({ board: req.params.boardId })
					.exec(function(err, cards) {
						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								var returnCard = null

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

						for (var i = 0; i < returnCards.length; i++) {
							attachChildCards(returnCards[i],childCards);
						}

						res.send({ status: "success", cards: returnCards });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
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
		}
	});
}

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

exports.getImage = function (req, res) {
	var http = require('http');
    var path = require('path');

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
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var cardColor = "#FFFFFF";

					if ((req.body.color) && (req.body.color.trim().length > 0)) {
						cardColor = req.body.color;
					}			

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
							board.lastModified = new Date();
							board.save();

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
  					res.send({ status: "failed", message: "Invalid board authentication" });
	  			}
			}
			else {
				dataError.log({
					model: __filename,
					action: "insert",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

exports.insertImage = function (req, res) {
    var fs = require('fs'),
    	Busboy = require('busboy'),
		path = require('path');

	var amazonClient = authenticateAmazonS3();

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
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var busboy = new Busboy({ headers: req.headers });

					busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
						var fileData = [];

						file.on('data', function(data) {
							fileData.push(data);
						});

						file.on('end', function() {
							var filenameParts = filename.split(".");
					    	var newFilename = createGUID() + "." + filenameParts[filenameParts.length-1];

					    	var finalData = Buffer.concat(fileData);

							var fileReq = amazonClient.put(req.params.boardId + "/" + newFilename, {
								'Content-Length': finalData.length,
								'Content-Type': mimetype
							});

							fileReq.on('response', function(uploadRes) {
								if (200 == uploadRes.statusCode) {
									var cardColor = "#FFFFFF";

									if ((req.body.color) && (req.body.color.trim().length > 0)) {
										cardColor = req.body.color;
									}			

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
											board.lastModified = new Date();
											board.save();

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
								else dataError.log({
									model: __filename,
									action: "insertImage",
									res: res
								});
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
				});
			}
		}
	});
}

exports.downloadImage = function (req, res) {
	var request = require('request').defaults({ encoding: null });
    var path = require('path');

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
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					var imageLocation = req.body.imageLocation;

					if (imageLocation) {
						var imageParts = imageLocation.split("/");

						if (imageParts.length > 0) {
							request.get(imageLocation, function (error, response, body) {
							    if ((!error) && (response.statusCode == 200) && (response.headers["content-type"].toString().toLowerCase().indexOf("image") == 0)) {
							    	var data = new Buffer(body);

							    	var newFilename = createGUID() + "." + mimeTypes.getFileExtension(response.headers["content-type"]);

									var fileReq = amazonClient.put(req.params.boardId + "/" + newFilename, {
										'Content-Length': response.headers["content-length"],
										'Content-Type': response.headers["content-type"]
									});

									fileReq.on('response', function(uploadRes) {
										if (200 == uploadRes.statusCode) {
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
													board.lastModified = new Date();
													board.save();

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
												res: res
											});

											res.send({ message: "failed" });
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
				});
			}
		}
	});
}

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
				err: err
			});

  			res.send({ status: "failed" });
        }
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
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

							if (card.type != "text") {
						    	var filenameParts = card.content.split(".");

								cardContent = createGUID() + "." + filenameParts[filenameParts.length-1];
							}

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
								var amazonClient = authenticateAmazonS3();

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
											board.lastModified = new Date();
											board.save();

											if (addedCard.width == undefined) {
												addedCard.width = null;
											}
											if (addedCard.height == undefined) {
												addedCard.height = null;
											}

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
										board.lastModified = new Date();
										board.save();

										if (addedCard.width == undefined) {
											addedCard.width = null;
										}
										if (addedCard.height == undefined) {
											addedCard.height = null;
										}

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
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "update",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
				err: err
			});

  			res.send({ status: "failed" });
        }
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						card.content = req.body.content;
						
						if ((req.body.color) && (req.body.color.trim().length > 0)) {
							card.color = req.body.color;
						}

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
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" });
				  			}
						});
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "update",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
				err: err
			});

  			res.send({ status: "failed" });
        }
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card) {
							if (card.votesReceived) {
								card.votesReceived++;
							}
							else {
								card.votesReceived = 1;
							}

							card.save(function(err, savedIdea) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "addVote",
										msg: "Error saving card: " + req.params.cardId,
										err: err
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
								action: "addVote",
								msg: "Error finding card: " + req.params.cardId,
							});

				  			res.send({ status: "failed" });
				  		}
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "addVote",
					msg: "Error finding board " + req.params.boardId,
				});

			  	res.send({ status: "failed" });
			}
		}
	});
}

exports.removeVotes = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	console.log("boardCard: removeVotes: Error getting board: " + err.toString());
  			res.send({ status: "success" }); // TODO: is this right?
        }
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card) {
							card.votesReceived = 0;

							card.save(function(err, savedIdea) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "removeVotes",
										msg: "Error saving card: " + req.params.cardId,
										err: err
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
								action: "removeVotes",
								msg: "Error finding card: " + req.params.cardId,
							});

						  	res.send({ status: "failed" });
						}
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "removeVotes",
					msg: "Error finding board " + req.params.boardId,
				});

			  	res.send({ status: "failed" });
			}
		}
	});
}

exports.updateImage = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) dataError.log({
			model: __filename,
			action: "updateImage",
			msg: "Error retrieving board",
			err: err,
			res: res
		});
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card) {
							var cardColor = "#FFFFFF";

							if ((req.body.color) && (req.body.color.trim().length > 0)) {
								cardColor = req.body.color;
							}			

							card.color = cardColor;
							card.title = req.body.title;

							card.save(function(err, savedIdea) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "updateImage",
										msg: "Error saving card: " + req.params.cardId,
										err: err
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
							});

						  	res.send({ status: "failed" });
						}
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "updateImage",
					msg: "Error finding board " + req.params.boardId,
				});

			  	res.send({ status: "failed" });
			}
		}
	});
}

exports.delete = function (req, res) {
	var cookies = parseCookies(req);;
	
    var path = require('path');
	var amazonClient = authenticateAmazonS3();

	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	console.log("boardCard: delete: Error getting board: " + err.toString());
        }
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card.type.trim().toLowerCase() != "text") {
							amazonClient.deleteFile(req.params.boardId + "/" +  card.content, function(err, res){
								if (err) {
									console.log("boardCard: delete: Error deleting image: " + err.toString()); // TODO: can this be dataError
								}
							});
						}

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

						card.remove();

						card.save(function(err, savedIdea) {
							if (err) {
								console.log("boardCard: delete: Error saving card: " + err.toString());
							}

							board.lastModified = new Date();
							board.save();

				  			res.send({ status: "success" }); 
				  		});
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "delete",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						card.isLocked = true;

						card.save(function(err) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "lock",
									msg: "Error saving card: " + req.params.cardId,
									err: err
								});

					  			res.send({ status: "failed" });
							}
							else {
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" });
				  			} 
				  		});
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "lock",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						card.isLocked = false;

						card.save(function(err) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "unlock",
									msg: "Error saving card: " + req.params.cardId,
									err: err
								});

					  			res.send({ status: "failed" });
							}
							else {
								board.lastModified = new Date();
								board.save();

					  			res.send({ status: "success" }); 
					  		}
				  		});
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "unlock",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card) {
							card.width = req.body.width;
							card.height = req.body.height;

							card.save(function(err, savedIdea) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "updateDimensions",
										msg: "Error saving card: " + req.params.cardId,
										err: err
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
							res.send({ status: "failed" });
						}
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "updateDimensions",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
		else {
			if (board) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.cardId)
					.exec(function(err, card) {
						if (card) {
							card.xPos = req.body.xPos;
							card.yPos = req.body.yPos;

							card.save(function(err, savedIdea) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "updatePosition",
										msg: "Error saving card: " + req.params.cardId,
										err: err
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
				  			res.send({ status: "failed" });
				  		}
					});
				}
				else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
				}
			}
			else {
				dataError.log({
					model: __filename,
					action: "updatePosition",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}

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
		else {
			if (board) {
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
								board.lastModified = new Date();
								board.save();
							}

				  			res.send({ status: "success" });
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
					action: "updatePosition",
					msg: "Error finding board " + req.params.boardId,
				});
			}
		}
	});
}