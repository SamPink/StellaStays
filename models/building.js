const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('building', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    city: {
      type: DataTypes.ENUM("Dubai","Montreal"),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'building',
    schema: 'test',
    timestamps: false,
    indexes: [
      {
        name: "building_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
