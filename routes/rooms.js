var express           = require("express"),
    Room              = require("../models/room"),
    multer            = require('multer'),
    fs                = require("fs"),
    stripe            = require("stripe")("sk_test_XWYQA8D09xYv2tHRcklTveuy"),
    router            = express.Router({mergeParams: true});

// Configure image storage
var imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/images')
  },
  filename: function (req, file, cb) {
    cb(null, "torename.png")
  }
});
var upload = multer({ storage: imageStorage})

// SEARCH ROUTE
router.get("/search", function(req, res) {
  if (req.query.date) {
    req.app.locals.dateQuery = req.query.date.replace(/\//ig, "-");
  }
  console.log(req.app.locals.dateQuery);
  Room.find({bookings: {$not: {$elemMatch: {$and: [{bookingDate: req.app.locals.dateQuery}, {bookedOut: true}]}}}}).populate("reviews").exec(function(err, foundRooms) {
    if(err) {
      console.log(err);
    } else {
      var bookings = generateBookingsAll(foundRooms, req.app.locals.dateQuery, res);
      var locations = generateLocations(foundRooms);
      console.log(foundRooms);
      res.render("rooms/search", {rooms: foundRooms, bookings: bookings, locations: locations});
    }
  });
});

// SEARCH REFRESH ROUTE
router.get("/search-refresh", function(req, res) {
  console.log(req.query.priceMin);
  req.app.locals.dateQuery = req.query.date;
  Room.find({$and: [{bookings: {$not: {$elemMatch: {$and: [{bookingDate: req.query.date}, {bookedOut: true}]}}}}, {$and: [{price_per_hour: {$gte: req.query.priceMin}}, {price_per_hour:{$lte: req.query.priceMax}}]}]}).populate("reviews").exec(function(err, foundRooms) {
    if(err) {
      console.log(err);
    } else {
      var bookings = generateBookingsAll(foundRooms, req.query.date, res);
      console.log("these were the found rooms");
      if (req.query.view == "list") {
        console.log("list view loaded");
        res.render("search-results", {rooms: foundRooms, bookings: bookings});
      } else {
        console.log("map view loaded");
        res.render("search-results-map-view", {rooms: foundRooms, bookings: bookings});
      };
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

// PAY ROUTE
router.get("/pay", function(req,res) {
  Room.findById(req.query.id, function(err, foundRoom) {
    var time = req.query.time;
    res.render("rooms/pay", {room: foundRoom, time:time});
  });
});

// NEW ROUTE
router.get("/new", isLoggedIn, checkIfAdmin, function(req, res) {
  res.render("rooms/new");
});

/// CREATE ROUTE
router.post("/", upload.single('roomImage'), function(req, res) {
  var coordinates = [req.body.room.long, req.body.room.lat];
  req.body.room.description = req.sanitize(req.body.room.description);
  Room.create({
    longLat: { type: 'Point', coordinates: coordinates},
    name: req.body.room.name,
    description: req.sanitize(req.body.room.description),
    location: req.body.room.location,
    price_per_hour: req.body.room.price_per_hour,
    picture: req.body.room.picture
  }, function(err, newlyCreated) {
    if(err) {
      console.log(err);
    } else {
      newlyCreated.bookings = [];
      // Rename the image file
      var imagePath = 'public/uploads/images/' + newlyCreated.id + ".png"
      fs.rename('public/uploads/images/torename.png', imagePath, function(err) {
        if ( err ) console.log('ERROR: ' + err);
      });
      newlyCreated.picture = imagePath;
      newlyCreated.save();
      console.log(newlyCreated);
      res.redirect("/rooms");
    };
  });
});

// SHOW ROUTE
router.get("/:id", function(req,res) {
  Room.findById(req.params.id).populate("reviews").exec(function(err, foundRoom) {
    if(err) {
      console.log(err)
    } else {
      console.log(req.app.locals.dateQuery + "is the date query");
      var bookings = generateBookings(foundRoom, req.app.locals.dateQuery, res);
      res.render("rooms/show", {room: foundRoom, bookings: bookings});
    }
  });
});

// SHOW BOOKINGS REFRESH ROUTE
router.get("/:id/bookings-refresh", function (req, res) {
  console.log("the date query is " + req.query.date);
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      consol.log(err);
    } else {
      console.log(foundRoom);
      console.log(req.date + "is the date query");
      var bookings = generateBookings(foundRoom, req.query.date, res);
      console.log(bookings);
      res.render("bookings-refresh", {room: foundRoom, bookings: bookings});
    }
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
router.put("/:id", upload.single('roomImage'), function(req, res) {
  console.log(req.body);
  var coordinates = [req.body.room.long, req.body.room.lat];
  Room.findById(req.params.id, function(err, room) {
    if (err) {
      res.redirect("/rooms");
    } else {
      room.longLat = { type: 'Point', coordinates: coordinates};
      room.name = req.body.room.name;
      room.description = req.sanitize(req.body.room.description);
      room.price_per_hour = req.body.room.price_per_hour;
      room.location = req.body.room.location;
      // Image stuff
      var imagePath = 'public/uploads/images/' + room.id + ".png"
      fs.rename('public/uploads/images/torename.png', 'public/uploads/images/' + room.id + ".png", function(err) {
        if ( err ) console.log('ERROR: ' + err);
      });
      room.picture = 'uploads/images/' + room.id + ".png";

      room.save();
      res.redirect("/rooms/" + req.params.id);
    }
  });
});

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




// MIDDLEWARE

/* The searchRooms function returns a list of rooms that are filtered depending on user's query.
- It is designed to work with the search dialog on the home page as well as the search page. This means it can work without the user setting their price range or features explicitly.*/
function searchRooms(filters) {

}






function generateBookings(room, date, res) {
  var bookings;
  var thisDaysBookings = room.bookings.find(function(booking) {
    return booking.bookingDate == date;
  });
  if (thisDaysBookings) {
    bookings = thisDaysBookings.slots;
  } else {
    bookings = [];
  }
  console.log(thisDaysBookings);
  return bookings;
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
  return bookings;
  //res.locals.bookings = bookings;
  //console.log(bookings);
};

function generateLocations(rooms) {
  return rooms.map(function(room) {
    var location = {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": room.longLat.coordinates
      },
      "properties": {
        "title": room.name,
        "icon": "harbor"
      },
    };
  return location;
  });
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

function getCoordinates(rooms) {
  var geoJSON = [];
  rooms.forEach(function(room) {
  });
}

module.exports = router;
