
var system_list = [];
$.ajax({ 
    dataType: "json", 
    url: path + "system/list/public.json", 
    async: false, 
    success: function (result) { 

        // sort by location
        result.sort(function(a, b) {
            // sort by location string
            if (a.location < b.location) return -1;
            if (a.location > b.location) return 1;
            return 0;
        });

        system_list = result; 
    }
});

var app = new Vue({
    el: '#app',
    data: {
        mode: "cop_vs_dt",
        // months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        // days_in_month: [31,28,31,30,31,30,31,31,30,31,30,31],
        // years: [2020,2021,2022,2023,...],
        interval: 3600,
        match_dates: true,
        selected_systems: selected_systems,
        system_list: system_list
    },
    methods: {
        add_system: function () {
            app.selected_systems.push(JSON.parse(JSON.stringify(app.selected_systems[app.selected_systems.length - 1])))
            load_system_data(app.selected_systems.length - 1);
            draw_chart();
        },

        remove_system: function (idx) {
            app.selected_systems.splice(idx, 1);
            draw_chart();
        },

        change_mode: function () {
            // load_all();
            draw_chart();
        },

        change_color: function () {
            draw_chart();
        },

        match_dates_fn: function () {
            if (!app.match_dates) {
                console.log("matching dates");
                let start = app.selected_systems[0].start;
                let end = app.selected_systems[0].end;

                for (var i in app.selected_systems) {
                    app.selected_systems[i].start = start;
                    app.selected_systems[i].end = end;
                }
                load_all();
                draw_chart();
            }
        },

        change_system: function (idx) {
            load_system_data(idx);
            draw_chart();
        },

        date_changed: function (idx) {
            app.selected_systems[idx].time_changed = true;
        },

        change_dates: function (idx) {

            // don't allow dates before 2020
            date = new Date(app.selected_systems[idx].start + " 00:00:00");
            if (date.getFullYear() < 2020) {
                date.setFullYear(2020);
                app.selected_systems[idx].start = time_to_date_str(date.getTime() * 0.001);
            }
            if (!isNaN(date.getTime())) {
                start = date.getTime() * 0.001;
            }

            // don't allow dates in the future
            today = new Date();
            date = new Date(app.selected_systems[idx].end + " 00:00:00");
            if (date > today) {
                date = today;
                app.selected_systems[idx].end = time_to_date_str(date.getTime() * 0.001);
            }
            if (!isNaN(date.getTime())) {
                end = date.getTime() * 0.001;
            }

            // set minimum period of 1 day
            if (start > (end - (3600 * 24))) {
                start = end - (3600 * 24)
                app.selected_systems[idx].start = time_to_date_str(start);
            }

            if (app.match_dates) {
                for (var i in app.selected_systems) {
                    app.selected_systems[i].start = time_to_date_str(start);
                    app.selected_systems[i].end = time_to_date_str(end);
                }
            }

            for (var i in app.selected_systems) {
                let start = date_str_to_time(app.selected_systems[i].start)
                let end = date_str_to_time(app.selected_systems[i].end)
                let npoints = Math.round((end - start) / app.interval);
                if (npoints > 6000) app.interval = 3600 * 24;
            }

            load_all();
            draw_chart();
            app.selected_systems[idx].time_changed = false;
        },

        change_interval: function () {
            for (var i in app.selected_systems) {
                let start = date_str_to_time(app.selected_systems[i].start)
                let end = date_str_to_time(app.selected_systems[i].end)
                let npoints = Math.round((end - start) / app.interval);
                if (npoints > 6000) app.interval = 3600 * 24;
            }
            load_all();
            draw_chart();
            for (var i in app.selected_systems) {
                app.selected_systems[i].time_changed = false;
            }
        }
    }
});

var timeout = false;

load_all();
draw_chart();

function draw_chart() {

    var plot_data = {
        "data": [],
        "layout": {
            "font": {
                "size": 14
            },
            "title": {
                "text": ""
            },
            "xaxis": {
                "type": "linear",
                "range": [],
                "title": {
                    "text": ""
                },
                "autorange": true
            },
            "yaxis": {
                "type": "linear",
                "range": [],
                "title": {
                    "text": ""
                },
                "autorange": true
            },
            "autosize": true,
            "showlegend": false,
            "annotations": []
        },
        "frames": []
    }

    let date = new Date();

    for (var i in app.selected_systems) {
        let id = app.selected_systems[i].id
        let data = app.selected_systems[i].data;

        let x = [];
        let y = [];
        let size = []

        var time = date_str_to_time(app.selected_systems[i].start);

        var profile = {};
        for (var t = 0; t < 24; t += (app.interval / 3600)) {
            profile[t] = 0;
        }

        for (var z in data['heatpump_elec']) {
            let elec = data['heatpump_elec'][z];
            let heat = data['heatpump_heat'][z];
            let outsideT = data['heatpump_outsideT'][z];
            let flowT = data['heatpump_flowT'][z];
            let returnT = data['heatpump_returnT'][z];

            if (app.mode == "cop_vs_dt") {
                if (elec != null && heat != null && outsideT != null && flowT != null && elec > 0 && heat > 0) {
                    x.push(flowT - outsideT)
                    y.push(heat / elec)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "cop_vs_outside") {
                if (elec != null && heat != null && outsideT != null && elec > 0 && heat > 0) {
                    x.push(outsideT)
                    y.push(heat / elec)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "cop_vs_flow") {
                if (elec != null && heat != null && flowT != null && elec > 0 && heat > 0) {
                    x.push(flowT)
                    y.push(heat / elec)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "cop_vs_return") {
                if (elec != null && heat != null && returnT != null && elec > 0 && heat > 0) {
                    x.push(returnT)
                    y.push(heat / elec)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "cop_vs_carnot") {
                if (elec != null && heat != null && outsideT != null && flowT != null && elec > 0 && heat > 0) {
                    let carnot = (flowT + 2 + 273) / ((flowT + 2 + 273) - (outsideT - 6 + 273));
                    x.push(carnot)
                    y.push(heat / elec)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "flow_vs_outside") {
                if (heat!=null && flowT != null && outsideT != null && heat > 0) {
                    x.push(outsideT)
                    y.push(flowT)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "heat_vs_outside") {
                if (heat != null && outsideT != null && heat > 0) {
                    x.push(outsideT)
                    y.push(heat)
                    size.push(heat * 0.002)
                }
            } else if (app.mode == "elec_vs_outside") {
                if (elec != null && outsideT != null && elec > 0) {
                    x.push(outsideT)
                    y.push(elec)
                    size.push(elec * 0.002)
                }
            } else if (app.mode == "profile") {
                if (elec != null) {
                    date.setTime(time * 1000);
                    let hm = date.getHours() + (date.getMinutes() / 60);
                    profile[hm] += (elec * app.interval) / 3600000;
                }
            }

            time += app.interval;
        }

        if (app.mode == "profile") {
            for (var hm = 0; hm < 24; hm += (app.interval / 3600)) {
                x.push(hm)
                y.push(profile[hm])
                size.push(10)
            }
        }

        var titles = {
            "cop_vs_dt": { xaxis: "DT (Flow - Outside temperature)", yaxis: "COP" },
            "cop_vs_outside": { xaxis: "Outside temperature", yaxis: "COP" },
            "cop_vs_flow": { xaxis: "Flow temperature", yaxis: "COP" },
            "cop_vs_return": { xaxis: "Return temperature", yaxis: "COP" },
            "cop_vs_carnot": { xaxis: "Ideal Carnot COP", yaxis: "COP" },
            "flow_vs_outside": { xaxis: "Outside temperature", yaxis: "Flow temperature" },     
            "heat_vs_outside": { xaxis: "Outside temperature", yaxis: "Heat" },
            "elec_vs_outside": { xaxis: "Outside temperature", yaxis: "Elec" },
            "profile": { xaxis: "Time of day", yaxis: "Elec" }
        }

        plot_data.layout.title.text = titles[app.mode].yaxis + " vs " + titles[app.mode].xaxis;
        plot_data.layout.xaxis.title.text = titles[app.mode].xaxis;
        plot_data.layout.yaxis.title.text = titles[app.mode].yaxis;

        plot_data.data.push({
            "mode": "markers",
            "type": "scatter",
            "x": x, "y": y,
            "marker": {
                "line": {
                    "width": 0
                },
                "size": size,
                "color": app.selected_systems[i].color
            }
        });
    }

    Plotly.newPlot("gd", plot_data);
    console.log("redraw complete");
}

function load_all() {
    for (var z in app.selected_systems) {
        load_system_data(z);
    }
}

function load_system_data(idx) {
    var system = app.selected_systems[idx];

    var params = {
        id: system.id,
        feeds: ["heatpump_elec", "heatpump_heat", "heatpump_outsideT", "heatpump_flowT", "heatpump_returnT"].join(","),
        start: date_str_to_time(system.start),
        end: date_str_to_time(system.end),
        interval: app.interval,
        average: 1,
        delta: 0,
        timeformat: "notime"
    }

    $.ajax({
        dataType: "json",
        url: "timeseries/data",
        data: params,
        async: false,
        success: function (system_data) {
            app.selected_systems[idx].data = system_data;
        }
    });
}

function time_to_date_str(time) {
    var date = new Date(time * 1000);
    var yyyy = date.getFullYear();
    var mm = date.getMonth() + 1;
    if (mm < 10) mm = "0" + mm;
    var dd = date.getDate();
    if (dd < 10) dd = "0" + dd;
    return yyyy + "-" + mm + "-" + dd;
}

function date_str_to_time(str) {
    return (new Date(str + " 00:00:00")).getTime() * 0.001;
}
