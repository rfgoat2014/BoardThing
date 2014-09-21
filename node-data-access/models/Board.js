var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var BoardSchema = new Schema({
	id: ObjectId, // id of the board
	owner: { type: ObjectId, ref: 'User' }, // id referencing User who is the owner of the board
	title: { type: String, default: '', trim: true }, // the title of a board
	background: {type: String, default: ''}, // an base64 image string that is the background of the board and used in the HTML canvas
	created: { type: Date, default: Date.now }, // the datetime the board was created
	lastModified: { type: Date }, // the datetime the board was last modified
	chat: [{
	    ownerName: { type: String, default: '' }, // the name of the user who wrote the chat item
	    content: { type: String, default: '' }, //  the content of the chat item
		created: { type: Date, default: Date.now } // the date the chat item was created
	}], // any chat associated to the board
    isPrivate: {type: Boolean, default: false }, // whether or not this is a private board (slightly redundant as only private boards have a password)
    password: { type: String, default: '' } // the password for a private board
});

module.exports = mongoose.model("Board", BoardSchema);