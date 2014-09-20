var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var BoardSchema = new Schema({
	id: ObjectId,
	owner: { type: ObjectId, ref: 'User' },
	title: { type: String, default: '', trim: true },
	background: {type: String, default: ''},
	created: { type: Date, default: Date.now },
	lastModified: { type: Date },
	chat: [{
	    ownerName: { type: String, default: '' },
	    content: { type: String, default: '' },
		created: { type: Date, default: Date.now }
	}],
    isPrivate: {type: Boolean, default: false },
    password: { type: String, default: '' }
});

module.exports = mongoose.model("Board", BoardSchema);