var express 	= require("express")
var http 		= require("http")
var bodyParser 	= require('body-parser')
var Promise 	= require("bluebird")
var _ 			= require("lodash")
var app 		= express();

function getSlaves(masterJson){
	return _.map(masterJson.slaves, function(slave){
		return slave.hostname
	})
}

app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/*+json' }))

app.get("/master", function(req, res){
	http.get("http://mesos-master.production.indix.tv:5050/master/state.json",function(resp){
		var result = ""
		resp.on("data", function(chunk){
			result += chunk
		})
		resp.on("end", function(){
			res.end(result)
		})
	})
})

app.get("/slaves", function(req, res){
	http.get("http://mesos-master.production.indix.tv:5050/master/state.json",function(resp){
		var result = ""
		resp.on("data", function(chunk){
			result += chunk
		})
		resp.on("end", function(){
			res.end(JSON.stringify(getSlaves(JSON.parse(result))))
		})
	})
})

app.get("/slave/data/all", function(req, res){
	http.get("http://mesos-master.production.indix.tv:5050/master/state.json",function(resp){
		var result = ""
		resp.on("data", function(chunk){
			result += chunk
		})
		resp.on("end", function(){
			var slaves = getSlaves(JSON.parse(result))
			var allSlaveData = {}
			var promiselist =  _.map(slaves, function(slave){
				return new Promise( function(resolve){
					var slaveUrl = "http://"+slave+":5051/metrics/snapshot"
					http.get(slaveUrl, function(respo){
						var tmpResult = ""
						respo.on("data", function(chunk){
							tmpResult += chunk
						})
						respo.on("end", function(){
							resolve(JSON.parse(tmpResult))
						})
					})
				})
			})
			Promise.all(promiselist).then(function(data){
				var output =  {}
				_.each(slaves, function(slave, key){
					output[slave] = {}
					output[slave]["metrics"] = data[key]
				})
				res.end(JSON.stringify(output))
			})
		})
	})
})

app.get("/slave/data", function(req, res){
	var slave = req.query.slave
	var slaveUrl = slave+":5051/metrics/snapshot"
	http.get(slaveUrl, function(resp){
		var result = ""
		resp.on("data", function(chunk){
			result += chunk
		})
		resp.on("end", function(){
			res.end(result)
		})
	})
})


app.listen(5000, function () {
  console.log('Example app listening on port 5000!');
});