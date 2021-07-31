const express = require("express");
const sequelize = require("./database/config");
const moment = require("moment-business-days");
const momentRange = require("moment-range");
var initModels = require("./models/init-models");

var models = initModels(sequelize);

const app = express();
const port = 3200;

app.get("/", async (req, res) => {
  //object will be used to fill the response for each respective group
  var response = {};
  response["match"] = [];
  response["alternative"] = [];
  response["other"] = [];

  var whereCondition = {}; //used to store query

  //query does not validate casing and types, assuming front end validates request
  const qu = req.query;

  if (!qu.city) {
    //I am assuming 1 city must be selected, not both
    res.send("parameter City is missing");
    //could respond with error code
  }

  if (qu.apartmentType) {
    //pass appartment type to query if selected
    whereCondition["property_type"] = qu.apartmentType.split(",");
  }

  if (qu.date) {
    var dates = qu.date.split(",");
    var start = moment(dates[0], "YYYY-MM-DD");
    var end = moment(dates[1], "YYYY-MM-DD");
    var range = momentRange().range(start, end);
  }

  if (qu.ftype && qu.fmonths) {
    type = qu.ftype;
    mon = qu.fmonths.split(",");

    var flex_range = []; //used to store months passed

    //add 1 month range for each month passed
    mon.forEach((m) => {
      var start = moment(`2021-${m}-01`, "YYYY-MMM-DD"); //assume the year

      var end = moment(`2021-${m}-01`, "YYYY-MMM-DD").add(1, "months");

      var range = momentRange().range(start, end);

      flex_range.push(range);
    });
  }

  //json containing valid properties with resepctive reservations and availabilitys
  const js = await models.building.findOne(createQuery(qu, whereCondition));

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

    //filter amenities after request
    var amens = qu.amenities.split(",");
    js.properties.forEach((p) => {
      var diff = p.amenities.filter((element) => !amens.includes(element));
      //diff is items in property that are not in request
      if (diff.length != 0) {
        js.properties.splice(p); //if missing items remove the property
      }
    });
  }

  //set working days
  setWeekends(qu);

  if (qu.date) {
    fixedDates(js, range, response["match"]);
  } else {
    flexDates(js, flex_range, response["match"]);
  }

  var n = 0; //limit 50
  if (response["match"].length < 1) {
    while (response["alternative"].length < 1 && n <= 50) {
      if (qu.date) {
        range.start.add(1, "days");
        range.end.add(1, "days");
        fixedDates(js, range, response["alternative"], (alternative = 1));
        console.log(range);
      } else {
        flex_range.forEach((f) => {
          f.start.add(-1, "days");
          f.end.add(1, "days");
        });
        flexDates(js, flex_range, response["alternative"], (alternative = 1));
        console.log(flex_range);
      }
      n++;
      if (n >= 50) {
        console.log("no date");
      }
    }
  }

  if (response["alternative"].length < 1 && response["match"].length < 1) {
    //fill other response by removing filters to database query
    const js_other = await models.building.findOne(createQuery(qu, {}));

    if (qu.date) {
      fixedDates(js_other, range, response["other"]);
    } else {
      flexDates(js_other, flex_range, response["other"]);
    }
  }

  //then return valid entries
  console.log(response);
  res.json(js);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function createQuery(qu, whereCondition) {
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

  return query_b;
}

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

function flexDates(js, flex_range, list, alternative = 0) {
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
          console.log(1);
          pushToGroup((avalible = 0), alternative, list, p);
        } else if (type == "weekend" && weekendDays >= 2) {
          pushToGroup((avalible = 0), alternative, list, p);
        } else if (type == "month" && days >= 30) {
          pushToGroup((avalible = 0), alternative, list, p);
        }
      });
    });
  });
}

function fixedDates(js, range, list, alternative = 0) {
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
    pushToGroup(avalible, alternative, list, p);
  });
}

function pushToGroup(avalible, alternative, list, p) {
  if (avalible == 0) {
    if (alternative == 1) {
      list.push({
        id: p.id,
        availableStarting: start_r.format("YYYY-MM-DD"),
      });
    } else {
      list.push(p.id);
    }
  }
}
