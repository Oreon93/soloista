var mongoose = require("mongoose");

var incidentSchema = mongoose.Schema({
  text: String,
  booking:   {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
  status: String,
});

module.exports = mongoose.model("Incident", incidentSchema);
