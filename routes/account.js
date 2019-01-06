var express           = require("express"),
    User              = require("../models/user"),
    router            = express.Router({mergeParams: true});
    moment            = require("moment");


/* ------------------- ACCOUNT AREA ----------------- */

// ACCOUNT BOOKINGS PAGE
router.get("/bookings", isLoggedIn, function(req, res) {
  var today = moment();
  User.findById(req.user)
    .populate({path:"bookings", options: {sort: {"exactTime": 1}}, populate: {path: "room", select: "name picture"}})
    .populate({path:"reviews", select: "room"})
    .exec(function(err, foundUser) {
    if(err) {
      console.log(err)
    } else {
      upcomingBookings = foundUser.bookings.filter(function(booking) {
        return booking.exactTime > today;
      });
      uniquePastRooms = pastRooms(foundUser.toObject());
      // Add which rooms the user has already reviewed, so the user isn't asked again to review them
      pastRoomsAndReviews = indicateWhichReviewed(uniquePastRooms, foundUser.reviews);
      res.render("account/bookings", {user: foundUser, upcomingBookings: upcomingBookings, pastRoomsAndReviews: pastRoomsAndReviews});
    }
  });
});

// ACCOUNT SETTINGS PAGE
router.get("/settings", isLoggedIn, function(req, res) {
  User.findById(req.user, function(err, foundUser) {
    res.render("account/settings", {user: foundUser});
  });
});

// UPDATE ACCOUNT DETAILS
router.put("/:id", function(req, res) {
  User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser) {
    if (err) {
      req.flash("error", "There was a problem with saving your details");
      res.redirect("/account/settings");
    } else {
      req.flash("success", "Your changes have been saved.");
      res.redirect("/account/settings");
    }
  })
})

// RESET PASSWORD PAGE FOR LOGGED IN USERS
router.get("/reset", isLoggedIn, function(req, res) {
  User.findById(req.user, function(err, foundUser) {
    res.render("account/reset", {user: foundUser});
  });
});

function isLoggedIn(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.session.returnTo = req.originalUrl;
    console.log(req.originalUrl);
    res.redirect("/login");
  }
}

function pastRooms(user) {
  var today = moment();
  var pastBookings = user.bookings.filter(function(booking) {
    return booking.exactTime < today;
  })
  var pastRooms = pastBookings.map(function(booking) {return booking.room});
  var uniquePastRooms = uniqueFilterer(pastRooms)
  return uniquePastRooms;
}

function indicateWhichReviewed(rooms, reviews) {
  rooms.forEach(function(room) {
    var alreadyReviewed = reviews.find(function(review) {
      // These are both objects so we can't really use the inbuilt mongoose "equals" function)
      var room_id = JSON.stringify(room._id);
      var review_id = JSON.stringify(review.room);
      return room_id == review_id;
    });
    if (alreadyReviewed !== undefined) {
      room.hasReview = true;
    };
  });
  return rooms;
}

function uniqueFilterer(arr) {
  var f = []
  return arr.filter(function(n) {
    return f.indexOf(n.name) == -1 && f.push(n.name)
  })
}


module.exports = router;
