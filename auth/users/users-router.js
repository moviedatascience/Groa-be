const bcrypt = require("bcryptjs");
const express = require("express");
const axios = require("axios");
const { signToken, authToken } = require("../authenticate-middleware.js");
const router = express.Router();

const Users = require("./users-model");

// REGISTER/LOGIN
router.post("/register", (req, res) => {
  let userData = req.body;
  const hash = bcrypt.hashSync(userData.password, 8);
  userData.password = hash;
  Users.findBy( userData.user_name )
  .then(user => {
    if(!user) {
      Users.add(userData)
      .then(user => {
          res.status(200).json({
            message: `Registration successful ${user.user_name}!`,
            user_name: user.user_name,
            id: user.id
          });
      })
    } else {
      res.status(400).json({ errorMessage: "Username already in use!" });
    }
  })
    .catch(error => {
      res.status(500).json({ errorMessage: "Failed to register new user" });
    });
});

router.post("/login", (req, res) => {
  let { user_name, password } = req.body;
  Users.findBy( user_name )
    .then(user => {
      if (user && bcrypt.compareSync(password, user.password)) {
        const token = signToken(user);
        res.status(200).json({
          message: `${user.user_name} Logged In!`,
          token,
          id: user.id
        });
      } else {
        res.status(401).json({ errorMessage: "Invalid credentials!" });
      }
    })
    .catch(error => {
      res.status(500).json({ errorMessage: "Failed to retrieve credentials " });
    });
});

// GET specific User's recommendations /api/users/:id/recommendations
router.get("/:id/recommendations", async (req, res) => {
  const { id } = req.params;

 await Users.getUserRecommendations(id)
    .then(recommendations => {
      if (recommendations) {
        res.status(200).json(recommendations);
      } else {  
        axios.post(
        process.env.RECOMMENDER_URL,
        {
          "user_id": id,
          "number_of_recommendations": 50,
          "good_threshold": 5,
          "bad_threshold": 4,
          "harshness": 1
        }, 
        {headers: {"Content-Type":"application/json"}}
        )
        .then( response => {
          if(response.data === "user_id not found" || response.data === "user_id not found in IMDB ratings or Letterboxd ratings"){
            res.status(404).json({ message: "Recommendations not available at this time, try adding your Letterboxd data."})
          }
          Users.getUserRecommendations(id)
          .then(recommendations => {
            res.status(200).json(recommendations)
          })
        })
      }
    })
    .catch(error => {
      res.status(500).json({ error, errorMessage: "Could not retrieve any recommendations for your account."});
    });
});

module.exports = router;
