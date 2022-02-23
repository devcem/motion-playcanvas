var Motion = pc.createScript('motion');

Motion.attributes.add('motions', {
    type : 'json',
    schema : [
        {
            name : 'name',
            type : 'string'
        },
        {
            name : 'position',
            type : 'curve',
            curves : ['x', 'y', 'z']
        },
        {
            name : 'rotation',
            type : 'curve',
            curves : ['x', 'y', 'z']
        },
        {
            name : 'scale',
            type : 'curve',
            curves : ['x', 'y', 'z']
        },
        {
            name : 'speed',
            type : 'number',
            default : 1
        },
        {
            name : 'autoplay',
            type : 'boolean',
            default : false
        },
        {
            name : 'loop',
            type : 'boolean',
            default : false
        }
    ],
    array : true
});

Motion.attributes.add('events', {
    type : 'json',
    schema : [
        {
            name : 'animationName',
            type : 'string'
        },
        {
            name : 'eventName',
            type : 'string'
        },
        {
            name : 'time',
            type : 'number',
            default : 1
        },
        {
            name : 'type',
            type : 'string',
            default : 'Anytime',
            enum : [
                {'Anytime' : 'Anytime'},
                {'Start' : 'Start'},
                {'End' : 'End'}
            ]
        }
    ],
    array : true
});


Motion.attributes.add('lerp', { type : 'number', default : 0.5 });

Motion.prototype.initialize = function() {
    this.timestamp     = 0;
    this.currentSpeed  = 0;
    this.currentMotion = false;

    this.isReverting   = false;

    this.startPosition = this.entity.getLocalPosition().clone();
    this.startRotation = this.entity.getLocalEulerAngles().clone();
    this.startScale    = this.entity.getLocalScale().clone();

    this.position = new pc.Vec3(0, 0, 0);
    this.rotation = new pc.Vec3(0, 0, 0);
    this.scale    = new pc.Vec3(0, 0, 0);
    
    if(this.motions.length > 0 && this.motions[0].autoplay){
        this.onMotionPlay(this.motions[0].name);
    }
    
    this.app.on(
        'Motion:' + this.entity.name, 
        this.onMotionPlay, 
        this
    );

    this.app.on(
        'Motion:' + this.entity.name + '@Stop', 
        this.onMotionStop, 
        this
    );

    this.entity.on('Motion', this.onMotionPlay, this);
};

Motion.prototype.findMotion = function(name) {
    var output = false;
    
    for(var index in this.motions){
        var motion = this.motions[index];
        
        if(motion.name == name){
            output = motion;
        }
    }
    
    return output;
};

Motion.prototype.onMotionStop = function(name) {
    //this.isPlaying = false;
    this.isReverting = true;
};

Motion.prototype.onMotionPlay = function(name, ignore) {
    if(
        !ignore &&
        this.currentMotion && 
        this.currentMotion.name == name
    ){
        return false;
    }

    var motion = this.findMotion(name);
    
    this.isPlaying = true;
    this.timestamp = 0;
    
    this.currentMotion = motion;
    this.triggerStartEvent(this.currentMotion);
};

Motion.prototype.triggerEvents = function(dt) {
    for(var index in this.events){
        var event = this.events[index];
        var time  = event.time;

        if(
            event.animationName == this.currentMotion.name &&
            time > this.timestamp && 
            time <= this.timestamp + dt
        ){
            this.app.fire(event.eventName);
        }
    }
};

Motion.prototype.findEventByMotion = function(motion, type) {
    for(var index in this.events){
        var event = this.events[index];
        if(
            event.animationName == motion.name &&
            event.type == type
        ){
            return event;
        }
    }
};

Motion.prototype.triggerStartEvent = function(motion) {
    var event = this.findEventByMotion(motion, 'Start');

    if(event){
        this.app.fire(event.eventName);
    }
};

Motion.prototype.triggerEndEvent = function(motion) {
    var event = this.findEventByMotion(motion, 'End');

    if(event){
        this.app.fire(event.eventName);
    }
};

Motion.prototype.update = function(dt) {
    if(!this.isPlaying){
        return false;
    }
    
    if(!this.currentMotion){
        return false;
    }
    
    var position = this.currentMotion.position.value(this.timestamp);
    var rotation = this.currentMotion.rotation.value(this.timestamp);
    var scale    = this.currentMotion.scale.value(this.timestamp);

    this.position = this.position.lerp(
        this.position,
        new pc.Vec3(position[0], position[1], position[2]),
        this.lerp
    );
    
    this.rotation = this.rotation.lerp(
        this.rotation,
        new pc.Vec3(rotation[0], rotation[1], rotation[2]),
        this.lerp
    );

    this.scale = this.scale.lerp(
        this.scale,
        new pc.Vec3(scale[0], scale[1], scale[2]),
        this.lerp
    );
    
    this.entity.setLocalPosition(
        this.position.clone().add(this.startPosition)
    );

    this.entity.setLocalEulerAngles(
        this.rotation.clone().add(this.startRotation)
    );

    this.entity.setLocalScale(
        this.scale.clone().add(this.startScale)
    );
    
    this.triggerEvents(dt);

    if(!this.isReverting){
        this.timestamp+=dt * this.currentMotion.speed;
    }else{
        this.timestamp = pc.math.lerp(
            this.timestamp,
            0,
            0.1
        );

        if(this.timestamp < 0.05){
            this.triggerEndEvent(this.currentMotion);

            this.currentMotion = false;
            this.isPlaying     = false;
            this.isReverting   = false;
        }
    }
    
    if(this.timestamp >= 1.0){
        this.isPlaying = false;
        
        if(this.currentMotion.loop){
            this.onMotionPlay(this.currentMotion.name, true);
        }else{
            this.currentMotion = false;
        }
    }
};
