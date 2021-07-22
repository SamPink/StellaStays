var DataTypes = require("sequelize").DataTypes;
var _availability = require("./availability");
var _building = require("./building");
var _property = require("./property");
var _reservation = require("./reservation");

function initModels(sequelize) {
  var availability = _availability(sequelize, DataTypes);
  var building = _building(sequelize, DataTypes);
  var property = _property(sequelize, DataTypes);
  var reservation = _reservation(sequelize, DataTypes);

  property.belongsTo(building, { as: "building", foreignKey: "building_id"});
  building.hasMany(property, { as: "properties", foreignKey: "building_id"});
  availability.belongsTo(property, { as: "property", foreignKey: "property_id"});
  property.hasMany(availability, { as: "availabilities", foreignKey: "property_id"});
  reservation.belongsTo(property, { as: "property", foreignKey: "property_id"});
  property.hasMany(reservation, { as: "reservations", foreignKey: "property_id"});

  return {
    availability,
    building,
    property,
    reservation,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
