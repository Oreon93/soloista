var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    firstname: {type: String, default: ""},
    lastname: {type: String, default: ""},
    mobile: Number,
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking"
      }
    ]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
