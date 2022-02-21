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

Motion.attributes.add('lerp', { type : 'number', default : 0.5 });

Motion.prototype.initialize = function() {
    this.timestamp     = 0;
    this.currentSpeed  = 0;
    this.currentMotion = false;
    
    this.position = new pc.Vec3(0, 0, 0);
    this.rotation = new pc.Vec3(0, 0, 0);
    
    if(this.motions.length > 0 && this.motions[0].autoplay){
        this.onMotionPlay(this.motions[0].name);
    }
    
    this.app.on('Motion:' + this.entity.name, this.onMotionPlay, this);
    this.app.on('Motion:' + this.entity.name + '@Stop', this.onMotionStop, this);
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
    this.isPlaying = false;
    this.timestamp = 0;
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
    
    this.entity.setLocalPosition(this.position);
    this.entity.setLocalEulerAngles(this.rotation);
    
    this.timestamp+=dt * this.currentMotion.speed;
    
    if(this.timestamp >= 1.0){
        this.isPlaying = false;
        
        if(this.currentMotion.loop){
            this.onMotionPlay(this.currentMotion.name, true);
        }else{
            this.currentMotion = false;
        }
    }
};