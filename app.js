const express = require("express");
const sequelize = require("./database/config");

var initModels = require("./models/init-models");

var models = initModels(sequelize);

const app = express();
const port = 3000;

city = "Dubai";
start = "2021-06-01";
end = "2021-06-03";
type = "week";
months = "may";
atype = "1bdr";

var params = {
  city: city,
  date: { start, end },
  flexible: { type, months },
  apartmentType: atype,
  amenities: ["WiFi", "Pool"],
};

app.get("/", (req, res) => {
  models.building
    .findOne({
      where: {
        city: city,
      },
    })
    .then((building) => {
      id = building.id;
      models.property
        .findOne({
          where: {
            building_id: id,
          },
        })
        .then((p) => {
          res.json(p)
        });
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
