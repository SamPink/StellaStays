# StellaStays

I have used postgres for the database with the npm module sequelize as the ORM tool, using sequelize I run sequelize-auto to create a copy of database models and relationships. This allowed me to easily query the relational database using only 1 sql query per page request.

I have filtered properties on city, apartment type and amenities through sql, returning all matching properties each with their respective reservations and availabilities.

To calculate dates I have used moment js along with moment-business-days (for calculating week days) and moment-range for dealing with ranges.

Express is used for web framework.

As a primarily python developer some of the JavaScript may look strange and possibly inefficient. However I believe I have solved this problem efficiently allowing for many concurrent web requests, with all relevant property data returned in a single sql query and all other processing done in memory using Node js.

#add models
node_modules\.bin\sequelize-auto -o "./models" -d mydb -h localhost -u postgres -p 5432 -x '' -e postgres

#example request
http://localhost:3200/?city=Dubai&apartmentType=1bdr&amenities=WiFi,Parking&date=2021-06-01,2021-06-10

http://localhost:3200/?city=Dubai&apartmentType=1bdr&amenities=WiFi,Parking&ftype=weekend&fmonths=jul
