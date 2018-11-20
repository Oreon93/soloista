var mongoose = require("mongoose");

var bookingSchema = mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  date: String,
  time: String,
  exactTime: Date,
  status: String,
  code: String,

});

module.exports = mongoose.model("Booking", bookingSchema);
