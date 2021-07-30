const express = require("express");
const sequelize = require("./database/config");
const moment = require("moment-business-days");
const momentRange = require("moment-range");
var initModels = require("./models/init-models");

var models = initModels(sequelize);

const app = express();
const port = 3200;

var response = {};
response["match"] = [];
response["alternative"] = [];
response["other"] = [];

app.get("/", async (req, res) => {
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

  //filter amenities, should be done during request, explained in line 45
  var amens = qu.amenities.split(",");
  js.properties.forEach((p) => {
    var diff = p.amenities.filter((element) => !amens.includes(element));
    if (diff.length != 0) {
      js.properties.splice(p);
    }
  });

  //set working days
  setWeekends(qu);

  if (qu.date) {
    fixedDates(js, range);
  } else {
    flexDates(js, flex_range);
  }

  //then return valid entries
  res.json(js);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function setWeekends(qu) {
  if (qu.city == "Dubai") {
    moment.updateLocale("ae", {
      workingWeekdays: [0, 1, 2, 3, 4, 5],
    });
  } else if (qu.city == "Montreal") {
    moment.updateLocale("ca", {
      workingWeekdays: [1, 2, 3, 4, 5, 6],
    });
  }
}

function flexDates(js, flex_range) {
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
        var start = moment(av_ranges[0].start, "YYYY-MM-DD");
        var end = moment(av_ranges[0].end, "YYYY-MM-DD");
        var weekdays = start.businessDiff(end);
        var days = end.diff(start, "days") + 1; //+1 to include first day
        var weekendDays = days - weekdays;

        //console.log(av_ranges);
        //console.log("start " + start.format("YYYY-MM-DD"));
        //console.log("End " + end.format("YYYY-MM-DD"));
        //console.log("days " + days);
        //console.log("working days " + weekdays);
        //console.log("weekend days " + weekendDays);

        if (type == "week" && days >= 7) {
          response["match"].push(p.id);
        } else if (type == "weekend" && weekendDays >= 2) {
          response["match"].push(p.id);
        } else if (type == "month" && days >= 30) {
          response["match"].push(p.id);
        }
      });
    });
  });
}

function fixedDates(js, range) {
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
}
