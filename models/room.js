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
  longLat: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0,0],
    }
  },
});

module.exports = mongoose.model("Room", roomSchema);
