var express                = require("express"),
    User                   = require("../models/user"),
    nodemailer             = require('nodemailer'),
    async                  = require('async'),
    passport               = require("passport"),
    LocalStrategy          = require("passport-local"),
    passportLocalMongooose = require("passport-local-mongoose"),
    crypto                 = require('crypto'),
    moment                 = require('moment'),
    router                 = express.Router({mergeParams: true});


// ---------------------- AUTH ROUTES ------------------------

router.get("/register", function(req, res) {
  res.render("register");
});

router.post("/register", function(req, res) {
  User.register(new User({email: req.body.email, username: req.body.email, mobile: req.body.mobile}), req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      res.render("register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("account/bookings");
      });
    }
  });
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.post("/login", passport.authenticate("local", {
  failureRedirect: "/login",
  successFlash: "You have been logged in",
}), function(req,res) {
  var redirectTo = req.session.returnTo || '/account/bookings';
  delete req.session.returnTo;
  res.redirect(redirectTo);
});

router.get("/logout", function(req, res) {
  req.logout();
  req.flash('success', "You have been logged out");
  res.redirect("/");
});


router.get("/logincheck", function(req, res) {
  if (req.isAuthenticated()) {
    res.send("Logged in");
  } else {
    res.redirect("/login");
  }
})



// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
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

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
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
