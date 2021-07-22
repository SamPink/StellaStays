const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('availability', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    property_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'property',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'availability',
    schema: 'test',
    timestamps: false,
    indexes: [
      {
        name: "availability_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
