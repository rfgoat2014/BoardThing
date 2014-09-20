var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
    id: ObjectId,
    sessionId: {type: String, default: ''},
    active: {type: Boolean, default: false },
    username: {type: String, default: ''},
    email: {type: String, default: ''},
    password: {type: String, default: ''},
    joined: { type: Date, default: Date.now },
    sharedBoards: [{id: { type: ObjectId, ref: 'Board' } }],
    note: {type: String, default: ''},
    displayCardAddHint: {type: Boolean, default: true },
    acceptCommunication: {type: Boolean, default: false },
    roles: [{ type: String } ]
});

module.exports = mongoose.model("User", UserSchema);