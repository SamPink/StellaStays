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
const port = 3100;

//"city" is mandatory to set
//"apartmentType" is optional
//"Amenities" filters the units that support the requested values

//flexible.type can be one of "weekend", "week" or "month"
//flexible.months is an array of 3-letter months, for example: ["may", "jun", ..]

//So submitting flexible {type: "week", months: ["may", "jun"]} tells the service to find a unit that is available for at least a week during May or June.
//Weekends vary across cities, so if you're checking for a Dubai weekend, that would be Fri & Sat, but if it's Montreal for example, then it's Sat & Sun.

// Note: when checking a unit availability, query both test.reservation & test.availability, if a unit has a reservation on an overlapping date range, or if it's
// manually blocked (for example: for maintenance) and has an entry with is_blocked set to true with an overlapping start_date & end_date in test.availability

app.get("/", async (req, res) => {
  var response = {};
  response["match"] = [];
  response["alternative"] = [];
  response["other"] = [];

  var whereCondition = {}; //used to store query

  const qu = req.query;

  //query currently does not validate casing and types, front end validates request

  if (!qu.city) {
    //I am assuming 1 city must be selected, not both
    res.send("parameter City is missing");
    //could respond with error code
  }

  if (qu.apartmentType) {
    //pass appartment type to query if selected
    console.log(qu.apartmentType.split(","));
    whereCondition["property_type"] = qu.apartmentType.split(",");
  }

  if (qu.amenities) {
    /*
      const am = models.property.build({amenities: '{WiFi,Parking}'})
      console.log(am.amenities);
      whereCondition["amenities"] = am.amenities;
      //error, (node:16368) UnhandledPromiseRejectionWarning: TypeError: values.map is not a function

      whereCondition["amenities"] = ["WiFi","Parking"]
      //error, (node:13500) UnhandledPromiseRejectionWarning: SequelizeDatabaseError: type "enum_test.property_amenities[]" does not exist

      this error must be caused when trying to pass the try type: DataTypes.ARRAY(DataTypes.ENUM("WiFi","Pool","Garden","Tennis table","Parking"))
      and somehow sequelize is not correctly passing the value

      I will therefore solve this error by filtering the query after the request is made
    */
  }

  if (qu.date) {
    //assume date is valid and in format
    var dates = qu.date.split(",");
    var start = moment(dates[0], "YYYY-MM-DD");
    var end = moment(dates[1], "YYYY-MM-DD");
    var range = momentRange().range(start, end);
  }

  if (qu.ftype && qu.fmonths) {
    //assume format
    type = qu.ftype;
    mon = qu.fmonths.split(",");

    var flex_range = [];

    console.log(type);
    console.log(mon);

    mon.forEach((m) => {
      var start = moment(`2021-${m}-01`, "YYYY-MMM-DD"); //pass month and assume the year

      var end = moment(`2021-${m}-01`, "YYYY-MMM-DD").add(1, "months");

      var range = momentRange().range(start, end);

      flex_range.push(range); //create range of 1 month for each month supplied
    });
  }

  //this query filters properties by city and optional values enterd into the where condition
  //using Eager Loading include valid properties, reservations and availabilitys all in 1 query
  query_b = {
    where: {
      city: qu.city,
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

  //json containing valid properties with resepctive reservations and availabilitys
  const js = await models.building.findOne(query_b);

  //set working days
  if (qu.city == "Dubai") {
    moment.updateLocale("ae", {
      workingWeekdays: [0, 1, 2, 3, 4, 5],
    });
  } else if (qu.city == "Montreal") {
    moment.updateLocale("ca", {
      workingWeekdays: [1, 2, 3, 4, 5, 6],
    });
  }

  if (qu.date) {
    js.properties.forEach((p) => {
      var avalible = 0;
      p.availabilities.forEach((r) => {
        start_r = moment(r.start_date, "YYYY-MM-DD");
        end_r = moment(r.end_date, "YYYY-MM-DD");
        var range_r = momentRange().range(start_r, end_r);

        if (range_r.overlaps(range)) {
          avalible = 1;
        }
      });

      p.reservations.forEach((r) => {
        start_r = moment(r.check_in, "YYYY-MM-DD");
        end_r = moment(r.check_out, "YYYY-MM-DD");

        var range_r = momentRange().range(start_r, end_r);

        if (range_r.overlaps(range)) {
          avalible = 1;
        }
      });
      if (avalible == 0) {
        response["match"].push(p.id);
      }
    });
  } else {
    var ranges = [];

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
        flex_range.every((range) => {
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
            console.log(p.id);
            response["match"].push(p.id);
          } else if (type == "weekend" && weekendDays >= 2) {
            //avalibleProps.push(obj.property_id);
            console.log("weekend");
            response["match"].push(p.id);
          } else if (type == "month" && days >= 30) {
            //avalibleProps.push(obj.property_id);
            console.log("month");
            response["match"].push(p.id);
          } else {
            console.log("no");
          }
        });
      });
    });
  }

  //then return valid entries
  res.json(response);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
