var express = require('express');
var admin = require('firebase-admin');
var bodyParser = require('body-parser');
var moment = require('moment');
var _ = require('lodash');
var url = require('url');

// ---------------------------------------------------
// Firebase Config
// ---------------------------------------------------
var serviceAccount = require('../private/fb.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://missile-launch-bb06a.firebaseio.com'
});
var db = admin.database();
var sightingsRef = db.ref('sightings');

var app = express();

app.get('/', function (req, res) {
   res.send('Hello World');
})

// ---------------------------------------------------
// Add bear sighting to Firebase
// ---------------------------------------------------

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/sighting', urlencodedParser, function (req, res) {
  var new_sighting = {
    created_at: Date.now(),
    bear_type: req.body.bear_type,
    location_description: req.body.location_description,
    bear_num: req.body.bear_num,
  }
  // Add new sighting to firebase
  // if its successful, "refresh" page
  // if it errors, respond with error message
  sightingsRef.push(new_sighting, function(error) {
    if(error)
      res.send('Could not add new sighhting, error:', error);
    else
      res.redirect('http://127.0.0.1:3000/');
  })
});


// ---------------------------------------------------
// Return array of bear sightings from Firebase
// ---------------------------------------------------

app.get('/sighting/search', function (req, res) {

  // get query params, right now only sort. no filter
  var url_parts = url.parse(req.url, true);
  var order_by = url_parts.query.order_by;
  var order_direction = url_parts.query.order_direction;

  // Fetch All sightings from firebase, no listener
  sightingsRef.once('value', function(snapshot) {
    var sightings_array = []
    snapshot.forEach(function(data) {
      var sighting = {
        id: data.key,
        bear_type: data.val().bear_type || 'No Type' ,
        location_description: data.val().location_description || 'No Location!!!' ,
        bear_num: data.val().bear_num || 'No count!!!' ,
        created_at: moment(data.val().created_at).format('YYYY-MM-DD h:mm:ss a') || 'No date!!!' ,
      }
      sightings_array.push(sighting)
    })
    // Sort the array based on query params
    var sorted_array = _.orderBy(sightings_array,[order_by], [order_direction])
    var response_json = JSON.stringify(sorted_array)

    // This is needed for cross domain access because client runs on different port
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(response_json);
  });
})


// ---------------------------------------------------
// Return JSON object for specific sighting ID
// ---------------------------------------------------

app.get('/sighting/:id', function (req, res) {

  var sighting_id = req.params.id

  sightingsRef.child(sighting_id).once('value', function(snapshot) {
    var response_json = null
    if(snapshot.val()) {
      response_json = snapshot.val()
    }
    response_json = JSON.stringify(response_json)
    // This is needed for cross domain access because client runs on different port
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(response_json);
  });
})


var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("API app listening at http://%s:%s", host, port)
})
