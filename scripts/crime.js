
var mongoose = require("mongoose");
var promisify = require("../helpers/promisify");
var fs = require("fs");
var path = require("path");
var parse = require("csv-parse");
var bluebird = require("bluebird")

mongoose.Promise = bluebird;
mongoose.connect("mongodb://localhost/homey", {useMongoClient: true});
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.once('open', function(){

  require("../models")();
  var Hood = mongoose.model("Hood");

  function get_neighbourhood_if_exists(nid){
    return promisify.m(Hood, 'find', {nid: nid})
      .then(function(results){
        if (results.length === 0) {
          throw "Ayy lmao neighbourhood doesn't exist";
        }
        return Promise.resolve(results[0]);
      })
  };

  promisify.m(fs, 'readFile', path.join(__dirname, "./crime.csv"))
    .then((rawCsv) => {
      return promisify.f(parse, rawCsv)
    })
    .then((csv) => {
      return Promise.all(csv.map((hood) => {
        var nid = hood[1];
        var crimes = hood[14];
        return get_neighbourhood_if_exists(nid)
          .then((hood) => {
            hood.scores.push({category: "crime", value: crimes});
            return promisify.m(hood, 'save');
          });
      }));
    })
    .then(() => {
      process.exit();
    })
    .catch((err) => {
      console.error(err);
    });
});