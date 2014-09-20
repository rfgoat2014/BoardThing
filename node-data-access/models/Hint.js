var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

// Priority 1 - Always show (Only allow 1)
// Priority 0 - Randomly show

var HintSchema = new Schema({
    content: { type: String },
    priority: { type: Number }
});

module.exports = mongoose.model("Hint", HintSchema);