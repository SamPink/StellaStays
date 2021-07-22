const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reservation', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    check_in: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    check_out: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    property_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'property',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'reservation',
    schema: 'test',
    timestamps: false,
    indexes: [
      {
        name: "reservation_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
