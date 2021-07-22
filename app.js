const express = require("express");
const app = express();
const port = 3000;
const { Sequelize } = require('sequelize');


const sequelize = new Sequelize('postgres://postgres:sam@localhost:5432/mydb') // Example for postgres

const property = sequelize.define('property',{
id: {
  field: 'PropertyId',
  type: String,
  primaryKey: true,
}
})


const { Client } = require("pg");

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "mydb",
  password: "sam",
});

client.connect();

var start = '01-01-2021';
var end = '01-02-2020';
var type = 'hey';
var months = 'sup';

//pass json request
var json = {
  city: "Dubai",
  date: { start, end },
  flexible: { type, months },
  apartmentType: null,
  amenities: ["WiFi", "Pool"],
};

//city is a mandatory feild

//either date or flexible is accepted

//Amenities filters the units that support the requested values

//apartmentType is optional

app.get('/', (req, res) => {
    client.query("SELECT id, city FROM test.building;", (err, response) => {
    console.log(err, res);
    res.send(response)
    client.end();
  });

  
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
