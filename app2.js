const express = require("express");
const sequelize = require("./database/config");
const { Op, where } = require("sequelize");

const moment = require("moment-business-days");
const momentRange = require("moment-range");

//const moment = MomentRange.extendMoment(Moment);

var initModels = require("./models/init-models");
const { Sequelize } = require("./database/config");
const reservation = require("./models/reservation");

var models = initModels(sequelize);

const app = express();
const port = 3200;

city = "Dubai"; //"city" is mandatory to set
atype = "2bdr"; //"apartmentType" is optional
amenities = ["WiFi", "Parking"]; //"Amenities" filters the units that support the requested values

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

  //set working days
  if (city == "Dubai") {
    moment.updateLocale("ae", {
      workingWeekdays: [0, 1, 2, 3, 4, 5],
    });
  } else if (city == "Montreal") {
    moment.updateLocale("ca", {
      workingWeekdays: [1, 2, 3, 4, 5, 6],
    });
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
  start = moment("2021-06-01", "YYYY-MM-DD");
  end = moment("2021-06-10", "YYYY-MM-DD");

  var range = momentRange().range(start, end);

  var ranges = [];

  if (true) {
    js.properties.forEach((p) => {
      p.reservations.forEach((r) => {
        //get the rage for the reservation
        start_r = moment(r.check_in, "YYYY-MM-DD");
        end_r = moment(r.check_out, "YYYY-MM-DD");

        var range_res = momentRange().range(start_r, end_r);

        ranges.push(range_res);
      });

      p.availabilities.forEach((a) => {
        if (a.is_blocked == 1) {
          start_r = moment(a.start_date, "YYYY-MM-DD");
          end_r = moment(a.end_date, "YYYY-MM-DD");

          var range_res = momentRange().range(start_r, end_r);

          ranges.push(range_res);
        }
      });
      //ranges contains dates where property is not avalible

      ranges.every((r) => {
        //need to find where property is avalible for >= n days
        var av_ranges = range.subtract(r);

        console.log(av_ranges);

        start = moment(av_ranges[0].start, "YYYY-MM-DD");
        end = moment(av_ranges[0].end, "YYYY-MM-DD");

        console.log("start " + start.format("YYYY-MM-DD"));
        console.log("End " + end.format("YYYY-MM-DD"));

        var weekdays = start.businessDiff(end);

        var days = end.diff(start, "days") + 1; //+1 to include first day

        var weekendDays = days - weekdays;

        console.log("days " + days);
        console.log("working days " + weekdays);
        console.log("weekend days " + weekendDays);

        if (type == "week" && days >= 7) {
          //avalibleProps.push(obj.property_id);
          return console.log("week");
        } else if (type == "weekend" && weekendDays >= 2) {
          //avalibleProps.push(obj.property_id);
          return console.log("weekend");
        } else if (type == "month" && days >= 30) {
          //avalibleProps.push(obj.property_id);
          return console.log("month");
        }
        else{
          return console.log("no");
        }
      });
    });
  }
  //then return valid entries

  res.json(js);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
