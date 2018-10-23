var mongoose = require("mongoose");


var roomSchema = new mongoose.Schema({
  name: String,
  location: String,
  description: String,
  price_per_hour: Number,
  picture: String,
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  bookings: [
    {
      bookedOut: {type: Boolean, default: false},
      slots: [
      ],
      bookingDate: String,
    }
  ],
});

module.exports = mongoose.model("Room", roomSchema);
