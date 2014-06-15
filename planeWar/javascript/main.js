var gamejs = require('gamejs');
var box2d = require('./Box2dWeb-2.1.a.3');
var vectors = require('gamejs/utils/vectors');
var math = require('gamejs/utils/math');
var SERVERHOST = "124.244.96.21";
var PORTNO = "4140";
var ROOTPATH = "4140" // The application root is located in http://<IP>:<PORT>/4140/ 
//var SERVERHOST = "223.255.151.218";
//var SERVERHOST = "192.168.11.50";

var SPAWN_LOCATION = [[],[5,5,135],[80,42,-45],[80,5,-135],[5,42,45],[40,5,180],[40,42,0]];
var SPAWNID_LOCATION = [[],[30,120],[1100,540],[1100,30],[30,540],[550,30],[550,540]];

var STEER_NONE=0;
var STEER_RIGHT=1;
var STEER_LEFT=2;
var MAXPLAYER = 6;

var ACC_NONE=0;
var ACC_ACCELERATE=1;
var ACC_BRAKE=2;
var FIREING=1;
var NOFIRE=0;
var STEER_THRE = 1.5;
var timer ;
var WIDTH_PX=1280;   //screen width in pixels
var HEIGHT_PX=720; //screen height in pixels
var SCALE=15;      //how many pixels in a meter
var WIDTH_M=WIDTH_PX/SCALE; //world width in meters. for this example, world is as large as the screen
var HEIGHT_M=HEIGHT_PX/SCALE; //world height in meters
var KEYS_DOWN={}; //keep track of what keys are held down by the player
var b2world;

var planeArr = [];
var roomID = -1;
var playerCount=1;
var toBeDestoried = [];
var planeTimer = [];
var context;
var wallImg=new Image();
var startImg=new Image();
var superBullet=new Image();
var planeImg = [];  
var bulletImg = [];
var powerUpImg = [];
var playerIDImg = [];
var playerNameMap = ["", "Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
var countdownImg = [];
var powerUpOnImg = [];
var planeHP = [10,10,10,10,10,10,10];
var planePowerUp = [0,0,0,0,0,0,0];
var indexInUse =[];
var MAXHP =10;
var gameEnd = 0;
var winID =-1; 

var bgm;
var websocket;
var joinSound;
var planeAva = [-1,-1,-1,-1,-1,-1,-1];  // plane avalible for choosing, index == planeNumber, content == playerID
var playerPlaneMap =[0,0,0,0,0,0,0];  // index==playerID, content == planeNumber
var powerUpDirArr = [];
var powerUpCount = 0;
var gameStart = 4;
var display;
var checkTimeOut;
var checkTimeOutFlag = 0;
var playSoundFlag = 1;
//initialize font to draw text with


function restart(){
    var planeArr = [];
    var roomID = -1;
    var playerCount=1;
    var toBeDestoried = [];
    var planeTimer = [];
    var context;
    var wallImg=new Image();
    var startImg=new Image();
    var superBullet=new Image();
    var planeImg = [];  
    var bulletImg = [];
    var powerUpImg = [];
    var playerIDImg = [];
    var countdownImg = [];
    var powerUpOnImg = [];
    var planeHP = [10,10,10,10,10,10,10];
    var planePowerUp = [0,0,0,0,0,0,0];
    var indexInUse =[];
    var MAXHP =10;
    var gameEnd = 0;
    var winID =-1;
    var bgm;
    var websocket;
    var joinSound;
    var planeAva = [-1,-1,-1,-1,-1,-1,-1];  // plane avalible for choosing, index == planeNumber, content == playerID
    var playerPlaneMap =[0,0,0,0,0,0,0];  // index==playerID, content == planeNumber
    var powerUpDirArr = [];
    var powerUpCount = 0;
    var gameStart = 4;
    var display;
    var checkTimeOutFlag = 0;
    var msg = { 
        type: "restart",
        rmID: roomID
    };
    websocket.send(JSON.stringify(msg));
}


//key bindings
var BINDINGS={accelerate:gamejs.event.K_UP,
              brake:gamejs.event.K_DOWN,
              steer_left:gamejs.event.K_LEFT,
               steer_right:gamejs.event.K_RIGHT,
               fire:gamejs.event.K_ENTER};


var BoxProp = function(pars){
    /*
   static rectangle shaped prop

     pars:
     size - array [width, height]
     position - array [x, y], in world meters, of center
    */
    this.size=pars.size;

    //initialize body
    var bdef=new box2d.b2BodyDef();
    bdef.position=new box2d.b2Vec2(pars.position[0], pars.position[1]);
    bdef.angle=0;
    bdef.fixedRotation=true;
    bdef.userData = pars.userData;
    this.body=b2world.CreateBody(bdef);

    //initialize shape
    var fixdef=new box2d.b2FixtureDef;
    fixdef.shape=new box2d.b2PolygonShape();
    fixdef.shape.SetAsBox(this.size[0]/2, this.size[1]/2);
    fixdef.restitution=0.4; //positively bouncy!
    this.body.CreateFixture(fixdef);
    console.log(this);
    return this;
};

function Wheel(pars){
    /*
    wheel object

    pars:

    car - car this wheel belongs to
    x - horizontal position in meters relative to car's center
    y - vertical position in meters relative to car's center
    width - width in meters
    length - length in meters
    revolving - does this wheel revolve when steering?
    powered - is this wheel powered?
    */

    this.position=[pars.x, pars.y];
    this.car=pars.car;
    this.revolving=pars.revolving;
    this.powered=pars.powered;

    //initialize body
    var def=new box2d.b2BodyDef();
    def.type = box2d.b2Body.b2_dynamicBody;
    def.position=this.car.body.GetWorldPoint(new box2d.b2Vec2(this.position[0], this.position[1]));
    def.angle=this.car.body.GetAngle();
    this.body=b2world.CreateBody(def);

    //initialize shape
    var fixdef= new box2d.b2FixtureDef;
    fixdef.density=1;
    fixdef.isSensor=true; //wheel does not participate in collision calculations: resulting complications are unnecessary
    fixdef.shape=new box2d.b2PolygonShape();
    fixdef.shape.SetAsBox(pars.width/2, pars.length/2);
    this.body.CreateFixture(fixdef);

    //create joint to connect wheel to body
    if(this.revolving){
        var jointdef=new box2d.b2RevoluteJointDef();
        jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter());
        jointdef.enableMotor=false; //we'll be controlling the wheel's angle manually
    }else{
        var jointdef=new box2d.b2PrismaticJointDef();
        jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter(), new box2d.b2Vec2(1, 0));
        jointdef.enableLimit=true;
        jointdef.lowerTranslation=jointdef.upperTranslation=0;
    }
    b2world.CreateJoint(jointdef);



}

Wheel.prototype.setAngle=function(angle){
    /*
    angle - wheel angle relative to car, in degrees
    */
    this.body.SetAngle(this.car.body.GetAngle()+math.radians(angle));
};

Wheel.prototype.getLocalVelocity=function(){
    /*returns get velocity vector relative to car
    */
    var res=this.car.body.GetLocalVector(this.car.body.GetLinearVelocityFromLocalPoint(new box2d.b2Vec2(this.position[0], this.position[1])));
    return [res.x, res.y];
};

Wheel.prototype.getDirectionVector=function(){
    /*
    returns a world unit vector pointing in the direction this wheel is moving
    */
    return vectors.rotate((this.getLocalVelocity()[1]>0) ? [0, 1]:[0, -1] , this.body.GetAngle()) ;
};


Wheel.prototype.getKillVelocityVector=function(){
    /*
    substracts sideways velocity from this wheel's velocity vector and returns the remaining front-facing velocity vector
    */
    var velocity=this.body.GetLinearVelocity();
    var sideways_axis=this.getDirectionVector();
    var dotprod=vectors.dot([velocity.x, velocity.y], sideways_axis);
    return [sideways_axis[0]*dotprod, sideways_axis[1]*dotprod];
};

Wheel.prototype.killSidewaysVelocity=function(){
    /*
    removes all sideways velocity from this wheels velocity
    */
    var kv=this.getKillVelocityVector();
    this.body.SetLinearVelocity(new box2d.b2Vec2(kv[0], kv[1]));

};

function powerUps(){

    var randX = Math.random() * (80 - 5) + 5;
    var randY = Math.random() * (40 - 5) + 5;
    this.type= Math.floor(Math.random() * (6 - 1) + 1);
    //this.type= 5;
    powerUpCount ++;

    var def=new box2d.b2BodyDef();
    def.type = box2d.b2Body.b2_dynamicBody;
    def.angle = 180;
    def.position=new box2d.b2Vec2(randX, randY);
    def.angle=math.radians(0);
    def.fixedRotation=true;
    
    def.userData = "powerUp*"+this.type;
    //console.log(def.userData);
    //console.log("fire");
//console.log("st");
    def.linearDamping=0;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
    def.bullet=true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.
    def.angularDamping=0;
    var a = b2world.CreateBody(def);

    var fixdef= new box2d.b2FixtureDef();
    fixdef.density = 0.5;
    fixdef.friction = 0; //friction when rubbing agaisnt other shapes
    fixdef.restitution = 1;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
    fixdef.shape=new box2d.b2CircleShape;
    fixdef.shape.m_p.Set(0, 0);
    fixdef.shape.m_radius = 1; //radius
   // fixdef.filter.groupIndex =-7;

    var b = a.CreateFixture(fixdef);
    var dirRand = Math.random()* powerUpDirArr.length;
    dirRand=  Math.floor(dirRand);
    var position=powerUpDirArr[0].body.GetWorldCenter();
    a.ApplyForce(powerUpDirArr[0].body.GetWorldVector(new box2d.b2Vec2(0,-1200)), position );

}

function Car(pars){
    /*
    pars is an object with possible attributes:

    width - width of the car in meters
    length - length of the car in meters
    position - starting position of the car, array [x, y] in meters
    angle - starting angle of the car, degrees
    max_steer_angle - maximum angle the wheels turn when steering, degrees
    max_speed       - maximum speed of the car, km/h
    power - engine force, in newtons, that is applied to EACH powered wheel
    wheels - wheel definitions: [{x, y, rotatable, powered}}, ...] where
             x is wheel position in meters relative to car body center
             y is wheel position in meters relative to car body center
             revolving - boolean, does this turn rotate when steering?
             powered - is force applied to this wheel when accelerating/braking?
    */

    //state of car controls
    this.steer=STEER_NONE;
    this.accelerate=ACC_NONE;
    this.fireInterval = 500;
    this.max_steer_angle=pars.max_steer_angle;
    this.max_speed=pars.max_speed;
    this.power=pars.power;
    this.wheel_angle=0;//keep track of current wheel angle relative to car.
                       //when steering left/right, angle will be decreased/increased gradually over 200ms to prevent jerkyness.
    this.cat = pars.cat;
    this.playerID= pars.playerID;
    //initialize body
    var def=new box2d.b2BodyDef();
    def.type = box2d.b2Body.b2_dynamicBody;
    def.position=new box2d.b2Vec2(pars.position[0], pars.position[1]);
    def.angle=math.radians(pars.angle);
    def.linearDamping=0.15;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
    def.bullet=true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.
    def.angularDamping=0.3;
    def.userData = "plane"+(this.cat*-1) +"*"+pars.src+"*"+pars.playerID;
    //console.log("create "+pars.src);
    this.imgNumber = pars.src;
    this.body=b2world.CreateBody(def);
    this.powerUp = 0;
    var points = [];
    var vec = new box2d.b2Vec2();
    vec.Set(0, -3);
    points[0] = vec;
    var vec = new box2d.b2Vec2();
    vec.Set(2, 2);
    points[1] = vec;

    var vec = new box2d.b2Vec2();
    vec.Set(-2, 2);
    points[2] = vec;
    var d = new Date();
    this.firingTime = d.getTime();

    //this.hp=MAXHP;
    //initialize shape
    var fixdef= new box2d.b2FixtureDef();
    fixdef.density = 1.0;
    fixdef.friction = 0.3; //friction when rubbing agaisnt other shapes
    fixdef.restitution = 0.4;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
    fixdef.shape=new box2d.b2PolygonShape;
    fixdef.filter.groupIndex =this.cat;
    //fixdef.userData = "car"+this.cat;

    //console.log(pars.cat);
    // fixdef.shape.SetAsBox(1, 1);
    fixdef.shape.SetAsArray(points, points.length);
    this.body.CreateFixture(fixdef);

    //initialize wheels
    this.wheels=[]
    var wheeldef, i;
    for(i=0;i<pars.wheels.length;i++){
        wheeldef=pars.wheels[i];
        wheeldef.car=this;
        this.wheels.push(new Wheel(wheeldef));
    }
    powerUpDirArr.push(this.wheels[1]);
}

Car.prototype.getPoweredWheels=function(){
    //return array of powered wheels
    var retv=[];
    for(var i=0;i<this.wheels.length;i++){
        if(this.wheels[i].powered){
            retv.push(this.wheels[i]);
        }
    }
    return retv;
};

Car.prototype.getLocalVelocity=function(){
    /*
    returns car's velocity vector relative to the car
    */
    var retv=this.body.GetLocalVector(this.body.GetLinearVelocityFromLocalPoint(new box2d.b2Vec2(0, 0)));
    return [retv.x, retv.y];
};

Car.prototype.getRevolvingWheels=function(){
    //return array of wheels that turn when steering
    var retv=[];
    for(var i=0;i<this.wheels.length;i++){
        if(this.wheels[i].revolving){
            retv.push(this.wheels[i]);
        }
    }
    return retv;
};

Car.prototype.getSpeedKMH=function(){
    var velocity=this.body.GetLinearVelocity();
    var len=vectors.len([velocity.x, velocity.y]);
    return (len/1000)*3600;
};

Car.prototype.setSpeed=function(speed){
    /*
    speed - speed in kilometers per hour
    */
    var velocity=this.body.GetLinearVelocity();
    velocity=vectors.unit([velocity.x, velocity.y]);
    velocity=new box2d.b2Vec2(velocity[0]*((speed*1000.0)/3600.0),
                              velocity[1]*((speed*1000.0)/3600.0));
    this.body.SetLinearVelocity(velocity);

};

Car.prototype.update=function(msDuration){

        //1. KILL SIDEWAYS VELOCITY

        //kill sideways velocity for all wheels
        var i;
        for(i=0;i<this.wheels.length;i++){
            this.wheels[i].killSidewaysVelocity();
        }

        //2. SET WHEEL ANGLE

        //calculate the change in wheel's angle for this update, assuming the wheel will reach is maximum angle from zero in 200 ms
        var incr=(this.max_steer_angle/200) * msDuration;

        if(this.steer < -STEER_THRE){
            this.wheel_angle=Math.min(this.steer*6.67, this.max_steer_angle); //increment angle without going over max steer
        }else if(this.steer > STEER_THRE){
            this.wheel_angle=Math.max(this.steer*6.67, -this.max_steer_angle); //decrement angle without going over max steer
        }else{
            this.wheel_angle=0;
        }
/*
        if(this.steer==STEER_RIGHT){
            console.log(this.wheel_angle);
            this.wheel_angle=Math.min(Math.max(this.wheel_angle, 0)+incr, this.max_steer_angle) //increment angle without going over max steer
        }else if(this.steer==STEER_LEFT){
            this.wheel_angle=Math.max(Math.min(this.wheel_angle, 0)-incr, -this.max_steer_angle) //decrement angle without going over max steer
        }else{
            this.wheel_angle=0;
        }
*/
        //update revolving wheels
        var wheels=this.getRevolvingWheels();
        for(i=0;i<wheels.length;i++){
            wheels[i].setAngle(this.wheel_angle);
        }

        //3. APPLY FORCE TO WHEELS
        var base_vect; //vector pointing in the direction force will be applied to a wheel ; relative to the wheel.

        //if accelerator is pressed down and speed limit has not been reached, go forwards
        if((this.accelerate==ACC_ACCELERATE) && (this.getSpeedKMH() < this.max_speed)){
            base_vect=[0, -1];
        }

        else if(this.accelerate==ACC_BRAKE){
            //braking, but still moving forwards - increased force
            if(this.getLocalVelocity()[1]<0)base_vect=[0, 1.3];
            //going in reverse - less force
            else base_vect=[0, 0.7];
        }
        else base_vect=[0, 0];

        //multiply by engine power, which gives us a force vector relative to the wheel
        var fvect=[this.power*base_vect[0], this.power*base_vect[1]];

        //apply force to each wheel
        wheels=this.getPoweredWheels();
        for(i=0;i<wheels.length;i++){
           var position=wheels[i].body.GetWorldCenter();
           wheels[i].body.ApplyForce(wheels[i].body.GetWorldVector(new box2d.b2Vec2(fvect[0], fvect[1])), position );
        }

        //if going very slow, stop - to prevent endless sliding
        if( (this.getSpeedKMH()<4) &&(this.accelerate==ACC_NONE)){
            this.setSpeed(0);
        }

        if(planePowerUp[this.playerID] == 4) {
            this.fireInterval = 300;
        }else{
            this.fireInterval = 500;
        }
// firing
        var d = new Date();
        if(this.fire==FIREING && d.getTime() - this.firingTime > this.fireInterval){

            var msg = {
                type:"fire",
                rmID: roomID,
                playerID: this.playerID
            };
            //alert(msg);
            websocket.send(JSON.stringify(msg));

            //console.log("A");
            wheels[1].setAngle(0);

           // var d = new Date();
            this.firingTime = d.getTime();

            var firevect=[this.power*0, this.power*-1];
            var pos = wheels[1].body.GetWorldCenter();
            //console.log(pos);
            var def=new box2d.b2BodyDef();
            def.type = box2d.b2Body.b2_dynamicBody;
            def.angle = 180;
            def.position=new box2d.b2Vec2(pos.x, pos.y);
            def.angle=math.radians(0);
            def.fixedRotation=true;
            
            //var temp = this.body.userData.split("*");
            def.userData = "bullet"+(this.cat*-1)+"*"+this.imgNumber+"*"+this.playerID+"*"+planePowerUp[this.playerID];

            if(planePowerUp[this.playerID]==5) planePowerUp[this.playerID] = 0;
            //console.log("fire");
            
            def.linearDamping=0;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
            def.bullet=true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.
            def.angularDamping=0;
            var a = b2world.CreateBody(def);

            var points = [];
            var vec = new box2d.b2Vec2();
            vec.Set(0, -0.6);
            points[0] = vec;
            var vec = new box2d.b2Vec2();
            vec.Set(0.4, 0.4);
            points[1] = vec;

            var vec = new box2d.b2Vec2();
            vec.Set(-0.4, 0.4);
            points[2] = vec;

            //console.log(this.cat);

            //initialize shape
            // b2CircleShape circleShape;
            // circleShape.m_p.Set(0, 0); //position, relative to body position
            // circleShape.m_radius = 1; //radius

            var fixdef= new box2d.b2FixtureDef();
            fixdef.density = 1;
            fixdef.friction = 0; //friction when rubbing agaisnt other shapes
            fixdef.restitution = 0;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
            fixdef.shape=new box2d.b2CircleShape;
            fixdef.shape.m_p.Set(0, 0);
            fixdef.shape.m_radius = 0.25; //radius
            fixdef.filter.groupIndex =this.cat;

            //console.log(position.x, position.y);
            //console.log(this.cat);
            // fixdef.shape.SetAsBox(1, 1);
            //fixdef.shape.SetAsArray(points, points.length);
            var b = a.CreateFixture(fixdef);
            var position=wheels[1].body.GetWorldCenter();
            a.ApplyForce(wheels[1].body.GetWorldVector(new box2d.b2Vec2(0,-600)), position );
            wheels[1].setAngle(this.wheel_angle);

        }

};

function checkWin(){
    var flag = 0;
    winID = -1;
    //console.log(indexInUse);
    for(var i=0;i<indexInUse.length;i++){
        if(planeHP[indexInUse[i]] > 0){
            flag ++;
            winID = indexInUse[i];
        }
    }
    if(flag == 1 && gameEnd<1){
        
        gameEnd =1;
        //while(1);
    }
    
}


function powerUphandle(A,B){
    powerUpCount --;
    var pUpData = B.split("*");
    var planeData = A.split("*");
    
  //  console.log("planeData All"+planeData);
  //  console.log("planeData 2"+planeData[2]);
    if ( pUpData[1]!=3) {
        planePowerUp[planeData[2]] = pUpData[1];
    }
    if(pUpData[1]==3){
        if(planeHP[planeData[2]]==9){
            planeHP[planeData[2]] ++;
        }else if (planeHP[planeData[2]]<9){
            planeHP[planeData[2]] +=2;
        }
        document.getElementById("hpNumber"+playerPlaneMap[planeData[2]]).innerHTML=planeHP[planeData[2]];
        $("#hp"+playerPlaneMap[planeData[2]]).css('width',((planeHP[planeData[2]]/10)*100) + "%");
    }
    //function(){
    //console.log("hit"+planeData[2]);    
    if(pUpData[1]==2 || pUpData[1]==4){
        clearTimeout(planeTimer[planeData[2]]);

        planeTimer[planeData[2]] = setTimeout(
            function () {
                var index = planeData[2];
                return function(e) {
                    if(planePowerUp[index]==2 || planePowerUp[index]==4) planePowerUp[index] = 0;
                }
            }()
        ,10000);
    }

}


function arrFind(ele){
    for(var i=1;i<7;i++){
        if(playerPlaneMap[i] == ele) return true;
    }
    return false;
}

/*
 *initialize car and props, start game loop
 */
function gameEngine(){
    var dateObj = new Date();
    var stcountdown = dateObj.getTime();
    display = gamejs.display.setMode([WIDTH_PX, HEIGHT_PX]);
    var font=new gamejs.font.Font('18px Sans-serif');
    var winText=new gamejs.font.Font('36px Sans-serif');
   // font.backgroundColor = "#88FF88";
    superBullet.src = './img/superBullet.png';
    wallImg.src = './img/wall.png';
   // wallImg.src = './img/debugBG.png';
    startImg.src = './img/start.png';
    for(i=1;i<7;i++){
        planeImg[i] = new Image();
        bulletImg[i]=new Image();
        playerIDImg[i] = new Image();
        planeImg[i].src= './img/plane'+i+'.png';
        bulletImg[i].src= './img/bomb'+i+'.png';
        playerIDImg[i].src = './img/player'+i+'.png';
        if(i<6) {
            powerUpImg[i]=new Image();
            powerUpOnImg[i]=new Image();
            powerUpImg[i].src = './img/powerUp'+i+'.png';
            powerUpOnImg[i].src = './img/powerUpOn'+i+'.png';
        }
        if(i<4) {
            countdownImg[i] = new Image();
            countdownImg[i].src = './img/countdown'+i+'.png';
        }
    }
    //SET UP B2WORLD
    b2world=new box2d.b2World(new box2d.b2Vec2(0, 0), false);

   // timer = Math.random() * (15000 - 8000) + 8000;
    


    //console.log(box2d);
    var listener = new box2d.Box2D.Dynamics.b2ContactListener;
    listener.BeginContact = function(contact) {
        //console.log("contact");
        var A = contact.GetFixtureA().GetBody().GetUserData();
        var B = contact.GetFixtureB().GetBody().GetUserData();

        if(A != null && B != null){
            //console.log(A,B);
            if(B.substr(0,6)=="bullet" || A.substr(0,6)=="bullet"){
                if(A.substr(0,4) == "wall"){
                    toBeDestoried.push(contact.GetFixtureB().GetBody());
                }else if (B.substr(0,4)=="wall"){
                    toBeDestoried.push(contact.GetFixtureA().GetBody());
                }
            }
            if(B.substr(0,6)=="bullet" && A.substr(0,6)=="bullet"){
                toBeDestoried.push(contact.GetFixtureA().GetBody());
                toBeDestoried.push(contact.GetFixtureB().GetBody());
            }
            else if(B.substr(0,6)=="bullet" || A.substr(0,6)=="bullet"){  // bullet 

                if(A.substr(0,5) == "plane"){   // hit plane
                    var temp = A.split("*");
                    var bulletData = B.split("*");
                    toBeDestoried.push(contact.GetFixtureB().GetBody());
                    
                    if(planePowerUp[temp[2]]==1){
                        //contact.GetFixtureA().GetBody().SetUserData(temp[0]+"*"+temp[1]+"*"+temp[2]+"*");
                        planePowerUp[temp[2]] = 0;
                    }else if(bulletData[3]==5){
                        planeHP[temp[2]] = 0;
                        sendToClient(temp[2],"dead");
                        toBeDestoried.push(contact.GetFixtureA().GetBody());
                    }else{
                        if(planeHP[temp[2]]<=1){ // plane die
                            planeHP[temp[2]] --;
                            sendToClient(temp[2], "dead");
                            toBeDestoried.push(contact.GetFixtureA().GetBody());
                        }else{

                            var bulletData = contact.GetFixtureB().GetBody().GetUserData().split("*");
                            if(bulletData[3]==2){
                                planeHP[temp[2]] --;                                                  
                            }

                            planeHP[temp[2]] --;
                            if (planeHP[temp[2]] <= 0){
                                sendToClient(temp[2], "dead");
                                toBeDestoried.push(contact.GetFixtureA().GetBody());
                            }
                            if (planeHP[temp[2]] <= 0){
                                sendToClient(temp[2], "dead");
                                toBeDestoried.push(contact.GetFixtureB().GetBody());
                            }
                            else if(planeHP[temp[2]] < 4){
                                sendToClient(temp[2], "onHitCritical");
                            }else if(planeHP[temp[2]] > 0){
                                sendToClient(temp[2], "onHit");
                            } 
                        }
                    }
                    console.log(temp[2]);
                   // console.log($("#hp"+temp[1]));
                    document.getElementById("hpNumber"+playerPlaneMap[temp[2]]).innerHTML=planeHP[temp[2]];
                    $("#hp"+playerPlaneMap[temp[2]]).css('width',((planeHP[temp[2]]/10)*100) + "%");
                    
                   
                }else if (B.substr(0,5)=="plane"){
                    toBeDestoried.push(contact.GetFixtureA().GetBody());
                    var bulletData = A.split("*");
                    var temp = B.split("*");
                    
                    if(planePowerUp[temp[2]]==1){
                        planePowerUp[temp[2]] = 0;
                    }else if(bulletData[3]==5){
                        planeHP[temp[2]] = 0;
                        sendToClient(temp[2],"dead");
                        toBeDestoried.push(contact.GetFixtureB().GetBody());
                    }else{
                        if(planeHP[temp[2]]<=1){
                           // console.log("bbb");
                            planeHP[temp[2]] --;
                            sendToClient(temp[2], "dead");
                            toBeDestoried.push(contact.GetFixtureB().GetBody());
                        }else{
                            var bulletData = contact.GetFixtureA().GetBody().GetUserData().split("*");
                            if(bulletData[3]==2){
                                planeHP[temp[2]] --;                                                  
                            }
                            planeHP[temp[2]] --;
                            if (planeHP[temp[2]] <= 0){
                                sendToClient(temp[2], "dead");
                                toBeDestoried.push(contact.GetFixtureA().GetBody());
                            }
                            if (planeHP[temp[2]] <= 0){
                                sendToClient(temp[2], "dead");
                                toBeDestoried.push(contact.GetFixtureB().GetBody());
                            }
                            else if(planeHP[temp[2]] < 4){
                                sendToClient(temp[2], "onHitCritical");
                            }else if(planeHP[temp[2]] > 0){
                                sendToClient(temp[2], "onHit");
                            } 
                        }
                        document.getElementById("hpNumber"+playerPlaneMap[temp[2]]).innerHTML=planeHP[temp[2]];
                    $("#hp"+playerPlaneMap[temp[2]]).css('width',((planeHP[temp[2]]/10)*100) + "%");
                    }
                }

                if(A.substr(0,7) == "powerUp"){   // hit powerUp
                    toBeDestoried.push(contact.GetFixtureA().GetBody());
                    toBeDestoried.push(contact.GetFixtureB().GetBody());
                    powerUphandle(B,A);

                }else if (B.substr(0,7) == "powerUp"){
                    toBeDestoried.push(contact.GetFixtureB().GetBody());
                    toBeDestoried.push(contact.GetFixtureA().GetBody());
                    powerUphandle(A,B);
                }

            }else if(B.substr(0,7)=="powerUp" || A.substr(0,7)=="powerUp"){
                if(A.substr(0,5) == "plane"){
                    toBeDestoried.push(contact.GetFixtureB().GetBody());
                    powerUphandle(A,B);
                    
                    //contact.GetFixtureA().GetBody().SetUserData(planeData[0]+"*"+planeData[1]+"*"+planeData[2]+"*"+pUpData[1]);
                }else if (B.substr(0,5) == "plane"){
                    toBeDestoried.push(contact.GetFixtureA().GetBody());
                    powerUphandle(B,A);
                    //contact.GetFixtureA().GetBody().SetUserData(planeData[0]+"*"+planeData[1]+"*"+planeData[2]+"*"+pUpData[1]);
                }

            }
            
            
        }
    }




//        console.log(contact.GetFixtureA().GetBody().GetUserData());
  //      console.log(contact.GetFixtureB().GetBody().GetUserData());

        // console.log(contact.GetFixtureA().GetBody().GetUserData());
    
    // if (callbacks.EndContact) listener.EndContact = function(contact) {
    //     callbacks.EndContact(contact.GetFixtureA().GetBody().GetUserData(),
    //                          contact.GetFixtureB().GetBody().GetUserData());
    // }
    // if (callbacks.PostSolve) listener.PostSolve = function(contact, impulse) {
    //     callbacks.PostSolve(contact.GetFixtureA().GetBody().GetUserData(),
    //                          contact.GetFixtureB().GetBody().GetUserData(),
    //                          impulse.normalImpulses[0]);
    // }
    b2world.SetContactListener(listener);




    //set up box2d debug draw to draw the bodies for us.
    //in a real game, car will propably be drawn as a sprite rotated by the car's angle
    var debugDraw = new box2d.b2DebugDraw();
    debugDraw.SetSprite(display._canvas.getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(0.5);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(box2d.b2DebugDraw.e_shapeBit);
    b2world.SetDebugDraw(debugDraw);


    //initialize car
    //console.log(playerCount);
    for(i =1;i< playerCount;i++){
        //alert(playerCount);
        if(playerPlaneMap[i] == 0){
            for (var j =1;j<7;j++){
                if(arrFind(j)==false){
                    playerPlaneMap[i] = j;
                    planeAva[j] = i; 
                    break;
                }
            }
        }
        console.log(SPAWN_LOCATION[i]);
        var car=new Car({'width':2,
            'length':4,
            'position':[SPAWN_LOCATION[i][0], SPAWN_LOCATION[i][1]],
            'angle':SPAWN_LOCATION[i][2],
            'power':60,
            'max_steer_angle':60,
            'max_speed':60,
            'wheels':[{'x':0.02, 'y':-2, 'width':0.4, 'length':0.8, 'revolving':true, 'powered':true}, //top left
                        {'x':0.02, 'y':-2, 'width':0.4, 'length':0.8, 'revolving':true, 'powered':true},//gun
                        {'x':-1, 'y':1.8, 'width':0.4, 'length':0.8, 'revolving':false, 'powered':false}, //back left
                        {'x':1, 'y':1.8, 'width':0.4, 'length':0.8, 'revolving':false, 'powered':false}],
            'cat': -i,
            'src': playerPlaneMap[i],
            'playerID': i
        }); //back right
        indexInUse.push(i);
        planeArr[i-1] = car;
    }
    


    /*
    planeArr[0] = car;
    var car2=new Car({'width':2,
                    'length':4,
                    'position':[10, 10],
                    'angle':180,
                    'power':60,
                    'max_steer_angle':40,
                    'max_speed':60,
                    'wheels':[{'x':0.02, 'y':-2, 'width':0.4, 'length':0.8, 'revolving':true, 'powered':true}, //top left
                                {'x':0.02, 'y':-2, 'width':0.4, 'length':0.8, 'revolving':true, 'powered':true},//gun
                                {'x':-1, 'y':1.8, 'width':0.4, 'length':0.8, 'revolving':false, 'powered':false}, //back left
                                {'x':1, 'y':1.8, 'width':0.4, 'length':0.8, 'revolving':false, 'powered':false}],
                    'cat':-2
                }); //back right
    //initialize some props to bounce against
    planeArr[1] = car2;
    */
    var props=[];

    //outer walls
    props.push(new BoxProp({'size':[WIDTH_M, 1],    'position':[WIDTH_M/2, 0.5],'userData': "wallUp*./img/wall.png"}));
    props.push(new BoxProp({'size':[1, HEIGHT_M-2], 'position':[0.5, HEIGHT_M/2],'userData': "wall"}));
    props.push(new BoxProp({'size':[WIDTH_M, 1],    'position':[WIDTH_M/2, HEIGHT_M-0.5],'userData': "wall"}));
    props.push(new BoxProp({'size':[1, HEIGHT_M-2], 'position':[WIDTH_M-0.5, HEIGHT_M/2],'userData': "wall"}));

    //pen in the center
   // var center=[WIDTH_M/2, HEIGHT_M/2];
    //props.push(new BoxProp({'size':[1, 6], 'position':[center[0]-3, center[1]]}));
   // props.push(new BoxProp({'size':[1, 6], 'position':[center[0]+3, center[1]]}));
   // props.push(new BoxProp({'size':[5, 1], 'position':[center[0], center[1]+2.5]}));
   //console.log(context);
   
    function tick(msDuration) {
        //GAME LOOP
       
        //set car controls according to player input
        checkWin();
        //var temp = toBeDestoried.pop();//(contact.GetFixtureA().GetBody());
        var temp = undefined;
        while((temp = toBeDestoried.pop())){
            b2world.DestroyBody(temp);
        }

        /*
        for (i=0;i<toBeDestoried.length;i++){
            b2world.DestroyBody(toBeDestoried[i]);
        }
        */
        //if(temp!=null) 


        //overridecontrol
/*
        if(KEYS_DOWN[BINDINGS.accelerate]){

            planeArr[0].accelerate=ACC_ACCELERATE;
        }else if(KEYS_DOWN[BINDINGS.brake]){
            planeArr[0].accelerate=ACC_BRAKE;
        }else{
            planeArr[0].accelerate=ACC_NONE;
        }

        if(KEYS_DOWN[BINDINGS.steer_right]){
            planeArr[0].steer=STEER_RIGHT;
        }else if(KEYS_DOWN[BINDINGS.steer_left]){
            planeArr[0].steer=STEER_LEFT;
        }else{
            planeArr[0].steer=STEER_NONE;
        }

        if(KEYS_DOWN[BINDINGS.fire] && car.fire==NOFIRE){
            planeArr[0].fire=FIREING;
            //console.log("fff");
        }else{
            planeArr[0].fire=NOFIRE;
        }
        
*/


        //update car
        for(i=0;i<playerCount-1;i++){
            planeArr[i].update(msDuration);
        }
        // car.update(msDuration);
        // car2.update(msDuration);

        //update physics world
        b2world.Step(msDuration/1000, 10, 8);

        //clear applied forces, so they don't stack from each update
        b2world.ClearForces();

        //fill background
        gamejs.draw.rect(display, '#000000', new gamejs.Rect([0, 0], [WIDTH_PX, HEIGHT_PX]),0)

       
      
        
         //let box2d draw it's bodies
        b2world.DrawDebugData();
        


        

        $("gjs-loader").clearCanvas();
        context.drawImage(wallImg,0,0);

        for (b = b2world.GetBodyList() ; b; b = b.GetNext())
        {
              var angle = b.GetAngle()*(180/Math.PI);
              var pos = b.GetPosition();
              var uData =  b.GetUserData();

                if(uData!=null){
                      var img;
                      if(uData.substr(0,5)=="plane"){
                        var temp = uData.split("*");
                        //console.log("draw "+temp[1]);
                        img= planeImg[temp[1]];
                        var width = img.width;
                        var height = img.height;
                    //context.rotateCanvas(pos.x,pos.y,angle);
                    //context.rotate(angle);
                    //console.log(angle,b.GetAngle());
                    context.save();
                   // 
                    context.translate(pos.x*SCALE,pos.y*SCALE); 
                        context.rotate(b.GetAngle());
                        //context.drawImage(img,pos.x*SCALE-31,pos.y*SCALE-33);
                        context.drawImage(img,-width/2, -height/2-7,width,height);
                        //console.log(temp[3]);
                        if(planePowerUp[temp[2]]!=0){
                            context.drawImage(powerUpOnImg[planePowerUp[temp[2]]],-width/2+2, -height/2-7,width,height);
                        }
                        var m_textLine =0; 
                        

                        display.blit(font.render(playerNameMap[temp[2]], "#FFFFFF"), [-width/2, -height/2+75]);
                       // console.log(debugDraw);
                        //debugDraw.DrawString(5, m_textLine, "Testing");

                      //  context.rotate(0);
                        context.restore();

                    }else if(uData.substr(0,6)=="bullet"){
                        var temp = uData.split("*");
                        //img.src= temp[1];
                        //console.log(temp[1]);
                        if(temp[3]==5){
                            context.drawImage(superBullet,pos.x*SCALE-4,pos.y*SCALE-4);
                        }else{
                            context.drawImage(bulletImg[temp[1]],pos.x*SCALE-4,pos.y*SCALE-4);
                        }
                    }else if(uData.substr(0,7)=="powerUp"){
                        var temp = uData.split("*");
                        //console.log(temp);
                        //img.src= temp[1];
                        //console.log(temp[1]);
                        context.drawImage(powerUpImg[temp[1]],pos.x*SCALE-15,pos.y*SCALE-15);
                    }

                   // uData = uData.split("*");
                    //var src = uData[1];
                   // console.log(src);
                  // Using Images to display bodies
                  // $("gjs-loader").rotateCanvas({
                  //         x: pos.x , y: pos.y,
                  //         rotate: angle
                  //     }).drawImage({
                  //         source: './img/plane1.jpg',
                  //         x: pos.x , y: pos.y,
                  //         fromCenter: true
                  //     }).restoreCanvas();
                      
                  // if (b.GetUserData() != 'ground'){ 
                      
                  //  }
                    
                  //  // Using CSS to draw ground
                  //  else if(b.GetUserData() == 'ground') {
                  //      $("gjs-loader").drawRect({
                  //         fillStyle: "#8cc924",
                  //         x: pos.x * 30, y: pos.y * 30,
                  //         width: 20 * 30,   // 600px
                  //         height: 1 * 30,   // 30px
                  //         cornerRadius: 0
                  //     })

                  //  }  
                   
               }   
                if(gameStart>0) {
                    if(gameStart>1)  {
                        context.drawImage(countdownImg[gameStart-1],550,270);
                    }
                    else if(gameStart==1) {
                        context.drawImage(startImg,420,270);
                        if(playSoundFlag == 1){
                            document.getElementById("startSound").play();
                            playSoundFlag = 0;
                        }
                    }
                    //var display = gamejs.display.setMode([WIDTH_PX, HEIGHT_PX]);
                    
                    //console.log("text n ");
                    
                    for(var i=0;i<indexInUse.length;i++){
                    //    console.log(indexInUse[i]);
                     //   display.blit(font.render('Player '+indexInUse[i], [10,10]));
                     context.drawImage(playerIDImg[indexInUse[i]],SPAWNID_LOCATION[indexInUse[i]][0],SPAWNID_LOCATION[indexInUse[i]][1]);
                    }
                    
                }
               
               
        }
        
        // if(gameEnd==1){
        //     //document.getElementById("status").innerHTML = playerNameMap[winID] + " Wins!";
        //     //gameEnd = 2;
        // }        
        if(gameEnd == 1){
            //console.log("aaa");
            if(playerPlaneMap[winID]!=undefined){
                display.blit(winText.render(playerNameMap[winID] + " Win", "#FF0000"), [550,350]);
            }else{
                display.blit(winText.render("No one Win", "#FF0000"), [540,350]);
            }
        }





        //fps and car speed display
       // display.blit(font.render('FPS: '+parseInt((1000)/msDuration)), [25, 25]);
      //  display.blit(font.render('SPEED: '+parseInt(Math.ceil(car.getSpeedKMH()))+' km/h'), [25, 55]);
        return;
    };
    /*
    function handleEvent(event){
        if (event.type === gamejs.event.KEY_DOWN) KEYS_DOWN[event.key] = true;
            //key release
        else if (event.type === gamejs.event.KEY_UP) KEYS_DOWN[event.key] = false;

    };
    */
    setTimeout(function(){
        document.getElementById("countDownSound").play();        
           
           
    }, 1000);
    
    gamejs.onTick(tick, this);
    //drawText(display);
    setTimeout(function(){gameStart--; }, 2000);
    setTimeout(function(){gameStart--; }, 3000);
    setTimeout(function(){gameStart--; }, 4000);
    setTimeout(function(){
    gameStart--; 
    timer = Math.random() * (5000 - 3000) + 3000;   

        setInterval(function(){
            if(powerUpCount < 2){
                powerUps();
                //console.log(powerUpCount);
            } 

        }, timer);
    }, 5000);
    $('html, body').animate({scrollTop:$(document).height()}, 'slow');
    //gamejs.onEvent(handleEvent);
}
function bgmFadeOut(){
    
    $("#bgm").animate({volume: 0.9}, 100);    
    $("#bgm").animate({volume: 0.8}, 100);    
    $("#bgm").animate({volume: 0.7}, 100);    
    $("#bgm").animate({volume: 0.6}, 100);    
    $("#bgm").animate({volume: 0.5}, 100);    
    $("#bgm").animate({volume: 0.4}, 100);    
    $("#bgm").animate({volume: 0.3}, 100);    
    $("#bgm").animate({volume: 0.2}, 100);    
    $("#bgm").animate({volume: 0.1}, 100);    
    $("#bgm").animate({volume: 0.0}, 100);    
    setTimeout(function(){bgm.pause();}, 1000);
    
}

function startGameEngine(){

    if(gameStart == 0 ){
        //document.getElementById("startGameBtn").html = "Start Game";

        localStorage.setItem("rmID", roomID);
        localStorage.setItem("restart", 1);
        location.reload();
        //restart();
        
    }else{
        bgmFadeOut();
        
        document.getElementById("gjs-canvas").style.display="";
        //document.getElementById("startGameBtn").style.display="none";
        var msg = {
            type:"startGame",
            rmID: roomID
            };
        //alert(msg);
        websocket.send(JSON.stringify(msg));
        console.log("stargeme");
        $("#startGameBtn").html("Restart Game");
        gameEngine();
        
    }
}
function sendPlaneAva(){
    var msg = { 
        type:"roomPlane",
        rmID: roomID,
        planeArr: planeAva
    };
    websocket.send(JSON.stringify(msg));
}

function sendToClient(pID, code){
    var msg = { 
        type: code,
        rmID: roomID,
        playerID: pID,
    };
    websocket.send(JSON.stringify(msg));

}

function main(){

    
    bgm = document.getElementsByTagName("audio")[0];
    bgm.play();
    joinSound = new Audio('./sound/join.mp3');
    context = document.getElementById("gjs-canvas").getContext("2d");
    //console.log(context);
   

    //initialize display
    document.getElementById("gjs-canvas").style.display="none";
    document.getElementById("startGameBtn").onclick=function(){
        //alert("A");
        startGameEngine();
    };

    document.getElementById("stopbgmBtn").onclick=function(){
        if(bgm.paused){
            $("#bgm").animate({volume: 1}, 0);
            bgm.play();
            document.getElementById("stopbgmBtn").innerHTML="Stop bgm";
        }else{
            bgmFadeOut();
            document.getElementById("stopbgmBtn").innerHTML="Resume bgm";
        }
    }

    var wsUri = "ws://"+SERVERHOST+":"+PORTNO+"/"+ROOTPATH+"/source/server.php";
    //var wsUri = "ws://192.168.11.50:4140/4140/source/server.php";   
    websocket = new WebSocket(wsUri); 

    websocket.onopen = function(ev) { // connection is open 
        console.log("socket opened");
        var restart = localStorage.getItem("restart");
        roomID = localStorage.getItem("rmID");
        if(restart==1){
            console.log("connected, trying to reconnect");
            var msg = {
                
                type:"reconnect",
                rmID: roomID
            };
            //convert and send data to server
            websocket.send(JSON.stringify(msg));
            document.getElementById("rmID").innerHTML = "Reconnecting...";
            checkTimeOut =  setInterval(function(){ 
                checkTimeOutFlag++;
                if(checkTimeOutFlag == 5){
                    clearTimeout(checkTimeOut); 
                    document.getElementById("rmID").innerHTML = "Fail to connect to server after 5 attempts";
                }
            }, 2000);

        }else{
            console.log("connected");
            var msg = {
                type:"getRmID",
                rmID: "-1"
            };
            //convert and send data to server
            websocket.send(JSON.stringify(msg));
        }
       // $('#message_box').append("<div class=\"system_msg\">Connected!</div>"); //notify user
    }


    //#### Message received from server?
    
    
    websocket.onerror   = function(ev){
        console.log("Error Occurred - "+ev.data);
      //  alert("Connection lost, please reconnect!\n see console for error");
       // $('#message_box').append("<div class=\"system_error\">Error Occurred - "+ev.data+"</div>");
    }; 
    websocket.onclose   = function(ev){
        console.log("connection closed");
       // alert("Connection lost, please reconnect!");
        //$('#message_box').append("<div class=\"system_msg\">Connection Closed</div>");
    }; 
    websocket.onmessage = function(ev) {
        var msg = JSON.parse(ev.data); //PHP sends Json data
        var type = msg.type; //message type
        
       
        //var ucolor = msg.color; //color
        if( gameStart == 0 && type == 'controlData'){
            //console.log("rmID:"+rmID+" fire:"+fire + " power: "+power+" dir: "+dir + "playerID: "+playerID);
            //console.log(car);
            var playerID = msg.playerID;
            var dir = msg.direction;
            var fire = msg.fire;
            var power = msg.power;

            if(power==1){
                //console.log("acce");
                planeArr[playerID-1].accelerate=ACC_ACCELERATE;
            }else{
                //console.log("none");
                planeArr[playerID-1].accelerate=ACC_NONE;
            }
            if(fire==1){
                planeArr[playerID-1].fire=FIREING;
                
            }else{
                 planeArr[playerID-1].fire=NOFIRE;
            }
            if(dir > STEER_THRE){
                planeArr[playerID-1].steer=dir;
            }else if (dir < -STEER_THRE){
                planeArr[playerID-1].steer=dir;
            }else{
                planeArr[playerID-1].steer=STEER_NONE;
            }


                //$('#message_box').append("<div><span class=\"user_name\" style=\"color:#"+ucolor+"\">"+uname+"</span> : <span class=\"user_message\">"+umsg+"</span></div>");
        }else if (type == "reconnectRe"){
            localStorage.setItem("rmID", -1);
            localStorage.setItem("restart", 0);
            clearTimeout(checkTimeOut); 
            checkTimeOutFlag = 0;
            document.getElementById("rmID").innerHTML = "Room Number: "+roomID;
            $('#qr').qrcode({
                'url' : 'http://'+SERVERHOST+'/'+ROOTPATH+'/mobile/index.html?rmID='+roomID,
                'width' : 300,
                'height' : 300,
                'qrsize' : 100
            });
        }
        else if(type == 'rmIDMsg') {
            var rmID = msg.rmID;
            roomID = rmID;
            document.getElementById("rmID").innerHTML = "Room Number: "+roomID;
            $('#qr').qrcode({
                'url' : 'http://'+SERVERHOST+'/'+ROOTPATH+'/mobile/index.html?rmID='+roomID,
                'width' : 300,
                'height' : 300,
                'qrsize' : 100
            });
        }else if (type == "playerName"){
            var playerID = msg.playerID;
            var playerName = msg.playerName;
            playerNameMap[playerID] = playerName;
            if(document.getElementById("txtp"+playerPlaneMap[playerID]) != null){
                document.getElementById("txtp"+playerPlaneMap[playerID]).innerHTML=playerNameMap[playerID];
            }
            document.getElementById("console").innerHTML = "";
            for(var i=1;i<playerCount;i++){
                document.getElementById("console").innerHTML += playerNameMap[i] + " Connected<br/>";
            }
        }
        else if(type == 'playerConnect') {
            joinSound.play();
            var playerID = msg.playerID;
            var playerName = msg.playerName;
            if(playerName == ""){
                playerName = "Player "+playerID;
            }
            document.getElementById("console").innerHTML += playerName+" Connected <br/>";
            playerNameMap[playerID] = playerName;
            sendPlaneAva();
            if(playerCount <7){
                playerCount++;
            }

        }
        else if(type == 'choosePlane'){
            var playerID = msg.playerID;
            var planeNo = msg.planeNo;
            for(var i=1;i<=MAXPLAYER;i++){
                if(planeAva[i]==playerID){
                    planeAva[i]=-1;
                    document.getElementById("txtp"+i).innerHTML="";
                }
            }
            //console.log(planeNo, playerID);
            if(planeAva[planeNo]==-1){
                playerPlaneMap[playerID] = planeNo;
                planeAva[planeNo] = playerID;
                document.getElementById("txtp"+planeNo).innerHTML=playerNameMap[playerID];
            }
            sendPlaneAva();
        }else if(type == 'playerDC'){
            var playerID = msg.playerID;
            console.log(playerID + " dc");
        }
           
            
           // $('#message').val(''); //reset text
    };
    // playerCount++;
    // indexInUse.push(1);
    // playerPlaneMap[1] = 1;
    // planeAva[1] = 1;
   /*
    
    playerCount++;
    
    indexInUse.push(1);

    gameEngine();
    */
}

gamejs.ready(main);


