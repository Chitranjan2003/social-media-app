var express = require('express');
var router = express.Router();
const userModel = require("./users");
var postModel = require("./post")
const passport = require('passport');
const path = require("path");
const fs = require("fs");
var multer = require("multer")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res, next) {
  res.render('index');
});

router.post('/upload', isLoggedIn, upload.single("image"), function (req, res, next) {
  // upload ho chuki hai data req.file mein hai
  userModel.findOne({ username: req.session.passport.user })
    .then(function (founduser) {
      if (founduser.image !== 'def.png') {
        fs.unlinkSync(`./public/images/uploads/${founduser.image}`);
      }
      founduser.image = req.file.filename;
      founduser.save()
      .then(function () {
        res.redirect("back");
      })
    });
});
router.get('/edit/:username',isLoggedIn , function (req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then(function(foundUser){
    res.render("edit",{foundUser})
      })
});

router.get('/cheak/:username', function(req, res, next) {
  userModel.findOne({username:req.params.username})
  .then(function(user){
    if(user){
      res.json(true)
    }else{
      res.json(false)
    }
  })
});
router.post('/update',isLoggedIn ,function (req, res, next) {
  userModel.findOneAndUpdate({username:req.session.passport.user},{username:req.body.username},{new:true})
  .then(function(updateduser){
    req.login(updateduser, function(err) {
      if (err) { return next(err); }
      return res.redirect("/profile");
    });
  })
});

router.get('/profile', isLoggedIn, function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .populate("posts")
    .then(function (foundUser) {
      console.log(foundUser);
      res.render("profile", { foundUser })
    })
});

router.get('/like/:postid', isLoggedIn, function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (user) {
      postModel.findOne({ _id: req.params.postid })
        .then(function (post) {
          if (post.likes.indexOf(user._id) === -1) {
            post.likes.push(user._id);
          }
          else {
            post.likes.splice(post.likes.indexOf(user._id), 1);
          }

          post.save()
            .then(function () {
              res.redirect("back");
            })
        })
    })
});

router.post('/post', isLoggedIn, function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (user) {
      postModel.create({
        userid: user._id,
        data: req.body.post
      })
        .then(function (post) {
          user.posts.push(post._id);
          user.save()
            .then(function () {
              res.redirect("back");
            })
        })
    })
});

router.get('/feed', isLoggedIn, function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (user) {
      postModel.find()
        .populate("userid")
        .then(function (allposts) {
          res.render("feed", { allposts, user });
        });
    })
});

router.get('/login', function (req, res, next) {
  res.render("login");
});

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function (req, res, next) {
});

router.post('/register', function (req, res, next) {
  userModel.findOne({ username: req.body.username })
    .then(function (foundUser) {
      if (foundUser) {
        // will run if there is some user
        res.send("username already exists");
      }
      else {
        // will run if there is no use with same username 
        var newuser = new userModel({
          username: req.body.username,
          age: req.body.age,
          email: req.body.email,
          image: req.body.image,
        });

        userModel.register(newuser, req.body.password)
          .then(function (u) {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/profile");
            })
          });
      }
    });
});


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect("/login");
  }
}

module.exports = router;