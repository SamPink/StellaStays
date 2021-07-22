const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('property', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    building_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'building',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "property_title_key"
    },
    property_type: {
      type: DataTypes.ENUM("1bdr","2bdr","3bdr"),
      allowNull: false
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.ENUM("WiFi","Pool","Garden","Tennis table","Parking")),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'property',
    schema: 'test',
    timestamps: false,
    indexes: [
      {
        name: "property_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "property_title_key",
        unique: true,
        fields: [
          { name: "title" },
        ]
      },
    ]
  });
};
