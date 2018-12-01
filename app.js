var express           = require("express"),
    bodyParser        = require("body-parser"),
    app               = express(),
    mongoose          = require("mongoose"),
    nodemailer        = require('nodemailer'),
    async             = require('async'),
    path              = require('path'),
    serveStatic       = require('serve-static'),
    methodOverride    = require('method-override'),
    expressSanitizer  = require('express-sanitizer'),
    Booking           = require("./models/booking"),
    Room              = require("./models/room"),
    Review            = require("./models/review"),
    User              = require("./models/user"),
    Incident          = require("./models/incident"),
    passport          = require("passport"),
    LocalStrategy     = require("passport-local"),
    passportLocalMongooose = require("passport-local-mongoose"),
    moment            = require('moment'),
    crypto            = require('crypto'),
    flash             = require('connect-flash');

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
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.successMessage = req.flash("success");
  res.locals.errorMessage = req.flash("error");
  res.locals.destination = null;
  res.locals.moment = moment;
  next();
});

moment().format();
require('dotenv').config({path: __dirname + '/.env'})

app.set("view engine", "ejs");

var roomsRoutes = require("./routes/rooms"),
    reviewsRoutes = require("./routes/reviews"),
    accountRoutes = require("./routes/account"),
    indexRoutes = require("./routes/index");
/*

    bookingsRoutes = require("./routes/bookings");

app.use(reviewsRoutes);
app.use(bookingsRoutes);
*/
app.use("/rooms", roomsRoutes);
app.use("/account", accountRoutes);
app.use("/rooms/:id/reviews", reviewsRoutes);
app.use("/", indexRoutes);

// LANDING PAGE
app.get("/", function(req, res) {
  res.render("landing");
});


// ---------------------- INCIDENTS ROUTES -----------------------


// NEW ROUTE
app.get("/bookings/:id/incidents/new", function(req, res) {
  Booking.findById(req.params.id, function(err, foundBooking) {
    if (err) {
      console.log(err);
    } else {
      res.render("incidents/new", {booking: foundBooking});
    }
  });

});

// CREATE ROUTE
app.post("/bookings/:id/incidents", function(req, res) {
    Booking.findById(req.params.id, function(err, foundBooking) {
      console.log(foundBooking);
      Incident.create({
        text: req.body.incident.text,
        booking: foundBooking,
        status: "Pending"
      }, function(err, incident) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/account/bookings");
        }
      });
    });
});

// ------------ NEW BOOKING LOGIC!!! -----------

app.post("/rooms/:id/book/:time", function(req, res) {
  Room.findById(req.params.id, function(err, room) {
    if (err) {
      console.log(err);
    }
    else {
      var existingDay = room.bookings.find(function(booking) {
        return booking.bookingDate == app.locals.dateQuery;
      });
      var bookingDay;
      if (existingDay) {
        bookingDay = existingDay;
          bookingDay.slots.push(req.params.time);
      } else {
        // Else create newDay
        bookingDay = {
          bookingDate: app.locals.dateQuery,
          bookedOut: false,
          slots: [req.params.time],
        }
        room.bookings.push(bookingDay);
      };
      // Checks if day is now fully booked
      if (bookingDay.slots.length == 12) {
        bookingDay.bookedOut = true;
      };
      room.save();
      // Create booking
      Booking.create({
        room: room,
        exactTime: moment(app.locals.dateQuery, "MM-DD-YYYY").add(req.params.time,"hours"),
        date: app.locals.dateQuery,
        time: req.params.time,
        status: "Pending",
        code: makeid(),
      }, function(err, booking) {
        User.findById(req.user._id, function(err, user) {
          booking.user = user;
          user.bookings.push(booking);
          user.save();
        });
        console.log("The exact time is: " + booking.exactTime);
        req.flash("success", "Great! Your room is booked and we've sent the access code to your phone. You can see all of your bookings and access codes on this page.");
        res.redirect("/account/bookings");
        ////Somehow get the User ID then add the booking to them!
        ////Redirect to their bookings page!
      });
    }
  });

})

function filterByDate(req, res, date) {
  Room.find({ daysBookedOut: { $nin: date}}, function(err, foundRooms) {
    res.render("rooms/index", {rooms: foundRooms});
  })
}

app.post("/loginmodal", function(req, res) {
  var room = Room.findById(req.body.id, function(err, foundRoom) {
    res.render("loginmodal", {room: foundRoom, time: req.body.time});
  })
})

app.post("/loginandbook/:id/:time", passport.authenticate("local"), function(req, res) {
  res.redirect(307, "/rooms/"+ req.params.id + "/book/" + req.params.time );
});

app.delete("/bookings/:id", function(req, res) {
  Booking.findByIdAndRemove(req.params.id, function(err, booking) {
    if (err) {
      res.redirect("/rooms");
    } else {
      Room.findById(booking.room, function(err, room) {
        var dateToDeleteFrom = room.bookings.find(function(individualBooking) {
          return individualBooking.bookingDate == booking.date;
        });
        var filteredSlots = dateToDeleteFrom.slots.filter(function(e) { return e !== booking.time });
        dateToDeleteFrom.slots = filteredSlots;
        room.save();
      });
      res.redirect("/account/bookings");
    }
  });
});


/* ------------------- OTHER ROUTES ----------------- */

app.get("/soloistaplus", isLoggedIn, function(req, res) {
  res.render("soloistaplus", {isLoggedIn: "Hello"});
})

app.listen(3000);

/* ------------------- RANDOM FUNCTIONS -------------------- */

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
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
