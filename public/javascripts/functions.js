var request = require('request');

module.exports = {
    aircraftTypesInfo : {},
    aircrafts : [],
    startDate,
    actualStartTime,
    realActualStartTime,
    aircraftData : null,
    locations : [],
    loadedRoutes,
    categories,

    loadAircrafts : function (callback) {
        request.get('https://www.matas-iaf.com/data/aircrafts-info.json', function (aircraftInfo) {
            // load aircraft type info into a map
            aircraftInfo.aircraftTypes.forEach(function (aircraftTypeInfo) {
                this.aircraftTypesInfo[aircraftTypeInfo.aircraftTypeId] = aircraftTypeInfo;
            }, this);

            // load all aircrafts
            request.get('https://www.matas-iaf.com/data/aircrafts.json', function (flightData) {
                this.aircrafts = flightData.aircrafts;
                this.startDate = flightData.startDate;

                // merge info from aircraft type info
                aircrafts.forEach(function (aircraft) {
                    if (aircraft.aircraftTypeId !== undefined) {
                        // copy all of the information from aircraft type info
                        var aircraftTypeInfo = aircraftTypesInfo[aircraft.aircraftTypeId];
                        for (var field in aircraftTypeInfo)
                            aircraft[field] = aircraftTypeInfo[field];
                    }

                    // sort aircraft path by time
                    aircraft.path.sort((point1, point2) => convertTime(point1.date, point1.time) - convertTime(point2.date, point2.time));
                }, this);

                this.aircraftData = flightData;
                this.loadActualStartTime();
                callback(aircrafts);
            });
        });
    },

    convertTime: function (dateString, timeString) {
        if (!dateString) dateString = startDate;
        var year = dateString.substr(0, 4);
        var month = dateString.substr(5, 2);
        var day = dateString.substr(8, 2);
        var hours = timeString.substr(0, 2);
        var minutes = timeString.substr(3, 2);
        var seconds = timeString.substr(6, 2);
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
    },

    loadActualStartTime : function() {
        this.actualStartTime = this.convertTime(startDate, aircraftData.actualStartTime);
        this.realActualStartTime = actualStartTime;
    },

    loadRoutes: function(callback) {
        request.get('https://www.matas-iaf.com/data/routes.json', function (routes) {
            routes.routes.forEach(function (route) {
                this.updateLocations(route);
            }, this);
            this.loadedRoutes = routes.routes;
            callback(routes.routes);
        });
    },

    updateLocations: function(route) {
        route.points.forEach(function (point) {
            if (this.locations[point.pointId] === undefined) {
                this.locations[point.pointId] = point;
                this.locations[point.pointId].aircrafts = [];
                this.locations[point.pointId].hideAircrafts = point.hideAircrafts;
                this.locations[point.pointId].color = route.color;
            }
        }, this);
    },

    updateLocationsMap: function(aircrafts) {
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

                location.hideAircrafts = locations[location.pointId].hideAircrafts;
                var location = locations[location.pointId];
                // if (displayAircraftShows && (item.aerobatic || item.parachutist || item.specialInPath === "מופעים אוויריים" || item.specialInAircraft === "מופעים אוויריים")) {
                // var timeout = convertTime(item.date, item.time) - getCurrentTime() + actualStartTime - plannedStartTime;
                // var notificationBody = `${getEventName(item.aerobatic)} ${getEventDescription(item.aerobatic, location.pointName, 5)}`;
                // }

                location.aircrafts.push(item);
            }, this);
        }, this);

        // sort each location points by time
        this.locations.forEach(function (loc) {
            loc.aircrafts.sort(function (item1, item2) {
                var keyA = convertTime(item1.date, item1.time),
                    keyB = convertTime(item2.date, item2.time);

                // Compare the 2 times
                if (keyA < keyB) return -1;
                if (keyA > keyB) return 1;
                return 0;
            });
        }, this);

        return locations;
    },

    loadCategories: function(callback) {
        request.get('https://www.matas-iaf.com/data/categories.json', function (pCategories) {
            this.categories = pCategories;
            callback();
        });
    }
};
