var User = require(config.userModel);
var Board = require(config.boardModel);
var Card = require(config.cardModel);

exports.getAll = function (req, res) {
	var moment = require("moment");

	Board
	.find({ owner: req.user._id })
	.select("_id owner title isPrivate password created lastModified")
	.populate("owner")
	.exec(function(err, boards) {
		if (err) dataError.log({
			model: __filename,
			action: "getAll",
			msg: "Error retrieving post ups",
			err: err,
			res: res
		});
		else {
			var returnList = [];

			for (var i=0; i<boards.length; i++) {
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

						Board
						.find({ _id: { $in: sharedBoardIds } })
						.select("_id owner title created isPrivate lastModified")
						.populate("owner")
						.exec(function(err, boards) {
							for (var i=0; i<boards.length; i++) {
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
}

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
		else {
			if (board) {
	        	var canPasswordProtectBoard = false;

				if ((req.isAuthenticated()) && (req.user.roles)) { 
					for (var i=0; i<req.user.roles.length; i++) {
						for (var j=0; j<userRoles.length; j++) {
							if (req.user.roles[i].trim().toLowerCase() == userRoles[j].trim().toLowerCase()) {
								canPasswordProtectBoard = true;
								break;
							}
						}

						if (canPasswordProtectBoard) break;
					}
				}

				var returnBoard = {
					id: board._id,
				    owner: board.owner,
				    isOwner: ((req.isAuthenticated()) && (req.user._id.toString() == board.owner.toString())),
				    title: board.title,
				    isPrivate: board.isPrivate,
				    canPasswordProtectBoard: canPasswordProtectBoard,
				    created: board.created
				};

				if (returnBoard.isOwner) {
					returnBoard.password = board.password;
				}

				if ((req.isAuthenticated()) && (board.owner.toString() != req.user._id.toString())) {
					User
					.findById(req.user._id)
					.exec(function(err, user) {
						if (err) dataError.log({
							model: __filename,
							action: "get",
							msg: "Error retrieving user",
							err: err
						});
						else {
							if (user) {
								if (!board.isPrivate) {
									var boardSaved = false;

									for (var i=0; i<user.sharedBoards.length; i++) {
										if ((user.sharedBoards[i]) && (user.sharedBoards[i]._id.toString() == req.params.id.toString())) {
											boardSaved = true;
											break;
										}
									}

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
		}
    });
}

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
        else {
	        if (board) {
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
		}
	});
}

exports.insert = function (req, res) {
	User
	.findById(req.user._id)
	.exec(function(err, user) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "insert",
				msg: "Error retrieving user",
				err: err,
				res: res
			});
		}
		else {
			var board = new Board({ 
			    owner: user._id,
				title: req.body.title,
			    created: new Date(),
	        	lastModified: new Date()
			});

			board.save(function (err, newPostup) {
				if (err) dataError.log({
					model: __filename,
					action: "insert",
					msg: "Error saving post up",
					err: err,
					res: res
				});
				else {
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
		}
	});
},

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
	        	var boardIsPrivate = false

	        	if (board.isPrivate != null) {
					boardIsPrivate = board.isPrivate;	        		
	        	}

	        	if ((!boardIsPrivate) || 
	        		(board.owner.toString() == req.user._id.toString()) || 
	        		((boardIsPrivate) && (cookies["BoardThing_" + board._id + "_password"]) && (cookies["BoardThing_" + board._id + "_password"] == board.password))) {
					Board
					.find({ title: new RegExp('^' + req.body.title + '$', "i") })
					.exec(function(err, existingBoards) {
						if ((existingBoards) && (existingBoards.length == 0)) {
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
									Card
									.find({ board: board._id })
									.exec(function(err, cards) {
										var idMap = [];

										var amazonClient = authenticateAmazonS3();

										var async = require("async");

										async.eachSeries(cards, function(card, callback) {
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

											if (card.type.trim().toLowerCase() != "text") {
												amazonClient.copyFile(req.params.boardId + "/" + card.content, newBoard._id + "/" + card.content, function(err, res){});
											}

											newCard.save(function(err, savedCard) {
												idMap.push({ oldId: card._id, newId: savedCard._id });
												callback();
											});

										}, function(err) {
											Card
											.find({ board: newBoard._id })
											.exec(function(err, newCards) {
												for (var i=0; i<newCards.length; i++) {
													var newChildren = [];

													for (var j=0; j<idMap.length; j++) {
														if ((newCards[i].parentId) && (idMap[j].oldId.toString() == newCards[i].parentId)) newCards[i].parentId = idMap[j].newId.toString();

														if (newCards[i].children) {
															for (var k=0; k<newCards[i].children.length; k++) {
																if (newCards[i].children[k] == idMap[j].oldId.toString()) newChildren.push(idMap[j].newId.toString()); 
															}
														}
													}

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
}

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
        else {
	        if (board != null) {
	        	if (board.password.trim() == req.body.password.trim()) {
					res.send({ status: "success" });
	        	}
	        	else {
					res.send({ status: "failed", message: "Incorrect password" });
	        	}
	        }
			else {
				dataError.log({
					model: __filename,
					action: "authenticateBoard",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
			}
	    }
	});
}

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
	        if ((board != null) && (board.owner.toString() == req.user._id.toString())) {
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
}

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
	        if ((board != null) && (board.owner.toString() == req.user._id.toString())) {
	        	var canPasswordProtectBoard = false;

				if(req.user.roles) { 
					for (var i=0; i<req.user.roles.length; i++) {
						for (var j=0; j<userRoles.length; j++) {
							if (req.user.roles[i].trim().toLowerCase() == userRoles[j].trim().toLowerCase()) {
								canPasswordProtectBoard = true;
								break;
							}
						}

						if (canPasswordProtectBoard) break;
					}
				}

				if (canPasswordProtectBoard) {
					if ((req.body.password) && (req.body.password.trim().length > 0)) {
			        	board.isPrivate = true;
			        	board.password = req.body.password;
					}
					else {
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
}

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
        else {
	        if (board) {
	        	if ((!board.isPrivate) ||
	        		((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
	        		((cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim()))) {
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
  					res.send({ status: "failed", message: "Invalid board authentication" });
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
		}
	});
}

exports.delete = function (req, res) {
	var path = require('path');
	var amazonClient = authenticateAmazonS3();
	var boards = req.params.ids.split(",");

	for (var i=0; i<boards.length; i++) {
		Board
		.findById(boards[i])
		.exec(function(err, board) {
	        if ((board) && (board.owner.toString() == req.user._id.toString())) {
				Card
				.find({ board: board._id })
				.exec(function(err, cards) {
					for (var j=0; j<cards.length; j++) {
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
					}
				});

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
							var boardDeleted = false;
							
							for (var j = 0; j < user.sharedBoards.length; j++) {
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

exports.open = function (req, res) {
	Board
	.findOne({ owner: req.user._id,  title: new RegExp('^' + req.params.title + '$', "i") })
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "open",
				msg: "Error retrieving board",
				err: err,
				res: res
			});
		}
		else {
			if (board) {
				req.params.id = board._id;
				exports.get(req, res);
			}
			else {
				req.body.title = req.params.title;
			    req.body.created = new Date();
				exports.insert(req, res);
			}
		}
	});
}

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
		else {
			if (board) {
	        	if ((!board.isPrivate) || 
	        		(board.owner._id.toString() == req.user._id.toString()) || 
	        		((board.isPrivate) && (cookies["BoardThing_" + board._id + "_password"]) && (cookies["BoardThing_" + board._id + "_password"] == board.password))) {
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						cards.sort(function (a, b) { return a.zPos > b.zPos ? 1 : a.zPos < b.zPos ? -1 : 0; });

						var rootElements = [];

						for (var i=0; i<cards.length; i++) {
							if (!cards[i].parentId) rootElements.push(cards[i]);
						}

						rootElements.sort(function sortByPosition(a, b){
							if (a.xPos == b.xPos) return a.yPos - b.yPos;
							return a.xPos - b.xPos;
						})

						if(req.params.format == "html") {
							var htmlString = "<html><head></head><body><ul>";

							for (var i=0; i<rootElements.length; i++) {
								if (cards[i].type == "text") {
									htmlString += "<li>" + rootElements[i].content + "</li>";
								}
								else {
									if (cards[i].title.trim().length > 0) {
										htmlString += "<li><img src=\"" + config.url + "/boards/cards/image/" + req.params.id + "/" + rootElements[i]._id + "\" /><br/>" + rootElements[i].title + "</li>";
									}
									else {
										htmlString += "<li><img src=\"" + config.url + "/boards/cards/image/" + req.params.id + "/" + rootElements[i]._id + "\" /></li>";
									}
								}
								
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
							var textString = "";

							for (var i=0; i<rootElements.length; i++) {
								if (rootElements[i].type == "text") textString += "- " + rootElements[i].content + "\n";					
								else {
									if (rootElements[i].title.trim().length > 0) textString += "- " + rootElements[i].title + ": [Image]\n";
									else textString += "- [Image]\n";
								}

								if (rootElements[i].children.length > 0) {
									textString += appendDownloadChildren(req.params.id,rootElements[i].children,cards,0,"text");
								}
							}

							res.setHeader('Content-disposition', 'attachment; filename=' + board.title + ".txt");
						  	res.setHeader('Content-type', "text/plain");
							res.send(textString);
						}
						else if(req.params.format == "opml") {
							var opmlString = "<?xml version=\"1.0\"?><opml version=\"2.0\"><head><ownerEmail>" + board.owner.email + "</ownerEmail></head><body>";
							
							for (var i=0; i<rootElements.length; i++) {
								if (!rootElements[i].parentId) {
									if (rootElements[i].type == "text") opmlString += "<outline text=\"" + rootElements[i].content + "\">";							else {
										if (rootElements[i].title.trim().length > 0) {
											opmlString += "<outline text=\"" + rootElements[i].title + ": [Image]\">";
										}
										else opmlString += "<outline text=\"[Image]\">";
									}

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
		}
	});
}

function appendDownloadChildren(boardId,childNodes,allNodes,depth,format) {
	var currentDepth = depth+1;
	var returnString = "";

	for (var j=0; j<allNodes.length; j++) {
		for (var i = 0; i < childNodes.length; i++) {
			if (childNodes[i].toString() == allNodes[j]._id.toString()) {
				if (format == "html") {
					if (allNodes[j].type == "text") returnString += "<li>" + allNodes[j].content + "</li>";
					else {
						if (allNodes[j].title.trim().length > 0) {
							returnString += "<li><img src=\"" + config.url + "/boards/cards/image/" + boardId + "/" + allNodes[j]._id + "\" /><br/>" + allNodes[j].title + "</li>";
						}
						else {
							returnString += "<li><img src=\"" + config.url + "/boards/cards/image/" + boardId + "/" + allNodes[j]._id + "\" /></li>";
						}
					}

					if (allNodes[j].children.length > 0) {
						returnString += "<ul>";
						returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"html");
						returnString += "</ul>";
					}
				}
				else if (format == "text") {
					for (var k=0; k<currentDepth; k++) {
						returnString += "\t";
					}

					if (allNodes[j].type == "text") returnString += "- " + allNodes[j].content + "\n";
					else {
						if (allNodes[j].title.trim().length > 0) returnString += "- " + allNodes[j].title + ": [Image]\n";
						else returnString += "- [Image]\n";
					}

					returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"text");
				}
				else if (format == "opml") {
					if (allNodes[j].type == "text") returnString += "<outline text=\"" + allNodes[j].content + "\">";
					else {
						if (allNodes[j].title.trim().length > 0) {
							returnString += "<outline text=\"" + allNodes[j].title + ": [Image]\">";
						}
						else returnString += "<outline text=\"[Image]\">";
					}

					if ((allNodes[j].children) && (allNodes[j].children.length > 0))  {
						returnString += appendDownloadChildren(boardId,allNodes[j].children,allNodes,currentDepth,"opml");
					}				
					returnString += "</outline>";
				}
				break;
			}
		}
	};
	
	return returnString;
}