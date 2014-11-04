// Hash password helper
	
	exports.hashPassword = function(password) {
			var bcrypt = require('bcrypt-nodejs');

		try {
			// Generate a salt
			var salt = bcrypt.genSaltSync(10);

			// Hash the password with the salt
			return bcrypt.hashSync(password, salt);
		}
		catch (err) {
			dataError.log({
				model: __filename,
				action: "hashPassword",
				code: 500,
				msg: "Error hashing entered password '" + password + "': " + err.toString(),
			});

			return "";
		}
	}	

// Compare password helper

	exports.comparePasswords = function(submittted, storedPassword) {
		var bcrypt = require('bcrypt-nodejs');

		try {
			return bcrypt.compareSync(submittted, storedPassword); 
		}
		catch (err) {
			dataError.log({
				model: __filename,
				action: "comparePasswords",
				code: 500,
				msg: "Error comparing passwords" +  err.toString(),
			});

			return false;
		}
	}