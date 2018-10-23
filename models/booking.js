var mongoose = require("mongoose");

var bookingSchema = mongoose.Schema({
  date: Date,
  status: String,
  code: String
});

module.exports = mongoose.model("Booking", bookingSchema);
