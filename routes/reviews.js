var express           = require("express"),
    Review            = require("../models/review"),
    Room              = require("../models/room"),
    User              = require("../models/user"),
    router            = express.Router({mergeParams: true});


// ---------------------- REVIEWS ROUTES -----------------------

// NEW ROUTE
router.get("/new", isLoggedIn, function(req, res) {
  // Find room
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      console.log(err);
    } else {
      // CHECK IF THE USER HAS BEEN THERE
      // Find the user and get their list of past rooms
      User.findById(req.user).populate({path:"bookings", populate: {path: "room", select: "_id"}}).exec(function(err, currentUser) {
        if(err) {
          console.log(err)
        } else {
          // Search the past rooms for the room we're trying to review
          var found = pastRooms(currentUser).find(function(room) {
            return foundRoom._id == room.id;
          });
          if (found !== undefined) {
            res.render("reviews/new", {room: foundRoom});
          }
          else {
            console.log("User can't review room!");
            res.render("account/bookings");
          }
        }
      });
    }
  });
});

// CREATE ROUTE
router.post("/", function(req, res) {
  Room.findById(req.params.id, function(err, room) {
    if(err) {
      console.log(err);
      res.redirect("/rooms");
    } else {
      Review.create(req.body.review, function(err, review) {
        if (err) {
          console.log(err);
        } else {
          // Add user and room details
          review.author.id = req.user._id;
          review.author.name = req.user.firstname;
          review.room = room._id;
          review.save();
          // Add to room
          room.reviews.push(review);
          room.save();
          // Add to user
          User.findById(req.user._id, function(err, foundUser) {
            foundUser.reviews.push(review);
            foundUser.save();
            req.flash('success', 'Thanks for your review!');
            res.redirect("/rooms/" + room._id);
          });
        };
      });
    };
  });
});

function isLoggedIn(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.session.returnTo = req.originalUrl;
    res.redirect("/login");
  }
}


function pastRooms(user) {
  var today = moment();
  var pastBookings = user.bookings.filter(function(booking) {
    return booking.exactTime < today;
  })
  var pastRooms = pastBookings.map(function(booking) {return booking.room});
  var uniquePastRooms = Array.from(new Set(pastRooms));
  return uniquePastRooms;
}

module.exports = router;
