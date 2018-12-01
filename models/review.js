var mongoose = require("mongoose");

var reviewSchema = mongoose.Schema({
  text: String,
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: String,
  },
  rating: Number,
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
});

module.exports = mongoose.model("Review", reviewSchema);
