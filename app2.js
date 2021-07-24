const express = require("express");
const sequelize = require("./database/config");
const { Op, where } = require("sequelize");

var moment = require("moment-business-days");

var initModels = require("./models/init-models");
const { Sequelize } = require("./database/config");
const reservation = require("./models/reservation");

var models = initModels(sequelize);

const app = express();
const port = 3001;

city = "Dubai"; //"city" is mandatory to set
atype = "2bdr"; //"apartmentType" is optional
amenities = ["WiFi", "Parking"]; //"Amenities" filters the units that support the requested values

//the program can take one of "date" or "flexible" but not both
var start = new Date("2021-06-01");
var end = new Date("2021-06-03");

type = "week"; //flexible.type can be one of "weekend", "week" or "month"
mon = ["may", "jun"]; //flexible.months is an array of 3-letter months, for example: ["may", "jun", ..]

//So submitting flexible {type: "week", months: ["may", "jun"]} tells the service to find a unit that is available for at least a week during May or June.
//Weekends vary across cities, so if you're checking for a Dubai weekend, that would be Fri & Sat, but if it's Montreal for example, then it's Sat & Sun.

// Note: when checking a unit availability, query both test.reservation & test.availability, if a unit has a reservation on an overlapping date range, or if it's
// manually blocked (for example: for maintenance) and has an entry with is_blocked set to true with an overlapping start_date & end_date in test.availability

app.get("/", async (req, res) => {
  var whereCondition = {};

  if (atype.length > 0) {
    console.log(atype);
    whereCondition["property_type"] = atype;
  }

  //this query filters properties by city and optional values enterd into the where condition
  query_b = {
    where: {
      city: city,
    },
    include: [
      {
        model: models.property,
        as: "properties",
        where: whereCondition,
        include: [
          {
            model: models.reservation,
            as: "reservations",
          },
          {
            model: models.availability,
            as: "availabilities",
          },
        ],
      },
    ],
  };

  //I am assuming 1 city must be selected, not both
  const js = await models.building.findOne(query_b);

  //for selected dates check reservations and avalibilites to make sure there is no overlap
  start = moment("2021-04-01", "YYYY-MM-DD");
  end = moment("2021-06-1", "YYYY-MM-DD");

  //for flex create object of all avalible selected dates, subtract dates in query
  /*
    const start = moment('2018-10-27 21:40:00');
    const end = moment('2018-10-27 22:40:00');
    const now = moment();

    const range  = moment().range(start, end);

    range.contains(now); // Current time is within the range therefore disable button.

    https://stackoverflow.com/questions/53025135/time-availability-using-moment-js
  */
  if (true) {
    //flex
    js.properties.forEach((p) => {
      p.reservations.forEach((r) => {
        console.log(r);
      });
      p.availabilities.forEach((a) => {
        console.log(a);
      });
    });
  }

  //then return valid entries

  res.json(js);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
