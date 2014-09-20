var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var CardSchema = new Schema({
    id: ObjectId,
	board: { type: ObjectId, ref: 'User' },
    parentId: { type: String },
	title: { type: String, default: '' },
    content: { type: String, default: '' },
    type: { type: String, default: 'text' },
    created: { type: Date, default: Date.now },
	collapsed: {type: Boolean, default: false },
    children: [{ type: String }],
    isVoting: {type: Boolean, default: false },
    votesReceived: { type: Number, default: 0 },
    isLocked: {type: Boolean, default: false },
    width: { type: Number },
    height: { type: Number },
    xPos: { type: Number },
    yPos: { type: Number },
    zPos: { type: Number },
    color: { type: String, default: '#FFFFFF' }
});

module.exports = mongoose.model("Card", CardSchema);