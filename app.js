const express = require("express");
const sequelize = require("./database/config");
const { Op, where } = require("sequelize");

var initModels = require("./models/init-models");
const { Sequelize } = require("./database/config");
const moment = require("moment");
const { months } = require("moment");

var models = initModels(sequelize);

const app = express();
const port = 3001;

city = "Dubai";
start = "2020-06-01";
end = "2021-06-03";
type = "week";
mon = "jan";
atype = "1bdr";
amenities = ["WiFi", "Parking"];


app.get("/", async (req, res) => {
  //date or flexible, not both
  //do an if statement

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

  //js contains all properties matching search conditions

  if (months & type) {
    const flex = new moment(`01-${month}-2021`, "DD-MMM-YYYY"); //assume the year
    var start_flex = flex.format("YYYY-MM-DD");

    if(type == "week"){
      var end_flex = flex.add(7, 'days')
    }else if(type == "month"){
      var end_flex = flex.add(1, 'M')
    }
    
  }

  query_a = {
    where: {
      check_in: start,
      check_out: end,
    },
    [Op.or]: [{ check_in: start_flex }, { check_out: end_flex }],
  };

  //now to filter by avalible
  const av = await models.reservation.findOne(query_a);

  //if a proprty is in av and js its a match

  res.json(av);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
