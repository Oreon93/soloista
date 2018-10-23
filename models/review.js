var mongoose = require("mongoose");

var reviewSchema = mongoose.Schema({
  text: String,
  author: String,
  rating: Number,
});

module.exports = mongoose.model("Review", reviewSchema);
