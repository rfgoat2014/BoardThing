var Board = require(config.boardModel);
var Card = require(config.cardModel);

exports.update = function (req, res) {
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
					if (req.body.action.trim().toLowerCase() == "create") {
						Card
						.find({ board: board._id })
						.exec(function(err, cards) {
							for (var i=0; i<cards.length; i++) {
								if (cards[i]) {
									var updateCard = false;

									if (cards[i]._id == req.params.clusterId) {
										cards[i].isVoting = false;
										cards[i].children = [];

										for (var j=0; j<req.body.cards.length; j++) {
											cards[i].children.push(req.body.cards[j].id)
										}

										updateCard = true;
									}

									for (var j=0; j<req.body.cards.length; j++) {
										if (cards[i]._id == req.body.cards[j].id) {
											if (cards[i].votesReceived > 0) {
												if (cards[i].type.trim().toLowerCase() == "text") {
													cards[i].content = cards[i].content + " (+" + cards[i].votesReceived + ")";
												}
												else {
													cards[i].title = cards[i].title + " (+" + cards[i].votesReceived + ")";
												}

												cards[i].votesReceived = 0;
											}

											cards[i].parentId = req.params.clusterId;
											cards[i].collapsed = true;
											cards[i].zPos = 1;

											updateCard = true;
										}
											
										if (cards[i]._id != req.params.clusterId) {
											for (var k = 0; k < cards[i].children.length; k++) {
												if (cards[i].children[k] == req.body.cards[j].id) {
													cards[i].children.splice(k,1);

													updateCard = true;
												}
											};
										}
									}

									if (updateCard) {
										board.lastModified = new Date();
										board.save();

										cards[i].save(function(err) {
											if (err) {
												dataError.log({
													model: __filename,
													action: "update",
													msg: "Error saving card: " + cards[i]._id,
													err: err
												});
											}
										});
									}
								}
							}
						});
					} 
					else if (req.body.action.trim().toLowerCase() == "update") {
						Card
						.findById(req.params.clusterId)
						.exec(function(err, cluster) {
							if (err) {
								dataError.log({
									model: __filename,
									action: "update",
									msg: "Error saving cluster " + req.params.clusterId,
									err: err
								});

								res.send({ status: "failed" });
							}
							else if (cluster) {
								if (req.body.title) {
									cluster.title = req.body.title;
								}

								if (req.body.content) {
									cluster.content = req.body.content;
								}

								cluster.save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "update",
											msg: "Error saving cluster " + req.params.clusterId,
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
									action: "update",
									msg: "Unable to find cluster " + req.params.clusterId,
									err: err
								});

								res.send({ status: "failed" });
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
					action: "update",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});

				res.send({ status: "failed" });
	        }
	    }
   	});
}

exports.expand = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "expand",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else {
        	if (board != null) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "expand",
								msg: "Error retrieving cluster " + req.params.clusterId,
								err: err
							});

							res.send({ status: "failed" });
						}
						else if (cluster) {
							cluster.collapsed = false;

							cluster.save(function(err) {
								if (err) {
						        	dataError.log({
										model: __filename,
										action: "expand",
										msg: "Unable to save cluster " + req.params.clusterId,
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
								action: "expand",
								msg: "Unable to find cluster " + req.params.clusterId,
								res: res
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
					action: "expand",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
	        }
	    }
   	});
}

exports.collapse = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
	        dataError.log({
				model: __filename,
				action: "collapse",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else {
        	if (board != null) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "collapse",
								msg: "Error retrieving cluster " + req.params.clusterId,
								err: err
							});

							res.send({ status: "failed" });
						}
						else if (cluster) {
							cluster.collapsed = true;

							cluster.save(function(err) {
								if (err) {
						        	dataError.log({
										model: __filename,
										action: "collapse",
										msg: "Unable to save cluster " + req.params.clusterId,
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
								action: "collapse",
								msg: "Unable to find cluster " + req.params.clusterId,
								res: res
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
					action: "collapse",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
	        }
	    }
   	});
}

exports.startDotVoting = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "startDotVoting",
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
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (cluster) {
							cluster.isVoting = true;

							Card
							.find({ parentId: req.params.clusterId })
							.exec(function(err, cards) {
								for (var i=0; i<cards.length; i++) {
									if (cards[i]) {
										var voteCountMatches = [];

						  				if (cards[i].type.trim().toLowerCase() == "text") {
						  					voteCountMatches = cards[i].content.match(/ \(\+(.*?)\)/g);

						  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
						  						voteCountMatches = cards[i].content.match(/\(\+(.*?)\)/g);
						  					}
										}
						  				else {
						  					voteCountMatches = cards[i].title.match(/ \(\+(.*?)\)/g);

						  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
						  						voteCountMatches = cards[i].title.match(/\(\+(.*?)\)/g);
						  					}
						  				}

										if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
						  					if (cards[i].type.trim().toLowerCase() == "text") {
						  						Card.update({_id: cards[i]._id}, {
												    content: cards[i].content.replace(voteCountMatches[0],""), 
												    votesReceived: voteCountMatches[0].trim().replace("(+","").replace(")","")
												}, function(err, numberAffected, rawResponse) {
													if (err) {
											        	dataError.log({
															model: __filename,
															action: "startDotVoting",
															msg: "Unable to save card " + cards[i]._id,
															err: err
														});
													}
												});
						  					}
						  					else {
						  						Card.update({_id: cards[i]._id}, {
												    title: cards[i].title.replace(voteCountMatches[0],""), 
												    votesReceived: voteCountMatches[0].trim().replace("(+","").replace(")","")
												}, function(err, numberAffected, rawResponse) {
													if (err) {
											        	dataError.log({
															model: __filename,
															action: "startDotVoting",
															msg: "Unable to save card " + cards[i]._id,
															err: err
														});
													}
												});
											}
										}
									}
								}

								cluster.save(function(err) {
									if (err) {
							        	dataError.log({
											model: __filename,
											action: "startDotVoting",
											msg: "Unable to save cluster " + req.params.clusterId,
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
					action: "startDotVoting",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
	        }
   		}
   	});
}

exports.stopDotVoting = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
         	dataError.log({
				model: __filename,
				action: "stopDotVoting",
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
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (cluster) {
							cluster.isVoting = false;

							Card
							.find({ parentId: req.params.clusterId })
							.exec(function(err, cards) {
								for (var i=0; i<cards.length; i++) {
									if (cards[i]) {
										if (cards[i].votesReceived > 0) {
						      				if (cards[i].type.trim().toLowerCase() == "text") {
						  						Card.update({_id: cards[i]._id}, {
												    content: cards[i].content+ " (+" + cards[i].votesReceived + ")", 
												    votesReceived: 0
												}, function(err, numberAffected, rawResponse) {
													if (err) {
											        	dataError.log({
															model: __filename,
															action: "startDotVoting",
															msg: "Unable to save card " + cards[i]._id,
															err: err
														});
													}
												});
						      				}
						      				else {
						  						Card.update({_id: cards[i]._id}, {
												    title: cards[i].title + " (+" + cards[i].votesReceived + ")", 
												    votesReceived: 0
												}, function(err, numberAffected, rawResponse) {
													if (err) {
											        	dataError.log({
															model: __filename,
															action: "startDotVoting",
															msg: "Unable to save card " + cards[i]._id,
															err: err
														});
													}
												});
						      				}
					      				}
					      			}
								}

								cluster.save(function(err) {
									if (err) {
							        	dataError.log({
											model: __filename,
											action: "stopDotVoting",
											msg: "Unable to save cluster " + req.params.clusterId,
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
					action: "stopDotVoting",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
	        }
	    }
   	});
}

exports.delete = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "delete",
				msg: "Error getting board",
				err: err,
				res: res
			});
        }
        else {
        	if (board != null) {
        		if ((!board.isPrivate)||
        			((req.isAuthenticated()) && (board.owner.toString() == req.user._id.toString())) || 
        			(cookies["BoardThing_" + board._id + "_password"] != null) && (cookies["BoardThing_" + board._id + "_password"].trim() == board.password.trim())) {
					Card
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (cluster) {
							var newChildren = [];

							Card
							.find({ parentId: req.params.clusterId })
							.exec(function(err, cards) {
								for (var i=0; i<cards.length; i++) {
									if (cards[i]) {
										newChildren.push(cards[i]._id);

										cards[i].parentId = cluster.parentId;

										cards[i].save(function(err) {
											if (err) {
												dataError.log({
													model: __filename,
													action: "delete",
													msg: "Error saving child card of " + req.params.clusterId,
													err: err
												});
											}
								  		});
									}
								}

								Card
								.findById(cluster.parentId)
								.exec(function(err, parentCard) {
									for (var i=0; i<parentCard.children.length; i++) {
										if (parentCard.children[i] == cluster._id) {
											parentCard.children.splice(i,1);
										}
									}

									for (var j=0; i<newChildren.length; i++) {
										parentCard.children.push(newChildren[i]);
									}

									parentCard.save(function(err) {
										if (err) {
											dataError.log({
												model: __filename,
												action: "delete",
												msg: "Error updating parent card of " + req.params.clusterId,
												err: err
											});
										}

										cluster.remove();

										cluster.save(function(err) {
											if (err) {
												dataError.log({
													model: __filename,
													action: "delete",
													msg: "Error updating parent card of " + req.params.clusterId,
													err: err
												});
											}

											board.lastModified = new Date();
											board.save();

											res.send({ message: "success" });
										});
							  		});
								});
							});
						}
						else {
							res.send({ message: "failed" });
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
					action: "delete",
					msg: "Unable to find board " + req.params.boardId,
					res: res
				});
	        }
        }
   	});
}

exports.attachCard = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "attachCard",
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
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						var parentIndex = null;
						var childIndex = null;

						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								if (cards[i]._id.toString() == req.params.clusterId) {
									cards[i].children.push(req.params.cardId);
									parentIndex = i;
								}
								else if (cards[i]._id.toString() == req.params.cardId) {
									cards[i].parentId = req.params.clusterId;
									childIndex = i;
								}
								
								if (cards[i]._id != req.params.clusterId) {
									for (var j = 0; j < cards[i].children.length; j++) {
										if (cards[i].children[j] == req.params.cardId) {
											cards[i].children.splice(j,1);
										}
									};
								}
							}
						}

						if ((parentIndex != null) && (childIndex != null)) {
							if (cards[parentIndex].isVoting) {
								var existingVotes = 0; 
								var voteCountMatches = [];

				  				if (cards[childIndex].type.trim().toLowerCase() == "text") {
				  					voteCountMatches = cards[childIndex].content.match(/ \(\+(.*?)\)/g);

				  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
				  						voteCountMatches = cards[childIndex].content.match(/\(\+(.*?)\)/g);
				  					}
								}
				  				else {
				  					voteCountMatches = cards[childIndex].title.match(/ \(\+(.*?)\)/g);

				  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
				  						voteCountMatches = cards[childIndex].title.match(/\(\+(.*?)\)/g);
				  					}
				  				}

								if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
									existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

				  					if (cards[childIndex].type.trim().toLowerCase() == "text") {
				  						cards[childIndex].content = cards[childIndex].content.replace(voteCountMatches[0],"");
				  					}
				  					else {
				  						cards[childIndex].title = cards[childIndex].title.replace(voteCountMatches[0],"");
				  					}
								}

				      			cards[childIndex].votesReceived += parseInt(existingVotes);
			      			}
			      			else {
								if (cards[childIndex].votesReceived > 0) {
									if (cards[childIndex].type.trim().toLowerCase() == "text") {
										cards[childIndex].content = cards[childIndex].content + " (+" + cards[childIndex].votesReceived + ")";
									}
									else {
										cards[childIndex].title = cards[childIndex].title + " (+" + cards[childIndex].votesReceived + ")";
									}

									cards[childIndex].votesReceived = 0;
								}
			      			}

							cards[childIndex].zPos = cards[parentIndex].children.length;
						}

						board.lastModified = new Date();
						board.save();

						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								cards[i].save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "attachCard",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
								});
							}
						}

						res.send({ status: "success" });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
			}
			else {
				dataError.log({
					model: __filename,
					action: "attachCard",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

exports.detachCard = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "detachCard",
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
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								if (cards[i]._id.toString() == req.params.clusterId) {
									for (var j=0; j<cards[i].children.length; j++) {
										if (cards[i].children[j] == req.params.cardId) {
											cards[i].children.splice(j,1);
										}
									}

									if (cards[i].children.length === 0) {
										cards[i].isVoting = false;
									}
								}

								if (cards[i]._id.toString() == req.params.cardId) {
					      			if (cards[i].votesReceived > 0) {
					      				if (cards[i].type.trim().toLowerCase() == "text") {
					      					cards[i].content = cards[i].content + " (+" + cards[i].votesReceived + ")";
					      				}
					      				else cards[i].title = cards[i].title + " (+" + cards[i].votesReceived + ")";
					      			}
									cards[i].parentId = null;
									cards[i].votesReceived = 0;
									cards[i].width = null;
									cards[i].height = null;
									cards[i].xPos = req.body.xPos;
									cards[i].yPos = req.body.yPos;
									cards[i].zPos = null;
								}

								cards[i].save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "detachCard",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
								});
							}
						}

			        	board.lastModified = new Date();
						board.save();
						
						res.send({ status: "success" });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
			}
			else {
				dataError.log({
					model: __filename,
					action: "detachCard",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

exports.attachClusterToMain = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "attachClusterToMain",
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
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								for (var j = 0; j < cards[i].children.length; j++) {
									if (cards[i].children[j] == req.params.clusterId) cards[i].children.splice(j, 1);
								}

								if (cards[i]._id.toString() == req.params.clusterId) {
									if (cards[i].votesReceived > 0) {
										if (cards[i].type.trim().toLowerCase() == "text") {
											cards[i].content = cards[i].content + " (+" + cards[i].votesReceived + ")";
										}
										else {
											cards[i].title = cards[i].title + " (+" + cards[i].votesReceived + ")";
										}

										cards[i].votesReceived = 0;
									}

									cards[i].parentId = null;
									cards[i].xPos = req.body.xPos;
									cards[i].yPos = req.body.yPos;
									cards[i].collapsed = false;
								}

								cards[i].save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "attachClusterToMain",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
								});
							}
						}

			        	board.lastModified = new Date();
						board.save();
						
						res.send({ status: "success" });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
			}
			else {
				dataError.log({
					model: __filename,
					action: "attachClusterToMain",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

exports.attachCluster = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) { 
			dataError.log({
				model: __filename,
				action: "attachCluster",
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
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						var parentIndex = null;
						var childIndex = null;

						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								for (var j = 0; j < cards[i].children.length; j++) {
									if (cards[i].children[j] == req.params.childclusterId) {
										cards[i].children.splice(j, 1);
									}
								}

								if (cards[i]._id.toString() == req.params.parentclusterId) {
									cards[i].children.push(req.params.childclusterId);
									parentIndex = i;
								}
								else if (cards[i]._id.toString() == req.params.childclusterId) {
									cards[i].collapsed = true;
									cards[i].parentId = req.params.parentclusterId;
									childIndex = i;
								}
							}
						}

						if ((parentIndex != null) && (childIndex != null)) {
							if (cards[parentIndex].isVoting) {
								var existingVotes = 0; 
								var voteCountMatches = [];

				  				if (cards[childIndex].type.trim().toLowerCase() == "text") {
				  					voteCountMatches = cards[childIndex].content.match(/ \(\+(.*?)\)/g);

				  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
				  						voteCountMatches = cards[childIndex].content.match(/\(\+(.*?)\)/g);
				  					}
								}
				  				else {
				  					voteCountMatches = cards[childIndex].title.match(/ \(\+(.*?)\)/g);

				  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) {
				  						voteCountMatches = cards[childIndex].title.match(/\(\+(.*?)\)/g);
				  					}
				  				}

								if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
									existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

				  					if (cards[childIndex].type.trim().toLowerCase() == "text") {
				  						cards[childIndex].content = cards[childIndex].content.replace(voteCountMatches[0],"");
				  					}
				  					else {
				  						cards[childIndex].title = cards[childIndex].title.replace(voteCountMatches[0],"");
				  					}
								}

				      			cards[childIndex].votesReceived += parseInt(existingVotes);
			      			}
			      			else {
								if (cards[childIndex].votesReceived > 0) {
									if (cards[childIndex].type.trim().toLowerCase() == "text") {
										cards[childIndex].content = cards[childIndex].content + " (+" + cards[childIndex].votesReceived + ")";
									}
									else {
										cards[childIndex].title = cards[childIndex].title + " (+" + cards[childIndex].votesReceived + ")";
									}

									cards[childIndex].votesReceived = 0;
								}
			      			}

							cards[childIndex].zPos = cards[parentIndex].children.length;
						}

						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								cards[i].save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "attachCluster",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
								});
							}
						}

			        	board.lastModified = new Date();
						board.save();
						
						res.send({ status: "success" });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
			}
			else { 
				dataError.log({
					model: __filename,
					action: "attachCluster",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

exports.detachCluster = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "detachCluster",
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
					Card
					.find({ board: board._id })
					.exec(function(err, cards) {
						for (var i = 0; i < cards.length; i++) {
							if (cards[i]) {
								if (cards[i]._id.toString() == req.params.parentclusterId) {
									for (var j=0; j<cards[i].children.length; j++) {
										if (cards[i].children[j] == req.params.childclusterId) {
											cards[i].children.splice(j,1);
										}
									}
								}
								if (cards[i]._id.toString() == req.params.childclusterId) {
									cards[i].parentId = null;
									cards[i].zPos = null;
									cards[i].xPos = req.body.xPos;
									cards[i].yPos = req.body.yPos;
								}

								cards[i].save(function(err) {
									if (err) {
										dataError.log({
											model: __filename,
											action: "detachCluster",
											msg: "Error saving card",
											err: err,
											res: res
										});
									}
								});
							}
						}

			        	board.lastModified = new Date();
						board.save();
						
						res.send({ status: "success" });
					});
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
			}
			else {
				dataError.log({
					model: __filename,
					action: "detachCluster",
					msg: "Error finding board " + req.params.boardId,
					res: res
				});
			}
		}
	});
}

exports.sort = function (req, res) {
	var cookies = parseCookies(req);;
	
	Board
	.findById(req.params.boardId)
	.exec(function(err, board) {
        if (err) {
        	dataError.log({
				model: __filename,
				action: "sort",
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
		        	if ((req.body.cards) && (req.body.cards.length > 0)) {
						Card
						.find({ parentId: req.params.clusterId })
						.exec(function(err, cards) {
							for (var i=0; i<req.body.cards.length; i++) {
								if (req.body.cards[i]) {
									for (var j=0; j<cards.length; j++) {
										if ((cards[j]) && (cards[j]._id == req.body.cards[i].id)) {
											cards[j].zPos = (i+1);
											
											cards[j].save(function(err) {
												if (err) {
													dataError.log({
														model: __filename,
														action: "sort",
														msg: "Error saving card",
														err: err,
														res: res
													});
												}
											});
											break;
										}
									}
								}
							}

				        	board.lastModified = new Date();
							board.save();

							res.send({ message: "success" });
						});
					}
					else {
						res.send({ message: "success" });
					}
				}
        		else {
  					res.send({ status: "failed", message: "Invalid board authentication" });
        		}
	        }
			else {
				dataError.log({
					model: __filename,
					action: "sort",
					msg: "Error finding board " + req.params.boardId,
					res: res
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
					.findById(req.params.clusterId)
					.exec(function(err, cluster) {
						if (cluster) {
							cluster.xPos = req.body.xPos;
							cluster.yPos = req.body.yPos;

							cluster.save(function(err) {
								if (err) {
									dataError.log({
										model: __filename,
										action: "sort",
										msg: "Error saving card",
										err: err,
										res: res
									});
								}
								else {
						        	board.lastModified = new Date();
									board.save();

							  		res.send({ status: "success" });
								}
							});
						}
						else {
							res.send({ message: "failed" });
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
					res: res
				});
			}
		}
	});
}