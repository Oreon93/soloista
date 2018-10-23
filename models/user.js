var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    bookings: [
      {
        date: Date,
        isAvailable: {type: Boolean, default: true},
        slots: [
          {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking"
          }
        ]
      }
    ]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
