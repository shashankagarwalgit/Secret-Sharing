//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passLocalMongo = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

mongoose.connect("mongodb+srv://shashankdev:Test123456@cluster0.gwlbr3g.mongodb.net/userDB?retryWrites=true" , {useNewUrlParser: true});
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
    secret: 'shasha@12',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: [String]
});

userSchema.plugin(passLocalMongo);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User" , userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id).then((user)=>{
        done(null, user);
    });

});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://ershashankgit-humble-goldfish-45r94w7w9ww355wp-3000.preview.app.github.dev/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/" , function(req,res){
    res.render("home");
});

app.get("/auth/google" ,
    passport.authenticate("google" , {scope: ["profile"]})
    );

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login" , function(req,res){
    res.render("login");
});

app.get("/register" , function(req,res){
    res.render("register");
});

app.get("/secrets" , function(req,res){
    if(req.isAuthenticated()){
        User.find({ _id: req.user.id}, "secret").then((foundUsers)=>{
            res.render("secrets", {userwithSecrets: foundUsers});
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/submit" , function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }

});

app.post("/submit" , function(req,res){
    const submitSecret = req.body.secret;
    User.findById(req.user.id).then((foundUser)=>{
        foundUser.secret.push(submitSecret);
        foundUser.save().then(()=>{
            res.redirect("/secrets");
        });
    });
});

app.get("/logout" , function(req,res){
    req.logOut(function () { console.log('Done logging out.'); });
    res.redirect("/");
    
});

app.post("/register" , function(req,res){
   User.register({username: req.body.username}, req.body.password ,function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });

    }
   });
});

app.post("/login" , function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    });
    
});

app.listen(3000 , function(){
    console.log("Server started at 3000");
});
