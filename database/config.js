const { Sequelize } = require('sequelize');

module.exports = new Sequelize('postgres://postgres:sam@localhost:5432/mydb')
