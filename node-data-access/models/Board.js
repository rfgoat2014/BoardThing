var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var BoardSchema = new Schema({
	id: ObjectId, // id of the board
	workspace: { type: ObjectId, ref: 'Workspace' }, // the board that this workspace is associated to
	title: { type: String, default: '', trim: true }, // the title of a board
    password: { type: String, default: '' }, // the password for a private board
	background: {type: String, default: '' }, // an base64 image string that is the background of the board and used in the HTML canvas
	position: {type: Number, default: 1 }, // getting the position of the board in the board map
	width: {type: Number, default: 1366 }, // the width of the board
	height: {type: Number, default: 695 }, // the height of the board
	created: { type: Date, default: Date.now }, // the datetime the board was created
	lastModified: { type: Date } // the datetime the board was last modified
});

module.exports = mongoose.model("Board", BoardSchema);