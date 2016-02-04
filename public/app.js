slaveData 	= {}
gauges 		= {}

function createGauge(name, label, min, max){
	var config = 
	{
		size: 150,
		label: label,
		min: undefined != min ? min : 0,
		max: undefined != max ? max : 100,
		minorTicks: 5
	}
	
	var range = config.max - config.min;
	config.yellowZones = [{ from: config.min + range*0.75, to: config.min + range*0.9 }];
	config.redZones = [{ from: config.min + range*0.9, to: config.max }];
	
	return new Gauge(name, config);
}

var updateFilter = true
var addFilter = true

function updateData(data){
	data = JSON.parse(data)
	$.extend(true, slaveData, data)
	updateGauges(slaveData)
	if(addFilter){
		updateFilterMenu(slaveData)
		addFilter = false
	}
}


function updateGauges(dataSet){
	for(var key in dataSet){
		keyname = key.split(".")
		keyname = keyname[0]
		if(!gauges[keyname])
			gauges[keyname] = {}
		data = dataSet[key]["metrics"]
		
		if(!$("#"+keyname).length)
			$("#main").append('<div id="'+keyname+'"><h1>'+key+'</h1><h4 class="badge"></h4></div>')
		for(var attr in data){
			attrname = attr.split("/")
			attrname = attrname[attrname.length - 1]
			var percentChk = attrname.split("_")
			percentChk = percentChk[percentChk.length - 1]

			if(updateFilter){
				$("#filter #pane #metrics ul").append("<li><input type='checkbox' name='"+attrname+"'/><label for='"+attrname+"'>"+attrname+"</label></li>")
			}

			if(gauges[keyname] && gauges[keyname][attrname]){
				var value = (percentChk === "percent") ? dataSet[key]["metrics"][attr]*100 : dataSet[key]["metrics"][attr]
				gauges[keyname][attrname].redraw(value)
				console.log(percentChk)
			}else{
				$("#"+keyname).append('<span class="gauge-class" id="'+keyname+'-'+attrname+'"></span>')
				gauges[keyname][attrname] = new createGauge(keyname+'-'+attrname, attrname)
				gauges[keyname][attrname].render()
				var value = (percentChk === "percent") ? dataSet[key]["metrics"][attr]*100 : dataSet[key]["metrics"][attr]
				console.log(percentChk)
				gauges[keyname][attrname].redraw(value)
			}
		}
		updateFilter = false
		$("#loader").hide()
	}
}

function filter(){
	$("#main div").hide()
	$(".gauge-class").hide()
	var filters = []
	var checked = $("input:checked")
	checked.map(function(key){
		filters.push($(checked[key]).attr("name"))
	})

	for(var slave in slaveData){
		var slaveName = slave.split(".");
		slaveName = slaveName[0]
		for(var filter in filters){
			$("#"+slaveName+"-"+filters[filter]).show()
			$("."+filters[filter]).show()
		}

	}

}
function toggleUl(e){
	$("ul."+e).toggle(500)
}

function updateFilterMenu(data){
	var attributeFilters = {}
	for(var slave in data){
		var attributes = data[slave]["attributes"]
		for(var attribute in attributes){
			var slavename = slave.split(".")
			if(!$("#"+slavename[0]).hasClass(attributes[attribute])){
				$("#"+slavename[0]).addClass(attributes[attribute])
				$("#"+slavename[0]+ " .badge").append("<span>"+attributes[attribute]+"</span>")
				if(!attributeFilters[attribute])
					attributeFilters[attribute] = []
				if(attributeFilters[attribute].indexOf(attributes[attribute])<0)
					attributeFilters[attribute].push(attributes[attribute])
			}

		}
	}
	var el = $("#filter #pane #attributes")
	for(var attributeFilter in attributeFilters){
		el.append("<div><h4 onclick='toggleUl(\""+attributeFilter+"\")'>"+attributeFilter+"</h4><ul class='"+attributeFilter+"'></ul></div>")
		for(var filter in attributeFilters[attributeFilter]){
			$("#filter #pane #attributes ul."+attributeFilter).append("<li><input type='checkbox' name='"+attributeFilters[attributeFilter][filter]+"'/><label for='"+attributeFilters[attributeFilter][filter]+"'>"+attributeFilters[attributeFilter][filter]+"</label></li>")
		}
	}
}

function clearFilters(){
	$(".gauge-class").show()
	$("#main div").show()
	$('input:checkbox').prop('checked',false);
}

$.ajax("/master").done(function(data){
	$("#loader .msg").text("Loading master data...")
	data = JSON.parse(data)
	for(var slave in data.slaves){
		var slaveDetails = data.slaves[slave]
		if(!slaveData[slaveDetails.hostname])
			slaveData[slaveDetails.hostname] = {}
		slaveData[slaveDetails.hostname]["attributes"] = slaveDetails.attributes
	}
	$("#loader .msg").text("Loading gauges... Hold on tight!!!")
	$.ajax("/slave/data/all").done(updateData)
	setInterval(function(){$.ajax("/slave/data/all").done(updateData)},60000)
})