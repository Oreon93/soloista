var express           = require("express"),
    bodyParser        = require("body-parser"),
    app               = express(),
    mongoose          = require("mongoose"),
    nodemailer        = require('nodemailer');
    async             = require('async');
    path              = require('path'),
    serveStatic       = require('serve-static'),
    methodOverride    = require('method-override'),
    expressSanitizer  = require('express-sanitizer'),
    Booking           = require("./models/booking");
    Room              = require("./models/room"),
    Review            = require("./models/review");
    User              = require("./models/user");
    Incident          = require("./models/incident");
    passport          = require("passport");
    LocalStrategy     = require("passport-local");
    passportLocalMongooose = require("passport-local-mongoose");
    moment            = require('moment');
    crypto            = require('crypto');
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
  next();
});

moment().format();
require('dotenv').config({path: __dirname + '/.env'})

app.set("view engine", "ejs");




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
      generateBookingsAll(foundRooms, app.locals.dateQuery, res);
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
  User.register(new User({email: req.body.email, username: req.body.email, mobile: req.body.mobile}), req.body.password, function(err, user) {
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
  failureRedirect: "/login",
  successFlash: "You have been logged in",
}), function(req,res) {
  var redirectTo = req.session.returnTo || '/account/bookings';
  delete req.session.returnTo;
  res.redirect(redirectTo);
});

app.get("/logout", function(req, res) {
  req.logout();
  req.flash('success', "You have been logged out");
  res.redirect("/");
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

app.get("/logincheck", function(req, res) {
  if (req.isAuthenticated()) {
    res.send("Logged in");
  } else {
    res.redirect("/login");
  }
})

app.post("/loginmodal", function(req, res) {
  var room = Room.findById(req.body.id, function(err, foundRoom) {
    res.render("loginmodal", {room: foundRoom, time: req.body.time});
  })
})

app.post("/loginandbook/:id/:time", passport.authenticate("local"), function(req, res) {
  res.redirect(307, "/rooms/"+ req.params.id + "/book/" + req.params.time );
});

// forgot password
app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          console.log("Can't find account");
          return res.redirect('/forgot');

        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        console.log("did it");
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          type: "OAuth2",
          user: "soloistamusic@gmail.com",
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          accessToken: process.env.ACCESS_TOKEN,
          refreshToken: process.env.REFRESH_TOKEN,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'soloistamusic@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      console.log(req.user);
      if (req.user) {
        // User is logged in so just reset the password
        if(req.body.password === req.body.confirm) {
          User.findById(req.user, function(err, user) {
            user.setPassword(req.body.password, function(err) {
              user.save(function(err) {
                done(err, user);
              });
            });
          });
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      }
      else {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;

              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      }
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        secure: false,
        auth: {
          user: 'soloistamusic@gmail.com',
          pass: 'bigshamu%123',
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'soloistamusic@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log("Mail should be sent!");
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/account/bookings');
  });
});


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


/*
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
*/


function filterByDate(req, res, date) {
  Room.find({ daysBookedOut: { $nin: date}}, function(err, foundRooms) {
    res.render("rooms/index", {rooms: foundRooms});
  })
}

/* ------------------- ACCOUNT AREA ----------------- */

app.get("/account/bookings", isLoggedIn, function(req, res) {
  var today = moment();
  User.findById(req.user).populate({path:"bookings", match: {exactTime: {$gte: today}}, populate: {path: "room", select: "name picture"}}).exec(function(err, foundUser) {
    if(err) {
      console.log(err)
    } else {
      console.log(foundUser);
      res.render("account/bookings", {theUser: foundUser});
    }
  });
});

// Updating account details
app.get("/account/settings", isLoggedIn, function(req, res) {
  User.findById(req.user, function(err, foundUser) {
    res.render("account/settings", {user: foundUser});
  });
});

app.put("/account/:id", function(req, res) {
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




app.get("/account/reset", isLoggedIn, function(req, res) {
  User.findById(req.user, function(err, foundUser) {
    res.render("account/reset", {user: foundUser});
  });
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


/* ------------------- RANDOM FUNCTIONs -------------------- */

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
