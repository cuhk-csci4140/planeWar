window.location.hash = '';

var SERVERHOST = "124.244.96.21";
var PORTNO = "4140";
var ROOTPATH = "4140";

// if( !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ) {
// 	window.location = "../";
// }

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}


fireFlag=powerFlag=0;
accX=accY=accZ=0;
rmID=playerID=0;
accXOrg = accYOrg = accZOrg = 0;
var fireSoundFlag =0;
var fireSound,planeArr;
var calibration = 0;
var calibrationFactor = 1;
var calibrateAxes = "X";
var rotate=0; // 0 = portrait, 1 = landscape
var tempcalibrationFactor = 1;

rmID = getURLParameter('rmID');
//console.log("rmID:"+rmID);
//$('#debug').html("<div>roodID:"+rmID+"</div>");

function startCal(){
	//console.log("cal" + calibration);
	document.getElementById("clickSound").play();

	if(calibration!=0){
		//$('#debug2').append("<div>cal stopped</div>");
		calibration= 0;
		//calibrationFactor = tempcalibrationFactor;
		//calibrationFactor = tempcalibrationFactor;
		calStop();
	}else {
		tempcalibrationFactor = calibrationFactor;
		calibrationFactor = 1;
		document.getElementById("calStatus").innerHTML = "";
		$("#calibration").removeClass("hide");
		$("#startCalibrateBtn").html("Cancel Calibration");
		//document.getElementById("clickSound").play();
		document.getElementById("caltext").innerHTML = "Calibration <br/> Please hold your phone up straight and press the calibrate button";
	}
}

function cal1(){
	
	document.getElementById("calStatus").innerHTML = "";
	document.getElementById("clickSound").play();
	accXOrg = accX;
	accYOrg = accY;
	accZOrg = accZ;
	calibration = 2;
	document.getElementById("caltext").innerHTML = "Calibration <br/> Please Tilt your phone 45-90 degress to the left";

}
function calStop(){
	//calibrationFactor = tempcalibrationFactor;
	//console.log("clean up");
	$("#startCalibrateBtn").html("Start Calibration");
	if(calibration!=0) document.getElementById("calStatus").innerHTML = "Calibration canceled!";
	calibration = 0;
	$("#calibration").addClass("hide");
	// }else{
	// 	console.log("can")
	// 	$("#startCalibrateBtn").html("Start Calibration");
	// 	$("#calibration").addClass("hide");
	// }
}

function init() {
	fireSound = new Audio("../planeWar/sound/shoot.mp3");
    fireSound.preload = "auto";
	//fireSound = document.getElementById('fireSound');
	// set game button height
	var gameBtnWidth = $('.gameBtn').width();
	var gameBtnHeight = gameBtnWidth-gameBtnWidth*0.075;
	$('.gameBtn').css({'height':gameBtnHeight+'px'});
	$('.gameBtn').css({'line-height':gameBtnHeight+'px'});

	$('#rotateBtn').on("click",function(e){
		document.getElementById("clickSound").play();
		if (rotate==1) {
			rotate=0;
			localStorage.setItem("rotate", 0);
			//$("#pageconnect").removeClass('rotate');
			//$("#pagesetting").removeClass('rotate');
			$("#pagewait").removeClass('rotate');
			$(".gameButton").removeClass('rotate');
			$(".playresult").removeClass('rotate');
			localStorage.setItem("rotate", 0);
		} else {
			rotate=1;
			localStorage.setItem("rotate", 1);
			//$("#pageconnect").addClass('rotate');
			//$("#pagesetting").addClass('rotate');
			$("#pagewait").addClass('rotate');
			$(".gameButton").addClass('rotate');
			$(".playresult").addClass('rotate');
			localStorage.setItem("rotate", 1);
		}
	});

	$('.planeBtn').on("tap",function(e){
		document.getElementById("clickSound").play();
		console.log(e.target.id);
		var planeNo = e.target.id.substr(5);
		if (planeArr[planeNo]==-1) {
			var msg = {
				type: "choosePlane",
				rmID: rmID,
				playerID: playerID,
				planeNo: planeNo,
			};
			websocket.send(JSON.stringify(msg));
		} else if (planeArr[planeNo]==playerID) {

		} else {
			alert("plane unavailable!");
		}
	});

	window.addEventListener('keydown', function(event){
		switch(event.keyCode){
			case 90: 
				fireFlag=1; 
			break;
			case 191:
				powerFlag=1;
			break;
		}
	});
	window.addEventListener('keyup', function(event){
		switch(event.keyCode){
			case 90: 
				fireFlag=0; 
			break;
			case 191:
				powerFlag=0;
			break;
		}
	});
	// set game button touch event
	$('.gameBtn').bind("touchstart mousedown",function() {
		$(this).removeClass('idle').addClass('gActive active');
		//document.getElementById("clickSound").play();
	});
	$('.gameBtn').bind("touchmove",function(e) {
		e.preventDefault();
	});
	$('.gameBtn').bind("touchend mouseup",function() {
		$(this).removeClass('gActive active').addClass('idle');
	});

	$('#fireBtn').bind("touchstart mousedown",function() {
		fireFlag=1; //playFireSound();

	});
	$('#powerBtn').bind("touchstart mousedown",function() {
		powerFlag=1;
	   	playSound();

	});
	$('#fireBtn').bind("touchend mouseup",function() {
		fireFlag=0;
	});
	$('#powerBtn').bind("touchend mouseup",function() {
		powerFlag=0;
	});

	$('#reconnectBtn').on("tap",function() {
		var msg = {
			type: "playerConnect",
			rmID: rmID,
			playerID: playerID,
			playerName: playerName
		};
		websocket.send(JSON.stringify(msg));
	});

	$('#submitNameBtn').on("tap",function() {
		document.getElementById("clickSound").play();
		playerName = $("#playername").val();
		var msg = {
			type: "playerName",
			rmID: rmID,
			playerID: playerID,
			playerName: playerName
		};
		websocket.send(JSON.stringify(msg));
	});

	$('#connectBtn').on("tap",function() {
		document.getElementById("clickSound").play();
		if ($("#roomid").val()=="") { alert("please input room id"); return; }
		playerName = $("#playername").val();
		rmID = $("#roomid").val();
		//$('#debug2').html("<div class=\"system_msg\">roomid:"+rmID+" playername:"+playerName+"</div>"); //notify user
		var msg = {
			type: "playerConnect",
			rmID: rmID,
			playerID: -1,
			playerName: playerName
		};
		websocket.send(JSON.stringify(msg));
		location.hash = "#pagewait";
	});
	var cal = localStorage.getItem("calibrateAxes");
	if(cal==undefined){
		location.hash = "#pagesetting";
		startCal();
	}else{
		calibrateAxes = localStorage.getItem("calibrateAxes");
		calibrationFactor = localStorage.getItem("calibrationFactor");
		rotate = localStorage.getItem("rotate");
   		//$('#debug2').append("<div> cal Fac"+calibrationFactor+"</div>");

	}
    if(rotate == 1 ) {
    	//$("#pageconnect").addClass('rotate');
    	//$("#pagesetting").addClass('rotate');
    	$(".playresult").addClass('rotate');
		$("#pagewait").addClass('rotate');
		$(".gameButton").addClass('rotate');
    }

   if (rmID!=null) {
   		$("#roomid").val(rmID);
   }
}

function initPagePlay() {
	gameThread = setInterval(function() {
		var dir =0;
		if(calibrateAxes=="X"){
			dir = accX;
		}else if (calibrateAxes == "Y"){
			dir = accY;
		}else if (calibrateAxes == "Z"){
			dir = accZ;
		}
		var msg = {
			type: "controlData",
			rmID: rmID,
			playerID: playerID,
			host: "0",
			fire: fireFlag,
			power: powerFlag,
			direction: dir,
			message: 'fire '+fireFlag+" power "+powerFlag+" accX "+accX,
		};
		//convert and send data to server
		websocket.send(JSON.stringify(msg));
		// 0$('#debug2').append(msg.message+"<br />");
	},10);
}

function updatePlaneData() {
	console.log("updatePlaneData");
	var i=1;
	$('.planeBtn').each(function(index, currentElement) {
		console.log(currentElement, index, planeArr);

		if (planeArr[index+1]==-1) {
			$(this).removeClass('planeSelected selfSelected');
		} else if (planeArr[index+1]==playerID) {
			$(this).addClass('selfSelected');
		} else {
			$(this).addClass('planeSelected');
		}
		i++;
	});
}

function initSocket() {
	//create a new WebSocket object.
	//var wsUri = "ws://223.255.151.218:4140/4140/source/server.php";
	//var wsUri = "ws://192.168.11.50:4140/4140/source/server.php";
	var wsUri = "ws://"+SERVERHOST+":"+PORTNO+"/"+ROOTPATH+"/source/server.php";
	websocket = new WebSocket(wsUri);

	websocket.onopen = function(ev) { // connection is open
		//$('#debug2').append("<div class=\"system_msg\">Connected!</div>"); //notify user
		// if (rmID!=null) {
		// 	//$('#debug').append("<div>have rmID</div>");
		// 	var msg = {
		// 		type: "playerConnect",
		// 		rmID: rmID,
		// 		playerID: -1,
		// 		playerName: ""
		// 	};
		// 	websocket.send(JSON.stringify(msg));
		// 	location.hash = "#pagewait";
		// }
	}

	websocket.onmessage = function(ev) {
		var msg = JSON.parse(ev.data); //PHP sends Json data
		var type = msg.type; //message type
		// var umsg = msg.message; //message text
		// var uname = msg.name; //user name
		// var ucolor = msg.color; //color
		if(type != 'system') ;//$('#debug2').append("<div>type:"+type+"</div>");
		if(type == 'playerConnect') {
			playerID = msg.playerID;
			if (playerName == NULL) { playerName = "Player "+playerID; }
			//$('#debug2').append("<div>playerID:"+playerID+"</div>");
			$("#playerNameField").html(playerName);
			updatePlaneData();
		}else if(type == 'roomPlane') {
			planeArr = msg.planeArr;
			updatePlaneData();
		} else if(type == 'startGame') {
			location.hash = "#pageplay";
		} else if (type == 'fire') {
			fireSoundFlag =1;

			//playFireSound();
			//$('#debug2').append("<div>play fire sound</div>");
		}else if(type == 'onHit'){
			//$('#debug2').append("<div>Hit</div>");
			window.navigator.vibrate(100);
		}else if (type == 'onHitCritical'){
			//$('#debug2').append("<div>HitCirtical</div>");
			window.navigator.vibrate([50,150,50,150,50]);
		}else if (type == 'dead'){
			//$('#debug2').append("<div>Dead</div>");
			window.navigator.vibrate(1000);
			location.hash = "#pageresult";
		}else if (type == 'restart') {
			planeArr = [];
			updatePlaneData();
			location.hash = "#pagewait";

		}else if (type == 'reconnectRe') {

			var msg = {
				type: "playerConnect",
				rmID: rmID,
				playerID: playerID,
				playerName: playerName
			};
			websocket.send(JSON.stringify(msg));
			planeArr = [-1,-1,-1,-1,-1,-1,-1];
			updatePlaneData();
			location.hash = "#pagewait";

		}
		// if(type == 'system')
		// {
		// 	$('#debug2').append("<div class=\"system_msg\">"+umsg+"</div>");
		// }

		$('#message').val(''); //reset text
	};

	websocket.onerror	= function(ev){$('#debug2').append("<div class=\"system_error\">Error Occurred - "+ev.data+"</div>");};
	websocket.onclose 	= function(ev){$('#debug2').append("<div class=\"system_msg\">Connection Closed</div>");};
}

$( document ).ready(function() {
	initSocket();
	init();
	fireSound = document.getElementById("fireSound");

	if (mediaPlaybackRequiresUserGesture()) {
	  console.log('wait for input event');
	  window.addEventListener('keydown', removeBehaviorsRestrictions);
	  window.addEventListener('mousedown', removeBehaviorsRestrictions);
	  window.addEventListener('touchstart', removeBehaviorsRestrictions);
	} else {
	  console.log('no user gesture required');
	  setSource();
	}

	window.ondevicemotion = function(event) {

	    accX = event.accelerationIncludingGravity.x * calibrationFactor;
	    accY = event.accelerationIncludingGravity.y * calibrationFactor;
	    accZ = event.accelerationIncludingGravity.z * calibrationFactor;
	    //$("#debug").html(accX.toFixed(2)+" "+accY.toFixed(2)+" "+accZ.toFixed(2));
	    //playSound();
	    if(fireSoundFlag==1){
			//$('#debug2').append("<div>2 play fire sound</div>");

			fireSound.pause();
			fireSound.currentTime = 0;
			fireSound.play();
			fireSoundFlag =0;
		}
		if(calibration == 2){
			//$("#debug3").html(accXOrg.toFixed(2)+" "+accYOrg.toFixed(2)+" "+accZOrg.toFixed(2));
			if(Math.abs(accX-accXOrg) > 7){
				calibrateAxes = "X";
				localStorage.setItem("calibrateAxes", "X");
				rotate = 0;
				localStorage.setItem("rotate", 0);
				if(accX < 0){
					calibrationFactor = 1;
					localStorage.setItem("calibrationFactor", 1);
				}else{
					calibrationFactor = -1;
					localStorage.setItem("calibrationFactor", -1);

				}
				//$('#debug2').append("<div>X cal Fac set "+localStorage.getItem("calibrationFactor")+"</div>");
				calibration = 0;
				rotate = 0;
				$("#pagewait").removeClass('rotate');
				$(".gameButton").removeClass('rotate');
				$(".playresult").removeClass('rotate');
				$("#calibration").addClass("hide");
				document.getElementById("calStatus").innerHTML = "Calibration complete!";
				document.getElementById("clickSound").play();
				$("#startCalibrateBtn").html("Start Calibration");
			}
			else if(Math.abs(accY-accYOrg) > 7){
				calibrateAxes = "Y";
				localStorage.setItem("calibrateAxes", "Y");
				rotate = 1;
				localStorage.setItem("rotate", 1);
				if(accY < 0){
					calibrationFactor = 1;
					localStorage.setItem("calibrationFactor", 1);
				}else{
					calibrationFactor = -1;
					localStorage.setItem("calibrationFactor", -1);
				}
				//$('#debug2').append("<div>Y cal Fac set "+localStorage.getItem("calibrationFactor")+"</div>");
				calibration = 0;
				rotate = 1;
				$("#pagewait").addClass('rotate');
				$(".gameButton").addClass('rotate');
				$(".playresult").addClass('rotate');
				$("#calibration").addClass("hide");
				document.getElementById("calStatus").innerHTML = "Calibration complete!";
				document.getElementById("clickSound").play();
				$("#startCalibrateBtn").html("Start Calibration");
			}
			else if(Math.abs(accZ-accZOrg) > 7){
				calibrateAxes = "Z";
				localStorage.setItem("calibrateAxes", "Z");
				if(accZ < 0){
					calibrationFactor = 1;
					localStorage.setItem("calibrationFactor", 1);
				}else{
					calibrationFactor = -1;
					localStorage.setItem("calibrationFactor", -1);
				}
				//$('#debug2').append("<div>Z cal Fac set "+localStorage.getItem("calibrationFactor")+"</div>");
				calibration = 0;
				$("#calibration").addClass("hide");
				document.getElementById("calStatus").innerHTML = "Calibration complete!";
				document.getElementById("clickSound").play();
				$("#startCalibrateBtn").html("Start Calibration");
			}
		}
	}

	$( window ).hashchange(function() {
		var hash = location.hash;
		//clearInterval(gameThread);

		if (hash=="#pageplay") {
			initPagePlay();
		}
	});
	// Since the event is only triggered when the hash changes, we need to trigger
	// the event now, to handle the hash the page may have loaded with.
	$( window ).hashchange();

});


function setSource() {
 // console.log('set source');
 // var fireSound = document.getElementById("fireSound");
  fireSound.src = "../planeWar/sound/shoot.mp3";
  document.getElementById("clickSound").src = "../planeWar/sound/click.mp3";
}

function mediaPlaybackRequiresUserGesture() {
  // test if play() is ignored when not called from an input event handler
 // var video = document.createElement('fireSound');
  fireSound.play();
  return fireSound.paused;
}

function removeBehaviorsRestrictions() {
 // var video = document.querySelector('video');
  //console.log('call load()');
  fireSound.load();
  window.removeEventListener('keydown', removeBehaviorsRestrictions);
  window.removeEventListener('mousedown', removeBehaviorsRestrictions);
  window.removeEventListener('touchstart', removeBehaviorsRestrictions);
  //console.log('wait 1 second');
  setTimeout(setSource, 500);
}


