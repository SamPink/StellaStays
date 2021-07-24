const express = require("express");
const sequelize = require("./database/config");
const { Op, where } = require("sequelize");

var moment = require("moment-business-days");

var initModels = require("./models/init-models");
const { Sequelize } = require("./database/config");

var models = initModels(sequelize);

const app = express();
const port = 3001;

city = "Dubai"; //"city" is mandatory to set
atype = "1bdr"; //"apartmentType" is optional
amenities = ["WiFi", "Parking"]; //"Amenities" filters the units that support the requested values

//the program can take one of "date" or "flexible" but not both
var start = new Date("2021-06-01");
var end = new Date("2021-06-03");
type = "week"; //flexible.type can be one of "weekend", "week" or "month"
mon = ["may", "jun"]; //flexible.months is an array of 3-letter months, for example: ["may", "jun", ..]
//So submitting flexible {type: "week", months: ["may", "jun"]} tells the service to find a unit that is available for at least a week during May or June.
//Weekends vary across cities, so if you're checking for a Dubai weekend, that would be Fri & Sat, but if it's Montreal for example, then it's Sat & Sun.

app.get("/", async (req, res) => {
  var whereCondition = {};

  if (atype.length > 0) {
    console.log(atype);
    whereCondition["property_type"] = atype;
  }

  //not working
  //if (amenities) {
  //  console.log(amenities)
  //  whereCondition["amenities"] = sequelize.literal(`ARRAY['WiFi','Parking']::"enum_test.property_amenities"[];`);
  //}

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
      },
    ],
  };

  //I am assuming 1 city must be selected, not both
  const js = await models.building.findOne(query_b);

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

  var req = []; //create request array from flexible.months to suply in query
  mon.forEach((m) => {
    var flex = moment(`2021-${m}-01`, "YYYY-MMM-DD"); //pass month and assume the year

    var flex_end = moment(`2021-${m}-01`, "YYYY-MMM-DD").add(1, "months");

    req.push({ check_in: { [Op.between]: [flex, flex_end] } });
  });

  query_a = {
    where: {
      [Op.or]: req,
    },
  };

  //now to filter by avalible
  const av = await models.reservation.findAll(query_a);

  //filter where date range greater than flexible.type
  var avalibleProps = []
  av.forEach((obj) => {
    //console.log(obj);
    start = moment(obj.check_in, "YYYY-MM-DD");
    end = moment(obj.check_out, "YYYY-MM-DD");

    //console.log("start " + start.format('YYYY-MM-DD'));
    //console.log("End " + end.format('YYYY-MM-DD'));

    var weekdays = start.businessDiff(end);

    var days = end.diff(start, "days") + 1; //+1 to include first day

    var weekendDays =  days - weekdays;

    //console.log("days " + days);
    //console.log("working days " + weekdays);
    //console.log("weekend days " + weekendDays);

    if (type == "week" && days >= 7) {
      avalibleProps.push(obj.property_id);
    } else if (type == "weekend" && weekendDays >= 2) {
      avalibleProps.push(obj.property_id);
    } else if (type == "month" && days >= 30) {
      avalibleProps.push(obj.property_id);
    }
  });

  //if a proprty is in av and js its a match

  //response format {match: [], alternative: [], other: []}

  res.json(avalibleProps);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
