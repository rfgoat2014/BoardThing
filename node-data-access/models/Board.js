var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var BoardSchema = new Schema({
	id: ObjectId, // id of the board
	workspace: { type: ObjectId, ref: 'Workspace' }, // the board that this workspace is associated to
	title: { type: String, default: '', trim: true }, // the title of a board
	background: {type: String, default: ''}, // an base64 image string that is the background of the board and used in the HTML canvas
	created: { type: Date, default: Date.now }, // the datetime the board was created
	lastModified: { type: Date }, // the datetime the board was last modified
    password: { type: String, default: '' } // the password for a private board
});

module.exports = mongoose.model("Board", BoardSchema);