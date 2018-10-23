var express           = require("express"),
    bodyParser        = require("body-parser"),
    app               = express(),
    mongoose          = require("mongoose"),
    path              = require('path'),
    serveStatic       = require('serve-static'),
    methodOverride    = require('method-override'),
    expressSanitizer  = require('express-sanitizer'),
    Booking           = require("./models/booking");
    Room              = require("./models/room"),
    Review            = require("./models/review");
    User              = require("./models/user");
    passport          = require("passport");
    LocalStrategy     = require("passport-local");
    passportLocalMongooose = require("passport-local-mongoose");
    moment            = require('moment');

mongoose.connect("mongodb://localhost/soloista");
app.use('/static', express.static('public'));
// app.use("/rooms/static", express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));
app.use(require("express-session")({
    secret: "Anything you want here",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});
moment().format();

app.set("view engine", "ejs");

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Models

/*
Room.create({
  name: "Balmes Suite",
  location: "Eixample",
  description: "Superior space equipped with a Steinway grand piano",
  price_per_hour: 8,
  picture: "pianoroom3.jpg",
}, function(err, room) {
  if (err) {
    console.log(err);
  } else {
    console.log(room);
  }
}
);
*/

// Routes

// LANDING PAGE
app.get("/", function(req, res) {
  res.render("landing");
});

// SEARCH ROUTE
app.get("/rooms/search", function(req, res) {
  app.locals.dateQuery = req.query.date.replace(/\//ig, "-");
  Room.find({bookings: {$not: {$elemMatch: {$and: [{bookingDate: app.locals.dateQuery}, {bookedOut: true}]}}}}, function(err, foundRooms) {
    if(err) {
      console.log(err)
    } else {
      console.log(foundRooms);
      console.log(typeof(req.query.date));
      generateBookingsAll(foundRooms, app.locals.dateQuery, res);
      var newDate = req.query.date.replace(/\//ig, "-");
      app.locals.dateQuery = newDate;
      console.log(app.locals.dateQuery + "is the dateQuery");
      res.render("rooms/search", {rooms: foundRooms});
    }
  });
});


// INDEX ROUTE
app.get("/rooms", function(req, res) {
  Room.find({}).populate("reviews").exec(function(err, rooms) {
    if (err) {
      console.log(err);
    } else {
      res.render("rooms/index", {rooms: rooms});
    }
  });
});


// NEW ROUTE
app.get("/rooms/new", function(req, res) {
  res.render("rooms/new");
});

/// CREATE ROUTE
app.post("/rooms", function(req, res) {
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
app.get("/rooms/:id", function(req,res) {
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
app.get("/rooms/:id/edit", function(req, res) {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      res.redirect("/rooms");
    } else {
      res.render("rooms/edit", {room: foundRoom});
    }
  });
});

// UPDATE ROUTE
app.put("/rooms/:id", function(req, res) {
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
app.delete("/rooms/:id", function(req, res) {
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
    } else {
      var thisDaysBookings = foundRoom.bookings.find(function(booking) {
        return booking.bookingDate == req.session.dateQuery;
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
}

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


// ---------------------- AUTH ROUTES ------------------------

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  User.register(new User({username: req.body.username}), req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      return res.render("register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login"
}), function(req,res) {
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

function isLoggedIn(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}

app.get("/logincheck", function(req, res) {
  if (req.isAuthenticated()) {
    res.send("Logged in");
  } else {
    res.redirect("/login");
  }
})

app.post("/loginmodal", function(req, res) {
  var room = Room.findById(req.body.id, function(err, foundRoom) {
    res.render("loginmodal", {room: foundRoom});
  })
})

// ---------------------- REVIEWS ROUTES -----------------------

// NEW ROUTE
app.get("/rooms/:id/reviews/new", function(req, res) {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      console.log(err);
    } else {
      res.render("reviews/new", {room: foundRoom});
    }
  });

});

// CREATE ROUTE
app.post("/rooms/:id/reviews", function(req, res) {
  Room.findById(req.params.id, function(err, room) {
    if(err) {
      console.log(err);
      res.redirect("/rooms");
    } else {
      Review.create(req.body.review, function(err, review) {
        if (err) {
          console.log(err);
        } else {
          console.log(review);
          room.reviews.push(review);
          room.save();
          res.redirect("/rooms/" + room._id);
          console.log(room);
        }
      })
    }
  })
});


/* ------------------- BOOKING ROUTES --------------- */

/*
app.get("/rooms/:id/book", function(req, res) {
  Room.findById(req.params.id).exec(function(err, foundRoom) {
    if(err) {
      console.log(err);
    } else {
      res.render("rooms/book", {room: foundRoom});
    }
  });
});
*/

app.post("/rooms/:id/book/:time", function(req, res) {
  generateBookings(req, res, function(){
    console.log(res.locals.bookings);
    if (res.locals.bookings.slots) {
      if (res.locals.bookings.slots.indexOf(req.params.time) !== -1) {  // Slot already booked //
        console.log("Already booked!");
        console.log(res.locals.bookings);
        res.redirect("/");
      }
    } else {
      Room.findById(req.params.id, function(err, room) {
        if (err) {
          console.log(err);
        } else {
          Booking.create({
            date: moment(app.locals.dateQuery).add(req.params.time, "hours"),
            status: "Pending",
            code: "H1J4D8E"
          }, function(err, booking) {
            // Check if day already created
            var existingDay = room.bookings.find(function(booking) {
              return booking.bookingDate == app.locals.dateQuery;
            })
            var bookingDay;
            if (existingDay) {
              bookingDay = existingDay;
                bookingDay.slots.push(req.params.time);
            } else {
            // Else create newDay
              bookingDay = {
                bookingDate: app.locals.dateQuery,
                bookedOut: false,
                slots: [],
              }
              bookingDay.slots.push(req.params.time);
              room.bookings.push(bookingDay);
            }
            console.log("the time booked for was" + bookingDay.bookingDate);
            // Checks if day is now fully booked
            if (bookingDay.slots.length == 12) {
              bookingDay.bookedOut = true;
            }
            console.log(room.bookings);
            room.save();
            res.redirect("/");
          });
        }
      })
    }
  });
});



function filterByDate(req, res, date) {
  Room.find({ daysBookedOut: { $nin: date}}, function(err, foundRooms) {
    res.render("rooms/index", {rooms: foundRooms});
  })
}


/* ------------------- OTHER ROUTES ----------------- */

app.get("/soloistaplus", isLoggedIn, function(req, res) {
  res.render("soloistaplus", {isLoggedIn: "Hello"});
})



app.listen(3000);
