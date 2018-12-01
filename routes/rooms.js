var express           = require("express"),
    Room              = require("../models/room"),
    router            = express.Router({mergeParams: true});


// SEARCH ROUTE
router.get("/search", function(req, res) {
  req.app.locals.dateQuery = req.query.date.replace(/\//ig, "-");
  console.log(req.app.locals.dateQuery);
  Room.find({bookings: {$not: {$elemMatch: {$and: [{bookingDate: req.app.locals.dateQuery}, {bookedOut: true}]}}}}, function(err, foundRooms) {
    if(err) {
      console.log(err);

    } else {
      generateBookingsAll(foundRooms, req.app.locals.dateQuery, res);
      res.render("rooms/search", {rooms: foundRooms});
    }
  });
});

// INDEX ROUTE
router.get("/", function(req, res) {
  Room.find({}).populate("reviews").exec(function(err, rooms) {
    if (err) {
      console.log(err);
    } else {
      res.render("rooms/index", {rooms: rooms});
    }
  });
});


// NEW ROUTE
router.get("/new", isLoggedIn, checkIfAdmin, function(req, res) {
  res.render("rooms/new");
});

/// CREATE ROUTE
router.post("/", function(req, res) {
  req.body.room.description = req.sanitize(req.body.room.description);
  Room.create(req.body.room, function(err, newlyCreated) {
    if(err) {
      console.log(err);
    } else {
      newlyCreated.bookings = [];
      newlyCreated.save();
      console.log(newlyCreated);
      res.redirect("/rooms");
    }
  });
});

// SHOW ROUTE
router.get("/:id", function(req,res) {
  generateBookings(req,res, function() {
    Room.findById(req.params.id).populate("reviews").exec(function(err, foundRoom) {
      if(err) {
        console.log(err)
      } else {
        res.render("rooms/show", {room: foundRoom});
      }
    });
  });
});

// EDIT ROUTE
router.get("/:id/edit", isLoggedIn, checkIfAdmin, function(req, res) {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      res.redirect("/rooms");
    } else {
      res.render("rooms/edit", {room: foundRoom});
    }
  });
});

// UPDATE ROUTE
router.put("/:id", function(req, res) {
  req.body.room.description = req.sanitize(req.body.room.description);
  Room.findByIdAndUpdate(req.params.id, req.body.room, function(err, updatedRoom) {
    if (err) {
      res.redirect("/rooms");
    } else {
      res.redirect("/rooms/" + req.params.id);
    }
  })
})

// DELETE ROUTE
router.delete("/:id", isLoggedIn, checkIfAdmin, function(req, res) {
  Room.findByIdAndRemove(req.params.id, function(err) {
    if (err) {
      res.redirect("/rooms");
    } else {
      res.redirect("/rooms");
    }
  })
});




// FILTERING MIDDLEWARE
function generateBookings(req, res, next) {
  var room = Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      console.log(err);
      console.log("ohno!!");
    } else {
      var thisDaysBookings = foundRoom.bookings.find(function(booking) {
        return booking.bookingDate == req.app.locals.dateQuery;
      });
      if (!thisDaysBookings) {
        res.locals.bookings = [];
      } else {
        res.locals.bookings = thisDaysBookings;
      }
      console.log(res.locals.bookings);
      next();
    }
  });
};

function generateBookingsAll(rooms, date, res) {
  var bookings = [];
  rooms.forEach(function(room) {
    var thisDaysBookings = room.bookings.find(function(booking) {
      return booking.bookingDate == date;
    });
    var slots;
    if (thisDaysBookings) {
      slots = thisDaysBookings.slots
    } else {
      slots = [];
    }
    bookings.push({
      id: room.id,
      bookings: slots
    });
  });
  res.locals.bookings = bookings;
  console.log(bookings);
}

function checkIfAdmin(req, res, next){
  if (req.user.isAdmin) {
    return next();
  } else {
    res.redirect("/");
  }
}

function isLoggedIn(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.session.returnTo = req.originalUrl;
    console.log(req.originalUrl);
    res.redirect("/login");
  }
}

module.exports = router;
