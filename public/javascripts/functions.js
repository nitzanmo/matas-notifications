var request = require('request');

module.exports = class Functions {
    constructor() {
        this.aircraftTypesInfo = {};
        this.aircrafts = [];
        this.startDate = null;
        this.actualStartTime = null;
        this.realActualStartTime = null;
        this.plannedStartTime = null;
        this.plannedEndTime = null;
        this.aircraftData = null;
        this.locations = [];
        this.loadedRoutes = null;
        this.categories = [];
    }

    getData(url, callback) {
        request.get({url: url, json: true}, (error, response, data) => {
            //JSON.parse(data);
            var parsedData = data;

            if (data.constructor === String) {
                parsedData = JSON.parse(data.substr(1, data.length));
            }


            callback(parsedData);
        });
    }

    loadAircrafts(callback) {
        // request.get({url: 'https://www.matas-iaf.com/data/aircrafts-info.json', json:true}, function (error, response, aircraftInfo) {
        this.getData('https://www.matas-iaf.com/data/aircrafts-info.json', parsedInfo => {
            parsedInfo.aircraftTypes.forEach(function (aircraftTypeInfo) {
                this.aircraftTypesInfo[aircraftTypeInfo.aircraftTypeId] = aircraftTypeInfo;
            }, this);

            // load all aircrafts
            this.getData('https://www.matas-iaf.com/data/aircrafts.json', flightData => {
                this.aircrafts = flightData.aircrafts;
                this.startDate = flightData.startDate;
                this.plannedStartTime = this.convertTime(this.startDate, flightData.plannedStartTime);
                this.plannedEndTime = this.convertTime(this.startDate, flightData.plannedEndTime);

                // merge info from aircraft type info
                this.aircrafts.forEach(function (aircraft) {
                    if (aircraft.aircraftTypeId !== undefined) {
                        // copy all of the information from aircraft type info
                        var aircraftTypeInfo = this.aircraftTypesInfo[aircraft.aircraftTypeId];
                        for (var field in aircraftTypeInfo)
                            aircraft[field] = aircraftTypeInfo[field];
                    }

                    // sort aircraft path by time
                    aircraft.path.sort((point1, point2) => this.convertTime(point1.date, point1.time) - this.convertTime(point2.date, point2.time));
                }, this);

                this.aircraftData = flightData;
                this.loadActualStartTime();
                callback(this.aircrafts);
            });
        });
    }

    convertTime(dateString, timeString) {
        if (!dateString) dateString = this.startDate;
        var year = dateString.substr(0, 4);
        var month = dateString.substr(5, 2);
        var day = dateString.substr(8, 2);
        var hours = timeString.substr(0, 2);
        var minutes = timeString.substr(3, 2);
        var seconds = timeString.substr(6, 2);
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
    }

    loadActualStartTime() {
        this.actualStartTime = this.convertTime(this.startDate, this.aircraftData.actualStartTime);
        this.realActualStartTime = this.actualStartTime;
    }

    loadRoutes(callback) {
        this.getData('https://www.matas-iaf.com/data/routes.json', routes => {
            routes.routes.forEach(function (route) {
                this.updateLocations(route);
            }, this);
            this.loadedRoutes = routes.routes;
            callback(routes.routes);
        });
    }

    updateLocations(route) {
        route.points.forEach(function (point) {
            if (this.locations[point.pointId] === undefined) {
                this.locations[point.pointId] = point;
                this.locations[point.pointId].aircrafts = [];
                this.locations[point.pointId].hideAircrafts = point.hideAircrafts;
                this.locations[point.pointId].color = route.color;
            }
        }, this);
    }

    updateLocationsMap(aircrafts) {
        // build locations map for all of the aircraft paths
        aircrafts.forEach(function (aircraft) {
            aircraft.path.forEach(function (location) {
                var item = {
                    aircraftId: aircraft.aircraftId,
                    name: aircraft.name,
                    icon: aircraft.icon,
                    aircraftType: aircraft.type,
                    time: location.time,
                    from: location.from,
                    aerobatic: aircraft.aerobatic,
                    parachutist: aircraft.parachutist,
                    category: aircraft.category,
                    specialInPath: location.special,
                    specialInAircraft: aircraft.special,
                    date: location.date
                };

                location.hideAircrafts = this.locations[location.pointId].hideAircrafts;
                var location = this.locations[location.pointId];
                // if (displayAircraftShows && (item.aerobatic || item.parachutist || item.specialInPath === "מופעים אוויריים" || item.specialInAircraft === "מופעים אוויריים")) {
                // var timeout = convertTime(item.date, item.time) - getCurrentTime() + actualStartTime - plannedStartTime;
                // var notificationBody = `${getEventName(item.aerobatic)} ${getEventDescription(item.aerobatic, location.pointName, 5)}`;
                // }

                location.aircrafts.push(item);
            }, this);
        }, this);

        // sort each location points by time
        this.locations.forEach(function (loc) {
            loc.aircrafts.sort((item1, item2) => {
                var keyA = this.convertTime(item1.date, item1.time),
                    keyB = this.convertTime(item2.date, item2.time);

                // Compare the 2 times
                if (keyA < keyB) return -1;
                if (keyA > keyB) return 1;
                return 0;
            });
        }, this);

        return this.locations;
    }

    loadCategories(callback) {
        this.getData('https://www.matas-iaf.com/data/categories.json', pCategories => {
            this.categories = pCategories;
            callback();
        });
    }

    getEventName(isAerobatics) {
        return isAerobatics ? 'מופע אווירובטי' : 'הצנחות';
    }

    getEventDescription(isAerobatics, locationName, minutes) {
        var desc = isAerobatics ? 'יחל ב' : 'יחלו ב';
        return `${desc}${locationName} בעוד ${minutes} דקות`;
    }
};
