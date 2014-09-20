var User = require(config.userModel);
var Board = require(config.boardModel);
var Card = require(config.cardModel);
var Example = require(config.exampleModel);

exports.getByEmail = function (email, callback) {
	User
	.find({ email: new RegExp(email, "i") })
	.exec(function(err, users) {
		var userFound = false;

		if (err) {
			callback(err, null);
		}
		else {
			for (var i in users) {
				var user = users[i];

				if ((user) && (user.email) && (email) && (user.email.trim().toLowerCase() == email.trim().toLowerCase()) && (user.active)) {
					userFound = true;

					var returnUser = {
						_id: user._id,
						sessionId: user.sessionId,
					    username: user.username,
					    password: user.password,
					    email: user.email,
					    roles: user.roles,
					    joined: user.joined
					};

		        	callback(null, returnUser);
		        	break;
		        }
		    }
		    
		    if (!userFound) {
		    	callback(null, null);
		    }
        }
	});
}

exports.getById = function (id, callback) {
	User
	.findById(id)
	.exec(function(err, user) {
		if (err) callback(err, null);
		else {
			if ((user) && (user.active)) {
				var returnUser = {
					_id: user._id,
					sessionId: user.sessionId,
				    username: user.username,
				    password: user.password,
				    email: user.email,
				    roles: user.roles,
				    joined: user.joined
				};

	        	callback(null, returnUser);
	        }
	        else {
	        	callback(null, null);
	        }
        }
	});
}

exports.getBySessionId = function (id, callback) {
	User
	.findOne({ sessionId: id })
	.exec(function(err, user) {
		if (err) callback(err, null);
		else {
			if ((user) && (user.active)) {
				var returnUser = {
					_id: user._id,
					sessionId: user.sessionId,
				    username: user.username,
				    password: user.password,
				    email: user.email,
				    roles: user.roles,
				    joined: user.joined
				};
	        	callback(null, returnUser);
	        }
	        else {
	        	callback(null, null);
	        }
        }
	});
}

exports.saveSessionId = function (id, sessionId) {
	User
	.findById(id)
	.exec(function(err, user) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "saveSessionId",
				msg: "Error retrieving user",
				err: err
			});
		}
		else {
			user.sessionId = sessionId;
			user.save();
		}
	});
}

exports.get = function (req, res) {
	User
	.findById(req.user._id)
	.exec(function(err, user) {
		if (err) dataError.log({
			model: __filename,
			action: "get",
			msg: "Error retrieving user",
			err: err,
			res: res
		});
		else {
			var returnUser = {
				_id: user._id,
				username: user.username,
				email: user.email,
				joined: user.joined
			};
			user.password = null;
        	res.send({ status: "success", user: returnUser });
        }
	});
} 

exports.sendUserPassword = function(req,res) {
	User
	.findOne({ email: new RegExp("^" + req.body.email + "$", "i") })
	.exec(function(err, user) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "sendUserPassword",
				msg: "Error retrieving user",
				err: err,
				res: res
			});

			res.send({ status: "failed" }); 
		}
		else {
			if (user != null) {
				var resetEmailContent = "A password reset has been requested for your BoardThing account.\n\r\n\rIf you did not make this request, you can safely ignore this email. A password reset request can be made by anyone, and it does not indicate that your account is in any danger of being accessed by someone else.\n\r\n\rIf you do actually want to reset your password, visit this link:\n\r\n\rhttp://www.boardthing.com/resetPassword/" + user._id + "\n\r\n\rThanks for using the site!";

				email.sendUserMsg(user.username, user.email, "Password reset for BoardThing", resetEmailContent);

				res.send({ status: "success" });  
			}
			else {
				res.send({ status: "failed" }); 
			}
		}
	});
}

exports.insert = function (req, res) {
	var user = new User({ 
	    username: req.body.username,
	    email: req.body.email,
	    note: req.body.note,
	    active: false
	});

	User
	.find({ email: new RegExp(req.body.email, "i") })
	.exec(function(err, existingUsers) {
		var userExists = false;

		for (var i in existingUsers) {
			if ((existingUsers[i]) && (existingUsers[i].email) && (req.body.email) && (existingUsers[i].email.trim().toLowerCase() == req.body.email.trim().toLowerCase())) {
				userExists = true;
	        	break;
	        }
	    }

		if (!userExists) {
			user.save(function (err, savedUser) {
				if (err) {
					dataError.log({
						model: __filename,
						action: "insert",
						msg: "Error saving user",
						err: err,
						res: res
					});
				}
				else {
					var welcomeBoard = new Board(Example.getWelcomeBoard(savedUser._id));
					
					welcomeBoard.save(function (err, newWelcomeBoard) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "insert",
								msg: "Error saving welcome board",
								err: err,
								res: res
							});
						}
						else {
							var welcomeBoardCards = Example.getWelcomeBoardCards(newWelcomeBoard._id);

							for (var i=0; i<welcomeBoardCards.length; i++) {
								var card = new Card(welcomeBoardCards[i]);
								card.save();
							}

    						var fs = require('fs');
    						var mime = require('mime');

							var amazonClient = authenticateAmazonS3();

    						var files = fs.readdirSync("./views/img/example-board");

    						for (var i in files) {
    							var fileContent = fs.readFileSync("./views/img/example-board/" + files[i]);

    							var fileReq = amazonClient.put(newWelcomeBoard._id + "/" + files[i], {
									'Content-Length': fileContent.length,
									'Content-Type': mime.lookup(files[i])
								});

								fileReq.end(fileContent);
							}
						}
					});

			        email.sendTeamMsg(config.emailFromAddress, "New user request", "A new user has requested access to BoardThing\n\r\n\r" + config.adminUrl);
		        	res.send({ status: "success", user: savedUser });
		        }
			});
		}
		else {
			res.send({ status: "failed", message: "An account already exists for your e-mail" });
		}
	})
}

exports.update = function (req, res) {
	User
	.find({ email: new RegExp(req.body.email, "i") })
	.exec(function(err, existingUsers) {
		var userExists = false;

		for (var i in existingUsers) {
			if ((existingUsers[i]) && 
				(existingUsers[i]._id.toString() != req.user._id.toString()) && 
				(existingUsers[i].email.trim().toLowerCase() == req.body.email.trim().toLowerCase())) {
				userExists = true;
	        	break;
	        }
	    }

		if (!userExists) {
			User
			.findById(req.user._id)
			.exec(function(err, existingUser) {
				if (existingUser) {
				    existingUser.username = req.body.username;
				    existingUser.email = req.body.email;

				    if (req.body.password) {
						existingUser.password = security.hashPassword(req.body.password);
				    }

				    existingUser.save(function (err, savedUser) {
						if (err) {
							dataError.log({
								model: __filename,
								action: "update",
								msg: err
							});

							res.send({ status: "failed", message: "Unable to update your profile" });
						}
						else {
							res.send({ status: "success" });
						}
					});
				}
				else {
					dataError.log({
						model: __filename,
						action: "update",
						msg: "Unable to find profile"
					});	

					res.send({ status: "failed", message: "Unable to update your profile" });
				}
			});
		}
		else {
			res.send({ status: "failed", message: "That e-mail address is currently in use" });
		}
	});
}

exports.resetPassword = function (req, res) {
	User
	.findById(req.params.id)
	.exec(function(err, user) {
		if (user) {
			user.password = security.hashPassword(req.body.password);

			if ((req.body.acceptCommunication != null) && (req.body.acceptCommunication != ""))  user.acceptCommunication = req.body.acceptCommunication;
			
			user.save(function (err, savedUser) {
				if (err) {
					dataError.log({
						model: __filename,
						msg: "An error occurred",
						err: err,
						res: res
					});
				}
				else { 
					returnUser = {
						id: savedUser.id,
						email: savedUser.email
					};

					res.send({ status: "success", user: returnUser });
				}
			});
		}
		else {
			res.send({ status: "failed", message: "Unable to find your account" });
		}
	});
}

exports.updateSharedBoards = function (req, res) {
	User
	.findById(req.user._id)
	.exec(function(err, user) {
		if (err) dataError.log({
			model: __filename,
			action: "updateSharedBoards",
			msg: "Error retrieving user",
			err: err,
			res: res
		});
		else {
			Board
			.findById(req.params.boardId)
			.exec(function(err, board) {
				if (err) dataError.log({
					model: __filename,
					action: "updateSharedBoards",
					msg: "Error retrieving user",
					err: err,
					res: res
				});
				else if (!board) dataError.log({
					model: __filename,
					action: "updateSharedBoards",
					msg: "Could not find board",
					res: res
				});
				else {
					if (board.owner.toString() != req.user._id.toString()) {
						var boardSaved = false;

						for (var i=0; i<user.sharedBoards.length; i++) {
							if ((user.sharedBoards[i]) && (user.sharedBoards[i]._id.toString() == req.params.boardId.toString())) {
								boardSaved = true;
								break;
							}
						}

						if (!boardSaved) {
							user.sharedBoards.push(req.params.boardId);
							user.save();
						}

			        	res.send({ status: "success" });
				   	}
				   	else {
				   		res.send({ status: "success" });
				   	}
		        }
	        });	
        }
	});
} 

exports.getDisplayCardAddHint = function (req, res) {
	User
	.findById(req.user._id)
	.exec(function(err, user) {
		if (err) dataError.log({
			model: __filename,
			action: "getDisplayCardAddHint",
			msg: "Error retrieving user",
			err: err,
			res: res
		});
		else {
			var displayCardAddHint = user.displayCardAddHint

			if (displayCardAddHint == null) {
				displayCardAddHint = true;
			}

        	res.send({ status: "success", displayCardAddHint: displayCardAddHint });
        }
	});
} 

exports.disableDisplayCardAddHint = function (req, res) {
	User
	.findById(req.user._id)
	.exec(function(err, user) {
		if (err) dataError.log({
			model: __filename,
			action: "disableDisplayCardAddHint",
			msg: "Error retrieving user",
			err: err,
			res: res
		});
		else {
			user.displayCardAddHint = false;
			user.save();
        }
	});
} 